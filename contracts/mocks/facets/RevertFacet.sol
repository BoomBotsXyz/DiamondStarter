// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;


/**
 * @title RevertFacet
 * @author Hysland Finance
 * @notice A facet containing functions that revert.
 *
 * Used to test how Diamond handles calls that revert.
 */
contract RevertFacet {

    /**
     * @notice Reverts with a reason.
     */
    function revertWithReason() external pure {
        revert("RevertFacet call failed");
    }

    /**
     * @notice Reverts without a reason.
     */
    function revertWithoutReason() external pure {
        revert();
    }
}
