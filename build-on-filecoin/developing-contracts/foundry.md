---
description: >-
  Reference guidance for Foundry on FEVM with Filecoin-specific setup links and
  official external docs.
---

# Foundry

{% hint style="info" %}
This page is Filecoin-specific guidance, not a generic Foundry tutorial.

Use the Foundry book for tool fundamentals and command semantics.
{% endhint %}

## Foundry on Filecoin

Foundry workflows can target FEVM networks using standard EVM flows plus Filecoin-specific network configuration.

Recommended Filecoin-oriented starting points:

* [FEVM Foundry kit](https://github.com/filecoin-project/fevm-foundry-kit)
* [MetaMask setup](../../basics/assets/metamask-setup.md)
* [Get test tokens](get-test-tokens.md)
* [Calibration RPC providers](../../networks/calibration/rpcs.md)

## Filecoin-specific notes

* Keep private keys and RPC credentials in environment variables.
* Validate chain and gas configuration before broadcast.
* Use Filecoin-specific actor/API references when contracts need storage-market integration.

## Official references

* [Foundry book](https://book.getfoundry.sh/)
* [FEVM compatibility overview](../fundamentals/fevm-compatibility-overview.md)

[Was this page helpful?](https://airtable.com/apppq4inOe4gmSSlk/pagoZHC2i1iqgphgl/form?prefill_Page+URL=https://docs.filecoin.io/build-on-filecoin/developing-contracts/foundry)
