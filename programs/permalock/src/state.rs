//! Struct definitions for accounts that hold state.

use anchor_lang::solana_program::pubkey::PUBKEY_BYTES;

use crate::*;

/// A permanently locked [locked_voter::Escrow].
#[account(zero_copy)]
#[derive(Debug, Default, PartialEq, Eq)]
pub struct Permalock {
    /// Base of the [Permalock].
    pub base: Pubkey,
    /// Bump seed.
    pub bump: u8,

    /// Padding.
    _padding: [u8; 7],

    /// The [locked_voter::Escrow].
    pub escrow: Pubkey,
    /// The [anchor_spl::token::Mint] staked into the [locked_voter::Escrow].
    pub staked_token_mint: Pubkey,
    /// [anchor_spl::token::TokenAccount] which one can send [locked_voter::Locker::token_mint] tokens to.
    /// This enables other programs to stake into the [Permalock].
    pub pending_tokens: Pubkey,

    /// Can modify the vote delegate of the escrow. This is usually a DAO.
    pub owner: Pubkey,
    /// Can modify the owner of the [Permalock]. Set this to [Pubkey::default] to ensure the escrow is non-transferrable.
    pub owner_setter: Pubkey,
}

impl Permalock {
    /// Number of bytes of a [Permalock].
    pub const LEN: usize = PUBKEY_BYTES + 1 + 7 + PUBKEY_BYTES * 5;
}
