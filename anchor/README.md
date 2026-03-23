# MentorVault — Anchor Program

Programa on-chain de MentorVault desplegado en Solana devnet. Gestiona pools de rewards educativos donde sponsors depositan SOL, mentores validan evidencia, y solo los estudiantes aprobados pueden reclamar su recompensa.

## Programa en devnet

```
Bz1ifM7QV7pBSV9SmzRTDLn7bwYQzZurDpZkMBR1dM7n
```

Verifica en Solana Explorer:
https://explorer.solana.com/address/Bz1ifM7QV7pBSV9SmzRTDLn7bwYQzZurDpZkMBR1dM7n?cluster=devnet

## Instrucciones

| Instruccion       | Quien la llama | Descripcion                                          |
| ----------------- | -------------- | ---------------------------------------------------- |
| `create_pool`       | Sponsor    | Crea el pool y deposita `reward * max_students` SOL  |
| `add_mentor`        | Sponsor    | Asigna un mentor al pool                             |
| `approve_student`   | Mentor     | Crea un `StudentAccess` PDA para el estudiante       |
| `submit_evidence`   | Estudiante | Envia evidencia (link)                               |
| `review_submission` | Mentor     | Aprueba o rechaza la evidencia con feedback          |
| `claim_reward`      | Estudiante | Transfiere el reward desde el vault al estudiante    |

## PDAs

| Cuenta         | Seeds                                    |
| -------------- | ---------------------------------------- |
| Pool           | `["pool", sponsor_pubkey, pool_name]`    |
| Vault          | `["vault", pool_pubkey]`                 |
| StudentAccess  | `["student", pool_pubkey, student_pubkey]` |

## Cuentas

### Pool

```
sponsor           Pubkey   // quien creo el pool
mentor            Pubkey   // mentor asignado (default = system program si sin asignar)
pool_name         String   // nombre, maximo 32 caracteres
reward_per_student u64     // lamports por estudiante
max_students       u16     // cupo maximo
students_rewarded  u16     // cuantos ya reclamaron
bump               u8
```

### StudentAccess

```
student         Pubkey  // wallet del estudiante
pool            Pubkey  // pool al que pertenece
is_submitted    bool    // evidencia enviada
is_approved     bool    // aprobado por el mentor
has_claimed     bool    // ya recibio su reward
evidence_uri    String  // link o hash (max 200)
mentor_feedback String  // feedback (max 160)
bump            u8
```

## Desplegar tu propia version

### 1. Genera un nuevo keypair para el programa

```bash
cd anchor
solana-keygen new -o target/deploy/vault-keypair.json
```

### 2. Obtiene el nuevo Program ID

```bash
solana address -k target/deploy/vault-keypair.json
```

### 3. Actualiza el Program ID en los dos archivos

`anchor/Anchor.toml`:
```toml
[programs.devnet]
vault = "<TU_PROGRAM_ID>"
```

`anchor/programs/vault/src/lib.rs`:
```rust
declare_id!("<TU_PROGRAM_ID>");
```

### 4. Compila y despliega

```bash
# Compilar
anchor build

# Airdrop para cubrir el deploy (~2 SOL)
solana airdrop 2 --url devnet

# Desplegar
anchor deploy --provider.cluster devnet
```

### 5. Actualiza el frontend

En `app/lib/mentorvault.ts`, cambia `PROGRAM_ADDRESS` al nuevo ID:

```typescript
export const PROGRAM_ADDRESS = "<TU_PROGRAM_ID>" as Address;
```

## Tests

```bash
anchor test --skip-deploy
```
