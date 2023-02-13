// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;


/**
 * @title Test2Facet
 * @author Hysland Finance
 * @notice A facet used to test diamonds.
 */
contract Test2Facet {

    /// @notice Emitted when any function is called.
    event Test2Event(uint256 funcNum);

    /// @notice A test function.
    function testFunc1() external payable {
        emit Test2Event(1);
    }

    /// @notice A test function.
    function testFunc2() external payable {
        emit Test2Event(2);
    }

    /// @notice A test function.
    function testFunc3() external payable {
        emit Test2Event(3);
    }
}
