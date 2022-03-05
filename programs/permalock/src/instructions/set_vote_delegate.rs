//! Processor for [permalock::set_vote_delegate].

use crate::*;
use locked_voter::Escrow;

/// Accounts for [permalock::set_vote_delegate].
#[derive(Accounts)]
pub struct SetVoteDelegate<'info> {
    /// The [Permalock].
    pub permalock: AccountLoader<'info, Permalock>,

    /// [Permalock::escrow].
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,

    /// The new vote delegate.
    pub new_delegate: UncheckedAccount<'info>,

    /// The [Permalock::owner]. This is usually a DAO.
    pub owner: Signer<'info>,

    /// The [locked_voter] program.
    pub locked_voter_program: Program<'info, locked_voter::program::LockedVoter>,
}

impl<'info> SetVoteDelegate<'info> {
    fn set_vote_delegate(&self) -> Result<()> {
        let permalock = self.permalock.load()?;
        let seeds: &[&[&[u8]]] = permalock_seeds!(permalock);
        locked_voter::cpi::set_vote_delegate(
            CpiContext::new(
                self.locked_voter_program.to_account_info(),
                locked_voter::cpi::accounts::SetVoteDelegate {
                    escrow: self.escrow.to_account_info(),
                    escrow_owner: self.permalock.to_account_info(),
                },
            )
            .with_signer(seeds),
            self.new_delegate.key(),
        )
    }
}

pub fn handler(ctx: Context<SetVoteDelegate>) -> Result<()> {
    ctx.accounts.set_vote_delegate()
}

impl<'info> Validate<'info> for SetVoteDelegate<'info> {
    fn validate(&self) -> Result<()> {
        let permalock = self.permalock.load()?;
        assert_keys_eq!(permalock.escrow, self.escrow);
        assert_keys_eq!(permalock.owner, self.owner, UnauthorizedNotOwner);
        Ok(())
    }
}
