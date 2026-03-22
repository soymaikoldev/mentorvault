use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("Bz1ifM7QV7pBSV9SmzRTDLn7bwYQzZurDpZkMBR1dM7n");

// ─── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod vault {
    use super::*;

    /// Sponsor creates a pool and deposits SOL into the vault PDA.
    /// Total deposit = reward_per_student * max_students.
    pub fn create_pool(
        ctx: Context<CreatePool>,
        pool_name: String,
        reward_per_student: u64,
        max_students: u16,
    ) -> Result<()> {
        require!(pool_name.len() <= 32, MentorVaultError::PoolNameTooLong);
        require!(reward_per_student > 0, MentorVaultError::InvalidRewardAmount);
        require!(max_students > 0, MentorVaultError::InvalidMaxStudents);

        let total_amount = reward_per_student
            .checked_mul(max_students as u64)
            .ok_or(MentorVaultError::ArithmeticOverflow)?;

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.sponsor.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            total_amount,
        )?;

        let pool = &mut ctx.accounts.pool;
        pool.sponsor = ctx.accounts.sponsor.key();
        pool.mentor = Pubkey::default();
        pool.pool_name = pool_name;
        pool.reward_per_student = reward_per_student;
        pool.max_students = max_students;
        pool.students_rewarded = 0;
        pool.bump = ctx.bumps.pool;

        Ok(())
    }

    /// Sponsor assigns a mentor to the pool.
    pub fn add_mentor(ctx: Context<AddMentor>, mentor: Pubkey) -> Result<()> {
        ctx.accounts.pool.mentor = mentor;
        Ok(())
    }

    /// Mentor approves a student, creating a StudentAccess PDA.
    pub fn approve_student(ctx: Context<ApproveStudent>) -> Result<()> {
        let pool = &ctx.accounts.pool;
        require!(
            pool.mentor != Pubkey::default(),
            MentorVaultError::MentorNotAssigned
        );

        let student_access = &mut ctx.accounts.student_access;
        student_access.student = ctx.accounts.student.key();
        student_access.pool = ctx.accounts.pool.key();
        student_access.is_approved = true;
        student_access.has_claimed = false;
        student_access.bump = ctx.bumps.student_access;

        Ok(())
    }

    /// Approved student claims their reward from the vault PDA.
    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let pool = &ctx.accounts.pool;
        require!(
            pool.students_rewarded < pool.max_students,
            MentorVaultError::PoolFull
        );

        let reward_amount = pool.reward_per_student;
        require!(
            ctx.accounts.vault.lamports() >= reward_amount,
            MentorVaultError::InsufficientVaultFunds
        );

        // Sign with vault PDA seeds
        let pool_key = ctx.accounts.pool.key();
        let vault_bump = ctx.bumps.vault;
        let signer_seeds: &[&[&[u8]]] = &[&[b"vault", pool_key.as_ref(), &[vault_bump]]];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.student.to_account_info(),
                },
                signer_seeds,
            ),
            reward_amount,
        )?;

        ctx.accounts.student_access.has_claimed = true;
        ctx.accounts.pool.students_rewarded = ctx
            .accounts
            .pool
            .students_rewarded
            .checked_add(1)
            .ok_or(MentorVaultError::ArithmeticOverflow)?;

        Ok(())
    }
}

// ─── Account Structs ───────────────────────────────────────────────────────────

#[account]
pub struct Pool {
    pub sponsor: Pubkey,         // 32
    pub mentor: Pubkey,          // 32
    pub pool_name: String,       // 4 + 32
    pub reward_per_student: u64, // 8
    pub max_students: u16,       // 2
    pub students_rewarded: u16,  // 2
    pub bump: u8,                // 1
}

impl Pool {
    /// 8 (discriminator) + 32 + 32 + (4 + 32) + 8 + 2 + 2 + 1
    pub const LEN: usize = 8 + 32 + 32 + 36 + 8 + 2 + 2 + 1;
}

#[account]
pub struct StudentAccess {
    pub student: Pubkey,   // 32
    pub pool: Pubkey,      // 32
    pub is_approved: bool, // 1
    pub has_claimed: bool, // 1
    pub bump: u8,          // 1
}

impl StudentAccess {
    /// 8 (discriminator) + 32 + 32 + 1 + 1 + 1
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 1;
}

// ─── Instruction Contexts ──────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(pool_name: String)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,

    #[account(
        init,
        payer = sponsor,
        space = Pool::LEN,
        seeds = [b"pool", sponsor.key().as_ref(), pool_name.as_bytes()],
        bump,
    )]
    pub pool: Account<'info, Pool>,

    /// Vault PDA that holds the SOL for this pool.
    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddMentor<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool", sponsor.key().as_ref(), pool.pool_name.as_bytes()],
        bump = pool.bump,
        constraint = pool.sponsor == sponsor.key() @ MentorVaultError::UnauthorizedSponsor,
    )]
    pub pool: Account<'info, Pool>,
}

#[derive(Accounts)]
pub struct ApproveStudent<'info> {
    #[account(mut)]
    pub mentor: Signer<'info>,

    #[account(
        seeds = [b"pool", pool.sponsor.as_ref(), pool.pool_name.as_bytes()],
        bump = pool.bump,
        constraint = pool.mentor == mentor.key() @ MentorVaultError::UnauthorizedMentor,
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: The student's pubkey — not a signer, only used as seed and stored.
    pub student: UncheckedAccount<'info>,

    #[account(
        init,
        payer = mentor,
        space = StudentAccess::LEN,
        seeds = [b"student", pool.key().as_ref(), student.key().as_ref()],
        bump,
    )]
    pub student_access: Account<'info, StudentAccess>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub student: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool", pool.sponsor.as_ref(), pool.pool_name.as_bytes()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"student", pool.key().as_ref(), student.key().as_ref()],
        bump = student_access.bump,
        constraint = student_access.student == student.key() @ MentorVaultError::UnauthorizedStudent,
        constraint = student_access.pool == pool.key() @ MentorVaultError::InvalidPool,
        constraint = student_access.is_approved @ MentorVaultError::StudentNotApproved,
        constraint = !student_access.has_claimed @ MentorVaultError::AlreadyClaimed,
    )]
    pub student_access: Account<'info, StudentAccess>,

    pub system_program: Program<'info, System>,
}

// ─── Error Codes ───────────────────────────────────────────────────────────────

#[error_code]
pub enum MentorVaultError {
    #[msg("Pool name must be 32 characters or fewer")]
    PoolNameTooLong,
    #[msg("Reward per student must be greater than zero")]
    InvalidRewardAmount,
    #[msg("Max students must be greater than zero")]
    InvalidMaxStudents,
    #[msg("Only the pool sponsor can perform this action")]
    UnauthorizedSponsor,
    #[msg("Only the assigned mentor can perform this action")]
    UnauthorizedMentor,
    #[msg("No mentor has been assigned to this pool yet")]
    MentorNotAssigned,
    #[msg("Student has not been approved by the mentor")]
    StudentNotApproved,
    #[msg("Student has already claimed their reward")]
    AlreadyClaimed,
    #[msg("Pool has reached the maximum number of rewarded students")]
    PoolFull,
    #[msg("Vault does not have sufficient funds to pay the reward")]
    InsufficientVaultFunds,
    #[msg("Signer does not match the approved student")]
    UnauthorizedStudent,
    #[msg("Student access record does not belong to this pool")]
    InvalidPool,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
