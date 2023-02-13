// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;


/**
 * @title IDiamond
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
interface IDiamond {

    // note that this interface is not the same as the version given in the standard
    // the true interface is scattered across multiple files
    // this is used to produce a minimal abi that can be used for the majority of mutator functions

    /**
     * @notice Receives and executes a batch of function calls on this contract.
     * @param data A list of function calls to execute.
     * @return results The results of each function call.
     */
    function multicall(bytes[] memory data) external payable returns (bytes[] memory results);

    /**
     * @notice Executes an arbitrary function call on this contract.
     * @param data The data for the function to call.
     * @return result The result of the function call.
     */
    fallback(bytes calldata data) external payable returns (bytes memory result);

    /**
     * @notice Allows this contract to receive the gas token.
     */
    receive() external payable;
}
