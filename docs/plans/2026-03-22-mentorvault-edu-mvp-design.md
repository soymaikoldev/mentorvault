# MentorVault MVP Educativo (Hito + Evidencia) Design

Date: 2026-03-22
Owner: Codex + user
Target demo: 2026-03-23 10:00 PM VET

## Goal
Add an educational milestone flow with evidence submission and mentor feedback so rewards are released only after verified learning.

## Non-goals
- Full multi-milestone program with dynamic reward schedules
- NFT credentials or off-chain storage integrations
- Mainnet deployment and security hardening

## Problem
Current flow approves a student and allows reward claim without evidence of learning. For hackathon scoring focused on education, we need verifiable learning steps.

## Proposed MVP (Enfoque A)
A pool represents a single educational milestone. A student must submit evidence and receive mentor feedback before claiming the reward.

### On-chain changes (minimal)
**StudentAccess** gets evidence + feedback and submission state.

New fields:
- `evidence_uri: String` (max 200 chars)
- `mentor_feedback: String` (max 160 chars)
- `is_submitted: bool`
- `is_approved: bool` (approval after review)
- `has_claimed: bool` (unchanged)

**Behavior changes:**
- `approve_student` only creates access (sets `is_approved = false`).
- `submit_evidence` allows student to submit/overwrite evidence and sets `is_submitted = true`.
- `review_submission(approve: bool, feedback: String)` sets feedback. If approved -> `is_approved = true`. If rejected -> `is_submitted = false` and `is_approved = false`.
- `claim_reward` requires `is_submitted == true` and `is_approved == true`.

**Account sizing**
StudentAccess space: 8 + 32 + 32 + 1 + 1 + 1 + (4 + 200) + (4 + 160) + 1 = 444 bytes.

### Frontend changes (minimal)
**Sponsor tab**: no change.

**Mentor tab**:
- Add a “Revisar evidencia” panel per pool.
- Mentor inputs student pubkey + feedback, chooses approve/reject.
- Calls `review_submission`.

**Student tab**:
- Add evidence input (URL).
- If access exists and not submitted, show “Enviar evidencia”.
- Show mentor feedback and status.
- Claim only when approved.

### Client/RPC changes
- Update instruction discriminators and builders for `submit_evidence` and `review_submission`.
- Update StudentAccess parsing layout.
- Add helper to fetch StudentAccess by pool (to allow mentor review UI).

### Demo flow
1. Sponsor creates pool.
2. Mentor creates student access (approve_student).
3. Student submits evidence.
4. Mentor reviews and approves with feedback.
5. Student claims reward.

## Risks
- Increased on-chain space for StudentAccess
- Instruction discriminators must match Anchor

## Mitigations
- Keep strings bounded with explicit max lengths
- Add UI validation and clear errors

## Success criteria
- End-to-end flow works on devnet.
- UI clearly shows evidence + feedback loop.
- Reward claim blocked until approval.
