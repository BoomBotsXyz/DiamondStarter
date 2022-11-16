// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;


/**
 * @title IERC165Updater
 * @author Multiple
 * @notice An extension of ERC165 Standard Interface Detection that allows contracts to add and remove supported interfaces.
 *
 * Users can check for interface support via `supportsInterface(bytes4 interfaceID)` as defined in ERC165. Users can add or remove interface support via [`updateSupportedInterfaces()`](#updatesupportedinterfaces).
 */
interface IERC165Updater {

    /// @notice Emitted when support for an interface is updated.
    event InterfaceSupportUpdated(bytes4 indexed interfaceID, bool supported);

    /**
     * @notice Adds or removes supported interfaces.
     * @dev Add access control in implementation.
     * @param interfaceIDs The list of interfaces to update.
     * @param support The list of true to signal support, false otherwise.
     */
    function updateSupportedInterfaces(bytes4[] calldata interfaceIDs, bool[] calldata support) external;
}
