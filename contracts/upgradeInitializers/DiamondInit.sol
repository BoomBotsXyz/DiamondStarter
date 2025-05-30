// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { LibDiamond } from "./../libraries/LibDiamond.sol";
import { IDiamondLoupe } from "./../interfaces/IDiamondLoupe.sol";
import { IDiamondCut } from "./../interfaces/IDiamondCut.sol";
import { IERC173 } from "./../interfaces/IERC173.sol";
import { IERC165 } from "./../interfaces/IERC165.sol";


/**
 * @title DiamondInit
 * @author Hysland Finance
 * @notice A helper contract for setting state variables on diamondCut.
 */
contract DiamondInit {

    // It is expected that this contract is customized if you want to deploy your diamond
    // with data from a deployment script. Use the init function to initialize state variables
    // of your diamond. Add parameters to the init function if you need to.

    /**
     * @notice Signals support for some interfaces.
     * Used in ERC165.
     */
    function init() external payable {
        // adding ERC165 data
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;

        // add your own state variables
        // EIP-2535 specifies that the `diamondCut` function takes two optional
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface
    }


}
