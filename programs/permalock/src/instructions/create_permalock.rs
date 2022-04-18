//! Processor for [permalock::create_permalock].

use anchor_spl::token::TokenAccount;
use locked_voter::Locker;

use crate::*;

/// Accounts for [permalock::create_permalock].
#[derive(Accounts)]
pub struct CreatePermalock<'info> {
    /// Base key.
    pub base: Signer<'info>,

    /// The [Permalock] to be created.
    #[account(
        init,
        seeds = [
            b"Permalock".as_ref(),
            base.key().as_ref()
        ],
        bump,
        space = 8 + Permalock::LEN,
        payer = payer
    )]
    pub permalock: AccountLoader<'info, Permalock>,

    /// The [Locker].
    pub locker: Account<'info, Locker>,

    /// The uninitialized [locked_voter::Escrow].
    #[account(mut)]
    pub escrow: SystemAccount<'info>,

    /// [Permalock::pending_tokens].
    pub permalock_pending_tokens: Account<'info, TokenAccount>,

    /// [Permalock::owner].
    /// CHECK: This can be an arbitrary account.
    pub owner: UncheckedAccount<'info>,

    /// [Permalock::owner_setter].
    /// CHECK: This can be an arbitrary account.
    pub owner_setter: UncheckedAccount<'info>,

    /// Payer.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// [System] program.
    pub system_program: Program<'info, System>,

    /// The [locked_voter] program.
    pub locked_voter_program: Program<'info, locked_voter::program::LockedVoter>,
}

impl<'info> CreatePermalock<'info> {
    fn create_permalock(&self, permalock_bump: u8) -> Result<()> {
        let permalock = &mut self.permalock.load_init()?;
        permalock.base = self.base.key();
        permalock.bump = permalock_bump;

        permalock.escrow = self.escrow.key();
        permalock.staked_token_mint = self.locker.token_mint;
        permalock.pending_tokens = self.permalock_pending_tokens.key();

        permalock.owner = self.owner.key();
        permalock.owner_setter = self.owner_setter.key();

        Ok(())
    }

    fn create_escrow(&self, escrow_bump: u8) -> Result<()> {
        locked_voter::cpi::new_escrow(
            CpiContext::new(
                self.locked_voter_program.to_account_info(),
                locked_voter::cpi::accounts::NewEscrow {
                    locker: self.locker.to_account_info(),
                    escrow: self.escrow.to_account_info(),
                    escrow_owner: self.permalock.to_account_info(),
                    payer: self.payer.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                },
            ),
            escrow_bump,
        )
    }
}

pub fn handler(ctx: Context<CreatePermalock>, escrow_bump: u8) -> Result<()> {
    let permalock_bump = unwrap_bump!(ctx, "permalock");
    ctx.accounts.create_permalock(permalock_bump)?;
    ctx.accounts.create_escrow(escrow_bump)?;
    Ok(())
}

impl<'info> Validate<'info> for CreatePermalock<'info> {
    fn validate(&self) -> Result<()> {
        assert_is_zero_token_account!(self.permalock_pending_tokens);
        assert_keys_eq!(self.permalock_pending_tokens.owner, self.permalock);
        assert_keys_eq!(self.permalock_pending_tokens.mint, self.locker.token_mint);
        Ok(())
    }
}
