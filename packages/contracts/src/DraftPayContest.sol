// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "./interfaces/IERC20.sol";
import { SafeTransferLib } from "./libraries/SafeTransferLib.sol";

/// @title DraftPayContest
/// @notice Arc Testnet hackathon escrow for one landing-page build contest.
/// @dev This unaudited MVP borrows ERC-8183 lifecycle semantics but adds DraftPay-specific
///      multi-submission qualification, ranking, client choice, and no-winner settlement.
contract DraftPayContest {
    using SafeTransferLib for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant WINNER_BPS = 9_500;
    uint256 public constant FIRST_BPS = 1_500;
    uint256 public constant SECOND_BPS = 1_000;
    uint256 public constant THIRD_BPS = 500;
    uint8 public constant MAX_FINALISTS = 3;
    uint16 public constant MAX_METADATA_URI_BYTES = 256;

    enum State {
        Created,
        SubmissionOpen,
        Evaluation,
        AwaitingSelection,
        SettledWithWinner,
        SettledWithoutWinner,
        Refunded,
        Cancelled
    }

    struct Submission {
        address builder;
        bytes32 deliverableHash;
        bytes32 evaluationHash;
        string metadataURI;
        bool evaluated;
        bool qualified;
        uint8 rank;
    }

    struct Payout {
        address recipient;
        uint256 amount;
        uint256 submissionId;
    }

    error Unauthorized();
    error InvalidAddress();
    error InvalidPrize();
    error InvalidDeadlines();
    error InvalidState(State expected, State actual);
    error SubmissionWindowClosed();
    error EvaluationNotReady();
    error SelectionWindowClosed();
    error SettlementTooEarly();
    error InvalidDeliverableHash();
    error DuplicateDeliverable();
    error MetadataTooLarge();
    error InvalidSubmission(uint256 submissionId);
    error AlreadyEvaluated(uint256 submissionId);
    error TooManyQualifiedSubmissions();
    error InvalidRanking();
    error InvalidWinner(uint256 submissionId);
    error QualifiedSubmissionsExist();
    error InvalidFundingAmount(uint256 expected, uint256 received);
    error ReentrantCall();

    event ContestCreated(
        address indexed contest,
        address indexed client,
        address indexed evaluator,
        uint256 prizeAmount,
        uint64 submissionDeadline,
        uint64 selectionDeadline,
        bytes32 specificationHash
    );
    event ContestFunded(address indexed client, uint256 amount);
    event SubmissionSubmitted(
        uint256 indexed submissionId,
        address indexed builder,
        bytes32 indexed deliverableHash,
        string metadataURI
    );
    event EvaluationOpened(uint64 openedAt);
    event SubmissionQualified(
        uint256 indexed submissionId, address indexed builder, bytes32 evaluationHash
    );
    event SubmissionRejected(
        uint256 indexed submissionId, address indexed builder, bytes32 evaluationHash
    );
    event FinalistsRanked(uint256[3] submissionIds, uint8 count, bytes32 rankingEvidenceHash);
    event WinnerSelected(uint256 indexed submissionId, address indexed builder);
    event PayoutRecorded(address indexed recipient, uint256 amount, uint256 indexed submissionId);
    event WinnerSettled(
        uint256 indexed winnerSubmissionId,
        address indexed winner,
        uint256 winnerAmount,
        uint256 finalistAmount
    );
    event NoWinnerSettled(uint256 clientRefund, uint256 effortProtectionPaid, uint8 finalistCount);
    event ClientRefunded(address indexed client, uint256 amount);
    event ContestCancelled(address indexed client);

    IERC20 public immutable usdc;
    address public immutable client;
    address public immutable evaluator;
    uint256 public immutable prizeAmount;
    uint64 public immutable submissionDeadline;
    uint64 public immutable selectionDeadline;
    bytes32 public immutable specificationHash;

    State public state;
    uint256 public submissionCount;
    uint8 public qualifiedCount;
    uint8 public finalistCount;
    uint256 public winnerSubmissionId;
    uint8 public payoutCount;

    mapping(uint256 submissionId => Submission) private submissions;
    mapping(bytes32 deliverableHash => bool used) public usedDeliverableHashes;
    uint256[3] private qualifiedInOrder;
    uint256[3] private rankedFinalists;
    Payout[4] private settlementPayouts;

    uint256 private unlocked = 1;

    modifier onlyClient() {
        if (msg.sender != client) revert Unauthorized();
        _;
    }

    modifier onlyEvaluator() {
        if (msg.sender != evaluator) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (unlocked != 1) revert ReentrantCall();
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor(
        IERC20 usdc_,
        address client_,
        address evaluator_,
        uint256 prizeAmount_,
        uint64 submissionDeadline_,
        uint64 selectionDeadline_,
        bytes32 specificationHash_
    ) {
        if (address(usdc_) == address(0) || client_ == address(0) || evaluator_ == address(0)) {
            revert InvalidAddress();
        }
        if (prizeAmount_ == 0) revert InvalidPrize();
        if (submissionDeadline_ <= block.timestamp || selectionDeadline_ <= submissionDeadline_) {
            revert InvalidDeadlines();
        }

        usdc = usdc_;
        client = client_;
        evaluator = evaluator_;
        prizeAmount = prizeAmount_;
        submissionDeadline = submissionDeadline_;
        selectionDeadline = selectionDeadline_;
        specificationHash = specificationHash_;

        emit ContestCreated(
            address(this),
            client_,
            evaluator_,
            prizeAmount_,
            submissionDeadline_,
            selectionDeadline_,
            specificationHash_
        );
    }

    function fund() external onlyClient nonReentrant {
        _requireState(State.Created);

        uint256 balanceBefore = usdc.balanceOf(address(this));
        state = State.SubmissionOpen;
        usdc.safeTransferFrom(client, address(this), prizeAmount);
        uint256 received = usdc.balanceOf(address(this)) - balanceBefore;
        if (received != prizeAmount) revert InvalidFundingAmount(prizeAmount, received);

        emit ContestFunded(client, prizeAmount);
    }

    function cancel() external onlyClient {
        _requireState(State.Created);
        state = State.Cancelled;
        emit ContestCancelled(client);
    }

    function submit(bytes32 deliverableHash, string calldata metadataURI)
        external
        nonReentrant
        returns (uint256 submissionId)
    {
        _requireState(State.SubmissionOpen);
        if (block.timestamp >= submissionDeadline) revert SubmissionWindowClosed();
        if (deliverableHash == bytes32(0)) revert InvalidDeliverableHash();
        if (usedDeliverableHashes[deliverableHash]) revert DuplicateDeliverable();
        if (bytes(metadataURI).length > MAX_METADATA_URI_BYTES) revert MetadataTooLarge();

        submissionId = ++submissionCount;
        usedDeliverableHashes[deliverableHash] = true;
        submissions[submissionId] = Submission({
            builder: msg.sender,
            deliverableHash: deliverableHash,
            evaluationHash: bytes32(0),
            metadataURI: metadataURI,
            evaluated: false,
            qualified: false,
            rank: 0
        });

        emit SubmissionSubmitted(submissionId, msg.sender, deliverableHash, metadataURI);
    }

    function beginEvaluation() external {
        _requireState(State.SubmissionOpen);
        if (block.timestamp < submissionDeadline) revert EvaluationNotReady();
        state = State.Evaluation;
        emit EvaluationOpened(uint64(block.timestamp));
    }

    function evaluateSubmission(uint256 submissionId, bool qualified, bytes32 evaluationHash)
        external
        onlyEvaluator
    {
        _requireState(State.Evaluation);
        if (block.timestamp > selectionDeadline) revert SelectionWindowClosed();
        if (submissionId == 0 || submissionId > submissionCount) {
            revert InvalidSubmission(submissionId);
        }

        Submission storage submission = submissions[submissionId];
        if (submission.evaluated) revert AlreadyEvaluated(submissionId);
        submission.evaluated = true;
        submission.evaluationHash = evaluationHash;

        if (qualified) {
            if (qualifiedCount == MAX_FINALISTS) revert TooManyQualifiedSubmissions();
            submission.qualified = true;
            qualifiedInOrder[qualifiedCount] = submissionId;
            unchecked {
                ++qualifiedCount;
            }
            emit SubmissionQualified(submissionId, submission.builder, evaluationHash);
        } else {
            emit SubmissionRejected(submissionId, submission.builder, evaluationHash);
        }
    }

    function rankFinalists(uint256[] calldata orderedSubmissionIds, bytes32 rankingEvidenceHash)
        external
        onlyEvaluator
    {
        _requireState(State.Evaluation);
        if (block.timestamp > selectionDeadline) revert SelectionWindowClosed();
        if (orderedSubmissionIds.length != qualifiedCount || qualifiedCount > MAX_FINALISTS) {
            revert InvalidRanking();
        }

        for (uint256 index; index < orderedSubmissionIds.length; ++index) {
            uint256 submissionId = orderedSubmissionIds[index];
            if (submissionId == 0 || submissionId > submissionCount) revert InvalidRanking();
            Submission storage submission = submissions[submissionId];
            if (!submission.qualified || submission.rank != 0) revert InvalidRanking();
            submission.rank = uint8(index + 1);
            rankedFinalists[index] = submissionId;
        }

        finalistCount = qualifiedCount;
        state = State.AwaitingSelection;
        emit FinalistsRanked(rankedFinalists, finalistCount, rankingEvidenceHash);
    }

    function selectWinner(uint256 submissionId) external onlyClient nonReentrant {
        _requireState(State.AwaitingSelection);
        if (block.timestamp > selectionDeadline) revert SelectionWindowClosed();
        Submission storage selected = submissions[submissionId];
        if (!selected.qualified || selected.rank == 0) revert InvalidWinner(submissionId);

        winnerSubmissionId = submissionId;
        state = State.SettledWithWinner;
        emit WinnerSelected(submissionId, selected.builder);

        uint256 otherFinalistCount = finalistCount - 1;
        uint256 baseWinnerAmount = prizeAmount * WINNER_BPS / BPS_DENOMINATOR;
        uint256 perFinalistAmount;
        if (otherFinalistCount != 0) {
            perFinalistAmount = (prizeAmount - baseWinnerAmount) / otherFinalistCount;
        }
        uint256 winnerAmount = prizeAmount - (perFinalistAmount * otherFinalistCount);
        _recordPayout(selected.builder, winnerAmount, submissionId);
        for (uint256 index; index < finalistCount; ++index) {
            uint256 finalistId = rankedFinalists[index];
            if (finalistId != submissionId) {
                _recordPayout(submissions[finalistId].builder, perFinalistAmount, finalistId);
            }
        }

        emit WinnerSettled(
            submissionId, selected.builder, winnerAmount, perFinalistAmount * otherFinalistCount
        );
        _transferRecordedPayouts();
    }

    /// @notice The client may reject all ranked finalists before the deadline. Once the
    ///         deadline passes, any account may settle. If ranking never completed, the
    ///         evaluator's qualification order becomes the bounded fallback ranking.
    function settleNoWinner() external nonReentrant {
        State current = state;
        if (current == State.AwaitingSelection) {
            if (msg.sender != client && block.timestamp <= selectionDeadline) {
                revert SettlementTooEarly();
            }
        } else if (current == State.SubmissionOpen || current == State.Evaluation) {
            if (block.timestamp <= selectionDeadline) revert SettlementTooEarly();
            _finalizeFallbackRanking();
        } else {
            revert InvalidState(State.AwaitingSelection, current);
        }

        if (finalistCount == 0) {
            _refundNoQualified();
            return;
        }

        state = State.SettledWithoutWinner;
        uint256 effortProtectionPaid;
        for (uint256 index; index < finalistCount; ++index) {
            uint256 reward = _rankReward(index);
            effortProtectionPaid += reward;
            uint256 submissionId = rankedFinalists[index];
            _recordPayout(submissions[submissionId].builder, reward, submissionId);
        }

        uint256 clientRefund = prizeAmount - effortProtectionPaid;
        _recordPayout(client, clientRefund, 0);
        emit ClientRefunded(client, clientRefund);
        emit NoWinnerSettled(clientRefund, effortProtectionPaid, finalistCount);
        _transferRecordedPayouts();
    }

    function refundNoQualified() external nonReentrant {
        _requireState(State.AwaitingSelection);
        if (finalistCount != 0) revert QualifiedSubmissionsExist();
        _refundNoQualified();
    }

    function getSubmission(uint256 submissionId) external view returns (Submission memory) {
        if (submissionId == 0 || submissionId > submissionCount) {
            revert InvalidSubmission(submissionId);
        }
        return submissions[submissionId];
    }

    function getRankedFinalists() external view returns (uint256[3] memory ids, uint8 count) {
        return (rankedFinalists, finalistCount);
    }

    function getPayouts() external view returns (Payout[] memory payouts) {
        payouts = new Payout[](payoutCount);
        for (uint256 index; index < payoutCount; ++index) {
            payouts[index] = settlementPayouts[index];
        }
    }

    function _finalizeFallbackRanking() private {
        for (uint256 index; index < qualifiedCount; ++index) {
            uint256 submissionId = qualifiedInOrder[index];
            submissions[submissionId].rank = uint8(index + 1);
            rankedFinalists[index] = submissionId;
        }
        finalistCount = qualifiedCount;
        state = State.AwaitingSelection;
        emit FinalistsRanked(rankedFinalists, finalistCount, bytes32(0));
    }

    function _refundNoQualified() private {
        state = State.Refunded;
        _recordPayout(client, prizeAmount, 0);
        emit ClientRefunded(client, prizeAmount);
        _transferRecordedPayouts();
    }

    function _rankReward(uint256 zeroBasedRank) private view returns (uint256) {
        if (zeroBasedRank == 0) return prizeAmount * FIRST_BPS / BPS_DENOMINATOR;
        if (zeroBasedRank == 1) return prizeAmount * SECOND_BPS / BPS_DENOMINATOR;
        return prizeAmount * THIRD_BPS / BPS_DENOMINATOR;
    }

    function _recordPayout(address recipient, uint256 amount, uint256 submissionId) private {
        settlementPayouts[payoutCount] =
            Payout({ recipient: recipient, amount: amount, submissionId: submissionId });
        unchecked {
            ++payoutCount;
        }
        emit PayoutRecorded(recipient, amount, submissionId);
    }

    function _transferRecordedPayouts() private {
        for (uint256 index; index < payoutCount; ++index) {
            Payout memory payout = settlementPayouts[index];
            if (payout.amount != 0) usdc.safeTransfer(payout.recipient, payout.amount);
        }
    }

    function _requireState(State expected) private view {
        if (state != expected) revert InvalidState(expected, state);
    }
}
