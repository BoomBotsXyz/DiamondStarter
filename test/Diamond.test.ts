/* global describe it before ethers */

import chai from "chai";
import hre from "hardhat";
const { ethers } = hre;
const { provider } = ethers;
const { expect, assert } = chai;;
import { BigNumber as BN, BigNumberish } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Diamond, DiamondInit, DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, Test1Facet, Test2Facet, RevertFacet, FallbackFacet } from "./../typechain";
import { expectDeployed } from "./../scripts/utilities/expectDeployed";

import { getSelectors, FacetCutAction } from "./../scripts/libraries/diamond"
import { getNetworkSettings } from "../scripts/utilities/getNetworkSettings";
import { deployContract } from "../scripts/utils/deployContract";

const { AddressZero } = ethers.constants;

describe("Diamond", function () {
  let deployer: SignerWithAddress;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let snapshot: BN;

  let diamond: Diamond;
  let diamondCutFacetProxy: DiamondCutFacet;
  let diamondCutFacetLogic: DiamondCutFacet;
  let diamondLoupeFacetProxy: DiamondLoupeFacet;
  let diamondLoupeFacetLogic: DiamondLoupeFacet;
  let ownershipFacetProxy: OwnershipFacet;
  let ownershipFacetLogic: OwnershipFacet;
  let test1FacetProxy: Test1Facet;
  let test1FacetLogic: Test1Facet;
  let test2FacetProxy: Test2Facet;
  let test2FacetLogic: Test2Facet;
  let revertFacetProxy: RevertFacet;
  let revertFacetLogic: RevertFacet;
  let diamondInit: DiamondInit;

  const multicallSighash                 = "0xac9650d8";
  const diamondCutSighash                = "0x1f931c1c";
  const updateSupportedInterfacesSighash = "0xf71a8a0f";
  const dummy1Sighash                    = "0x11111111";
  const dummy2Sighash                    = "0x22222222";
  const testFunc1Sighash                 = "0x561f5f89";
  const testFunc2Sighash                 = "0x08752360";
  const testFunc3Sighash                 = "0x9a5fb5a8";

  before(async function () {
    [deployer, owner, user] = await ethers.getSigners();
    let chainID = (await provider.getNetwork()).chainId;
    let networkSettings = getNetworkSettings(chainID);
    if(!networkSettings.isTestnet) throw new Error("Do not run tests on production networks");
    snapshot = await provider.send("evm_snapshot", []);
    await deployer.sendTransaction({to:deployer.address}); // for some reason this helps solidity-coverage
  });

  after(async function () {
    await provider.send("evm_revert", [snapshot]);
  });

  describe("deployment", function () {
    it("cannot deploy with zero address owner", async function () {
      //await expect(deployContract(deployer, "Diamond", [AddressZero, user.address])).to.be.revertedWith("Diamond: zero address owner");
      await expect(deployContract(deployer, "Diamond", [AddressZero, user.address])).to.be.reverted//WithCustomError(diamond, "AddressZero");
    });
    it("cannot deploy with no code diamondCutFacet", async function () {
      await expect(deployContract(deployer, "Diamond", [owner.address, AddressZero])).to.be.reverted;//WithCustomError(diamond, "NoCodeAdd")
      await expect(deployContract(deployer, "Diamond", [owner.address, user.address])).to.be.reverted;//WithCustomError(diamond, "NoCodeAdd")
    });
    it("should deploy successfully", async function () {
      diamondCutFacetLogic = await deployContract(deployer, "DiamondCutFacet") as DiamondCutFacet;
      await expectDeployed(diamondCutFacetLogic.address);
      diamond = await deployContract(deployer, "Diamond", [owner.address, diamondCutFacetLogic.address]) as Diamond;
      await expectDeployed(diamond.address);
      diamondCutFacetProxy = await ethers.getContractAt("DiamondCutFacet", diamond.address) as DiamondCutFacet;
    });
  });

  describe("diamondCut add", function () {
    before(async function () {
      diamondLoupeFacetLogic = await deployContract(deployer, "DiamondLoupeFacet") as DiamondLoupeFacet;
      await expectDeployed(diamondLoupeFacetLogic.address);
      diamondInit = await deployContract(deployer, "DiamondInit") as DiamondInit;
      await expectDeployed(diamondInit.address);
      revertFacetLogic = await deployContract(deployer, "RevertFacet") as RevertFacet;
      await expectDeployed(revertFacetLogic.address);
    });
    it("cannot be called by non owner", async function () {
      await expect(diamondCutFacetProxy.connect(user).diamondCut([{
        facetAddress: diamondLoupeFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "NotContractOwner");
    });
    it("cannot use invalid FacetCutAction", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondLoupeFacetLogic.address,
        action: 3,
        functionSelectors: [dummy1Sighash]
      }], AddressZero, "0x")).to.be.revertedWith("Diamond: failed delegatecall");
    });
    it("cannot add zero functions", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondLoupeFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: []
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "NoSelectorsToCut");
    });
    it("cannot add zero address facet", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "AddressZero");
    });
    it("cannot add function that already exists", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [diamondCutSighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "AddFunctionDuplicate");
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [multicallSighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "AddFunctionDuplicate");
    });
    it("cannot init to non contract", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], user.address, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "NotAContract");
    });
    it("cannot add if init fails", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithReason()"))).to.be.revertedWith("RevertFacet call failed");
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithoutReason()"))).to.be.revertedWith("LibDiamond: init func failed");
    });
    it("can add functions from a known facet", async function () {
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [updateSupportedInterfacesSighash]
      }], AddressZero, "0x");
      await expect(tx).to.emit(diamondCutFacetProxy, "DiamondCut");
    });
    it("can add functions from a new facet", async function () {
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondLoupeFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(diamondLoupeFacetLogic)
      }], diamondInit.address, diamondInit.interface.encodeFunctionData("init()"), {value: 1}); // and delegatecall
      await expect(tx).to.emit(diamondCutFacetProxy, "DiamondCut");
      diamondLoupeFacetProxy = await ethers.getContractAt("DiamondLoupeFacet", diamond.address) as DiamondLoupeFacet;
    });
  });

  describe("diamondLoupe", function () {
    it("should have three facets", async function () {
      let facets = await diamondLoupeFacetProxy.facetAddresses();
      expect(facets.length).eq(3);
      expect(facets[0]).eq(diamond.address);
      expect(facets[1]).eq(diamondCutFacetLogic.address);
      expect(facets[2]).eq(diamondLoupeFacetLogic.address);
      facets = await diamondLoupeFacetLogic.facetAddresses();
      expect(facets.length).eq(0);
    });
    it("facets should have the right function selectors -- call to facetFunctionSelectors function", async function () {
      let facets = await diamondLoupeFacetProxy.facetAddresses();
      let selectors01 = [multicallSighash];
      let selectors02 = getSelectors(diamond);
      let selectors03 = await diamondLoupeFacetProxy.facetFunctionSelectors(facets[0]);
      assert.sameMembers(selectors01, selectors02);
      assert.sameMembers(selectors01, selectors03);

      let selectors11 = [diamondCutSighash, updateSupportedInterfacesSighash];
      let selectors12 = getSelectors(diamondCutFacetLogic);
      let selectors13 = await diamondLoupeFacetProxy.facetFunctionSelectors(facets[1]);
      assert.sameMembers(selectors11, selectors12);
      assert.sameMembers(selectors11, selectors13);

      let selectors22 = getSelectors(diamondLoupeFacetLogic);
      let selectors23 = await diamondLoupeFacetProxy.facetFunctionSelectors(facets[2]);
      assert.sameMembers(selectors22, selectors23);
    })
    it("selectors should be associated to facets correctly -- multiple calls to facetAddress function", async function () {
      let facets = await diamondLoupeFacetProxy.facetAddresses();
      assert.equal(facets[0], await diamondLoupeFacetProxy.facetAddress(multicallSighash))
      assert.equal(facets[1], await diamondLoupeFacetProxy.facetAddress(diamondCutSighash))
      assert.equal(facets[2], await diamondLoupeFacetProxy.facetAddress("0xcdffacc6"))
      assert.equal(facets[2], await diamondLoupeFacetProxy.facetAddress("0x01ffc9a7"))
    })
    it("supportsInterface", async function () {
      expect(await diamondLoupeFacetProxy.supportsInterface("0x01ffc9a7")).eq(true); // ERC165
      expect(await diamondLoupeFacetProxy.supportsInterface("0x7f5828d0")).eq(true); // ERC173
      expect(await diamondLoupeFacetProxy.supportsInterface(diamondCutSighash)).eq(true); // DiamondCut
      expect(await diamondLoupeFacetProxy.supportsInterface("0x48e2b093")).eq(true); // DiamondLoupe
      expect(await diamondLoupeFacetProxy.supportsInterface("0x00000000")).eq(false);
      expect(await diamondLoupeFacetProxy.supportsInterface("0x12345678")).eq(false);
      expect(await diamondLoupeFacetProxy.supportsInterface("0xffffffff")).eq(false); // invalid interfaceID
    });
    it("has the correct facets", async function () {
      let facets = await diamondLoupeFacetProxy.facets();
      expect(facets.length).eq(3);
      expect(facets[0].facetAddress).eq(diamond.address);
      expect(facets[1].facetAddress).eq(diamondCutFacetLogic.address);
      expect(facets[2].facetAddress).eq(diamondLoupeFacetLogic.address);
    });
  });

  describe("ownership", function () {
    it("cannot call functions before adding facet", async function () {
      ownershipFacetProxy = await ethers.getContractAt("OwnershipFacet", diamond.address) as OwnershipFacet;
      await expect(ownershipFacetProxy.owner()).to.be.revertedWithCustomError(diamond, "FunctionDoesNotExist");
      await expect(ownershipFacetProxy.transferOwnership(user.address)).to.be.revertedWithCustomError(diamond, "FunctionDoesNotExist");
    });
    it("can add ownership facet", async function () {
      ownershipFacetLogic = await deployContract(deployer, "OwnershipFacet") as OwnershipFacet;
      await expectDeployed(ownershipFacetLogic.address);
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ownershipFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(ownershipFacetLogic)
      }], AddressZero, "0x", {value: 1});
      ownershipFacetProxy = await ethers.getContractAt("OwnershipFacet", diamond.address) as OwnershipFacet;
    });
    it("starts with the correct owner", async function () {
      expect(await ownershipFacetProxy.owner()).eq(owner.address);
      expect(await ownershipFacetLogic.owner()).eq(AddressZero);
    });
    it("non owner cannot transfer ownership", async function () {
      await expect(ownershipFacetProxy.connect(user).transferOwnership(user.address)).to.be.revertedWithCustomError(ownershipFacetProxy, "NotContractOwner");
      await expect(ownershipFacetLogic.connect(user).transferOwnership(user.address)).to.be.revertedWithCustomError(ownershipFacetLogic, "NotContractOwner");
    });
    it("owner can transfer ownership", async function () {
      let tx = await ownershipFacetProxy.connect(owner).transferOwnership(user.address, {value: 1});
      await expect(tx).to.emit(ownershipFacetProxy, "OwnershipTransferred").withArgs(owner.address, user.address);
      expect(await ownershipFacetProxy.owner()).eq(user.address);
      await ownershipFacetProxy.connect(user).transferOwnership(owner.address, {value: 1}); // return ownership
    });
  });

  describe("diamondCut remove", function () {
    before(async function () {
      // deploy test1Facet
      test1FacetLogic = await deployContract(deployer, "Test1Facet") as Test1Facet;
      await expectDeployed(test1FacetLogic.address);
      test1FacetProxy = await ethers.getContractAt("Test1Facet", diamond.address) as Test1Facet;
      // add test1Facet
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test1FacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(test1FacetLogic)
      }], AddressZero, "0x", {value: 1});
      let test1Selectors = [testFunc1Sighash, testFunc2Sighash, testFunc3Sighash];
      let result = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result, test1Selectors);
      await expect(await test1FacetProxy.testFunc1()).to.emit(test1FacetProxy, "Test1Event").withArgs(1);
      await expect(await test1FacetProxy.testFunc2()).to.emit(test1FacetProxy, "Test1Event").withArgs(2);
      await expect(await test1FacetProxy.testFunc3()).to.emit(test1FacetProxy, "Test1Event").withArgs(3);
      // deploy test2Facet
      test2FacetLogic = await deployContract(deployer, "Test2Facet") as Test2Facet;
      await expectDeployed(test2FacetLogic.address);
      test2FacetProxy = await ethers.getContractAt("Test2Facet", diamond.address) as Test2Facet;
    });
    it("cannot be called by non owner", async function () {
      await expect(diamondCutFacetProxy.connect(user).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [dummy1Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "NotContractOwner");
    });
    it("cannot use invalid FacetCutAction", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: 3,
        functionSelectors: [dummy1Sighash]
      }], AddressZero, "0x")).to.be.revertedWith("Diamond: failed delegatecall");
    });
    it("cannot remove zero functions", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: []
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "NoSelectorsToCut");
    });
    it("cannot remove nonzero address facet", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamond.address,
        action: FacetCutAction.Remove,
        functionSelectors: [dummy1Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "RemoveFunctionDoesNotExist");
    });
    it("cannot remove function that doesn't exist", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [dummy1Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "RemoveFunctionDoesNotExist");
    });
    it("cannot init to non contract", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      }], user.address, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "NotAContract");
    });
    it("cannot remove if init fails", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithReason()"))).to.be.revertedWith("RevertFacet call failed");
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithoutReason()"))).to.be.revertedWith("LibDiamond: init func failed");
    });
    it("can remove functions", async function () {
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      }], AddressZero, "0x", {value: 1});
      await expect(tx).to.emit(diamondCutFacetProxy, "DiamondCut");
      let test1Selectors = [testFunc2Sighash, testFunc3Sighash];
      let result = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result, test1Selectors);
    });
    it("cannot remove function twice", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      }], user.address, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "RemoveFunctionDoesNotExist");
    });
    it("can remove multiple functions", async function () {
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc2Sighash, testFunc3Sighash]
      }], AddressZero, "0x", {value: 1});
      await expect(tx).to.emit(diamondCutFacetProxy, "DiamondCut");
      let test1Selectors:string[] = [];
      let result = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result, test1Selectors);
    });
    it("cannot remove an immutable function", async function () {
      // add immutable function => facet address == diamond address
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamond.address,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], AddressZero, "0x", {value: 1});
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [dummy1Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "RemoveFunctionImmutable");
      // try remove multicall
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [multicallSighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "RemoveFunctionImmutable");
    });
    it("can remove facets", async function () {
      // add facets
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test1FacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [testFunc1Sighash]
      },{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [testFunc2Sighash]
      }], AddressZero, "0x", {value: 1});
      test2FacetProxy = await ethers.getContractAt("Test2Facet", diamond.address) as Test2Facet;
      let result11 = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result11, [testFunc1Sighash]);
      let result12 = await diamondLoupeFacetProxy.facetFunctionSelectors(test2FacetLogic.address)
      assert.sameMembers(result12, [testFunc2Sighash]);
      let facets1 = await diamondLoupeFacetProxy.facetAddresses();
      expect(facets1.length).eq(6);
      // remove facets
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      },{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc2Sighash]
      }], AddressZero, "0x", {value: 1});
      let result21 = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result21, []);
      let result22 = await diamondLoupeFacetProxy.facetFunctionSelectors(test2FacetLogic.address)
      assert.sameMembers(result22, []);
      let facets2 = await diamondLoupeFacetProxy.facetAddresses();
      expect(facets2.length).eq(4);
    });
  });

  describe("diamondCut replace", function () {
    before(async function () {
      // add test1Facet
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test1FacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(test1FacetLogic)
      }], AddressZero, "0x", {value: 1});
      let test1Selectors = [testFunc1Sighash, testFunc2Sighash, testFunc3Sighash];
      let result = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result, test1Selectors);
      await expect(await test1FacetProxy.testFunc1()).to.emit(test1FacetProxy, "Test1Event").withArgs(1);
      await expect(await test1FacetProxy.testFunc2()).to.emit(test1FacetProxy, "Test1Event").withArgs(2);
      await expect(await test1FacetProxy.testFunc3()).to.emit(test1FacetProxy, "Test1Event").withArgs(3);
    });
    it("cannot be called by non owner", async function () {
      await expect(diamondCutFacetProxy.connect(user).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "NotContractOwner");
    });
    it("cannot use invalid FacetCutAction", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: 3,
        functionSelectors: [testFunc1Sighash]
      }], AddressZero, "0x")).to.be.revertedWith("Diamond: failed delegatecall");
    });
    it("cannot replace zero functions", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: []
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "NoSelectorsToCut");
    });
    it("cannot replace zero address facet", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "AddressZero");
    });
    it("cannot replace function that doesn't exist", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [dummy2Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "RemoveFunctionDoesNotExist");
    });
    it("cannot replace function with same facet", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test1FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "ReplaceFunctionSame");
    });
    it("cannot init to non contract", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], user.address, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "NotAContract");
    });
    it("cannot replace if init fails", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithReason()"))).to.be.revertedWith("RevertFacet call failed");
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithoutReason()"))).to.be.revertedWith("LibDiamond: init func failed");
    });
    it("can replace functions", async function () {
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], AddressZero, "0x", {value: 1});
      await expect(tx).to.emit(diamondCutFacetProxy, "DiamondCut");
      let test1Selectors = [testFunc2Sighash, testFunc3Sighash];
      let result1 = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result1, test1Selectors);
      let test2Selectors = [testFunc1Sighash];
      let result2 = await diamondLoupeFacetProxy.facetFunctionSelectors(test2FacetLogic.address)
      assert.sameMembers(result2, test2Selectors);
      await expect(await test2FacetProxy.testFunc1()).to.emit(test2FacetProxy, "Test2Event").withArgs(1);
      await expect(await test1FacetProxy.testFunc2()).to.emit(test1FacetProxy, "Test1Event").withArgs(2);
      await expect(await test1FacetProxy.testFunc3()).to.emit(test1FacetProxy, "Test1Event").withArgs(3);
    });
    it("can replace multiple functions", async function () {
      let facets1 = await diamondLoupeFacetProxy.facetAddresses();
      expect(facets1.length).eq(6);
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc2Sighash, testFunc3Sighash]
      }], AddressZero, "0x", {value: 1});
      await expect(tx).to.emit(diamondCutFacetProxy, "DiamondCut");
      let test1Selectors:string[] = [];
      let result1 = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result1, test1Selectors);
      let test2Selectors = [testFunc1Sighash, testFunc2Sighash, testFunc3Sighash];
      let result2 = await diamondLoupeFacetProxy.facetFunctionSelectors(test2FacetLogic.address)
      assert.sameMembers(result2, test2Selectors);
      await expect(await test2FacetProxy.testFunc1()).to.emit(test2FacetProxy, "Test2Event").withArgs(1);
      await expect(await test2FacetProxy.testFunc2()).to.emit(test2FacetProxy, "Test2Event").withArgs(2);
      await expect(await test2FacetProxy.testFunc3()).to.emit(test2FacetProxy, "Test2Event").withArgs(3);
      let facets2 = await diamondLoupeFacetProxy.facetAddresses();
      expect(facets2.length).eq(5);
    });
    it("cannot replace an immutable function", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [dummy1Sighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "RemoveFunctionImmutable");
      // try replace multicall
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [multicallSighash]
      }], AddressZero, "0x")).to.be.revertedWithCustomError(diamondCutFacetProxy, "RemoveFunctionImmutable");
    });
  });

  describe("multicall", function () {
    it("cannot call functions that don't exist", async function () {
      await expect(diamond.multicall([dummy2Sighash], {gasLimit:1000000})).to.be.revertedWithCustomError(diamond, "FunctionDoesNotExist");
    });
    it("cannot call functions that revert", async function () {
      revertFacetProxy = await ethers.getContractAt("RevertFacet", diamond.address) as RevertFacet;
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: revertFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(revertFacetLogic)
      }], AddressZero, "0x", {value: 1});
      let txdata1 = revertFacetProxy.interface.encodeFunctionData("revertWithReason()");
      await expect(diamond.multicall([txdata1])).to.be.revertedWith("RevertFacet call failed");
      let txdata2 = revertFacetProxy.interface.encodeFunctionData("revertWithoutReason()");
      await expect(diamond.multicall([txdata2])).to.be.revertedWith("Diamond: failed delegatecall");
    });
    it("cannot delegatecall a nonpayable function with value", async function () {
      let txdata = ownershipFacetProxy.interface.encodeFunctionData("owner()");
      await expect(diamond.multicall([txdata], {value: 1, gasLimit: 1000000})).to.be.reverted;
    });
    it("can multicall", async function () {
      let txdata1 = test1FacetProxy.interface.encodeFunctionData("testFunc1()");
      let txdata2 = test1FacetProxy.interface.encodeFunctionData("testFunc2()");
      let txdata3 = test1FacetProxy.interface.encodeFunctionData("testFunc3()");
      let txdata4 = ownershipFacetProxy.interface.encodeFunctionData("owner()");
      let txdata5 = ownershipFacetProxy.interface.encodeFunctionData("transferOwnership(address)", [user.address]);
      let txdata6 = ownershipFacetProxy.interface.encodeFunctionData("owner()");
      let response = await diamond.connect(owner).callStatic.multicall([txdata1, txdata2, txdata3, txdata4, txdata5, txdata6]);
      expect(response.length).eq(6);
      expect(response[0]).eq("0x");
      expect(response[1]).eq("0x");
      expect(response[2]).eq("0x");
      expect(response[4]).eq("0x");
      const toAddress = (s:string) => ethers.utils.getAddress(`0x${s.substring(s.length-40)}`); // bytes32 to address
      expect(toAddress(response[3])).eq(owner.address);
      expect(toAddress(response[5])).eq(user.address);
      let tx = await diamond.connect(owner).multicall([txdata1, txdata2, txdata3, txdata4, txdata5, txdata6]);
      await expect(tx).to.emit(test2FacetProxy, "Test2Event").withArgs(1);
      await expect(tx).to.emit(test2FacetProxy, "Test2Event").withArgs(2);
      await expect(tx).to.emit(test2FacetProxy, "Test2Event").withArgs(3);
      await expect(tx).to.emit(ownershipFacetProxy, "OwnershipTransferred").withArgs(owner.address, user.address);
      await ownershipFacetProxy.connect(user).transferOwnership(owner.address);
    });
    it("can multicall with value", async function () {
      let txdata1 = test1FacetProxy.interface.encodeFunctionData("testFunc1()");
      let txdata2 = test1FacetProxy.interface.encodeFunctionData("testFunc2()");
      let txdata3 = test1FacetProxy.interface.encodeFunctionData("testFunc3()");
      await diamond.connect(owner).multicall([txdata1, txdata2, txdata3], {value: 1});
    });
  });

  describe("diamondCut updateSupportedInterfaces", function () {
    it("cannot be called by non owner", async function () {
      await expect(diamondCutFacetProxy.connect(user).updateSupportedInterfaces([],[])).to.be.revertedWithCustomError(diamondCutFacetProxy, "NotContractOwner");
    });
    it("cannot be called with length mismatch", async function () {
      await expect(diamondCutFacetProxy.connect(owner).updateSupportedInterfaces([],[true])).to.be.revertedWithCustomError(diamondCutFacetProxy, "LengthMismatch");
    });
    it("can updateSupportedInterfaces", async function () {
      expect(await diamondLoupeFacetProxy.supportsInterface("0x01ffc9a7")).eq(true); // ERC165
      expect(await diamondLoupeFacetProxy.supportsInterface("0x7f5828d0")).eq(true); // ERC173
      expect(await diamondLoupeFacetProxy.supportsInterface("0x1f931c1c")).eq(true); // DiamondCut
      expect(await diamondLoupeFacetProxy.supportsInterface("0x48e2b093")).eq(true); // DiamondLoupe
      expect(await diamondLoupeFacetProxy.supportsInterface("0x00000000")).eq(false);
      expect(await diamondLoupeFacetProxy.supportsInterface("0x12345678")).eq(false);
      expect(await diamondLoupeFacetProxy.supportsInterface("0xffffffff")).eq(false); // invalid interfaceID
      let tx = await diamondCutFacetProxy.connect(owner).updateSupportedInterfaces(["0x01ffc9a7", "0x12345678"], [false, true], {value: 1});
      await expect(tx).to.emit(diamondCutFacetProxy, "InterfaceSupportUpdated").withArgs("0x01ffc9a7", false);
      await expect(tx).to.emit(diamondCutFacetProxy, "InterfaceSupportUpdated").withArgs("0x12345678", true);
      expect(await diamondLoupeFacetProxy.supportsInterface("0x01ffc9a7")).eq(false); // ERC165
      expect(await diamondLoupeFacetProxy.supportsInterface("0x7f5828d0")).eq(true); // ERC173
      expect(await diamondLoupeFacetProxy.supportsInterface("0x1f931c1c")).eq(true); // DiamondCut
      expect(await diamondLoupeFacetProxy.supportsInterface("0x48e2b093")).eq(true); // DiamondLoupe
      expect(await diamondLoupeFacetProxy.supportsInterface("0x00000000")).eq(false);
      expect(await diamondLoupeFacetProxy.supportsInterface("0x12345678")).eq(true);
      expect(await diamondLoupeFacetProxy.supportsInterface("0xffffffff")).eq(false); // invalid interfaceID
    });
  });

  describe("cache bug", function () {
    const ownerSel = "0x8da5cb5b";
    const sel0     = "0x19e3b533"; // fills up slot 1
    const sel1     = "0x0716c2ae"; // fills up slot 1
    const sel2     = "0x11046047"; // fills up slot 1
    const sel3     = "0xcf3bbe18"; // fills up slot 1
    const sel4     = "0x24c1d5a7"; // fills up slot 1
    const sel5     = "0xcbb835f6"; // fills up slot 1
    const sel6     = "0xcbb835f7"; // fills up slot 1
    const sel7     = "0xcbb835f8"; // fills up slot 2
    const sel8     = "0xcbb835f9"; // fills up slot 2
    const sel9     = "0xcbb835fa"; // fills up slot 2
    const sel10    = "0xcbb835fb"; // fills up slot 2
    let selectors1 = [
      sel0,
      sel1,
      sel2,
      sel3,
      sel4,
      sel5,
      sel6,
      sel7,
      sel8,
      sel9,
      sel10
    ];
    let selectors2 = [
      ownerSel,
      sel5,
      sel10
    ];

    before(async function () {
      // redeploy
      diamondCutFacetLogic = await deployContract(deployer, "DiamondCutFacet") as DiamondCutFacet;
      await expectDeployed(diamondCutFacetLogic.address);
      diamond = await deployContract(deployer, "Diamond", [owner.address, diamondCutFacetLogic.address]) as Diamond;
      await expectDeployed(diamond.address);
      diamondCutFacetProxy = await ethers.getContractAt("DiamondCutFacet", diamond.address) as DiamondCutFacet;
      diamondLoupeFacetLogic = await deployContract(deployer, "DiamondLoupeFacet") as DiamondLoupeFacet;
      await expectDeployed(diamondLoupeFacetLogic.address);
      diamondLoupeFacetProxy = await ethers.getContractAt("DiamondLoupeFacet", diamond.address) as DiamondLoupeFacet;
      ownershipFacetLogic = await deployContract(deployer, "OwnershipFacet") as OwnershipFacet;
      await expectDeployed(ownershipFacetLogic.address);
      ownershipFacetProxy = await ethers.getContractAt("OwnershipFacet", diamond.address) as OwnershipFacet;
      test1FacetLogic = await deployContract(deployer, "Test1Facet") as Test1Facet;
      await expectDeployed(test1FacetLogic.address);
      test1FacetProxy = await ethers.getContractAt("Test1Facet", diamond.address) as Test1Facet;
      // add functions
      await diamondCutFacetProxy.connect(owner).diamondCut([
        {
          facetAddress: diamondLoupeFacetLogic.address,
          action: FacetCutAction.Add,
          functionSelectors: getSelectors(diamondLoupeFacetLogic)
        },{
          facetAddress: ownershipFacetLogic.address,
          action: FacetCutAction.Add,
          functionSelectors: getSelectors(ownershipFacetLogic)
        },{
          facetAddress: test1FacetLogic.address,
          action: FacetCutAction.Add,
          functionSelectors: selectors1
        }
      ], AddressZero, "0x", {value: 1});
      // remove functions
      await diamondCutFacetProxy.connect(owner).diamondCut([
        {
          facetAddress: AddressZero,
          action: FacetCutAction.Remove,
          functionSelectors: selectors2
        }
      ], AddressZero, "0x", {value: 1});
    });
    it("should not exhibit the cache bug", async function () {
      // Get the test1Facet's registered functions
      let selectors3 = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address);
      // Check individual correctness
      assert.isTrue(selectors3.includes(sel0), "Does not contain sel0");
      assert.isTrue(selectors3.includes(sel1), "Does not contain sel1");
      assert.isTrue(selectors3.includes(sel2), "Does not contain sel2");
      assert.isTrue(selectors3.includes(sel3), "Does not contain sel3");
      assert.isTrue(selectors3.includes(sel4), "Does not contain sel4");
      assert.isTrue(selectors3.includes(sel6), "Does not contain sel6");
      assert.isTrue(selectors3.includes(sel7), "Does not contain sel7");
      assert.isTrue(selectors3.includes(sel8), "Does not contain sel8");
      assert.isTrue(selectors3.includes(sel9), "Does not contain sel9");

      assert.isFalse(selectors3.includes(ownerSel), "Contains ownerSel");
      assert.isFalse(selectors3.includes(sel5), "Contains sel5");
      assert.isFalse(selectors3.includes(sel10), "Contains sel10");
    })
  });

  describe("gas", function () {
    before(async function () {
      // redeploy
      diamondCutFacetLogic = await deployContract(deployer, "DiamondCutFacet") as DiamondCutFacet;
      await expectDeployed(diamondCutFacetLogic.address);
      diamond = await deployContract(deployer, "Diamond", [owner.address, diamondCutFacetLogic.address]) as Diamond;
      await expectDeployed(diamond.address);
      diamondCutFacetProxy = await ethers.getContractAt("DiamondCutFacet", diamond.address) as DiamondCutFacet;
      diamondLoupeFacetLogic = await deployContract(deployer, "DiamondLoupeFacet") as DiamondLoupeFacet;
      await expectDeployed(diamondLoupeFacetLogic.address);
      diamondLoupeFacetProxy = await ethers.getContractAt("DiamondLoupeFacet", diamond.address) as DiamondLoupeFacet;
      ownershipFacetLogic = await deployContract(deployer, "OwnershipFacet") as OwnershipFacet;
      await expectDeployed(ownershipFacetLogic.address);
      ownershipFacetProxy = await ethers.getContractAt("OwnershipFacet", diamond.address) as OwnershipFacet;
      test1FacetLogic = await deployContract(deployer, "Test1Facet") as Test1Facet;
      await expectDeployed(test1FacetLogic.address);
      test1FacetProxy = await ethers.getContractAt("Test1Facet", diamond.address) as Test1Facet;
      // add functions
      await diamondCutFacetProxy.connect(owner).diamondCut([
        {
          facetAddress: diamondLoupeFacetLogic.address,
          action: FacetCutAction.Add,
          functionSelectors: getSelectors(diamondLoupeFacetLogic)
        },{
          facetAddress: ownershipFacetLogic.address,
          action: FacetCutAction.Add,
          functionSelectors: getSelectors(ownershipFacetLogic)
        }
      ], AddressZero, "0x", {value: 1});
    });
    it("gas usage single call", async function () {
      // no matter how many facets you add, the lookup & call cost constant gas
      // add: ~158609 call: 26586
      let numFacets1 = 3;
      let numFacets2 = 15;
      let results = [];
      for(let i = numFacets1+1; i <= numFacets2; ++i) {
        let nextFacetLogic = await deployContract(deployer, "FallbackFacet") as FallbackFacet;
        let sighash = "0x"+BN.from(i).toHexString().substring(2).padStart(8,"0");
        let tx1 = await diamondCutFacetProxy.connect(owner).diamondCut([
          {
            facetAddress: nextFacetLogic.address,
            action: FacetCutAction.Add,
            functionSelectors: [sighash]
          }
        ], AddressZero, "0x");
        let receipt1 = await tx1.wait();
        let tx2 = await user.sendTransaction({to: diamond.address, data: sighash});
        let receipt2 = await tx2.wait();
        results.push({
          facetNum: i,
          addGas: receipt1.gasUsed.toString(),
          callGas: receipt2.gasUsed.toString(),
        });
      }
      let s = "FacetNum AddGas CallGas";
      for(let i = 0; i < results.length; ++i) {
        let res = results[i];
        s = `${s}\n${res.facetNum} ${res.addGas} ${res.callGas}`;
      }
      //console.log(s);
    });
    it("gas usage multi call", async function () {
      // multicall([]) costs 22244 gas
      // each additional call adds ~6740 gas (for an extremely basic function)
      let maxMulticalls = 10;
      let calls:string[] = [];
      let s = "NumCalls CallGas Diff";
      let lastGas = 0;
      while(calls.length <= maxMulticalls) {
        let tx = await diamond.connect(user).multicall(calls);
        let receipt = await tx.wait();
        let gasUsed = receipt.gasUsed.toNumber();
        let diff = ( (calls.length > 0) ? (gasUsed-lastGas) : '')
        s = `${s}\n${calls.length} ${gasUsed} ${diff}`;
        lastGas = gasUsed;
        calls.push("0x"+BN.from(calls.length+4).toHexString().substring(2).padStart(8,"0"));
      }
      //console.log(s);
    });
  });

  describe("mutibility", function () {
    const dead = "0x000000000000000000000000000000000000dEaD";
    it("can be made immutible", async function () {
      let txdata = ownershipFacetProxy.interface.encodeFunctionData("transferOwnership(address)", [dead]);
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [diamondCutSighash]
      }], ownershipFacetLogic.address, txdata, {value:1});
      await expect(tx).to.emit(diamondCutFacetProxy, "DiamondCut");
      await expect(tx).to.emit(ownershipFacetProxy, "OwnershipTransferred").withArgs(owner.address, dead);
      expect(await ownershipFacetProxy.owner()).eq(dead);
    });
    it("cannot upgrade an immutible diamond", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([], AddressZero, "0x")).to.be.revertedWithCustomError(diamond, "FunctionDoesNotExist");
    });
  });
});
