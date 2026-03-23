"use client";
import { useState, useEffect, useCallback } from "react";
import { useSendTransaction } from "@solana/react-hooks";
import type { Address } from "@solana/kit";
import {
  PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  derivePoolPda,
  deriveStudentAccessPda,
  buildApproveStudentData,
  fetchPoolsByMentor,
  type PoolAccount,
  shortAddress,
  explorerTxUrl,
  solFromLamports,
} from "../lib/mentorvault";

export function MentorTab({ walletAddress }: { walletAddress: Address }) {
  const { send, isSending } = useSendTransaction();
  const [pools, setPools] = useState<PoolAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentInputs, setStudentInputs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string; sig?: string } | null>(null);

  const loadPools = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchPoolsByMentor(walletAddress);
      setPools(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => { loadPools(); }, [loadPools]);

  const handleApproveStudent = async (pool: PoolAccount) => {
    const studentAddr = studentInputs[pool.address]?.trim();
    if (!studentAddr) return;
    setMsg(null);
    try {
      const poolPda = await derivePoolPda(pool.sponsor, pool.poolName);
      const studentAccessPda = await deriveStudentAccessPda(poolPda, studentAddr as Address);

      const sig = await send({
        instructions: [{
          programAddress: PROGRAM_ADDRESS,
          accounts: [
            { address: walletAddress, role: 3 },   // mentor: WritableSigner
            { address: poolPda, role: 0 },           // pool: Readonly
            { address: studentAddr as Address, role: 0 }, // student: Readonly (UncheckedAccount)
            { address: studentAccessPda, role: 1 }, // student_access: Writable (init)
            { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
          ],
          data: buildApproveStudentData(),
        }],
      });

      setMsg({ type: "success", text: `Estudiante ${shortAddress(studentAddr)} aprobado.`, sig: sig ?? undefined });
      setStudentInputs((prev) => ({ ...prev, [pool.address]: "" }));
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Error desconocido" });
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {msg.text}
          {msg.sig && (
            <a href={explorerTxUrl(msg.sig)} target="_blank" rel="noreferrer" className="ml-2 underline opacity-80 hover:opacity-100">
              Ver en Explorer ->
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Pools donde eres mentor</p>
        <button onClick={loadPools} disabled={loading} className="text-xs text-gray-500 hover:text-gray-300 transition">
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {pools.length === 0 && !loading && (
        <p className="text-sm text-gray-600 py-10 text-center">
          No eres mentor en ningún pool aún.
          <br />
          <span className="text-xs text-gray-700 mt-1 block">Pide al sponsor que te asigne como mentor.</span>
        </p>
      )}

      {pools.map((pool) => (
        <div key={pool.address} className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-white">{pool.poolName}</p>
              <p className="font-mono text-xs text-gray-500 mt-0.5">{shortAddress(pool.address)}</p>
            </div>
            <div className="text-right text-xs text-gray-500 space-y-1">
              <div>Reward: <span className="text-gray-300">{solFromLamports(pool.rewardPerStudent)} SOL</span></div>
              <div className={`font-medium ${pool.studentsRewarded >= pool.maxStudents ? "text-gray-500" : "text-emerald-400"}`}>
                {pool.studentsRewarded}/{pool.maxStudents} reclamados
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-gray-400 font-medium">Aprobar estudiante</label>
            <div className="flex gap-2">
              <input
                value={studentInputs[pool.address] ?? ""}
                onChange={(e) => setStudentInputs((prev) => ({ ...prev, [pool.address]: e.target.value.trim() }))}
                placeholder="Pubkey del estudiante (base58)..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-violet-500/50 transition font-mono"
              />
              <button
                onClick={() => handleApproveStudent(pool)}
                disabled={isSending || !studentInputs[pool.address] || (studentInputs[pool.address]?.length ?? 0) < 32 || pool.studentsRewarded >= pool.maxStudents}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSending ? "Confirmando..." : "Aprobar"}
              </button>
            </div>
            {pool.studentsRewarded >= pool.maxStudents && (
              <p className="text-xs text-yellow-600">Pool completo — no se pueden aprobar más estudiantes.</p>
            )}
          </div>

          <div className="pt-1 border-t border-white/5">
            <p className="text-xs text-gray-600">
              Sponsor: <span className="font-mono text-gray-500">{shortAddress(pool.sponsor)}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
