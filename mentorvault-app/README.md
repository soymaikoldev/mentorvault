# mentorvault-app

Next.js dApp para MentorVault (rewards educativos en Solana) con roles de Sponsor, Mentor y Estudiante.

## Quickstart

```bash
npm install
npm run dev
```

Abre http://localhost:3000, conecta tu wallet y usa devnet.

## Demo rapida (devnet)

1. Sponsor crea un pool y define reward por estudiante.
2. Sponsor asigna un mentor.
3. Mentor aprueba al estudiante.
4. Estudiante reclama el reward.

Devnet faucet: https://faucet.solana.com/

## Smoke test devnet

```bash
npm run devnet-smoke
```

Requiere una wallet local en `~/.config/solana/id.json` o `SOLANA_KEYPAIR=/ruta/al/keypair.json`.

## Stack

| Layer         | Technology                              |
| ------------- | --------------------------------------- |
| Frontend      | Next.js 16, React 19, TypeScript        |
| Styling       | Tailwind CSS v4                         |
| Solana Client | `@solana/client`, `@solana/react-hooks` |
| Program       | Anchor (Rust)                           |

## Project Structure

```
+-- app/
¦   +-- components/
¦   +-- lib/
¦   +-- page.tsx
+-- anchor/
¦   +-- programs/vault/
+-- scripts/
    +-- devnet-smoke.js
```
