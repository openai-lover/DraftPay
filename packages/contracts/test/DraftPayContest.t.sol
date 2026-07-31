// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { DraftPayContest } from "../src/DraftPayContest.sol";
import { DraftPayContestFactory } from "../src/DraftPayContestFactory.sol";
import { IERC20 } from "../src/interfaces/IERC20.sol";
import { FeeOnTransferUSDC, MockUSDC, ReentrantUSDC } from "./mocks/MockUSDC.sol";
import { TestBase } from "./utils/TestBase.sol";

contract DraftPayContestTest is TestBase {
    uint256 internal constant ONE_USDC = 1_000_000;
    uint256 internal constant PRIZE = 100 * ONE_USDC;
    uint256 internal constant START = 1_000_000;

    address internal constant CLIENT = address(0xA11CE);
    address internal constant EVALUATOR = address(0xE1A1);
    address internal constant BUILDER_ONE = address(0xB001);
    address internal constant BUILDER_TWO = address(0xB002);
    address internal constant BUILDER_THREE = address(0xB003);
    address internal constant BUILDER_FOUR = address(0xB004);
    address internal constant STRANGER = address(0xBAD);

    MockUSDC internal usdc;

    function setUp() public {
        vm.warp(START);
        usdc = new MockUSDC();
    }

    function testContestFunding() public {
        DraftPayContest contest = _createAndFund(PRIZE);
        assertEq(usdc.balanceOf(address(contest)), PRIZE, "contest holds exact prize");
        assertEq(uint256(contest.state()), uint256(DraftPayContest.State.SubmissionOpen), "open");
    }

    function testFactoryCreatesConfiguredContest() public {
        DraftPayContestFactory factory = new DraftPayContestFactory(IERC20(address(usdc)));
        uint64 submissionDeadline = uint64(block.timestamp + 1 days);
        uint64 selectionDeadline = uint64(block.timestamp + 3 days);
        bytes32 specificationHash = keccak256("factory-spec");

        vm.prank(CLIENT);
        (uint256 contestId, DraftPayContest contest) = factory.createContest(
            EVALUATOR, PRIZE, submissionDeadline, selectionDeadline, specificationHash
        );

        assertEq(contestId, 1, "first factory id");
        assertEq(factory.contests(contestId), address(contest), "factory stores contest");
        assertEq(contest.client(), CLIENT, "caller becomes client");
        assertEq(contest.evaluator(), EVALUATOR, "evaluator is immutable");
        assertEq(contest.prizeAmount(), PRIZE, "prize is immutable");
        assertEq(contest.specificationHash(), specificationHash, "specification is bound");
    }

    function testFactoryRejectsZeroUsdcAddress() public {
        vm.expectRevert(DraftPayContestFactory.InvalidUsdcAddress.selector);
        new DraftPayContestFactory(IERC20(address(0)));
    }

    function testInvalidUsdcFundingAmountReverts() public {
        FeeOnTransferUSDC token = new FeeOnTransferUSDC();
        DraftPayContest contest = _create(PRIZE, token);
        token.mint(CLIENT, PRIZE);
        vm.startPrank(CLIENT);
        token.approve(address(contest), PRIZE);
        vm.expectRevert(
            abi.encodeWithSelector(DraftPayContest.InvalidFundingAmount.selector, PRIZE, PRIZE - 1)
        );
        contest.fund();
        vm.stopPrank();
    }

    function testWinnerPlusTwoFinalists() public {
        (DraftPayContest contest, uint256[3] memory ids) = _rankThree(PRIZE);
        vm.prank(CLIENT);
        contest.selectWinner(ids[1]);

        assertEq(usdc.balanceOf(BUILDER_TWO), 95 * ONE_USDC, "winner gets 95");
        assertEq(usdc.balanceOf(BUILDER_ONE), 2_500_000, "rank one gets split");
        assertEq(usdc.balanceOf(BUILDER_THREE), 2_500_000, "rank three gets split");
        _assertTerminalConservation(contest, PRIZE);
    }

    function testWinnerPlusOneFinalist() public {
        (DraftPayContest contest, uint256[2] memory ids) = _rankTwo(PRIZE);
        vm.prank(CLIENT);
        contest.selectWinner(ids[0]);

        assertEq(usdc.balanceOf(BUILDER_ONE), 95 * ONE_USDC, "winner gets 95");
        assertEq(usdc.balanceOf(BUILDER_TWO), 5 * ONE_USDC, "only finalist gets 5");
        _assertTerminalConservation(contest, PRIZE);
    }

    function testWinnerWithoutAnotherFinalist() public {
        (DraftPayContest contest, uint256 id) = _rankOne(PRIZE);
        vm.prank(CLIENT);
        contest.selectWinner(id);

        assertEq(usdc.balanceOf(BUILDER_ONE), PRIZE, "winner gets unused allocation");
        _assertTerminalConservation(contest, PRIZE);
    }

    function testNoWinnerThreeQualified() public {
        (DraftPayContest contest,) = _rankThree(PRIZE);
        vm.prank(CLIENT);
        contest.settleNoWinner();

        assertEq(usdc.balanceOf(CLIENT), 70 * ONE_USDC, "client gets 70");
        assertEq(usdc.balanceOf(BUILDER_ONE), 15 * ONE_USDC, "first gets 15");
        assertEq(usdc.balanceOf(BUILDER_TWO), 10 * ONE_USDC, "second gets 10");
        assertEq(usdc.balanceOf(BUILDER_THREE), 5 * ONE_USDC, "third gets 5");
        _assertTerminalConservation(contest, PRIZE);
    }

    function testNoWinnerOneQualified() public {
        (DraftPayContest contest,) = _rankOne(PRIZE);
        vm.prank(CLIENT);
        contest.settleNoWinner();

        assertEq(usdc.balanceOf(CLIENT), 85 * ONE_USDC, "unused shares refunded");
        assertEq(usdc.balanceOf(BUILDER_ONE), 15 * ONE_USDC, "first paid");
        _assertTerminalConservation(contest, PRIZE);
    }

    function testNoWinnerTwoQualified() public {
        (DraftPayContest contest,) = _rankTwo(PRIZE);
        vm.prank(CLIENT);
        contest.settleNoWinner();

        assertEq(usdc.balanceOf(CLIENT), 75 * ONE_USDC, "third share refunded");
        assertEq(usdc.balanceOf(BUILDER_ONE), 15 * ONE_USDC, "first paid");
        assertEq(usdc.balanceOf(BUILDER_TWO), 10 * ONE_USDC, "second paid");
        _assertTerminalConservation(contest, PRIZE);
    }

    function testNoQualifiedSubmissionRefund() public {
        DraftPayContest contest = _createAndFund(PRIZE);
        _openEvaluation(contest);
        uint256[] memory none = new uint256[](0);
        vm.prank(EVALUATOR);
        contest.rankFinalists(none, keccak256("no valid submissions"));
        contest.refundNoQualified();

        assertEq(usdc.balanceOf(CLIENT), PRIZE, "full prize refunded");
        assertEq(uint256(contest.state()), uint256(DraftPayContest.State.Refunded), "refunded");
        _assertTerminalConservation(contest, PRIZE);
    }

    function testUnauthorizedWinnerSelection() public {
        (DraftPayContest contest, uint256 id) = _rankOne(PRIZE);
        vm.expectRevert(DraftPayContest.Unauthorized.selector);
        vm.prank(STRANGER);
        contest.selectWinner(id);
    }

    function testPermissionlessSettlementBeforeDeadlineReverts() public {
        (DraftPayContest contest,) = _rankOne(PRIZE);
        vm.expectRevert(DraftPayContest.SettlementTooEarly.selector);
        vm.prank(STRANGER);
        contest.settleNoWinner();
    }

    function testPermissionlessSettlementAfterDeadline() public {
        (DraftPayContest contest,) = _rankThree(PRIZE);
        vm.warp(contest.selectionDeadline() + 1);
        vm.prank(STRANGER);
        contest.settleNoWinner();
        assertEq(usdc.balanceOf(CLIENT), 70 * ONE_USDC, "client refunded");
        _assertTerminalConservation(contest, PRIZE);
    }

    function testExpiredEvaluationUsesQualificationOrder() public {
        DraftPayContest contest = _createAndFund(PRIZE);
        uint256 id1 = _submit(contest, BUILDER_TWO, "two");
        uint256 id2 = _submit(contest, BUILDER_ONE, "one");
        _openEvaluation(contest);
        _evaluate(contest, id1, true);
        _evaluate(contest, id2, true);

        vm.warp(contest.selectionDeadline() + 1);
        vm.prank(STRANGER);
        contest.settleNoWinner();

        assertEq(usdc.balanceOf(BUILDER_TWO), 15 * ONE_USDC, "qualification order first");
        assertEq(usdc.balanceOf(BUILDER_ONE), 10 * ONE_USDC, "qualification order second");
        _assertTerminalConservation(contest, PRIZE);
    }

    function testDuplicateSettlementReverts() public {
        (DraftPayContest contest, uint256 id) = _rankOne(PRIZE);
        vm.prank(CLIENT);
        contest.selectWinner(id);
        vm.expectRevert(
            abi.encodeWithSelector(
                DraftPayContest.InvalidState.selector,
                DraftPayContest.State.AwaitingSelection,
                DraftPayContest.State.SettledWithWinner
            )
        );
        vm.prank(CLIENT);
        contest.settleNoWinner();
    }

    function testInvalidWinnerReverts() public {
        (DraftPayContest contest,) = _rankOne(PRIZE);
        vm.expectRevert(abi.encodeWithSelector(DraftPayContest.InvalidWinner.selector, 2));
        vm.prank(CLIENT);
        contest.selectWinner(2);
    }

    function testInvalidRankingReverts() public {
        DraftPayContest contest = _createAndFund(PRIZE);
        uint256 id1 = _submit(contest, BUILDER_ONE, "one");
        uint256 id2 = _submit(contest, BUILDER_TWO, "two");
        _openEvaluation(contest);
        _evaluate(contest, id1, true);
        _evaluate(contest, id2, true);

        uint256[] memory duplicate = new uint256[](2);
        duplicate[0] = id1;
        duplicate[1] = id1;
        vm.expectRevert(DraftPayContest.InvalidRanking.selector);
        vm.prank(EVALUATOR);
        contest.rankFinalists(duplicate, keccak256("bad rank"));
    }

    function testDuplicateDeliverableReverts() public {
        DraftPayContest contest = _createAndFund(PRIZE);
        bytes32 hash = keccak256("same");
        vm.prank(BUILDER_ONE);
        contest.submit(hash, "ipfs://one");
        vm.expectRevert(DraftPayContest.DuplicateDeliverable.selector);
        vm.prank(BUILDER_TWO);
        contest.submit(hash, "ipfs://two");
    }

    function testUnauthorizedEvaluationReverts() public {
        DraftPayContest contest = _createAndFund(PRIZE);
        uint256 id = _submit(contest, BUILDER_ONE, "one");
        _openEvaluation(contest);
        vm.expectRevert(DraftPayContest.Unauthorized.selector);
        vm.prank(STRANGER);
        contest.evaluateSubmission(id, true, keccak256("checks"));
    }

    function testInvalidStateTransitionsRevert() public {
        DraftPayContest contest = _create(PRIZE, usdc);
        vm.expectRevert(
            abi.encodeWithSelector(
                DraftPayContest.InvalidState.selector,
                DraftPayContest.State.SubmissionOpen,
                DraftPayContest.State.Created
            )
        );
        vm.prank(BUILDER_ONE);
        contest.submit(keccak256("early"), "fixture://early");

        _fund(contest, usdc, PRIZE);
        vm.expectRevert(DraftPayContest.EvaluationNotReady.selector);
        contest.beginEvaluation();
    }

    function testWinnerRoundingConservesAtomicUnits() public {
        uint256 tinyPrize = 100;
        (DraftPayContest contest, uint256[3] memory ids) = _rankThree(tinyPrize);
        vm.prank(CLIENT);
        contest.selectWinner(ids[0]);

        assertEq(usdc.balanceOf(BUILDER_ONE), 96, "winner receives remainder");
        assertEq(usdc.balanceOf(BUILDER_TWO), 2, "finalist floor");
        assertEq(usdc.balanceOf(BUILDER_THREE), 2, "finalist floor");
        _assertTerminalConservation(contest, tinyPrize);
    }

    function testReentrantSettlementAttemptFails() public {
        ReentrantUSDC token = new ReentrantUSDC();
        DraftPayContest contest = _create(PRIZE, token);
        _fund(contest, token, PRIZE);
        uint256 id = _submit(contest, BUILDER_ONE, "reentrant");
        _openEvaluation(contest);
        _evaluate(contest, id, true);
        uint256[] memory ordered = new uint256[](1);
        ordered[0] = id;
        vm.prank(EVALUATOR);
        contest.rankFinalists(ordered, keccak256("rank"));
        vm.warp(contest.selectionDeadline() + 1);
        token.configureAttack(address(contest), abi.encodeCall(contest.settleNoWinner, ()));

        vm.prank(STRANGER);
        contest.settleNoWinner();

        assertTrue(token.attackAttempted(), "token attempted callback");
        assertTrue(!token.attackSucceeded(), "guard rejected callback");
        assertEq(token.balanceOf(BUILDER_ONE), 15 * ONE_USDC, "builder paid once");
        _assertTerminalConservationWithToken(contest, token, PRIZE);
    }

    function testFuzzWinnerPayoutConservation(uint96 rawPrize) public {
        uint256 fuzzPrize = uint256(rawPrize) % 1_000_000_000_000 + 1;
        (DraftPayContest contest, uint256[3] memory ids) = _rankThree(fuzzPrize);
        vm.prank(CLIENT);
        contest.selectWinner(ids[2]);
        _assertTerminalConservation(contest, fuzzPrize);
    }

    function testFuzzNoWinnerPayoutConservation(uint96 rawPrize, uint8 rawCount) public {
        uint256 fuzzPrize = uint256(rawPrize) % 1_000_000_000_000 + 1;
        uint8 count = uint8(uint256(rawCount) % 4);
        DraftPayContest contest = _createAndFund(fuzzPrize);
        uint256[] memory ordered = new uint256[](count);
        address[3] memory builders = [BUILDER_ONE, BUILDER_TWO, BUILDER_THREE];
        for (uint256 index; index < count; ++index) {
            ordered[index] = _submit(contest, builders[index], _label(index));
        }
        _openEvaluation(contest);
        for (uint256 index; index < count; ++index) {
            _evaluate(contest, ordered[index], true);
        }
        vm.prank(EVALUATOR);
        contest.rankFinalists(ordered, keccak256("fuzz rank"));
        vm.prank(CLIENT);
        contest.settleNoWinner();
        _assertTerminalConservation(contest, fuzzPrize);
    }

    function testFourthQualifiedSubmissionDoesNotRevert() public {
        DraftPayContest contest = _createAndFund(PRIZE);
        uint256 one = _submit(contest, BUILDER_ONE, "one");
        uint256 two = _submit(contest, BUILDER_TWO, "two");
        uint256 three = _submit(contest, BUILDER_THREE, "three");
        uint256 four = _submit(contest, BUILDER_FOUR, "four");
        _openEvaluation(contest);
        _evaluate(contest, one, true);
        _evaluate(contest, two, true);
        _evaluate(contest, three, true);
        _evaluate(contest, four, true);

        assertEq(contest.qualifiedCount(), 3, "finalist set stays bounded at three");
        assertEq(contest.qualifiedBeyondCap(), 1, "fourth qualified entry is recorded");
        assertTrue(contest.getSubmission(four).evaluated, "fourth entry was evaluated");
        assertTrue(contest.getSubmission(four).qualified, "fourth entry is honestly qualified");
        assertTrue(
            !contest.getSubmission(four).finalistEligible, "fourth entry cannot take a payout slot"
        );
    }

    function testBeyondCapSubmissionCannotBeRankedOrSelected() public {
        DraftPayContest contest = _createAndFund(PRIZE);
        uint256 one = _submit(contest, BUILDER_ONE, "one");
        uint256 two = _submit(contest, BUILDER_TWO, "two");
        uint256 three = _submit(contest, BUILDER_THREE, "three");
        uint256 four = _submit(contest, BUILDER_FOUR, "four");
        _openEvaluation(contest);
        _evaluate(contest, one, true);
        _evaluate(contest, two, true);
        _evaluate(contest, three, true);
        _evaluate(contest, four, true);

        uint256[] memory ordered = new uint256[](3);
        ordered[0] = four;
        ordered[1] = two;
        ordered[2] = three;
        vm.prank(EVALUATOR);
        vm.expectRevert(DraftPayContest.InvalidRanking.selector);
        contest.rankFinalists(ordered, keccak256("beyond cap"));

        ordered[0] = one;
        vm.prank(EVALUATOR);
        contest.rankFinalists(ordered, keccak256("valid rank"));
        vm.prank(CLIENT);
        vm.expectRevert(abi.encodeWithSelector(DraftPayContest.InvalidWinner.selector, four));
        contest.selectWinner(four);
    }

    function testFourQualifiedSubmissionsStillConserveThePrize() public {
        DraftPayContest contest = _createAndFund(PRIZE);
        uint256 one = _submit(contest, BUILDER_ONE, "one");
        uint256 two = _submit(contest, BUILDER_TWO, "two");
        uint256 three = _submit(contest, BUILDER_THREE, "three");
        uint256 four = _submit(contest, BUILDER_FOUR, "four");
        _openEvaluation(contest);
        _evaluate(contest, one, true);
        _evaluate(contest, two, true);
        _evaluate(contest, three, true);
        _evaluate(contest, four, true);

        uint256[] memory ordered = new uint256[](3);
        ordered[0] = one;
        ordered[1] = two;
        ordered[2] = three;
        vm.prank(EVALUATOR);
        contest.rankFinalists(ordered, keccak256("rank capped"));
        vm.prank(CLIENT);
        contest.selectWinner(one);

        assertEq(usdc.balanceOf(BUILDER_ONE), 95 * ONE_USDC, "winner takes 95");
        assertEq(usdc.balanceOf(BUILDER_FOUR), 0, "beyond-cap builder is not paid");
        _assertTerminalConservation(contest, PRIZE);
    }

    function _rankThree(uint256 prize)
        internal
        returns (DraftPayContest contest, uint256[3] memory ids)
    {
        contest = _createAndFund(prize);
        ids[0] = _submit(contest, BUILDER_ONE, "one");
        ids[1] = _submit(contest, BUILDER_TWO, "two");
        ids[2] = _submit(contest, BUILDER_THREE, "three");
        _openEvaluation(contest);
        _evaluate(contest, ids[0], true);
        _evaluate(contest, ids[1], true);
        _evaluate(contest, ids[2], true);
        uint256[] memory ordered = new uint256[](3);
        ordered[0] = ids[0];
        ordered[1] = ids[1];
        ordered[2] = ids[2];
        vm.prank(EVALUATOR);
        contest.rankFinalists(ordered, keccak256("rank three"));
    }

    function _rankTwo(uint256 prize)
        internal
        returns (DraftPayContest contest, uint256[2] memory ids)
    {
        contest = _createAndFund(prize);
        ids[0] = _submit(contest, BUILDER_ONE, "one");
        ids[1] = _submit(contest, BUILDER_TWO, "two");
        _openEvaluation(contest);
        _evaluate(contest, ids[0], true);
        _evaluate(contest, ids[1], true);
        uint256[] memory ordered = new uint256[](2);
        ordered[0] = ids[0];
        ordered[1] = ids[1];
        vm.prank(EVALUATOR);
        contest.rankFinalists(ordered, keccak256("rank two"));
    }

    function _rankOne(uint256 prize) internal returns (DraftPayContest contest, uint256 id) {
        contest = _createAndFund(prize);
        id = _submit(contest, BUILDER_ONE, "one");
        _openEvaluation(contest);
        _evaluate(contest, id, true);
        uint256[] memory ordered = new uint256[](1);
        ordered[0] = id;
        vm.prank(EVALUATOR);
        contest.rankFinalists(ordered, keccak256("rank one"));
    }

    function _createAndFund(uint256 prize) internal returns (DraftPayContest contest) {
        contest = _create(prize, usdc);
        _fund(contest, usdc, prize);
    }

    function _create(uint256 prize, MockUSDC token) internal returns (DraftPayContest contest) {
        contest = new DraftPayContest(
            IERC20(address(token)),
            CLIENT,
            EVALUATOR,
            prize,
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 3 days),
            keccak256("landing-page-spec-v1")
        );
    }

    function _fund(DraftPayContest contest, MockUSDC token, uint256 prize) internal {
        token.mint(CLIENT, prize);
        vm.startPrank(CLIENT);
        token.approve(address(contest), prize);
        contest.fund();
        vm.stopPrank();
    }

    function _submit(DraftPayContest contest, address builder, string memory label)
        internal
        returns (uint256 id)
    {
        vm.prank(builder);
        id = contest.submit(keccak256(bytes(label)), string.concat("fixture://", label));
    }

    function _openEvaluation(DraftPayContest contest) internal {
        vm.warp(contest.submissionDeadline());
        contest.beginEvaluation();
    }

    function _evaluate(DraftPayContest contest, uint256 id, bool qualified) internal {
        vm.prank(EVALUATOR);
        contest.evaluateSubmission(id, qualified, keccak256(abi.encode("checks", id, qualified)));
    }

    function _assertTerminalConservation(DraftPayContest contest, uint256 expected) internal view {
        _assertTerminalConservationWithToken(contest, usdc, expected);
    }

    function _assertTerminalConservationWithToken(
        DraftPayContest contest,
        MockUSDC token,
        uint256 expected
    ) internal view {
        DraftPayContest.Payout[] memory payouts = contest.getPayouts();
        uint256 recorded;
        for (uint256 index; index < payouts.length; ++index) {
            recorded += payouts[index].amount;
        }
        assertEq(recorded, expected, "recorded payouts conserve prize");
        assertEq(token.balanceOf(address(contest)), 0, "contest has no prize remainder");
    }

    function _label(uint256 index) internal pure returns (string memory) {
        if (index == 0) return "fuzz-one";
        if (index == 1) return "fuzz-two";
        return "fuzz-three";
    }
}
