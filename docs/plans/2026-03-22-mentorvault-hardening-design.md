# MentorVault Hardening Design (Devnet, demo ready)

Date: 2026-03-22
Owner: Codex + user
Target demo: 2026-03-23 10:00 PM VET

## Goals
- Make the repo technically coherent for demo (no template leftovers or mismatched clients/tests).
- Validate the on-chain flow on devnet with a real smoke test.
- Improve narrative and demo instructions with minimal UX edits.

## Non-goals
- Major feature expansion or protocol redesign.
- Production hardening or mainnet deployment.

## Current Findings
- Codama-generated client exports only deposit/withdraw (legacy), while program implements pools/mentor/student flow.
- Rust tests target legacy deposit/withdraw, not current program.
- Legacy UI components (vault-card) remain but are unused.
- Visible mojibake in UI/README strings.
- Root README still template-focused.

## Approach Options (Summary)
- A (Recommended): Fix coherence first (client/tests/legacy cleanup), then narrative/demo polish.
- B: Minimal tests only.
- C: UX-first, minimal tests.

## Selected Approach
Approach A: Coherence first with devnet smoke test, then narrative/demo polish.

## Technical Plan (High level)
1. Align client and program
   - Regenerate Codama client from the current IDL, or remove it if unused.
   - Ensure any program IDs and discriminators align with current program.

2. Replace tests with devnet smoke test
   - Create an npm script (e.g., `devnet-smoke`) that runs a TypeScript script.
   - Use local wallet `~/.config/solana/id.json` as payer.
   - Run real devnet transactions: create pool, add mentor, approve student, claim reward.
   - Output tx signatures and explorer links.

3. Remove legacy/template artifacts
   - Remove unused `vault-card` UI and any related references.
   - Update README(s) to MentorVault narrative and a short demo flow.

4. Fix encoding
   - Replace mojibake in UI and README with proper UTF-8 content.

## Data Flow (Devnet smoke test)
- Payer wallet funds pool vault (create_pool).
- Mentor (payer) approves student (new keypair).
- Student claims reward; verify pool counter and student balance.

## Risks
- Devnet RPC flakiness or airdrop limits.
- Wallet local file missing or not funded.

## Mitigations
- Use retries for airdrop.
- Print clear failure messages and explorer URLs for debugging.

## Success Criteria
- Smoke test passes end-to-end on devnet with visible txs in explorer.
- No legacy client/test mismatch.
- README and UI reflect MentorVault and show clean text.
