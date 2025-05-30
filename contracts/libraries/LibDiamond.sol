// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { IDiamondCut } from "./../interfaces/IDiamondCut.sol";
import { Calls } from "./Calls.sol";
import { Errors } from "./Errors.sol";


/**
 * @title LibDiamond
 * @author Hysland Finance
 * @notice A library for the core diamond functionality.
 */
library LibDiamond {

    /***************************************
    STORAGE FUNCTIONS
    ***************************************/

    bytes32 constant internal DIAMOND_STORAGE_POSITION = keccak256("libdiamond.diamond.storage");

    struct FacetAddressAndPosition {
        address facetAddress;
        uint96 functionSelectorPosition; // position in facetFunctionSelectors.functionSelectors array
    }

    struct FacetFunctionSelectors {
        bytes4[] functionSelectors;
        uint256 facetAddressPosition; // position of facetAddress in facetAddresses array
    }

    struct DiamondStorage {
        // maps function selector to the facet address and
        // the position of the selector in the facetFunctionSelectors.selectors array
        mapping(bytes4 => FacetAddressAndPosition) selectorToFacetAndPosition;
        // maps facet addresses to function selectors
        mapping(address => FacetFunctionSelectors) facetFunctionSelectors;
        // facet addresses
        address[] facetAddresses;
        // Used to query if a contract implements an interface.
        // Used to implement ERC-165.
        mapping(bytes4 => bool) supportedInterfaces;
        // owner of the contract
        address contractOwner;
    }

    /**
     * @notice Returns the `DiamondStorage` struct.
     * @return ds The `DiamondStorage` struct.
     */
    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            ds.slot := position
        }
    }

    /***************************************
    OWNERSHIP FUNCTIONS
    ***************************************/

    /// @dev Emitted when ownership of a contract changes.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @notice Get the address of the owner.
     * @return contractOwner_ The address of the owner.
     */
    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = diamondStorage().contractOwner;
    }

    /**
     * @notice Reverts if `msg.sender` is not the contract owner.
     */
    function enforceIsContractOwner() internal view {
        if(msg.sender != diamondStorage().contractOwner) revert Errors.NotContractOwner();
    }

    /**
     * @notice Set the address of the new owner of the contract.
     * @dev Set _newOwner to address(0) to renounce any ownership.
     * @param _newOwner The address of the new owner of the contract.
     */
    function setContractOwner(address _newOwner) internal {
        DiamondStorage storage ds = diamondStorage();
        address previousOwner = ds.contractOwner;
        ds.contractOwner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    /***************************************
    DIAMOND CUT FUNCTIONS
    ***************************************/

    /// @notice Emitted when the diamond is cut.
    event DiamondCut(IDiamondCut.FacetCut[] _diamondCut, address _init, bytes _calldata);

    /**
     * @notice Add/replace/remove any number of functions and optionally execute a function with delegatecall.
     * @param _diamondCut Contains the facet addresses and function selectors.
     * @param _init The address of the contract or facet to execute `_calldata`.
     * @param _calldata A function call, including function selector and arguments.
     */
    function diamondCut(
        IDiamondCut.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) internal {
        for (uint256 facetIndex = 0; facetIndex < _diamondCut.length; ) {
            // safe to assume valid FacetCutAction
            IDiamondCut.FacetCutAction action = _diamondCut[facetIndex].action;
            if (action == IDiamondCut.FacetCutAction.Add) {
                addFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Replace) {
                replaceFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else {
                removeFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            }
            unchecked { facetIndex++; }
        }
        emit DiamondCut(_diamondCut, _init, _calldata);
        initializeDiamondCut(_init, _calldata);
    }

    /**
     * @notice Adds one or more functions from the facet to this diamond.
     * @param _facetAddress The address of the facet with the logic.
     * @param _functionSelectors The function selectors to add to this diamond.
     */
    function addFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        if(_functionSelectors.length == 0) revert Errors.NoSelectorsToCut();
        if(_facetAddress == address(0)) revert Errors.AddressZero();
        DiamondStorage storage ds = diamondStorage();
        uint256 selectorPosition256 = ds.facetFunctionSelectors[_facetAddress].functionSelectors.length;
        uint96 selectorPosition96 = uint96(selectorPosition256);
        // add new facet address if it does not exist
        if (selectorPosition256 == 0) {
            addFacet(ds, _facetAddress);
        }
        for (uint256 selectorIndex = 0; selectorIndex < _functionSelectors.length; ) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            if(oldFacetAddress != address(0)) revert Errors.AddFunctionDuplicate();
            addFunction(ds, selector, selectorPosition96, _facetAddress);
            unchecked { selectorPosition96++; }
            unchecked { selectorIndex++; }
        }
    }

    /**
     * @notice Replaces one or more functions from the facet to this diamond.
     * @param _facetAddress The address of the facet with the logic.
     * @param _functionSelectors The function selectors to replace on this diamond.
     */
    function replaceFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        if(_functionSelectors.length == 0) revert Errors.NoSelectorsToCut();
        if(_facetAddress == address(0)) revert Errors.AddressZero();
        DiamondStorage storage ds = diamondStorage();
        uint256 selectorPosition256 = ds.facetFunctionSelectors[_facetAddress].functionSelectors.length;
        uint96 selectorPosition96 = uint96(selectorPosition256);
        // add new facet address if it does not exist
        if (selectorPosition256 == 0) {
            addFacet(ds, _facetAddress);
        }
        for (uint256 selectorIndex = 0; selectorIndex < _functionSelectors.length; ) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            if(oldFacetAddress == _facetAddress) revert Errors.ReplaceFunctionSame();
            removeFunction(ds, oldFacetAddress, selector);
            addFunction(ds, selector, selectorPosition96, _facetAddress);
            unchecked { selectorPosition96++; }
            unchecked { selectorIndex++; }
        }
    }

    /**
     * @notice Removes one or more functions from the facet from this diamond.
     * @param _facetAddress The address of the facet with the logic.
     * @param _functionSelectors The function selectors to remove from this diamond.
     */
    function removeFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        if(_functionSelectors.length == 0) revert Errors.NoSelectorsToCut();
        if(_facetAddress != address(0)) revert Errors.RemoveFunctionDoesNotExist();
        DiamondStorage storage ds = diamondStorage();
        // if function does not exist then do nothing and return
        for (uint256 selectorIndex = 0; selectorIndex < _functionSelectors.length; ) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            removeFunction(ds, oldFacetAddress, selector);
            unchecked { selectorIndex++; }
        }
    }

    /**
     * @notice Adds a new facet to the list of known facets.
     * @param ds The DiamondStorage struct.
     * @param _facetAddress The address of the facet to add.
     */
    function addFacet(DiamondStorage storage ds, address _facetAddress) internal {
        Calls.verifyHasCode(_facetAddress);
        ds.facetFunctionSelectors[_facetAddress].facetAddressPosition = ds.facetAddresses.length;
        ds.facetAddresses.push(_facetAddress);
    }

    /**
     * @notice Adds a function from the facet to this diamond.
     * @param ds The DiamondStorage struct.
     * @param _selector The function selector to add to this diamond.
     * @param _selectorPosition The position in facetFunctionSelectors.functionSelectors array.
     * @param _facetAddress The address of the facet with the logic.
     */
    function addFunction(DiamondStorage storage ds, bytes4 _selector, uint96 _selectorPosition, address _facetAddress) internal {
        ds.selectorToFacetAndPosition[_selector].functionSelectorPosition = _selectorPosition;
        ds.facetFunctionSelectors[_facetAddress].functionSelectors.push(_selector);
        ds.selectorToFacetAndPosition[_selector].facetAddress = _facetAddress;
    }

    /**
     * @notice Removes a function from the facet from this diamond.
     * @param ds The DiamondStorage struct.
     * @param _facetAddress The address of the facet with the logic.
     * @param _selector The function selector to add to this diamond.
     */
    function removeFunction(DiamondStorage storage ds, address _facetAddress, bytes4 _selector) internal {
        if(_facetAddress == address(0)) revert Errors.RemoveFunctionDoesNotExist();
        // an immutable function is a function defined directly in a diamond
        if(_facetAddress == address(this)) revert Errors.RemoveFunctionImmutable();
        // replace selector with last selector, then delete last selector
        uint256 selectorPosition = ds.selectorToFacetAndPosition[_selector].functionSelectorPosition;
        uint256 lastSelectorPosition = ds.facetFunctionSelectors[_facetAddress].functionSelectors.length - 1;
        // if not the same then replace _selector with lastSelector
        if (selectorPosition != lastSelectorPosition) {
            bytes4 lastSelector = ds.facetFunctionSelectors[_facetAddress].functionSelectors[lastSelectorPosition];
            ds.facetFunctionSelectors[_facetAddress].functionSelectors[selectorPosition] = lastSelector;
            ds.selectorToFacetAndPosition[lastSelector].functionSelectorPosition = uint96(selectorPosition);
        }
        // delete the last selector
        ds.facetFunctionSelectors[_facetAddress].functionSelectors.pop();
        delete ds.selectorToFacetAndPosition[_selector];
        // if no more selectors for facet address then delete the facet address
        if (lastSelectorPosition == 0) {
            // replace facet address with last facet address and delete last facet address
            uint256 lastFacetAddressPosition = ds.facetAddresses.length - 1;
            uint256 facetAddressPosition = ds.facetFunctionSelectors[_facetAddress].facetAddressPosition;
            if (facetAddressPosition != lastFacetAddressPosition) {
                address lastFacetAddress = ds.facetAddresses[lastFacetAddressPosition];
                ds.facetAddresses[facetAddressPosition] = lastFacetAddress;
                ds.facetFunctionSelectors[lastFacetAddress].facetAddressPosition = facetAddressPosition;
            }
            ds.facetAddresses.pop();
            delete ds.facetFunctionSelectors[_facetAddress].facetAddressPosition;
        }
    }

    /***************************************
    HELPER FUNCTIONS
    ***************************************/

    /**
     * @notice Optionally delegatecalls a contract on diamond cut.
     * @param _init The address of the contract to delegatecall to or zero to skip.
     * @param _calldata The data to send to _init.
     */
    function initializeDiamondCut(address _init, bytes memory _calldata) internal {
        if (_init == address(0)) {
            return;
        }
        Calls.verifyHasCode(_init);
        Calls.functionDelegateCall(_init, _calldata);
    }
}
