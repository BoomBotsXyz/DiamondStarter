// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;


/**
 * @title IDiamondCut
 * @author Hysland Finance
 * @notice A set of functions that allow modifications of an `ERC2535` Diamond.
 *
 * See details of the `ERC2535` diamond standard at https://eips.ethereum.org/EIPS/eip-2535.
 *
 * The owner of the diamond may use [`diamondCut()`](#diamondcut) to add, replace, or remove functions.
 */
interface IDiamondCut {

    /// @notice Emitted when the diamond is cut.
    event DiamondCut(FacetCut[] _diamondCut, address _init, bytes _calldata);

    // Add=0, Replace=1, Remove=2
    enum FacetCutAction {Add, Replace, Remove}

    struct FacetCut {
        address facetAddress;
        FacetCutAction action;
        bytes4[] functionSelectors;
    }

    /**
     * @notice Add/replace/remove any number of functions and optionally execute a function with delegatecall.
     * @dev Add access control in implementation.
     * @param _diamondCut Contains the facet addresses and function selectors.
     * @param _init The address of the contract or facet to execute _calldata.
     * @param _calldata A function call, including function selector and arguments.
     *                  _calldata is executed with delegatecall on _init.
     */
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external;
}
