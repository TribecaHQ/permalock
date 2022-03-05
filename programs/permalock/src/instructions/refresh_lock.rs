//! Processor for [permalock::refresh_lock].

use crate::*;
use anchor_spl::token::{Token, TokenAccount};
use locked_voter::{Escrow, Locker, LockerWhitelistEntry};
use num_traits::ToPrimitive;

/// Accounts for [permalock::refresh_lock].
#[derive(Accounts)]
pub struct RefreshLock<'info> {
    /// The [Permalock].
    pub permalock: AccountLoader<'info, Permalock>,

    /// [Escrow::locker].
    #[account(mut)]
    pub locker: Account<'info, Locker>,

    /// [Permalock::escrow].
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,

    /// [Escrow::tokens].
    #[account(mut)]
    pub escrow_tokens: Account<'info, TokenAccount>,

    /// [Permalock::pending_tokens].
    #[account(mut)]
    pub permalock_pending_tokens: Box<Account<'info, TokenAccount>>,

    /// The [locked_voter] program.
    pub locked_voter_program: Program<'info, locked_voter::program::LockedVoter>,

    /// The [token] program.
    pub token_program: Program<'info, Token>,
}

impl<'info> RefreshLock<'info> {
    fn max_lock_all_underlying_tokens(&self, ra: &[AccountInfo<'info>]) -> Result<()> {
        let amount = self.permalock_pending_tokens.amount;
        let permalock = self.permalock.load()?;
        let signer_seeds: &[&[&[u8]]] = permalock_seeds!(permalock);

        let cpi_ctx = CpiContext::new(
            self.locked_voter_program.to_account_info(),
            locked_voter::cpi::accounts::Lock {
                locker: self.locker.to_account_info(),
                escrow: self.escrow.to_account_info(),
                escrow_tokens: self.escrow_tokens.to_account_info(),
                escrow_owner: self.permalock.to_account_info(),
                source_tokens: self.permalock_pending_tokens.to_account_info(),
                token_program: self.token_program.to_account_info(),
            },
        )
        .with_signer(signer_seeds)
        .with_remaining_accounts(ra.to_vec());

        locked_voter::cpi::lock(
            cpi_ctx,
            amount,
            unwrap_int!(self.locker.params.max_stake_duration.to_i64()),
        )
    }
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, RefreshLock<'info>>) -> Result<()> {
    if ctx.accounts.locker.params.whitelist_enabled {
        let accounts_iter = &mut ctx.remaining_accounts.iter();
        let instructions_sysvar_info = next_account_info(accounts_iter)?;

        {
            use anchor_lang::solana_program::sysvar::SysvarId;
            assert_keys_eq!(instructions_sysvar_info.key(), Instructions::id());
        }

        let whitelist_entry_info = next_account_info(accounts_iter)?;

        {
            let whitelist_entry: Account<LockerWhitelistEntry> =
                Account::try_from(whitelist_entry_info)?;

            assert_keys_eq!(ctx.accounts.locker, whitelist_entry.locker);
            assert_keys_eq!(crate::ID, whitelist_entry.program_id);
            assert_keys_eq!(ctx.accounts.permalock, whitelist_entry.owner);
        }

        ctx.accounts.max_lock_all_underlying_tokens(&[
            instructions_sysvar_info.to_account_info(),
            whitelist_entry_info.to_account_info(),
        ])
    } else {
        ctx.accounts.max_lock_all_underlying_tokens(&[])
    }
}

impl<'info> Validate<'info> for RefreshLock<'info> {
    fn validate(&self) -> Result<()> {
        let permalock = self.permalock.load()?;
        assert_keys_eq!(self.locker, self.escrow.locker);
        assert_keys_eq!(self.escrow, permalock.escrow);
        assert_keys_eq!(self.escrow_tokens, self.escrow.tokens);
        assert_keys_eq!(self.permalock_pending_tokens, permalock.pending_tokens);
        Ok(())
    }
}
