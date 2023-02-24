// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;


/**
 * @title Test1Facet
 * @author Hysland Finance
 * @notice A facet used to test diamonds.
 */
contract Test1Facet {

    /// @notice Emitted when any function is called.
    event Test1Event(uint256 funcNum);

    /// @notice A test function.
    function testFunc1() external payable {
        emit Test1Event(1);
    }

    /// @notice A test function.
    function testFunc2() external payable {
        emit Test1Event(2);
    }

    /// @notice A test function.
    function testFunc3() external payable {
        emit Test1Event(3);
    }
}
