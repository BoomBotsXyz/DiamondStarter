// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IDiamondLoupe } from "./../IDiamondLoupe.sol";
import { IERC165 } from "./../IERC165.sol";


/**
 * @title IDiamondLoupeFacet
 * @author Hysland Finance
 * @notice A set of functions that allow inspection of an `ERC2535` Diamond.
 *
 * See details of the `ERC2535` diamond standard at https://eips.ethereum.org/EIPS/eip-2535.
 *
 * Users can view the functions and facets of a diamond via [`facets()`](#facets), [`facetFunctionSelectors()`](#facetfunctionselectors), [`facetAddresses()`](#facetaddresses), and [`facetAddress()`](#facetaddress).
 */
// solhint-disable-next-line no-empty-blocks
interface IDiamondLoupeFacet is IDiamondLoupe, IERC165 {}
