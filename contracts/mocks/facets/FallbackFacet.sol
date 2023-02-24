// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;


/**
 * @title FallbackFacet
 * @author Hysland Finance
 * @notice A facet used to test diamonds.
 */
contract FallbackFacet {

    /// @notice Calls to this facet will never fail.
    // solhint-disable-next-line no-empty-blocks
    fallback() external payable {}
}
