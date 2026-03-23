# mentorvault-app

Frontend Next.js del dApp MentorVault — rewards educativos en Solana con roles de Sponsor, Mentor y Estudiante.

## Quickstart

```bash
npm install
npm run dev
```

Abre http://localhost:3000, conecta tu wallet y asegurate de estar en **devnet**.

## Demo rapida (devnet)

1. **Sponsor** — crea un pool: nombre, reward por estudiante (SOL) y cupo maximo.
2. **Sponsor** — asigna un mentor al pool pegando su pubkey.
3. **Mentor** — registra al estudiante ingresando su pubkey.
4. **Estudiante** — envia evidencia (link).
5. **Mentor** — revisa y aprueba la evidencia con feedback.
6. **Estudiante** — reclama el reward en la tab Estudiante.

Devnet faucet: https://faucet.solana.com/

## Smoke test devnet

```bash
npm run devnet-smoke
```

Requiere wallet local en `~/.config/solana/id.json` o `SOLANA_KEYPAIR=/ruta/al/keypair.json`.

## Stack

| Capa          | Tecnologia                              |
| ------------- | --------------------------------------- |
| Frontend      | Next.js 16, React 19, TypeScript        |
| Estilos       | Tailwind CSS v4                         |
| Solana client | `@solana/client`, `@solana/react-hooks` |
| Programa      | Anchor (Rust), devnet                   |

## Estructura

```
app/
  components/   sponsor-tab, mentor-tab, student-tab, wallet-button
  lib/          mentorvault.ts — PDAs, instrucciones y helpers RPC
  page.tsx      pagina principal con selector de rol
anchor/
  programs/vault/src/lib.rs   logica on-chain
scripts/
  devnet-smoke.js   smoke test end-to-end
```

## Scripts

| Comando               | Descripcion                              |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Servidor de desarrollo                   |
| `npm run build`       | Build de produccion                      |
| `npm run devnet-smoke`| Smoke test end-to-end en devnet          |
| `npm run anchor-build`| Compila el programa Anchor               |
