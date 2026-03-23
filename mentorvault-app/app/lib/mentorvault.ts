import {
  getProgramDerivedAddress,
  getAddressEncoder,
  type Address,
  type ReadonlyUint8Array,
} from "@solana/kit";

// ─── Constants ────────────────────────────────────────────────────────────────

export const PROGRAM_ADDRESS =
  "4RqpxTxbpLepFuaLK8pidbReLDxmGX8M9gKZEadXm1yX" as Address;

export const SYSTEM_PROGRAM_ADDRESS =
  "11111111111111111111111111111111" as Address;

export const DEVNET_RPC = "https://api.devnet.solana.com";

export const LAMPORTS_PER_SOL = 1_000_000_000n;

// Account discriminators: sha256("account:<Name>")[0..8]
export const POOL_DISCRIMINATOR = new Uint8Array([
  241, 154, 109, 4, 17, 177, 109, 188,
]);
export const STUDENT_ACCESS_DISCRIMINATOR = new Uint8Array([
  179, 133, 17, 7, 106, 184, 42, 74,
]);

// Instruction discriminators: sha256("global:<name>")[0..8]
const DISC_CREATE_POOL = new Uint8Array([233, 146, 209, 142, 207, 104, 64, 188]);
const DISC_ADD_MENTOR = new Uint8Array([246, 91, 90, 224, 82, 235, 65, 66]);
const DISC_APPROVE_STUDENT = new Uint8Array([6, 121, 214, 30, 220, 176, 57, 183]);
const DISC_CLAIM_REWARD = new Uint8Array([149, 95, 181, 242, 94, 90, 158, 162]);

// ─── Account Types ────────────────────────────────────────────────────────────

export type PoolAccount = {
  address: Address;
  sponsor: Address;
  mentor: Address;
  poolName: string;
  rewardPerStudent: bigint;
  maxStudents: number;
  studentsRewarded: number;
  bump: number;
};

export type StudentAccessAccount = {
  address: Address;
  student: Address;
  pool: Address;
  isApproved: boolean;
  hasClaimed: boolean;
  bump: number;
};

// ─── PDA Derivation ───────────────────────────────────────────────────────────

const te = new TextEncoder();

export async function derivePoolPda(
  sponsor: Address,
  poolName: string
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: [te.encode("pool"), getAddressEncoder().encode(sponsor), te.encode(poolName)],
  });
  return pda;
}

export async function deriveVaultPda(pool: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: [te.encode("vault"), getAddressEncoder().encode(pool)],
  });
  return pda;
}

export async function deriveStudentAccessPda(
  pool: Address,
  student: Address
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: [
      te.encode("student"),
      getAddressEncoder().encode(pool),
      getAddressEncoder().encode(student),
    ],
  });
  return pda;
}

// ─── Instruction Data Builders ────────────────────────────────────────────────

function concat(...parts: (Uint8Array | ReadonlyUint8Array)[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p as Uint8Array, off); off += p.length; }
  return out;
}

function encodeU16LE(v: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, v, true);
  return b;
}

function encodeU64LE(v: bigint): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, v, true);
  return b;
}

function encodeBorshString(s: string): Uint8Array {
  const bytes = te.encode(s);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, bytes.length, true);
  return concat(len, bytes);
}

export function buildCreatePoolData(
  poolName: string,
  rewardPerStudent: bigint,
  maxStudents: number
): Uint8Array {
  return concat(
    DISC_CREATE_POOL,
    encodeBorshString(poolName),
    encodeU64LE(rewardPerStudent),
    encodeU16LE(maxStudents)
  );
}

export function buildAddMentorData(mentor: Address): Uint8Array {
  return concat(DISC_ADD_MENTOR, getAddressEncoder().encode(mentor));
}

export function buildApproveStudentData(): Uint8Array {
  return DISC_APPROVE_STUDENT.slice();
}

export function buildClaimRewardData(): Uint8Array {
  return DISC_CLAIM_REWARD.slice();
}

// ─── Account Parsing ──────────────────────────────────────────────────────────

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function bytesToBase58(bytes: Uint8Array): string {
  let leading = 0;
  for (const b of bytes) { if (b === 0) leading++; else break; }
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let s = "";
  while (n > 0n) { s = BASE58[Number(n % 58n)] + s; n /= 58n; }
  return "1".repeat(leading) + s;
}

