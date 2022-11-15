// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { IDiamond } from "./interfaces/IDiamond.sol";
import { LibDiamond } from "./libraries/LibDiamond.sol";
import { IDiamondCut } from "./interfaces/IDiamondCut.sol";


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
 */
contract Diamond is IDiamond {

    /**
     * @notice Constructs the Diamond contract.
     * @param contractOwner The owner of the new contract.
     * @param diamondCutFacet The address of a [DiamondCutFacet](./facets/DiamondCutFacet).
     */
    constructor(address contractOwner, address diamondCutFacet) payable {
        LibDiamond.setContractOwner(contractOwner);
        // add the diamondCut external function from the diamondCutFacet
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        bytes4[] memory functionSelectors = new bytes4[](1);
        functionSelectors[0] = IDiamondCut.diamondCut.selector;
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: diamondCutFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: functionSelectors
        });
        LibDiamond.diamondCut(cut, address(0), "");
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
        for (uint256 i = 0; i < data.length; i++) {
            bytes memory nextcall = data[i];
            // get function selector
            bytes4 msgsig;
            // solhint-disable-next-line no-inline-assembly
            assembly {
                msgsig := mload(add(nextcall, 32))
            }
            // get facet from function selector
            address facet = ds.selectorToFacetAndPosition[msgsig].facetAddress;
            require(facet != address(0), "Diamond: function dne");
            // execute external function from facet using delegatecall and return any value
            results[i] = functionDelegateCall(facet, nextcall);
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
        require(facet != address(0), "Diamond: function dne");
        // execute external function from facet using delegatecall and return any value
        return functionDelegateCall(facet, data);
    }

    /**
     * @notice Allows this contract to receive the gas token.
     */
    // solhint-disable-next-line no-empty-blocks
    receive() external payable override {}

    /***************************************
    HELPER FUNCTIONS
    ***************************************/

    /**
     * @notice Safely performs a Solidity function call using a low level `delegatecall`.
     * @dev If `target` reverts with a revert reason, it is bubbled up by this function.
     * @param target The address of the contract to `delegatecall`.
     * @param data The data to pass to the target.
     * @return result The result of the function call.
     */
    function functionDelegateCall(
        address target,
        bytes memory data
    ) internal returns (bytes memory result) {
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.delegatecall(data);
        if(success) {
            return returndata;
        } else {
            // look for revert reason and bubble it up if present
            if(returndata.length > 0) {
                // the easiest way to bubble the revert reason is using memory via assembly
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert("Diamond: failed delegatecall");
            }
        }
    }
}
