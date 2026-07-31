// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "./interfaces/IERC20.sol";
import { DraftPayContest } from "./DraftPayContest.sol";

/// @title DraftPayContestFactory
/// @notice Creates isolated DraftPay contest escrows for the configured Arc Testnet USDC interface.
contract DraftPayContestFactory {
    error InvalidUsdcAddress();

    event ContestCreated(
        address indexed contest,
        address indexed client,
        address indexed evaluator,
        uint256 prizeAmount,
        uint64 submissionDeadline,
        uint64 selectionDeadline,
        bytes32 specificationHash
    );

    IERC20 public immutable usdc;
    uint256 public contestCount;
    mapping(uint256 contestId => address contest) public contests;

    constructor(IERC20 usdc_) {
        if (address(usdc_) == address(0)) revert InvalidUsdcAddress();
        usdc = usdc_;
    }

    function createContest(
        address evaluator,
        uint256 prizeAmount,
        uint64 submissionDeadline,
        uint64 selectionDeadline,
        bytes32 specificationHash
    ) external returns (uint256 contestId, DraftPayContest contest) {
        contest = new DraftPayContest(
            usdc,
            msg.sender,
            evaluator,
            prizeAmount,
            submissionDeadline,
            selectionDeadline,
            specificationHash
        );
        contestId = ++contestCount;
        contests[contestId] = address(contest);

        emit ContestCreated(
            address(contest),
            msg.sender,
            evaluator,
            prizeAmount,
            submissionDeadline,
            selectionDeadline,
            specificationHash
        );
    }
}
