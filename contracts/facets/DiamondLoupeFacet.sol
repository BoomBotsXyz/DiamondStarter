// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { LibDiamond } from  "./../libraries/LibDiamond.sol";
import { IDiamondLoupe } from "./../interfaces/IDiamondLoupe.sol";
import { IERC165 } from "./../interfaces/IERC165.sol";


/**
 * @title DiamondLoupeFacet
 * @author Hysland Finance
 * @notice A facet that allows inspection of an `ERC2535` Diamond.
 *
 * See details of the `ERC2535` diamond standard at https://eips.ethereum.org/EIPS/eip-2535.
 *
 * Users can view the functions and facets of a diamond via [`facets()`](#facets), [`facetFunctionSelectors()`](#facetfunctionselectors), [`facetAddresses()`](#facetaddresses), and [`facetAddress()`](#facetaddress).
 */
contract DiamondLoupeFacet is IDiamondLoupe, IERC165 {

    // These functions are expected to be called frequently by tools.
    //
    // struct Facet {
    //     address facetAddress;
    //     bytes4[] functionSelectors;
    // }

    /**
     * @notice Gets all facets and their selectors.
     * @return facets_ A list of all facets on the diamond.
     */
    function facets() external view override returns (Facet[] memory facets_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 numFacets = ds.facetAddresses.length;
        facets_ = new Facet[](numFacets);
        for (uint256 i = 0; i < numFacets; i++) {
            address facetAddress_ = ds.facetAddresses[i];
            facets_[i].facetAddress = facetAddress_;
            facets_[i].functionSelectors = ds.facetFunctionSelectors[facetAddress_].functionSelectors;
        }
    }

    /**
     * @notice Gets all the function selectors provided by a facet.
     * @param _facet The facet address.
     * @return facetFunctionSelectors_ The function selectors provided by the facet.
     */
    function facetFunctionSelectors(address _facet) external view override returns (bytes4[] memory facetFunctionSelectors_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetFunctionSelectors_ = ds.facetFunctionSelectors[_facet].functionSelectors;
    }

    /**
     * @notice Get all the facet addresses used by a diamond.
     * @return facetAddresses_ The list of all facets on the diamond.
     */
    function facetAddresses() external view override returns (address[] memory facetAddresses_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddresses_ = ds.facetAddresses;
    }

    /**
     * @notice Gets the facet that supports the given selector.
     * @dev If facet is not found return address(0).
     * @param _functionSelector The function selector.
     * @return facetAddress_ The facet address.
     */
    function facetAddress(bytes4 _functionSelector) external view override returns (address facetAddress_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddress_ = ds.selectorToFacetAndPosition[_functionSelector].facetAddress;
    }

    /**
     * @notice Query if a contract implements an interface.
     * @param interfaceID The interface identifier, as specified in ERC-165.
     * @dev Interface identification is specified in ERC-165. This function uses less than 30,000 gas.
     * @return supported `true` if the contract implements `interfaceID` and `interfaceID` is not `0xffffffff`, `false` otherwise.
     */
    function supportsInterface(bytes4 interfaceID) external view override returns (bool supported) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.supportedInterfaces[interfaceID];
    }
}
