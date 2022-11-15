/* global ethers */

import { ethers } from "ethers";

export const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

export const selector = (facet: ethers.Contract) => {
  let selection = get(getSelectors(facet),["goodbye()"]);
  console.log("FUNCTIONS: "+selection[0])
}

// get function selectors from ABI
export const getSelectors = (contract: ethers.Contract|ethers.ContractFactory) => {
  const signatures = Object.keys(contract.interface.functions)
  const selectors: any = signatures.reduce((acc, val) => {
    if (val !== "init(bytes)") {
      acc.push(contract.interface.getSighash(val))
    }
    return acc
  }, [] as any[])
  selectors.contract = contract
  selectors.remove = remove
  selectors.get = get
  return selectors
}

// get function selector from function signature
export const getSelector = (func:any) => {
  const abiInterface = new ethers.utils.Interface([func])
  return abiInterface.getSighash(ethers.utils.Fragment.from(func))
}

// used with getSelectors to remove selectors from an array of selectors
// functionNames argument is an array of function signatures
export const remove = (that: any, functionNames: string[]) => {
  const selectors = that.filter((v: string) => {
    for(let i = 0; i < functionNames.length; ++i) {
      const functionName = functionNames[i];
      if (v === that.contract.interface.getSighash(functionName)) {
        return false
      }
    }
    return true
  })
  selectors.contract = that.contract
  //selectors.remove = remove
  //selectors.get = get
  return selectors
}

// used with getSelectors to get selectors from an array of selectors
// functionNames argument is an array of function signatures
export const get = (that:any, functionNames:string[]) => {
  const selectors = that.filter((v:string) => {
    for (const functionName of functionNames) {
      if (v === that.contract.interface.getSighash(functionName)) {
        return true
      }
    }
    return false
  })
  selectors.contract = that.contract
  // selectors.remove = this.remove
  // selectors.get = this.get
  return selectors
}

// remove selectors using an array of signatures
export const removeSelectors = (selectors:string[], signatures:string[]) => {
  const iface = new ethers.utils.Interface(signatures.map(v => "function " + v))
  const removeSelectors = signatures.map(v => iface.getSighash(v))
  selectors = selectors.filter(v => !removeSelectors.includes(v))
  return selectors
}

// find a particular address position in the return value of diamondLoupeFacet.facets()
export const findAddressPositionInFacets = (facetAddress:string, facets:any) => {
  for (let i = 0; i < facets.length; i++) {
    if (facets[i].facetAddress === facetAddress) {
      return i
    }
  }
}

module.exports = {
  FacetCutAction,
  selector,
  get,
  getSelector,
  getSelectors,
  remove,
  removeSelectors,
  findAddressPositionInFacets
}
