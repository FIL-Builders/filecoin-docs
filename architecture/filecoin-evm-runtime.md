---
description: >-
  Filecoin-specific overview of FEVM runtime compatibility and where to find
  detailed implementation guidance.
---

# Filecoin EVM runtime

The FEVM is the EVM-compatible runtime on top of the Filecoin Virtual Machine (FVM). It allows existing EVM toolchains and contracts to run on Filecoin while integrating with Filecoin-specific capabilities.

For the canonical entry page, use [FEVM compatibility overview](../smart-contracts/fundamentals/fevm-compatibility-overview.md).

## What to expect on Filecoin

* EVM bytecode execution and Ethereum-style tooling support.
* Ethereum-compatible JSON-RPC methods on Filecoin nodes.
* Access to Filecoin-specific workflows through built-in actors and APIs.

## Filecoin-specific references

* [The Filecoin Virtual Machine](the-fvm.md)
* [Call built-in actors](../smart-contracts/developing-contracts/call-built-in-actors.md)
* [Filecoin.sol reference](../reference/built-in-actors/filecoin.sol.md)
* [Modern storage patterns](../reference/general/modern-storage-patterns.md)

## External EVM/Solidity references

* [Solidity docs](https://docs.soliditylang.org/)
* [Ethereum developer docs](https://ethereum.org/developers/docs/)

[Was this page helpful?](https://airtable.com/apppq4inOe4gmSSlk/pagoZHC2i1iqgphgl/form?prefill_Page+URL=https://docs.filecoin.io/architecture/filecoin-evm-runtime)
