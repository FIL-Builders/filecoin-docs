---
description: >-
  This page gives a very basic overview of how to install Lotus on your
  computer.
---

# Basic setup

For current full-node installation instructions, use the [Lotus installation documentation](https://lotus.filecoin.io/lotus/install/linux/) and the [latest Lotus release](https://github.com/filecoin-project/lotus/releases/latest). Build requirements change with Lotus releases, so check the release's `go.mod` and install notes before pinning toolchain versions.

The source-build flow for a mainnet Lotus daemon looks like this:

```sh
git clone https://github.com/filecoin-project/lotus.git
cd lotus
LOTUS_RELEASE="$(git tag --list 'v*' --sort=-v:refname | grep -v '-' | head -n 1)"
git checkout "$LOTUS_RELEASE"
make clean lotus
sudo make install-daemon
lotus --version
lotus daemon
```

For Calibration testnet, build the Calibration binary instead:

```sh
make clean && make calibnet-lotus
sudo make install-daemon
lotus --version
lotus daemon
```

Storage-provider operation no longer starts with `lotus-miner run` on a laptop. Use Lotus for chain access, then follow current Curio, Boost, and PDP guidance for provider workflows. See [Install and run PDP](../../pdp/install-and-run-pdp.md), [Software components](../../architecture/lotus-components.md), and the [Curio documentation](https://docs.curiostorage.org/) for provider-specific setup.



[Was this page helpful?](https://airtable.com/apppq4inOe4gmSSlk/pagoZHC2i1iqgphgl/form?prefill\_Page+URL=https://docs.filecoin.io/storage-providers/nodes/full-nodes/basic-setup)
