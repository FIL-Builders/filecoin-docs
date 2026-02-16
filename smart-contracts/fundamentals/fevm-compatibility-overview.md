---
description: >-
  Concise FEVM compatibility overview, what is Filecoin-specific, and where to
  learn generic EVM/Solidity topics.
---

# FEVM compatibility overview

The FEVM (Filecoin EVM runtime) lets you run EVM smart contracts on Filecoin while using familiar Ethereum tooling.

## What FEVM compatibility means

At a high level:

* You can deploy EVM bytecode on Filecoin.
* You can use common EVM tooling such as Hardhat, Foundry, Remix, and MetaMask.
* Filecoin nodes expose Ethereum-compatible JSON-RPC methods for contract interactions.

## What is uniquely Filecoin

Filecoin is not just another EVM network. Filecoin-native capabilities include:

* Storage and retrieval guarantees anchored in the Filecoin protocol.
* Filecoin built-in actors and APIs for storage-market and network-level behaviors.
* Integration paths for modern storage workflows such as PDP.

Use these pages for Filecoin-specific implementation details:

* [The Filecoin Virtual Machine](../../architecture/the-fvm.md)
* [Call built-in actors](../developing-contracts/call-built-in-actors.md)
* [Filecoin.sol reference](../../reference/built-in-actors/filecoin.sol.md)
* [Modern storage patterns](../../reference/general/modern-storage-patterns.md)
* [PDP documentation](../../provide-storage/pdp/README.md)

## Where to learn generic Solidity and EVM basics

Generic Solidity/EVM education is maintained outside Filecoin docs:

* [Solidity documentation](https://docs.soliditylang.org/)
* [Ethereum developer documentation](https://ethereum.org/developers/docs/)
* [Hardhat documentation](https://hardhat.org/docs)
* [Foundry book](https://book.getfoundry.sh/)

## Recommended next steps in Filecoin docs

* [Developing contracts](../developing-contracts/README.md)
* [Advanced smart contracts](../advanced/README.md)
* [Filecoin EVM runtime](../../architecture/filecoin-evm-runtime.md)

[Was this page helpful?](https://airtable.com/apppq4inOe4gmSSlk/pagoZHC2i1iqgphgl/form?prefill_Page+URL=https://docs.filecoin.io/smart-contracts/fundamentals/fevm-compatibility-overview)
