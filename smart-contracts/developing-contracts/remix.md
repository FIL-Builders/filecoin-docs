---
description: >-
  Reference guidance for using Remix with FEVM, focused on Filecoin-specific
  considerations and official external docs.
---

# Remix

{% hint style="info" %}
This page is Filecoin-specific guidance, not a Solidity 101 tutorial.

For generic Remix and Solidity walkthroughs, use the official external docs.
{% endhint %}

## Use Remix with FEVM

Remix works with FEVM through standard EVM flows, including injected wallet providers and contract deployment through Ethereum-compatible RPC endpoints.

Before deploying on Filecoin, confirm:

* wallet/network configuration ([MetaMask setup](../../basics/assets/metamask-setup.md))
* test token availability ([Get test tokens](get-test-tokens.md))
* current RPC endpoint from [Calibration RPCs](../../networks/calibration/rpcs.md)

## Filecoin-specific deployment notes

* Transaction confirmation timing follows Filecoin tipset cadence.
* Gas pricing defaults in generic EVM tooling may need adjustment for Filecoin networks.
* Prefer FEVM-focused starter kits when bootstrapping new projects.

## Official references

* [Remix documentation](https://remix-ide.readthedocs.io/)
* [Solidity documentation](https://docs.soliditylang.org/)
* [FEVM compatibility overview](../fundamentals/fevm-compatibility-overview.md)

[Was this page helpful?](https://airtable.com/apppq4inOe4gmSSlk/pagoZHC2i1iqgphgl/form?prefill_Page+URL=https://docs.filecoin.io/smart-contracts/developing-contracts/remix)
