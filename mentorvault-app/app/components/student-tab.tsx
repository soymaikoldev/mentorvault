"use client";
import { useState, useEffect, useCallback } from "react";
import { useSendTransaction } from "@solana/react-hooks";
import type { Address } from "@solana/kit";
import {
  PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  deriveStudentAccessPda,
  deriveVaultPda,
  buildClaimRewardData,
  fetchStudentAccessByStudent,
  fetchPoolByAddress,
  type StudentAccessAccount,
  type PoolAccount,
  shortAddress,
  explorerTxUrl,
  solFromLamports,
} from "../lib/mentorvault";

type StudentEntry = {
  access: StudentAccessAccount;
  pool: PoolAccount | null;
};

export function StudentTab({ walletAddress }: { walletAddress: Address }) {
  const { send, isSending } = useSendTransaction();
  const [entries, setEntries] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string; sig?: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const accesses = await fetchStudentAccessByStudent(walletAddress);
      const withPools = await Promise.all(
        accesses.map(async (access) => {
          const pool = await fetchPoolByAddress(access.pool);
          return { access, pool };
        })
      );
      setEntries(withPools);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClaim = async (entry: StudentEntry) => {
    if (!entry.pool) return;
    setMsg(null);
    setClaiming(entry.access.address);
    try {
      const poolPda = entry.access.pool;
      const vaultPda = await deriveVaultPda(poolPda);
      const studentAccessPda = await deriveStudentAccessPda(poolPda, walletAddress);

      const sig = await send({
        instructions: [{
          programAddress: PROGRAM_ADDRESS,
          accounts: [
            { address: walletAddress, role: 3 },   // student: WritableSigner
            { address: poolPda, role: 1 },           // pool: Writable
            { address: vaultPda, role: 1 },          // vault: Writable
            { address: studentAccessPda, role: 1 }, // student_access: Writable
            { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
          ],
          data: buildClaimRewardData(),
        }],
      });

      setMsg({
        type: "success",
        text: `¡Reward reclamado! ${solFromLamports(entry.pool.rewardPerStudent)} SOL transferidos.`,
        sig: sig ?? undefined,
      });
      await loadData();
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Error desconocido" });
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {msg.text}
          {msg.sig && (
            <a href={explorerTxUrl(msg.sig)} target="_blank" rel="noreferrer" className="ml-2 underline opacity-80 hover:opacity-100">
              Ver en Explorer →
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Tus accesos a pools</p>
        <button onClick={loadData} disabled={loading} className="text-xs text-gray-500 hover:text-gray-300 transition">
          {loading ? "Cargando…" : "↻ Actualizar"}
        </button>
      </div>

      {entries.length === 0 && !loading && (
        <p className="text-sm text-gray-600 py-10 text-center">
          No tienes acceso aprobado en ningún pool.
          <br />
          <span className="text-xs text-gray-700 mt-1 block">Pide al mentor que te apruebe.</span>
        </p>
      )}

      <div className="space-y-4">
        {entries.map(({ access, pool }) => {
          const isBusy = isSending && claiming === access.address;
          return (
            <div key={access.address} className="rounded-xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">
                    {pool?.poolName ?? <span className="text-gray-500 font-normal">Pool desconocido</span>}
                  </p>
                  <p className="font-mono text-xs text-gray-500 mt-0.5">{shortAddress(access.pool)}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge label="Aprobado" active={access.isApproved} />
                  <StatusBadge label="Reclamado" active={access.hasClaimed} />
                </div>
              </div>

              {pool && (
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div>Reward: <span className="text-gray-300">{solFromLamports(pool.rewardPerStudent)} SOL</span></div>
                  <div>Sponsor: <span className="font-mono text-gray-400">{shortAddress(pool.sponsor)}</span></div>
                  <div>Mentor: <span className="font-mono text-gray-400">{shortAddress(pool.mentor)}</span></div>
                </div>
              )}

              <div className="mt-4">
                {!access.isApproved && (
                  <p className="text-xs text-yellow-600">Pendiente de aprobación por el mentor.</p>
                )}
                {access.isApproved && access.hasClaimed && (
                  <p className="text-xs text-gray-500">Ya reclamaste tu reward en este pool.</p>
                )}
                {access.isApproved && !access.hasClaimed && (
                  <button
                    onClick={() => handleClaim({ access, pool })}
                    disabled={isSending || !pool}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isBusy ? "Confirmando…" : `Reclamar ${pool ? solFromLamports(pool.rewardPerStudent) + " SOL" : "Reward"}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-gray-600"}`}>
      {label}
    </span>
  );
}
