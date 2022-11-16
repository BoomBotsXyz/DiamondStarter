// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { LibDiamond } from "./../libraries/LibDiamond.sol";
import { IERC173 } from "./../interfaces/IERC173.sol";


/**
 * @title OwnershipFacet
 * @author Hysland Finance
 * @notice A facet that allows `ERC173` ownership of an `ERC2535` Diamond.
 *
 * Ownership is a simple form of access control.
 *
 * The current contract owner can be viewed via [`owner()`](#owner). The owner can transfer ownership via [`transferOwnership()`](#transferownership).
 */
contract OwnershipFacet is IERC173 {

    /**
     * @notice Get the address of the owner.
     * @return owner_ The address of the owner.
     */
    function owner() external view override returns (address owner_) {
        owner_ = LibDiamond.contractOwner();
    }

    /**
     * @notice Set the address of the new owner of the contract.
     * @dev Set `_newOwner` to `address(0)` to renounce any ownership.
     * @param _newOwner The address of the new owner of the contract.
     */
    function transferOwnership(address _newOwner) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.setContractOwner(_newOwner);
    }
}
