/**
 * Tools such as MythX require contracts to be preprocessed.
 * The main advantage of Artifact Importer is its ability to seamlessly switch between raw and processed contracts.
 * It also removes repetitive code from the tests.
 */

import { config as dotenv_config } from "dotenv";
dotenv_config();
import { ContractJSON } from "ethereum-waffle/dist/esm/ContractJSON";

export interface ArtifactImports { [contract_name: string]: ContractJSON };

export const EMPTY_ARTIFACTS: ArtifactImports = {};

export async function import_artifacts() {
  let artifacts: ArtifactImports = {};

  let artifact_dir = process.env.USE_PROCESSED_FILES === "true" ? "./../../artifacts/contracts_processed" : "./../../artifacts/contracts";

  // diamond base
  artifacts.Diamond = await tryImport(`${artifact_dir}/Diamond.sol/Diamond.json`);

  // facets
  artifacts.DiamondCutFacet = await tryImport(`${artifact_dir}/facets/DiamondCutFacet.sol/DiamondCutFacet.json`);
  artifacts.DiamondLoupeFacet = await tryImport(`${artifact_dir}/facets/DiamondLoupeFacet.sol/DiamondLoupeFacet.json`);
  artifacts.OwnershipFacet = await tryImport(`${artifact_dir}/facets/OwnershipFacet.sol/OwnershipFacet.json`);

  // mock facets
  artifacts.Test1Facet = await tryImport(`${artifact_dir}/mocks/facets/Test1Facet.sol/Test1Facet.json`);
  artifacts.Test2Facet = await tryImport(`${artifact_dir}/mocks/facets/Test2Facet.sol/Test2Facet.json`);
  artifacts.RevertFacet = await tryImport(`${artifact_dir}/mocks/facets/RevertFacet.sol/RevertFacet.json`);
  artifacts.FallbackFacet = await tryImport(`${artifact_dir}/mocks/facets/FallbackFacet.sol/FallbackFacet.json`);

  // upgrade initializers
  artifacts.DiamondInit = await tryImport(`${artifact_dir}/upgradeInitializers/DiamondInit.sol/DiamondInit.json`);

  return artifacts;
}

async function tryImport(filepath: string) {
  try {
    var imp = await import(filepath);
    return imp;
  } catch(e) {
    return undefined;
  }
}
