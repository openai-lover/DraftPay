// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "../../src/interfaces/IERC20.sol";

contract MockUSDC is IERC20 {
    string public constant name = "Test USDC";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;

    mapping(address account => uint256) public override balanceOf;
    mapping(address owner => mapping(address spender => uint256)) public override allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external virtual override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount)
        external
        virtual
        override
        returns (bool)
    {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }
}

    contract ReentrantUSDC is MockUSDC {
        address public target;
        bytes public attackData;
        bool public attackEnabled;
        bool public attackAttempted;
        bool public attackSucceeded;

        function configureAttack(address target_, bytes calldata attackData_) external {
            target = target_;
            attackData = attackData_;
            attackEnabled = true;
        }

        function transfer(address to, uint256 amount) external override returns (bool) {
            if (attackEnabled) {
                attackEnabled = false;
                attackAttempted = true;
                (attackSucceeded,) = target.call(attackData);
            }
            _transfer(msg.sender, to, amount);
            return true;
        }
    }

    contract FeeOnTransferUSDC is MockUSDC {
        function transferFrom(address from, address to, uint256 amount)
            external
            override
            returns (bool)
        {
            uint256 allowed = allowance[from][msg.sender];
            if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
            uint256 received = amount == 0 ? 0 : amount - 1;
            _transfer(from, to, received);
            if (amount != 0) _transfer(from, address(0xFEE), 1);
            return true;
        }
    }
