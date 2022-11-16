/* global describe it before ethers */

import chai from "chai";
import { ethers, waffle } from "hardhat";
const { expect, assert } = chai;
const { deployContract, solidity } = waffle;
const provider = waffle.provider;
chai.use(solidity);

import { import_artifacts, ArtifactImports } from "./../scripts/utilities/artifact_importer";
import { Diamond, DiamondInit, DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, Test1Facet, Test2Facet, RevertFacet } from "./../typechain";
import { expectDeployed } from "./../scripts/utilities/expectDeployed";

import { getSelectors, FacetCutAction } from "./../scripts/libraries/diamond"

describe("Diamond", async function () {
  const [deployer, owner, user] = provider.getWallets();
  let artifacts: ArtifactImports;

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

  const diamondCutSighash                = "0x1f931c1c";
  const updateSupportedInterfacesSighash = "0xf71a8a0f";
  const dummy1Sighash                    = "0x11111111";
  const dummy2Sighash                    = "0x22222222";
  const testFunc1Sighash                 = "0x561f5f89";
  const testFunc2Sighash                 = "0x08752360";
  const testFunc3Sighash                 = "0x9a5fb5a8";

  before(async function () {
    artifacts = await import_artifacts();
    await deployer.sendTransaction({to:deployer.address}); // for some reason this helps solidity-coverage
  });

  describe("deployment", function () {
    it("should deploy successfully", async function () {
      diamondCutFacetLogic = await deployContract(deployer, artifacts.DiamondCutFacet) as DiamondCutFacet;
      await expectDeployed(diamondCutFacetLogic.address);
      diamond = await deployContract(deployer, artifacts.Diamond, [owner.address, diamondCutFacetLogic.address]) as Diamond;
      await expectDeployed(diamond.address);
      diamondCutFacetProxy = await ethers.getContractAt(artifacts.DiamondCutFacet.abi, diamond.address) as DiamondCutFacet;
    });
  });

  describe("diamondCut add", function () {
    before(async function () {
      diamondLoupeFacetLogic = await deployContract(deployer, artifacts.DiamondLoupeFacet) as DiamondLoupeFacet;
      await expectDeployed(diamondLoupeFacetLogic.address);
      diamondInit = await deployContract(deployer, artifacts.DiamondInit) as DiamondInit;
      await expectDeployed(diamondInit.address);
      revertFacetLogic = await deployContract(deployer, artifacts.RevertFacet) as RevertFacet;
      await expectDeployed(revertFacetLogic.address);
    });
    it("cannot be called by non owner", async function () {
      await expect(diamondCutFacetProxy.connect(user).diamondCut([{
        facetAddress: diamondLoupeFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: !owner");
    });
    it("cannot use invalid FacetCutAction", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondLoupeFacetLogic.address,
        action: 3,
        functionSelectors: [dummy1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("Diamond: failed delegatecall");
    });
    it("cannot add zero functions", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondLoupeFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: []
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: no selectors to cut");
    });
    it("cannot add zero address facet", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: zero address facet");
    });
    it("cannot add function that already exists", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [diamondCutSighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: add duplicate func");
    });
    it("cannot init to non contract", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], user.address, "0x")).to.be.revertedWith("LibDiamond: no code init");
    });
    it("cannot add if init fails", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithReason"))).to.be.revertedWith("RevertFacet call failed");
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [dummy1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithoutReason"))).to.be.revertedWith("LibDiamond: init func failed");
    });
    it("can add functions from a known facet", async function () {
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondCutFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: [updateSupportedInterfacesSighash]
      }], ethers.constants.AddressZero, "0x");
      await expect(tx).to.emit(diamondCutFacetProxy, "DiamondCut");
    });
    it("can add functions from a new facet", async function () {
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamondLoupeFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(diamondLoupeFacetLogic)
      }], diamondInit.address, diamondInit.interface.encodeFunctionData("init")); // and delegatecall
      await expect(tx).to.emit(diamondCutFacetProxy, "DiamondCut");
      diamondLoupeFacetProxy = await ethers.getContractAt(artifacts.DiamondLoupeFacet.abi, diamond.address) as DiamondLoupeFacet;
    });
  });

  describe("diamondLoupe", function () {
    it("should have two facets", async function () {
      let facets = await diamondLoupeFacetProxy.facetAddresses();
      expect(facets.length).eq(2);
      expect(facets[0]).eq(diamondCutFacetLogic.address);
      expect(facets[1]).eq(diamondLoupeFacetLogic.address);
      facets = await diamondLoupeFacetLogic.facetAddresses();
      expect(facets.length).eq(0);
    });
    it("facets should have the right function selectors -- call to facetFunctionSelectors function", async function () {
      let facets = await diamondLoupeFacetProxy.facetAddresses();
      let selectors = getSelectors(diamondCutFacetLogic)
      let result = await diamondLoupeFacetProxy.facetFunctionSelectors(facets[0])
      assert.sameMembers(result, selectors)
      selectors = getSelectors(diamondLoupeFacetLogic)
      result = await diamondLoupeFacetProxy.facetFunctionSelectors(facets[1])
      assert.sameMembers(result, selectors)
    })
    it("selectors should be associated to facets correctly -- multiple calls to facetAddress function", async function () {
      let facets = await diamondLoupeFacetProxy.facetAddresses();
      assert.equal(facets[0], await diamondLoupeFacetProxy.facetAddress("0x1f931c1c"))
      assert.equal(facets[1], await diamondLoupeFacetProxy.facetAddress("0xcdffacc6"))
      assert.equal(facets[1], await diamondLoupeFacetProxy.facetAddress("0x01ffc9a7"))
    })
    it("supportsInterface", async function () {
      expect(await diamondLoupeFacetProxy.supportsInterface("0x01ffc9a7")).eq(true); // ERC165
      expect(await diamondLoupeFacetProxy.supportsInterface("0x7f5828d0")).eq(true); // ERC173
      expect(await diamondLoupeFacetProxy.supportsInterface("0x1f931c1c")).eq(true); // DiamondCut
      expect(await diamondLoupeFacetProxy.supportsInterface("0x48e2b093")).eq(true); // DiamondLoupe
      expect(await diamondLoupeFacetProxy.supportsInterface("0x00000000")).eq(false);
      expect(await diamondLoupeFacetProxy.supportsInterface("0x12345678")).eq(false);
      expect(await diamondLoupeFacetProxy.supportsInterface("0xffffffff")).eq(false); // invalid interfaceID
    });
    it("has the correct facets", async function () {
      let facets = await diamondLoupeFacetProxy.facets();
      expect(facets.length).eq(2);
      expect(facets[0].facetAddress).eq(diamondCutFacetLogic.address);
      expect(facets[1].facetAddress).eq(diamondLoupeFacetLogic.address);
    });
  });

  describe("ownership", function () {
    it("cannot call functions before adding facet", async function () {
      ownershipFacetProxy = await ethers.getContractAt(artifacts.OwnershipFacet.abi, diamond.address) as OwnershipFacet;
      await expect(ownershipFacetProxy.owner()).to.be.revertedWith("Diamond: function dne");
      await expect(ownershipFacetProxy.transferOwnership(user.address)).to.be.revertedWith("Diamond: function dne");
    });
    it("can add ownership facet", async function () {
      ownershipFacetLogic = await deployContract(deployer, artifacts.OwnershipFacet) as OwnershipFacet;
      await expectDeployed(ownershipFacetLogic.address);
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ownershipFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(ownershipFacetLogic)
      }], ethers.constants.AddressZero, "0x");
      ownershipFacetProxy = await ethers.getContractAt(artifacts.OwnershipFacet.abi, diamond.address) as OwnershipFacet;
    });
    it("starts with the correct owner", async function () {
      expect(await ownershipFacetProxy.owner()).eq(owner.address);
      expect(await ownershipFacetLogic.owner()).eq(ethers.constants.AddressZero);
    });
    it("non owner cannot transfer ownership", async function () {
      await expect(ownershipFacetProxy.connect(user).transferOwnership(user.address)).to.be.revertedWith("LibDiamond: !owner");
      await expect(ownershipFacetLogic.connect(user).transferOwnership(user.address)).to.be.revertedWith("LibDiamond: !owner");
    });
    it("owner can transfer ownership", async function () {
      let tx = await ownershipFacetProxy.connect(owner).transferOwnership(user.address);
      await expect(tx).to.emit(ownershipFacetProxy, "OwnershipTransferred").withArgs(owner.address, user.address);
      expect(await ownershipFacetProxy.owner()).eq(user.address);
      await ownershipFacetProxy.connect(user).transferOwnership(owner.address); // return ownership
    });
  });

  describe("diamondCut remove", function () {
    before(async function () {
      // deploy test1Facet
      test1FacetLogic = await deployContract(deployer, artifacts.Test1Facet) as Test1Facet;
      await expectDeployed(test1FacetLogic.address);
      test1FacetProxy = await ethers.getContractAt(artifacts.Test1Facet.abi, diamond.address) as Test1Facet;
      // add test1Facet
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test1FacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(test1FacetLogic)
      }], ethers.constants.AddressZero, "0x");
      let test1Selectors = [testFunc1Sighash, testFunc2Sighash, testFunc3Sighash];
      let result = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result, test1Selectors);
      await expect(await test1FacetProxy.testFunc1()).to.emit(test1FacetProxy, "Test1Event").withArgs(1);
      await expect(await test1FacetProxy.testFunc2()).to.emit(test1FacetProxy, "Test1Event").withArgs(2);
      await expect(await test1FacetProxy.testFunc3()).to.emit(test1FacetProxy, "Test1Event").withArgs(3);
      // deploy test2Facet
      test2FacetLogic = await deployContract(deployer, artifacts.Test2Facet) as Test2Facet;
      await expectDeployed(test2FacetLogic.address);
      test2FacetProxy = await ethers.getContractAt(artifacts.Test2Facet.abi, diamond.address) as Test2Facet;
    });
    it("cannot be called by non owner", async function () {
      await expect(diamondCutFacetProxy.connect(user).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [dummy1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: !owner");
    });
    it("cannot use invalid FacetCutAction", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: 3,
        functionSelectors: [dummy1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("Diamond: failed delegatecall");
    });
    it("cannot remove zero functions", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: []
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: no selectors to cut");
    });
    it("cannot remove nonzero address facet", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: diamond.address,
        action: FacetCutAction.Remove,
        functionSelectors: [dummy1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: remove !zero facet");
    });
    it("cannot remove function that doesn't exist", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [dummy1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: remove func dne");
    });
    it("cannot init to non contract", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      }], user.address, "0x")).to.be.revertedWith("LibDiamond: no code init");
    });
    it("cannot remove if init fails", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithReason"))).to.be.revertedWith("RevertFacet call failed");
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithoutReason"))).to.be.revertedWith("LibDiamond: init func failed");
    });
    it("can remove functions", async function () {
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      }], ethers.constants.AddressZero, "0x");
      await expect(tx).to.emit(diamondCutFacetProxy, "DiamondCut");
      let test1Selectors = [testFunc2Sighash, testFunc3Sighash];
      let result = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result, test1Selectors);
    });
    it("cannot remove function twice", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      }], user.address, "0x")).to.be.revertedWith("LibDiamond: remove func dne");
    });
    it("can remove multiple functions", async function () {
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc2Sighash, testFunc3Sighash]
      }], ethers.constants.AddressZero, "0x");
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
      }], ethers.constants.AddressZero, "0x");
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [dummy1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: remove immut func");
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
      }], ethers.constants.AddressZero, "0x");
      test2FacetProxy = await ethers.getContractAt(artifacts.Test2Facet.abi, diamond.address) as Test2Facet;
      let result11 = await diamondLoupeFacetProxy.facetFunctionSelectors(test1FacetLogic.address)
      assert.sameMembers(result11, [testFunc1Sighash]);
      let result12 = await diamondLoupeFacetProxy.facetFunctionSelectors(test2FacetLogic.address)
      assert.sameMembers(result12, [testFunc2Sighash]);
      let facets1 = await diamondLoupeFacetProxy.facetAddresses();
      expect(facets1.length).eq(6);
      // remove facets
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc1Sighash]
      },{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: [testFunc2Sighash]
      }], ethers.constants.AddressZero, "0x");
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
      }], ethers.constants.AddressZero, "0x");
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
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: !owner");
    });
    it("cannot use invalid FacetCutAction", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: 3,
        functionSelectors: [testFunc1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("Diamond: failed delegatecall");
    });
    it("cannot replace zero functions", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: []
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: no selectors to cut");
    });
    it("cannot replace zero address facet", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: zero address facet");
    });
    it("cannot replace function that doesn't exist", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [dummy2Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: remove func dne");
    });
    it("cannot replace function with same facet", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test1FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: replace func same");
    });
    it("cannot init to non contract", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], user.address, "0x")).to.be.revertedWith("LibDiamond: no code init");
    });
    it("cannot replace if init fails", async function () {
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithReason"))).to.be.revertedWith("RevertFacet call failed");
      await expect(diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], revertFacetLogic.address, revertFacetLogic.interface.encodeFunctionData("revertWithoutReason"))).to.be.revertedWith("LibDiamond: init func failed");
    });
    it("can replace functions", async function () {
      let tx = await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: test2FacetLogic.address,
        action: FacetCutAction.Replace,
        functionSelectors: [testFunc1Sighash]
      }], ethers.constants.AddressZero, "0x");
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
      }], ethers.constants.AddressZero, "0x");
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
      }], ethers.constants.AddressZero, "0x")).to.be.revertedWith("LibDiamond: remove immut func");
    });
  });

  describe("multicall", function () {
    it("cannot call functions that don't exist", async function () {
      await expect(diamond.multicall([dummy2Sighash], {gasLimit:1000000})).to.be.revertedWith("Diamond: function dne")
    });
    it("cannot call functions that revert", async function () {
      revertFacetProxy = await ethers.getContractAt(artifacts.RevertFacet.abi, diamond.address) as RevertFacet;
      await diamondCutFacetProxy.connect(owner).diamondCut([{
        facetAddress: revertFacetLogic.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(revertFacetLogic)
      }], ethers.constants.AddressZero, "0x");
      let txdata1 = revertFacetProxy.interface.encodeFunctionData("revertWithReason");
      await expect(diamond.multicall([txdata1])).to.be.revertedWith("RevertFacet call failed");
      let txdata2 = revertFacetProxy.interface.encodeFunctionData("revertWithoutReason");
      await expect(diamond.multicall([txdata2])).to.be.revertedWith("Diamond: failed delegatecall");
    });
    it("can multicall", async function () {
      let txdata1 = test1FacetProxy.interface.encodeFunctionData("testFunc1");
      let txdata2 = test1FacetProxy.interface.encodeFunctionData("testFunc2");
      let txdata3 = test1FacetProxy.interface.encodeFunctionData("testFunc3");
      let txdata4 = ownershipFacetProxy.interface.encodeFunctionData("owner");
      let txdata5 = ownershipFacetProxy.interface.encodeFunctionData("transferOwnership", [user.address]);
      let txdata6 = ownershipFacetProxy.interface.encodeFunctionData("owner");
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
  });

  describe("diamondCut updateSupportedInterfaces", function () {
    it("cannot be called by non owner", async function () {
      await expect(diamondCutFacetProxy.connect(user).updateSupportedInterfaces([],[])).to.be.revertedWith("LibDiamond: !owner");
    });
    it("cannot be called with length mismatch", async function () {
      await expect(diamondCutFacetProxy.connect(owner).updateSupportedInterfaces([],[true])).to.be.revertedWith("DiamondCutFacet: len mismatch");
    });
    it("can updateSupportedInterfaces", async function () {
      expect(await diamondLoupeFacetProxy.supportsInterface("0x01ffc9a7")).eq(true); // ERC165
      expect(await diamondLoupeFacetProxy.supportsInterface("0x7f5828d0")).eq(true); // ERC173
      expect(await diamondLoupeFacetProxy.supportsInterface("0x1f931c1c")).eq(true); // DiamondCut
      expect(await diamondLoupeFacetProxy.supportsInterface("0x48e2b093")).eq(true); // DiamondLoupe
      expect(await diamondLoupeFacetProxy.supportsInterface("0x00000000")).eq(false);
      expect(await diamondLoupeFacetProxy.supportsInterface("0x12345678")).eq(false);
      expect(await diamondLoupeFacetProxy.supportsInterface("0xffffffff")).eq(false); // invalid interfaceID
      let tx = await diamondCutFacetProxy.connect(owner).updateSupportedInterfaces(["0x01ffc9a7", "0x12345678"], [false, true]);
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
      diamondCutFacetLogic = await deployContract(deployer, artifacts.DiamondCutFacet) as DiamondCutFacet;
      await expectDeployed(diamondCutFacetLogic.address);
      diamond = await deployContract(deployer, artifacts.Diamond, [owner.address, diamondCutFacetLogic.address]) as Diamond;
      await expectDeployed(diamond.address);
      diamondCutFacetProxy = await ethers.getContractAt(artifacts.DiamondCutFacet.abi, diamond.address) as DiamondCutFacet;
      diamondLoupeFacetLogic = await deployContract(deployer, artifacts.DiamondLoupeFacet) as DiamondLoupeFacet;
      await expectDeployed(diamondLoupeFacetLogic.address);
      diamondLoupeFacetProxy = await ethers.getContractAt(artifacts.DiamondLoupeFacet.abi, diamond.address) as DiamondLoupeFacet;
      ownershipFacetLogic = await deployContract(deployer, artifacts.OwnershipFacet) as OwnershipFacet;
      await expectDeployed(ownershipFacetLogic.address);
      ownershipFacetProxy = await ethers.getContractAt(artifacts.OwnershipFacet.abi, diamond.address) as OwnershipFacet;
      test1FacetLogic = await deployContract(deployer, artifacts.Test1Facet) as Test1Facet;
      await expectDeployed(test1FacetLogic.address);
      test1FacetProxy = await ethers.getContractAt(artifacts.Test1Facet.abi, diamond.address) as Test1Facet;
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
      ], ethers.constants.AddressZero, "0x");
      // remove functions
      await diamondCutFacetProxy.connect(owner).diamondCut([
        {
          facetAddress: ethers.constants.AddressZero,
          action: FacetCutAction.Remove,
          functionSelectors: selectors2
        }
      ], ethers.constants.AddressZero, "0x");
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
});
