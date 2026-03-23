const fs = require("fs");
const path = require("path");
let web3;
try {
  web3 = require("@solana/web3.js");
} catch (err) {
  console.error("Missing @solana/web3.js. Run npm install before devnet smoke test.");
  process.exit(1);
}
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} = web3;

const PROGRAM_ID = new PublicKey("4RqpxTxbpLepFuaLK8pidbReLDxmGX8M9gKZEadXm1yX");
const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";

const DISC_CREATE_POOL = Buffer.from([233, 146, 209, 142, 207, 104, 64, 188]);
const DISC_ADD_MENTOR = Buffer.from([246, 91, 90, 224, 82, 235, 65, 66]);
const DISC_APPROVE_STUDENT = Buffer.from([6, 121, 214, 30, 220, 176, 57, 183]);
const DISC_CLAIM_REWARD = Buffer.from([149, 95, 181, 242, 94, 90, 158, 162]);

const POOL_DISCRIMINATOR = Buffer.from([241, 154, 109, 4, 17, 177, 109, 188]);

function explorerTx(sig) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

function loadKeypair() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const defaultPath = home
    ? path.join(home, ".config", "solana", "id.json")
    : null;
  const kpPath = process.env.SOLANA_KEYPAIR || defaultPath;
  if (!kpPath || !fs.existsSync(kpPath)) {
    console.error("Missing Solana keypair. Set SOLANA_KEYPAIR or ensure ~/.config/solana/id.json exists.");
    process.exit(1);
  }
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(kpPath, "utf8")));
  return Keypair.fromSecretKey(secret);
}

function u16LE(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

function u64LE(n) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

function borshString(s) {
  const buf = Buffer.from(s, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(buf.length);
  return Buffer.concat([len, buf]);
}

async function airdropIfNeeded(conn, pubkey, minSol) {
  const minLamports = Math.floor(minSol * LAMPORTS_PER_SOL);
  const bal = await conn.getBalance(pubkey, "confirmed");
  if (bal >= minLamports) return;
  const sig = await conn.requestAirdrop(pubkey, minLamports - bal);
  const latest = await conn.getLatestBlockhash();
  await conn.confirmTransaction({ signature: sig, ...latest }, "confirmed");
}

function parsePoolAccount(data) {
  if (data.length < 8) throw new Error("Pool account too small");
  if (!data.slice(0, 8).equals(POOL_DISCRIMINATOR)) {
    throw new Error("Pool discriminator mismatch");
  }
  let offset = 8 + 32 + 32;
  const nameLen = data.readUInt32LE(offset);
  offset += 4;
  const poolName = data.slice(offset, offset + nameLen).toString("utf8");
  offset += nameLen;
  const rewardPerStudent = data.readBigUInt64LE(offset);
  offset += 8;
  const maxStudents = data.readUInt16LE(offset);
  offset += 2;
  const studentsRewarded = data.readUInt16LE(offset);
  offset += 2;
  const bump = data.readUInt8(offset);
  return { poolName, rewardPerStudent, maxStudents, studentsRewarded, bump };
}

async function main() {
  const payer = loadKeypair();
  const conn = new Connection(RPC, "confirmed");

  await airdropIfNeeded(conn, payer.publicKey, 0.2);

  const poolName = `demo-${Date.now()}`;
  const rewardLamports = Math.floor(0.01 * LAMPORTS_PER_SOL);
  const maxStudents = 1;

  const [poolPda] = await PublicKey.findProgramAddress(
    [Buffer.from("pool"), payer.publicKey.toBuffer(), Buffer.from(poolName)],
    PROGRAM_ID
  );
  const [vaultPda] = await PublicKey.findProgramAddress(
    [Buffer.from("vault"), poolPda.toBuffer()],
    PROGRAM_ID
  );

  const createData = Buffer.concat([
    DISC_CREATE_POOL,
    borshString(poolName),
    u64LE(rewardLamports),
    u16LE(maxStudents),
  ]);

  const createIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: poolPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: createData,
  });

  const addMentorData = Buffer.concat([DISC_ADD_MENTOR, payer.publicKey.toBuffer()]);
  const addMentorIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: poolPda, isSigner: false, isWritable: true },
    ],
    data: addMentorData,
  });

  const student = Keypair.generate();
  await airdropIfNeeded(conn, student.publicKey, 0.1);

  const [studentAccessPda] = await PublicKey.findProgramAddress(
    [Buffer.from("student"), poolPda.toBuffer(), student.publicKey.toBuffer()],
    PROGRAM_ID
  );

  const approveIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: poolPda, isSigner: false, isWritable: false },
      { pubkey: student.publicKey, isSigner: false, isWritable: false },
      { pubkey: studentAccessPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: DISC_APPROVE_STUDENT,
  });

  const claimIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: student.publicKey, isSigner: true, isWritable: true },
      { pubkey: poolPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: studentAccessPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: DISC_CLAIM_REWARD,
  });

  console.log("RPC:", RPC);
  console.log("Payer:", payer.publicKey.toBase58());
  console.log("Pool:", poolPda.toBase58());
  console.log("Vault:", vaultPda.toBase58());
  console.log("Student:", student.publicKey.toBase58());

  const sig1 = await sendAndConfirmTransaction(
    conn,
    new Transaction().add(createIx),
    [payer]
  );
  console.log("create_pool:", sig1, explorerTx(sig1));

  const sig2 = await sendAndConfirmTransaction(
    conn,
    new Transaction().add(addMentorIx),
    [payer]
  );
  console.log("add_mentor:", sig2, explorerTx(sig2));

  const sig3 = await sendAndConfirmTransaction(
    conn,
    new Transaction().add(approveIx),
    [payer]
  );
  console.log("approve_student:", sig3, explorerTx(sig3));

  const sig4 = await sendAndConfirmTransaction(
    conn,
    new Transaction().add(claimIx),
    [student]
  );
  console.log("claim_reward:", sig4, explorerTx(sig4));

  const poolInfo = await conn.getAccountInfo(poolPda, "confirmed");
  if (!poolInfo) throw new Error("Pool account not found");
  const parsed = parsePoolAccount(Buffer.from(poolInfo.data));
  if (parsed.studentsRewarded !== 1) {
    throw new Error(`Expected students_rewarded = 1, got ${parsed.studentsRewarded}`);
  }

  console.log("Smoke test OK. students_rewarded =", parsed.studentsRewarded);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
