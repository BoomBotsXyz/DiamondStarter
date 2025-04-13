// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { IDiamond } from "./interfaces/IDiamond.sol";
import { LibDiamond } from "./libraries/LibDiamond.sol";
import { IDiamondCut } from "./interfaces/IDiamondCut.sol";
import { Calls } from "./libraries/Calls.sol";
import { Errors } from "./libraries/Errors.sol";


/**
 * @title Diamond
 * @author Hysland Finance
 * @notice An implementation of an `ERC2535` Diamond.
 *
 * See details of the `ERC2535` diamond standard at https://eips.ethereum.org/EIPS/eip-2535.
 *
 * On top of the vanilla implementation, this version supports [`multicall()`](#multicall), allowing users to batch multiple calls in one transaction.
 *
 * Security warning: `delegatecall` in a loop. Facets should not use `msg.value`.
 *
 * EVM note: if you pass any gas token to the diamond, the diamond cannot delegatecall a nonpayable function. All non-view functions in facets should be marked as payable. Even if the function does not require or expect the gas token, it may be multicalled with a function that does.
 */
contract Diamond is IDiamond {

    /// @notice Emitted when the diamond is cut.
    event DiamondCut(IDiamondCut.FacetCut[] _diamondCut, address _init, bytes _calldata);

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
     * @notice Constructs the Diamond contract.
     * @param contractOwner The owner of the new contract.
     * @param diamondCutFacet The address of a [DiamondCutFacet](./facets/DiamondCutFacet).
     */
    constructor(address contractOwner, address diamondCutFacet) payable {
        // this code could be made a lot more readable by using libraries
        // inlining the library functions and optimizing for zero index cases saves gas
        // checks
        if(contractOwner == address(0)) revert Errors.AddressZero();
        Calls.verifyHasCode(diamondCutFacet);
        // get storage
        bytes32 DIAMOND_STORAGE_POSITION = keccak256("libdiamond.diamond.storage");
        DiamondStorage storage ds;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            ds.slot := DIAMOND_STORAGE_POSITION
        }
        // set owner
        ds.contractOwner = contractOwner;
        // add multicall as immutible facet
        ds.facetAddresses.push(address(this));
        bytes4 multicallSelector = IDiamond.multicall.selector;
        bytes4[] memory multicallSelectors = new bytes4[](1);
        multicallSelectors[0] = multicallSelector;
        ds.facetFunctionSelectors[address(this)].functionSelectors.push(multicallSelector);
        ds.selectorToFacetAndPosition[multicallSelector].facetAddress = address(this);
        // add diamond cut facet
        ds.facetFunctionSelectors[diamondCutFacet].facetAddressPosition = 1;
        ds.facetAddresses.push(diamondCutFacet);
        bytes4 diamondCutSelector = IDiamondCut.diamondCut.selector;
        bytes4[] memory diamondCutSelectors = new bytes4[](1);
        diamondCutSelectors[0] = diamondCutSelector;
        ds.facetFunctionSelectors[diamondCutFacet].functionSelectors.push(diamondCutSelector);
        ds.selectorToFacetAndPosition[diamondCutSelector].facetAddress = diamondCutFacet;
        // emit event
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](2);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(this),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: multicallSelectors
        });
        cut[1] = IDiamondCut.FacetCut({
            facetAddress: diamondCutFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: diamondCutSelectors
        });
        emit DiamondCut(cut, address(0), "");
    }

    /***************************************
    EXTERNAL FUNCTIONS
    ***************************************/

    /**
     * @notice Receives and executes a batch of function calls on this contract.
     * @param data A list of function calls to execute.
     * @return results The results of each function call.
     */
    function multicall(bytes[] memory data) external payable override returns (bytes[] memory results) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; ) {
            bytes memory nextcall = data[i];
            // get function selector
            bytes4 msgsig;
            // solhint-disable-next-line no-inline-assembly
            assembly {
                msgsig := mload(add(nextcall, 32))
            }
            // get facet from function selector
            address facet = ds.selectorToFacetAndPosition[msgsig].facetAddress;
            if(facet == address(0)) revert Errors.FunctionDoesNotExist();
            // execute external function from facet using delegatecall and return any value
            results[i] = Calls.functionDelegateCall(facet, nextcall);
            unchecked { i++; }
        }
        return results;
    }

    /**
     * @notice Executes an arbitrary function call on this contract.
     * @param data The data for the function to call.
     * @return result The result of the function call.
     */
    // solhint-disable-next-line no-complex-fallback
    fallback(bytes calldata data) external payable override returns (bytes memory result) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        // get facet from function selector
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        if(facet == address(0)) revert Errors.FunctionDoesNotExist();
        // execute external function from facet using delegatecall and return any value
        return Calls.functionDelegateCall(facet, data);
    }

    /**
     * @notice Allows this contract to receive the gas token.
     */
    // solhint-disable-next-line no-empty-blocks
    receive() external payable override {}
}
