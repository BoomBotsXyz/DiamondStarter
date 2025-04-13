// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title Errors
 * @author Hysland Finance
 * @notice A library of custom error types.
 */
library Errors {
    // call errors
    /// @notice Thrown when a low level call reverts without a reason.
    error CallFailed();
    /// @notice Thrown when a low level delegatecall reverts without a reason.
    error DelegateCallFailed();
    /// @notice Thrown when using an address with no code.
    error NotAContract();
    /// @notice Thrown when the sender has an insufficient balance of the token they are sending.
    error InsufficientBalance();

    // ownership & authentication errors
    /// @notice Thrown when calling a function reserved for the contract owner.
    error NotContractOwner();
    
    // generic input errors
    /// @notice Thrown when address zero is used where it should not be.
    error AddressZero();
    /// @notice Thrown when the number of elements in an array is not what was expected.
    error LengthMismatch();
    
    // erc2535 errors
    /// @notice Thrown when installing a function that is already installed.
    error AddFunctionDuplicate();
    /// @notice Thrown when replacing a function with itself.
    error ReplaceFunctionSame();
    /// @notice Thrown when removing a function that has not currently installed.
    error RemoveFunctionDoesNotExist();
    /// @notice Thrown when removing a function that cannot be removed.
    error RemoveFunctionImmutable();
    /// @notice Thrown when calling a function that does not exist in this contract.
    error FunctionDoesNotExist();
    /// @notice Thrown when there are no functions to cut.
    error NoSelectorsToCut();
}
