// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;


/**
 * @title IERC165
 * @author Multiple
 * @notice Standard Interface Detection.
 */
interface IERC165 {

    /**
     * @notice Query if a contract implements an interface.
     * @param interfaceID The interface identifier, as specified in ERC-165.
     * @dev Interface identification is specified in ERC-165. This function uses less than 30,000 gas.
     * @return supported `true` if the contract implements `interfaceID` and `interfaceID` is not `0xffffffff`, `false` otherwise.
     */
    function supportsInterface(bytes4 interfaceID) external view returns (bool supported);
}
