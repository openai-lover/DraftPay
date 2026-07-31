// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "../src/interfaces/IERC20.sol";
import { DraftPayContestFactory } from "../src/DraftPayContestFactory.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Deploy with an externally configured Foundry account/keystore. Never pass a raw key.
contract DeployArc {
    address internal constant VM_ADDRESS = address(uint160(uint256(keccak256("hevm cheat code"))));
    Vm internal constant vm = Vm(VM_ADDRESS);

    address public constant ARC_TESTNET_USDC = 0x3600000000000000000000000000000000000000;

    function run() external returns (DraftPayContestFactory factory) {
        vm.startBroadcast();
        factory = new DraftPayContestFactory(IERC20(ARC_TESTNET_USDC));
        vm.stopBroadcast();
    }
}
