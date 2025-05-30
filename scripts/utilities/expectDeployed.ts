import chai from "chai";
import hre from "hardhat";
const { ethers } = hre;
const { provider } = ethers;
const { expect } = chai;

// reverts if no code was deployed at the given address and block
// or if the address is invalid
export async function expectDeployed(address: string, blockTag="latest") {
  expect(await isDeployed(address, blockTag), `no contract deployed at ${address}`).to.be.true;
}

// returns true if code is deployed at the given address and block
// returns false if the address is invalid or no code was deployed yet
export async function isDeployed(address: string, blockTag:any="latest") {
  try {
    // safety checks
    if(address === undefined || address === null) return false;
    if(address.length !== 42) return false;
    if(address == ethers.constants.AddressZero) return false;
    if((await provider.getCode(address, blockTag)).length <= 2) return false;
    return true;
  } catch (e: any) {
    if(e.toString().includes("account aurora does not exist while viewing")) return false; // handle aurora idiosyncracies
    else throw e;
  }
}