function readPubkey(data: Uint8Array, offset: number): Address {
  return bytesToBase58(data.slice(offset, offset + 32)) as Address;
}

export function parsePoolAccount(address: Address, data: Uint8Array): PoolAccount | null {
  if (data.length < 8) return null;
  for (let i = 0; i < 8; i++) if (data[i] !== POOL_DISCRIMINATOR[i]) return null;

  const view = new DataView(data.buffer, data.byteOffset);
  const sponsor = readPubkey(data, 8);
  const mentor = readPubkey(data, 40);
  const nameLen = view.getUint32(72, true);
  const poolName = new TextDecoder().decode(data.slice(76, 76 + nameLen));
  let off = 76 + nameLen;
  const rewardPerStudent = view.getBigUint64(off, true); off += 8;
  const maxStudents = view.getUint16(off, true); off += 2;
  const studentsRewarded = view.getUint16(off, true); off += 2;
  const bump = data[off];

  return { address, sponsor, mentor, poolName, rewardPerStudent, maxStudents, studentsRewarded, bump };
}

export function parseStudentAccessAccount(
  address: Address,
  data: Uint8Array
): StudentAccessAccount | null {
  if (data.length < 8) return null;
  for (let i = 0; i < 8; i++) if (data[i] !== STUDENT_ACCESS_DISCRIMINATOR[i]) return null;

  const student = readPubkey(data, 8);
  const pool = readPubkey(data, 40);
  const isApproved = data[72] === 1;
  const hasClaimed = data[73] === 1;
  const bump = data[74];

  return { address, student, pool, isApproved, hasClaimed, bump };
}

// ─── RPC Helpers ─────────────────────────────────────────────────────────────

type RpcFilter =
  | { memcmp: { offset: number; bytes: string; encoding: "base58" } }
  | { dataSize: number };

async function getProgramAccounts(filters: RpcFilter[]) {
  const resp = await fetch(DEVNET_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getProgramAccounts",
      params: [
        PROGRAM_ADDRESS,
        {
          encoding: "base64",
          filters,
        },
      ],
    }),
  });
  const json = await resp.json();
  return (json.result ?? []) as Array<{
    pubkey: string;
    account: { data: [string, string]; lamports: number };
  }>;
}

export async function fetchPoolsBySponsor(sponsor: Address): Promise<PoolAccount[]> {
  const results = await getProgramAccounts([
    { memcmp: { offset: 8, bytes: sponsor as string, encoding: "base58" } },
  ]);
  return results
    .map((r) => {
      const bytes = Uint8Array.from(atob(r.account.data[0]), (c) => c.charCodeAt(0));
      return parsePoolAccount(r.pubkey as Address, bytes);
    })
    .filter((p): p is PoolAccount => p !== null);
}

export async function fetchPoolsByMentor(mentor: Address): Promise<PoolAccount[]> {
  const results = await getProgramAccounts([
    { memcmp: { offset: 40, bytes: mentor as string, encoding: "base58" } },
  ]);
  return results
    .map((r) => {
      const bytes = Uint8Array.from(atob(r.account.data[0]), (c) => c.charCodeAt(0));
      return parsePoolAccount(r.pubkey as Address, bytes);
    })
    .filter((p): p is PoolAccount => p !== null && p.mentor === mentor);
}

export async function fetchStudentAccessByStudent(
  student: Address
): Promise<StudentAccessAccount[]> {
  const results = await getProgramAccounts([
    { memcmp: { offset: 8, bytes: student as string, encoding: "base58" } },
  ]);
  return results
    .map((r) => {
      const bytes = Uint8Array.from(atob(r.account.data[0]), (c) => c.charCodeAt(0));
      return parseStudentAccessAccount(r.pubkey as Address, bytes);
    })
    .filter((s): s is StudentAccessAccount => s !== null);
}

export async function fetchPoolByAddress(addr: Address): Promise<PoolAccount | null> {
  const resp = await fetch(DEVNET_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [addr, { encoding: "base64" }],
    }),
  });
  const json = await resp.json();
  if (!json.result?.value) return null;
  const bytes = Uint8Array.from(atob(json.result.value.data[0]), (c) => c.charCodeAt(0));
  return parsePoolAccount(addr, bytes);
}

export function shortAddress(addr: string) {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

export function explorerTxUrl(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function solFromLamports(lamports: bigint) {
  return (Number(lamports) / Number(LAMPORTS_PER_SOL)).toFixed(4);
}
