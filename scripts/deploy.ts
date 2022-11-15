import hardhat from "hardhat";
const { waffle, ethers } = hardhat;
const { deployContract, provider } = waffle;
import { config as dotenv_config } from "dotenv";
dotenv_config();
const owner = new ethers.Wallet(JSON.parse(process.env.PRIVATE_KEYS || '[]')[0], provider);

import { import_artifacts, ArtifactImports } from "./../scripts/utilities/artifact_importer";
import { Diamond, DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet } from "./../typechain";
import { expectDeployed, isDeployed } from "./utilities/expectDeployed";
import { logContractAddress } from "./utilities/logContractAddress";
import { getNetworkSettings } from "./utilities/getNetworkSettings";

import { getSelectors, FacetCutAction } from "./libraries/diamond"

let artifacts: ArtifactImports;
let networkSettings: any;
let ownerAddress: string;
let chainID: number;

let diamond: Diamond;
let diamondCutFacetProxy: DiamondCutFacet;
let diamondCutFacetLogic: DiamondCutFacet;
let diamondLoupeFacetProxy: DiamondLoupeFacet;
let diamondLoupeFacetLogic: DiamondLoupeFacet;
let ownershipFacetProxy: OwnershipFacet;
let ownershipFacetLogic: OwnershipFacet;

// fill in these values after deployment
let diamondAddress: string           = "";
let diamondCutFacetAddress: string   = "";
let diamondLoupeFacetAddress: string = "";
let ownershipFacetAddress: string    = "";

async function main() {
  artifacts = await import_artifacts();
  ownerAddress = await owner.getAddress();
  console.log(`Using ${ownerAddress} as deployer and owner`);

  chainID = (await provider.getNetwork()).chainId;
  networkSettings = getNetworkSettings(chainID);

  await deployDiamondCutFacet();
  await deployDiamond();
  await deployDiamondLoupeFacet();
  await deployOwnershipFacet();
  await getProxies();
  await cutDiamond();
  await addSupportedInterfaces();
  await logAddresses();
}

async function deployDiamondCutFacet() {
  if(await isDeployed(diamondCutFacetAddress)) {
    diamondCutFacetLogic = await ethers.getContractAt(artifacts.DiamondCutFacet.abi, diamondCutFacetAddress) as DiamondCutFacet;
  } else {
    console.log("Deploying DiamondCutFacet");
    diamondCutFacetLogic = await deployContract(owner, artifacts.DiamondCutFacet, undefined, networkSettings.overrides) as DiamondCutFacet;
    await expectDeployed(diamondCutFacetLogic.address);
    console.log(`Deployed DiamondCutFacet to ${diamondCutFacetLogic.address}`);
    await verifyContract(diamondCutFacetLogic.address, []);
  }
}

async function deployDiamond() {
  if(await isDeployed(diamondAddress)) {
    diamond = await ethers.getContractAt(artifacts.Diamond.abi, diamondAddress) as Diamond;
  } else {
    console.log("Deploying Diamond");
    diamond = await deployContract(owner, artifacts.Diamond, [ownerAddress, diamondCutFacetLogic.address], networkSettings.overrides) as Diamond;
    await expectDeployed(diamond.address);
    console.log(`Deployed Diamond to ${diamond.address}`);
    await verifyContract(diamond.address, [ownerAddress, diamondCutFacetLogic.address]);
  }
}

async function deployDiamondLoupeFacet() {
  if(await isDeployed(diamondLoupeFacetAddress)) {
    diamondLoupeFacetLogic = await ethers.getContractAt(artifacts.DiamondLoupeFacet.abi, diamondLoupeFacetAddress) as DiamondLoupeFacet;
  } else {
    console.log("Deploying DiamondLoupeFacet");
    diamondLoupeFacetLogic = await deployContract(owner, artifacts.DiamondLoupeFacet, undefined, networkSettings.overrides) as DiamondLoupeFacet;
    await expectDeployed(diamondLoupeFacetLogic.address);
    console.log(`Deployed DiamondLoupeFacet to ${diamondLoupeFacetLogic.address}`);
    await verifyContract(diamondLoupeFacetLogic.address, []);
  }
}

async function deployOwnershipFacet() {
  if(await isDeployed(ownershipFacetAddress)) {
    ownershipFacetLogic = await ethers.getContractAt(artifacts.OwnershipFacet.abi, ownershipFacetAddress) as OwnershipFacet;
  } else {
    console.log("Deploying OwnershipFacet");
    ownershipFacetLogic = await deployContract(owner, artifacts.OwnershipFacet, undefined, networkSettings.overrides) as OwnershipFacet;
    await expectDeployed(ownershipFacetLogic.address);
    console.log(`Deployed OwnershipFacet to ${ownershipFacetLogic.address}`);
    await verifyContract(ownershipFacetLogic.address, []);
  }
}

async function verifyContract(address: string, constructorArguments: any) {
  if(chainID == 31337) return; // dont try to verify local contracts
  var verifyArgs: any = {
    address: address,
    constructorArguments: constructorArguments
  };
  try {
    await hardhat.run("verify:verify", verifyArgs);
  } catch(e) { /* probably already verified */ }
}

async function getProxies() {
  console.log("Fetching proxies");
  diamondCutFacetProxy = await ethers.getContractAt(artifacts.DiamondCutFacet.abi, diamond.address) as DiamondCutFacet;
  diamondLoupeFacetProxy = await ethers.getContractAt(artifacts.DiamondLoupeFacet.abi, diamond.address) as DiamondLoupeFacet;
  ownershipFacetProxy = await ethers.getContractAt(artifacts.OwnershipFacet.abi, diamond.address) as OwnershipFacet;
  console.log("Fetched proxies");
}

async function cutDiamond() {
  console.log("Cutting diamond");
  let tx = await diamondCutFacetProxy.connect(owner).diamondCut([
    {
      facetAddress: diamondCutFacetLogic.address,
      action: FacetCutAction.Add,
      functionSelectors: ["0xf71a8a0f"] // updateSupportedInterfaces
    },{
      facetAddress: diamondLoupeFacetLogic.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(diamondLoupeFacetLogic)
    },{
      facetAddress: ownershipFacetLogic.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(ownershipFacetLogic)
    }
  ], ethers.constants.AddressZero, "0x", networkSettings.overrides);
  await tx.wait(networkSettings.confirmations);
  console.log("Diamond Cut");
}

async function addSupportedInterfaces() {
  console.log("Adding supported interfaces");
  // add supported interfaces
  let tx = await diamondCutFacetProxy.connect(owner).updateSupportedInterfaces([
    "0x01ffc9a7", // ERC165
    "0x7f5828d0", // ERC173
    "0x1f931c1c", // DiamondCut
    "0x48e2b093", // DiamondLoupe
  ], [true, true, true, true], networkSettings.overrides)
  await tx.wait(networkSettings.confirmations);
  console.log("Added supported interfaces");
}

async function logAddresses() {
  console.log("");
  console.log("| Contract Name                | Address                                      |");
  console.log("|------------------------------|----------------------------------------------|");
  logContractAddress("Diamond", diamond.address);
  logContractAddress("DiamondCutFacet", diamondCutFacetLogic.address);
  logContractAddress("DiamondLoupeFacet", diamondLoupeFacetLogic.address);
  logContractAddress("OwnershipFacet", ownershipFacetLogic.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
  });
