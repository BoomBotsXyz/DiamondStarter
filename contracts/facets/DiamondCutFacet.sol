// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { IDiamondCutFacet } from "./../interfaces/facets/IDiamondCutFacet.sol";
import { LibDiamond } from "./../libraries/LibDiamond.sol";


/**
 * @title DiamondCutFacet
 * @author Hysland Finance
 * @notice A facet that allows modifications of an `ERC2535` Diamond.
 *
 * See details of the `ERC2535` diamond standard at https://eips.ethereum.org/EIPS/eip-2535.
 *
 * The owner of the diamond may use [`diamondCut()`](#diamondcut) to add, replace, or remove functions. The owner can add or remove interface support via [`updateSupportedInterfaces()`](#updatesupportedinterfaces).
 */
contract DiamondCutFacet is IDiamondCutFacet {

    /**
     * @notice Add/replace/remove any number of functions and optionally execute a function with delegatecall.
     * Can only be called by the contract owner.
     * @param _diamondCut Contains the facet addresses and function selectors.
     * @param _init The address of the contract or facet to execute `_calldata`.
     * @param _calldata A function call, including function selector and arguments.
     */
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external payable override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }

    /**
     * @notice Adds or removes supported interfaces.
     * Can only be called by the contract owner.
     * @param interfaceIDs The list of interfaces to update.
     * @param support The list of true to signal support, false otherwise.
     */
    function updateSupportedInterfaces(bytes4[] calldata interfaceIDs, bool[] calldata support) external payable override {
        LibDiamond.enforceIsContractOwner();
        require(interfaceIDs.length == support.length, "DiamondCutFacet: len mismatch");
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        for(uint256 i = 0; i < interfaceIDs.length; ) {
            bytes4 interfaceID = interfaceIDs[i];
            bool supported = support[i];
            ds.supportedInterfaces[interfaceID] = supported;
            emit InterfaceSupportUpdated(interfaceID, supported);
            unchecked { i++; }
        }
    }
}
