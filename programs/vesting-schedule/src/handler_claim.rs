use crate::{tokenoperation, vesting_operations, Claim, ClaimEffects};
use anchor_lang::prelude::*;

pub fn process(ctx: Context<Claim>, user_id: u64) -> ProgramResult {
    utils::assert_permissions(&ctx, user_id)?;

    let schedule = &mut ctx.accounts.vesting_schedule.load_mut()?;
    let vesting_data = &mut ctx.accounts.vesting_data;

    let ClaimEffects { claimable_amount } =
        vesting_operations::claim(schedule, user_id, vesting_data)?;

    if claimable_amount > 0 {
        tokenoperation::token_operations::vesting_transfer(
            claimable_amount,
            vesting_data.admin,
            &ctx.accounts.claim_user_hbb_ata,
            &ctx.accounts.vesting_vault,
            &ctx.accounts.vesting_vault_authority,
            vesting_data.vesting_vault_authority_seed,
            &ctx.accounts.token_program.to_account_info(),
        );
    }

    Ok(())
}

mod utils {
    use anchor_lang::prelude::*;
    use vipers::{assert_ata, assert_keys_eq};

    pub fn assert_permissions(ctx: &Context<crate::Claim>, user_id: u64) -> ProgramResult {
        let schedule = &mut ctx.accounts.vesting_schedule.load_mut()?;

        assert_keys_eq!(
            schedule.data[user_id as usize].user,
            ctx.accounts.claiming_user.key(),
        );

        assert_ata!(
            ctx.accounts.claim_user_hbb_ata,
            ctx.accounts.claiming_user,
            ctx.accounts.hbb_mint
        );

        Ok(())
    }
}
