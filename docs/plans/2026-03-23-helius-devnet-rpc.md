# Helius Devnet RPC Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Configurar la app para usar Helius devnet como RPC unico del frontend.

**Architecture:** El endpoint RPC se resolvera desde una utilidad compartida para que el provider de wallet y las lecturas RPC manuales usen exactamente la misma URL. Se mantendra fallback al endpoint publico de devnet si la variable de entorno aun no existe.

**Tech Stack:** Next.js 16, React 19, TypeScript, @solana/client, @solana/react-hooks

---

### Task 1: Centralizar la configuracion RPC

**Files:**
- Modify: `app/lib/mentorvault.ts`
- Modify: `app/components/providers.tsx`

**Step 1: Introducir una constante compartida para el endpoint RPC**

Definir una constante exportada que lea `process.env.NEXT_PUBLIC_HELIUS_RPC_URL` y caiga en `https://api.devnet.solana.com`.

**Step 2: Conectar el provider de Solana al endpoint compartido**

Actualizar `createClient` para reutilizar la constante compartida.

**Step 3: Conectar las lecturas RPC manuales al endpoint compartido**

Reemplazar el uso del endpoint hardcodeado en `getProgramAccounts`, `fetchPoolByAddress` y `fetchStudentAccessByAddress`.

**Step 4: Verificar build**

Run: `cmd /c npm run build`
Expected: PASS

### Task 2: Documentar la configuracion

**Files:**
- Modify: `README.md`

**Step 1: Agregar instruccion de variable de entorno**

Documentar `NEXT_PUBLIC_HELIUS_RPC_URL` para local y Vercel usando el endpoint de devnet.

**Step 2: Verificar claridad**

Confirmar que el README deja claro que la misma key sirve para devnet con otra URL base.
