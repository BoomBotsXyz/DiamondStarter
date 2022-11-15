# DiamondStarter
A template for solidity projects using ERC2535 diamonds.

This is a fork of diamond-3-hardhat with a few modifications centered around cleanliness, gas efficiency, and operation in production.
- multicall
- code organization and comments
- javascript -> typescript
- 100% test coverage

## Install Dependencies

`npm i`

## Compile Contracts

`npx hardhat compile`

## Run Tests

`npx hardhat test`
or
`npx hardhat coverage`

## Deployment

`npx hardhat run scripts/deploy.ts --network ethereum`
