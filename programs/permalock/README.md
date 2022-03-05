# permalock

[![Crates.io](https://img.shields.io/crates/v/permalock)](https://crates.io/crates/permalock)
[![Docs.rs](https://img.shields.io/docsrs/permalock)](https://docs.rs/permalock)
[![License](https://img.shields.io/crates/l/permalock)](https://github.com/TribecaHQ/permalock/blob/master/LICENSE)
[![Build Status](https://img.shields.io/github/workflow/status/TribecaHQ/permalock/E2E/master)](https://github.com/TribecaHQ/permalock/actions/workflows/programs-e2e.yml?query=branch%3Amaster)
[![Contributors](https://img.shields.io/github/contributors/TribecaHQ/permalock)](https://github.com/TribecaHQ/permalock/graphs/contributors)
[![NPM](https://img.shields.io/npm/v/@tribecahq/permalock)](https://www.npmjs.com/package/@tribecahq/permalock)

<p align="center">
    <img src="https://raw.githubusercontent.com/TribecaHQ/permalock/master/images/banner.png" />
</p>

Permalock: Tribeca vote escrows with infinite lockup durations.

## About

The Permalock program allows the creation of _permalocks_: vote escrows which are always locked to the maximum duration.

It works by allowing any user to refresh the lockup period of the vote escrow to the maximum period,
ensuring that the owner of the Permalock can never unstake the tokens. Since the Tribeca DAO holds the program
upgrade keys, a DAO can be certain that a permalock will never be unlocked, ever.

## Documentation

Detailed documentation may be found on the [Tribeca Documentation site.](https://docs.tribeca.so)

## Usage

### Locking tokens

First, transfer tokens to the Permalock's `pending_tokens` account. The `pending_tokens` account holds all tokens that
are ready to be max-locked.

Next, refresh the Permalock with [`permalock::refresh_lock`]. This refreshes the Permalock's escrow
to max lock the tokens that have been deposited, plus refreshes the lock period of all existing Escrow tokens.

## Address

Program addresses are the same on devnet, testnet, and mainnet-beta.

- Permalock: [`PLKZAXAYmZSfQv61tL2XALX4c14fcEhJj2CJhU1KcKd`](https://explorer.solana.com/address/PLKZAXAYmZSfQv61tL2XALX4c14fcEhJj2CJhU1KcKd)

## Contribution

Thank you for your interest in contributing to Tribeca Protocol! All contributions are welcome no matter how big or small. This includes
(but is not limited to) filing issues, adding documentation, fixing bugs, creating examples, and implementing features.

When contributing, please make sure your code adheres to some basic coding guidlines:

- Code must be formatted with the configured formatters (e.g. `rustfmt` and `prettier`).
- Comment lines should be no longer than 80 characters and written with proper grammar and punctuation.

## License

The Tribeca Permalock program is licensed under the Affero General Public License, version 3.0.
