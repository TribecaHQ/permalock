//! Processor for [permalock::set_owner].

use crate::*;

/// Accounts for [permalock::set_owner].
#[derive(Accounts)]
pub struct SetOwner<'info> {
    /// The [Permalock].
    #[account(mut)]
    pub permalock: AccountLoader<'info, Permalock>,

    /// [Permalock::owner_setter].
    pub owner_setter: Signer<'info>,

    /// New owner.
    /// CHECK: This can be any account.
    pub new_owner: UncheckedAccount<'info>,
}

impl<'info> SetOwner<'info> {
    fn set_owner(&self) -> Result<()> {
        let permalock = &mut self.permalock.load_mut()?;
        assert_keys_eq!(
            self.owner_setter,
            permalock.owner_setter,
            UnauthorizedNotOwnerSetter
        );
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
