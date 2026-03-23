# MentorVault UI Refresh (Edtech Dark) Design

Date: 2026-03-22
Owner: Codex + user
Target: Hackathon demo (2026-03-23 10:00 PM VET)

## Goal
Improve UX/UI clarity and perceived product quality for an educational rewards flow while keeping the interface fast and demo-friendly.

## Non-goals
- Rebuild information architecture from scratch
- Add new business logic or on-chain changes
- Create complex analytics dashboard

## Design Principles
- Dark edtech aesthetic: calm, modern, trustworthy
- Make learning progress visible at a glance
- Keep primary actions obvious and single-purpose
- Mobile-first responsive layout

## Layout
1. **Header**
   - Brand + subtitle
   - Devnet pill + program id link
   - Wallet button

2. **Hero**
   - One-sentence value prop focused on learning evidence
   - Supporting subtext

3. **KPI Strip (new)**
   - 4 small cards: Pools Activos, Estudiantes Registrados, Evidencias Enviadas, Rewards Liberados
   - Uses current on-chain data when available, otherwise shows placeholders

4. **Role Tabs**
   - Sponsor, Mentor, Estudiante tabs with short descriptions
   - Cards inside each tab for actions and state

## Visual Style
- Background: deep charcoal with subtle radial gradient
- Accent: teal + violet for actions, emerald for success
- Borders: thin, low-contrast
- Cards: soft blur + glass surface
- Typography: Space Grotesk (headings) + JetBrains Mono (addresses)

## Components
- KPI card: label + big number + small caption
- Status badges: Enviado, Aprobado, Reclamado
- Evidence card: link + feedback
- Primary buttons: high contrast with hover lift

## Responsive Rules
- KPI grid: 2x2 on mobile, 4 columns on desktop
- Tabs: full width on mobile, inline on desktop
- Forms: single column on mobile, two column where possible on desktop
- Ensure tap targets >= 44px

## Success Criteria
- Users can understand the flow in < 10 seconds
- Sponsor, Mentor, Estudiante actions are visually distinct
- Works on 360px width without overflow
