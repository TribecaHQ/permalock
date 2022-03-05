//! Processor for [permalock::set_owner].

use crate::*;

/// Accounts for [permalock::set_owner].
#[derive(Accounts)]
pub struct SetOwner<'info> {
    /// The [Permalock].
    #[account(mut)]
    pub permalock: AccountLoader<'info, Permalock>,

    /// [Permalock::owner].
    pub owner: Signer<'info>,

    /// New owner.
    pub new_owner: UncheckedAccount<'info>,
}

impl<'info> SetOwner<'info> {
    fn set_owner(&self) -> Result<()> {
        let permalock = &mut self.permalock.load_mut()?;
        assert_keys_eq!(self.owner, permalock.owner, UnauthorizedNotOwner);
        permalock.owner = self.new_owner.key();
        Ok(())
    }
}

pub fn handler(ctx: Context<SetOwner>) -> Result<()> {
    ctx.accounts.set_owner()
}

impl<'info> Validate<'info> for SetOwner<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}
