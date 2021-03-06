//! Permalock: Tribeca vote escrows with infinite lockup durations.
//!
//! # About
//!
//! The Permalock program allows the creation of *permalocks*: vote escrows which are always locked to the maximum duration.
//!
//! It works by allowing any user to refresh the lockup period of the vote escrow to the maximum period,
//! ensuring that the owner of the Permalock can never unstake the tokens. Since the Tribeca DAO holds the program
//! upgrade keys, a DAO can be certain that a permalock will never be unlocked, ever.
//!
//! # Documentation
//!
//! Detailed documentation may be found on the [Tribeca Documentation site.](https://docs.tribeca.so)
//!
//! # Usage
//!
//! ## Locking tokens
//!
//! First, transfer tokens to the Permalock's `pending_tokens` account. The `pending_tokens` account holds all tokens that
//! are ready to be max-locked.
//!
//! Next, refresh the Permalock with [`permalock::refresh_lock`]. This refreshes the Permalock's escrow
//! to max lock the tokens that have been deposited, plus refreshes the lock period of all existing Escrow tokens.
//!
//! # Address
//!
//! Program addresses are the same on devnet, testnet, and mainnet-beta.
//!
//! - Permalock: [`PLKZAXAYmZSfQv61tL2XALX4c14fcEhJj2CJhU1KcKd`](https://explorer.solana.com/address/PLKZAXAYmZSfQv61tL2XALX4c14fcEhJj2CJhU1KcKd)
//!
//! # Contribution
//!
//! Thank you for your interest in contributing to Tribeca Protocol! All contributions are welcome no matter how big or small. This includes
//! (but is not limited to) filing issues, adding documentation, fixing bugs, creating examples, and implementing features.
//!
//! When contributing, please make sure your code adheres to some basic coding guidlines:
//!
//! - Code must be formatted with the configured formatters (e.g. `rustfmt` and `prettier`).
//! - Comment lines should be no longer than 80 characters and written with proper grammar and punctuation.
//!
//! # License
//!
//! The Tribeca Permalock program is licensed under the Affero General Public License, version 3.0.
#![deny(rustdoc::all)]
#![allow(rustdoc::missing_doc_code_examples)]
#![deny(clippy::unwrap_used)]

use anchor_lang::prelude::*;
use vipers::prelude::*;

mod instructions;
mod macros;
mod state;

use instructions::*;
pub use state::*;

declare_id!("PLKZAXAYmZSfQv61tL2XALX4c14fcEhJj2CJhU1KcKd");

/// The [permalock] program.
#[program]
pub mod permalock {
    use super::*;

    // Locking

    /// Creates a [Permalock] for a [locked_voter::Locker].
    ///
    /// # Permissions
    ///
    /// Permissionless.
    #[access_control(ctx.accounts.validate())]
    pub fn create_permalock(ctx: Context<CreatePermalock>, escrow_bump: u8) -> Result<()> {
        create_permalock::handler(ctx, escrow_bump)
    }

    /// Locks all [Permalock::pending_tokens] into the [Permalock]'s escrow.
    ///
    /// # Permissions
    ///
    /// Permissionless.
    #[access_control(ctx.accounts.validate())]
    pub fn refresh_lock<'info>(ctx: Context<'_, '_, '_, 'info, RefreshLock<'info>>) -> Result<()> {
        refresh_lock::handler(ctx)
    }

    // Voting

    /// Sets the vote delegate of a [Permalock].
    ///
    /// # Permissions
    ///
    /// Must be called by the [Permalock::owner].
    #[access_control(ctx.accounts.validate())]
    pub fn set_vote_delegate(ctx: Context<SetVoteDelegate>) -> Result<()> {
        set_vote_delegate::handler(ctx)
    }

    // Admin

    /// Sets the owner of a [Permalock].
    ///
    /// # Permissions
    ///
    /// Must be called by the [Permalock::owner_setter].
    #[access_control(ctx.accounts.validate())]
    pub fn set_owner(ctx: Context<SetOwner>) -> Result<()> {
        set_owner::handler(ctx)
    }
}

/// Errors.
#[error_code]
pub enum ErrorCode {
    #[msg("Only the owner of the Permalock may execute this instruction.")]
    UnauthorizedNotOwner,
    #[msg("Only the owner setter of the Permalock may execute this instruction.")]
    UnauthorizedNotOwnerSetter,
}
