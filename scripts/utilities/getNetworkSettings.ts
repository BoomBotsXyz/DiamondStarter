// chainlist
// 1: ethereum
// 5: goerli
// 137: polygon
// 80001: polygon mumbai
// 31337: hardhat testnet

import { config as dotenv_config } from "dotenv";
dotenv_config();

// given a chainID, returns some settings to use for the network
export function getNetworkSettings(chainID: number) {
  // number of blocks to wait to ensure finality
  const CONFIRMATIONS: any = {
    [1]: 2,
    [5]: 2,
    [137]: 5,
    [80001]: 5,
    [31337]: 0
  };
  let confirmations = CONFIRMATIONS.hasOwnProperty(chainID) ? CONFIRMATIONS[chainID] : 1;

  // gas settings
  const ONE_GWEI = 1000000000;
  const OVERRIDES: any = {
    [1]: {maxFeePerGas: 40 * ONE_GWEI, maxPriorityFeePerGas: 2 * ONE_GWEI},
    [5]: {maxFeePerGas: 1 * ONE_GWEI, maxPriorityFeePerGas: 1 * ONE_GWEI},
    [137]: {maxFeePerGas: 31 * ONE_GWEI, maxPriorityFeePerGas: 31 * ONE_GWEI},
    [80001]: {maxFeePerGas: 1 * ONE_GWEI, maxPriorityFeePerGas: 1 * ONE_GWEI},
    [31337]: {},
  };
  let overrides = OVERRIDES.hasOwnProperty(chainID) ? OVERRIDES[chainID] : {};

  const ETHERSCAN_SETTINGS: any = {
    [1]: {url: "", apikey: process.env.ETHERSCAN_API_KEY},
    [5]: {url: "", apikey: process.env.ETHERSCAN_API_KEY},
    [137]: {url: "", apikey: process.env.POLYGONSCAN_API_KEY},
    [80001]: {url: "", apikey: process.env.POLYGONSCAN_API_KEY},
  }
  let etherscanSettings = ETHERSCAN_SETTINGS.hasOwnProperty(chainID) ? ETHERSCAN_SETTINGS[chainID] : undefined;

  // testnets
  const TESTNETS: any = [5, 80001, 31337];
  let isTestnet = TESTNETS.includes(chainID);

  let networkSettings = {confirmations, overrides, isTestnet, etherscanSettings};
  return networkSettings;
}
