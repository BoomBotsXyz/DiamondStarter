// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;


/**
 * @title IDiamondLoupe
 * @author Hysland Finance
 * @notice A set of functions that allow inspection of an `ERC2535` Diamond.
 *
 * See details of the `ERC2535` diamond standard at https://eips.ethereum.org/EIPS/eip-2535.
 *
 * Users can view the functions and facets of a diamond via [`facets()`](#facets), [`facetFunctionSelectors()`](#facetfunctionselectors), [`facetAddresses()`](#facetaddresses), and [`facetAddress()`](#facetaddress).
 */
interface IDiamondLoupe {

    // These functions are expected to be called frequently by tools.

    struct Facet {
        address facetAddress;
        bytes4[] functionSelectors;
    }

    /**
     * @notice Gets all facets and their selectors.
     * @return facets_ A list of all facets on the diamond.
     */
    function facets() external view returns (Facet[] memory facets_);

    /**
     * @notice Gets all the function selectors provided by a facet.
     * @param _facet The facet address.
     * @return facetFunctionSelectors_ The function selectors provided by the facet.
     */
    function facetFunctionSelectors(address _facet) external view returns (bytes4[] memory facetFunctionSelectors_);

    /**
     * @notice Get all the facet addresses used by a diamond.
     * @return facetAddresses_ The list of all facets on the diamond.
     */
    function facetAddresses() external view returns (address[] memory facetAddresses_);

    /**
     * @notice Gets the facet that supports the given selector.
     * @dev If facet is not found return address(0).
     * @param _functionSelector The function selector.
     * @return facetAddress_ The facet address.
     */
    function facetAddress(bytes4 _functionSelector) external view returns (address facetAddress_);
}
