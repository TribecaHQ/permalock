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
//! - [`PLKZAXAYmZSfQv61tL2XALX4c14fcEhJj2CJhU1KcKd`](https://explorer.solana.com/address/DPLKZAXAYmZSfQv61tL2XALX4c14fcEhJj2CJhU1KcKd)
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

pub use state::*;

use instructions::*;

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
    /// Must be called by the [Permalock::owner].
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
    #[msg("Only the operator of the Permalock may execute this instruction.")]
    UnauthorizedNotOperator,
    #[msg("Current rewards epoch must be non-zero to copy.")]
    CopyRewardsEpochIsZero,
    #[msg("Provided epoch gauge must be of the current rewards epoch.")]
    CopyWrongEpochGauge,
    #[msg("The supplied token of appreciation may no longer be minted.")]
    TAPExpired,
    #[msg("The gauge mapping is not enabled.")]
    GaugeMappingNotEnabled,
    #[msg("The TAP decimals must be equivalent to the staked token's decimals.")]
    TAPDecimalMismatch,
    #[msg("Only the benefactor of the TAP may execute this instruction.")]
    UnauthorizedNotBenefactor,
}
