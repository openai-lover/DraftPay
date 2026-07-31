// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "../interfaces/IERC20.sol";

library SafeTransferLib {
    error TokenTransferFailed();
    error TokenTransferFromFailed();

    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        (bool success, bytes memory data) =
            address(token).call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFailed();
        }
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) =
            address(token).call(abi.encodeCall(IERC20.transferFrom, (from, to, amount)));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFromFailed();
        }
    }
}
