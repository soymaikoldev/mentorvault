"use client";
import { useState, useEffect, useCallback } from "react";
import { useSendTransaction } from "@solana/react-hooks";
import type { Address } from "@solana/kit";
import {
  PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  LAMPORTS_PER_SOL,
  derivePoolPda,
  deriveVaultPda,
  buildCreatePoolData,
  buildAddMentorData,
  fetchPoolsBySponsor,
  type PoolAccount,
  formatTxError,
  shortAddress,
  explorerAddressUrl,
  explorerTxUrl,
  solFromLamports,
} from "../lib/mentorvault";

export function SponsorTab({ walletAddress }: { walletAddress: Address }) {
  const { send, isSending } = useSendTransaction();

  // Create Pool state
  const [poolName, setPoolName] = useState("");
  const [rewardSol, setRewardSol] = useState("");
  const [maxStudents, setMaxStudents] = useState("");

  // Add Mentor state
  const [selectedPoolAddr, setSelectedPoolAddr] = useState("");
  const [mentorInput, setMentorInput] = useState("");

  // Common
  const [pools, setPools] = useState<PoolAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string; sig?: string } | null>(null);

  const loadPools = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchPoolsBySponsor(walletAddress);
      setPools(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => { loadPools(); }, [loadPools]);

  const handleCreatePool = async () => {
    if (!poolName || !rewardSol || !maxStudents) return;
    setMsg(null);
    try {
      const rewardLamports = BigInt(Math.floor(parseFloat(rewardSol) * Number(LAMPORTS_PER_SOL)));
      const maxSt = parseInt(maxStudents, 10);
      const poolPda = await derivePoolPda(walletAddress, poolName);
      const vaultPda = await deriveVaultPda(poolPda);

      const sig = await send({
        instructions: [{
          programAddress: PROGRAM_ADDRESS,
          accounts: [
            { address: walletAddress, role: 3 },
            { address: poolPda, role: 1 },
            { address: vaultPda, role: 1 },
            { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
          ],
          data: buildCreatePoolData(poolName, rewardLamports, maxSt),
        }],
      });

      setMsg({ type: "success", text: "Pool creado exitosamente.", sig: sig ?? undefined });
      setPoolName(""); setRewardSol(""); setMaxStudents("");
      await loadPools();
    } catch (e) {
      console.error("Create pool failed", e);
      setMsg({ type: "error", text: formatTxError(e) });
    }
  };

  const handleAddMentor = async () => {
    if (!selectedPoolAddr || !mentorInput) return;
    setMsg(null);
    const pool = pools.find((p) => p.address === selectedPoolAddr);
    if (!pool) return;
    try {
      const poolPda = await derivePoolPda(walletAddress, pool.poolName);
      const sig = await send({
        instructions: [{
          programAddress: PROGRAM_ADDRESS,
          accounts: [
            { address: walletAddress, role: 3 },
            { address: poolPda, role: 1 },
          ],
          data: buildAddMentorData(mentorInput as Address),
        }],
      });
      setMsg({ type: "success", text: "Mentor asignado correctamente.", sig: sig ?? undefined });
      setMentorInput("");
      await loadPools();
    } catch (e) {
      console.error("Add mentor failed", e);
      setMsg({ type: "error", text: formatTxError(e) });
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {msg.text}
          {msg.sig && (
            <a href={explorerTxUrl(msg.sig)} target="_blank" rel="noreferrer" className="ml-2 underline opacity-80 hover:opacity-100">
              Ver en Explorer {"->"}
            </a>
          )}
        </div>
      )}

      {/* Create Pool */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-4">
        <h3 className="text-base font-semibold text-white">Crear Pool</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block mb-1.5 text-xs text-gray-400 font-medium">Nombre del pool <span className="text-gray-600">(máx 32 chars)</span></label>
            <input
              value={poolName}
              onChange={(e) => setPoolName(e.target.value.slice(0, 32))}
              placeholder="ej: solana-bootcamp-2025"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-violet-500/50 transition"
            />
          </div>
          <div>
            <label className="block mb-1.5 text-xs text-gray-400 font-medium">Reward por estudiante (SOL)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rewardSol}
              onChange={(e) => setRewardSol(e.target.value)}
              placeholder="0.1"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-violet-500/50 transition"
            />
          </div>
          <div>
            <label className="block mb-1.5 text-xs text-gray-400 font-medium">Máx. estudiantes</label>
            <input
              type="number"
              min="1"
              step="1"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              placeholder="10"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-violet-500/50 transition"
            />
          </div>
        </div>
        {rewardSol && maxStudents && parseFloat(rewardSol) > 0 && parseInt(maxStudents) > 0 && (
          <p className="text-xs text-gray-500">
            Total a depositar: <span className="text-gray-300 font-medium">{(parseFloat(rewardSol) * parseInt(maxStudents)).toFixed(4)} SOL</span>
          </p>
        )}
        <button
          onClick={handleCreatePool}
          disabled={isSending || !poolName || !rewardSol || !maxStudents}
          className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSending ? "Confirmando..." : "Crear Pool"}
        </button>
      </div>

      {/* Add Mentor */}
      {pools.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-4">
          <h3 className="text-base font-semibold text-white">Asignar Mentor</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block mb-1.5 text-xs text-gray-400 font-medium">Pool</label>
              <select
                value={selectedPoolAddr}
                onChange={(e) => setSelectedPoolAddr(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#1c1c1f] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 transition"
              >
                <option value="">Seleccionar pool...</option>
                {pools.map((p) => (
                  <option key={p.address} value={p.address}>{p.poolName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs text-gray-400 font-medium">Pubkey del mentor</label>
              <input
                value={mentorInput}
                onChange={(e) => setMentorInput(e.target.value.trim())}
                placeholder="Base58 address..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-violet-500/50 transition font-mono text-xs"
              />
            </div>
          </div>
          <button
            onClick={handleAddMentor}
            disabled={isSending || !selectedPoolAddr || mentorInput.length < 32}
            className="rounded-lg border border-violet-500/40 bg-violet-600/20 px-5 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSending ? "Confirmando..." : "Asignar Mentor"}
          </button>
        </div>
      )}

      {/* Pool list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Mis Pools</h3>
          <button onClick={loadPools} disabled={loading} className="text-xs text-gray-500 hover:text-gray-300 transition">
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
        {pools.length === 0 ? (
          <p className="text-sm text-gray-600 py-6 text-center">No has creado ningún pool aún.</p>
        ) : (
          <div className="space-y-3">
            {pools.map((p) => (
              <div key={p.address} className="rounded-xl border border-white/8 bg-white/3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{p.poolName}</p>
                    <a
                      href={explorerAddressUrl(p.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-gray-500 mt-0.5 inline-flex hover:text-gray-300 transition"
                    >
                      {shortAddress(p.address)}
                    </a>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.studentsRewarded >= p.maxStudents ? "bg-gray-800 text-gray-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                    {p.studentsRewarded}/{p.maxStudents} estudiantes
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>Reward: <span className="text-gray-300">{solFromLamports(p.rewardPerStudent)} SOL</span></div>
                  <div>
                    Mentor:{" "}
                    {p.mentor === "11111111111111111111111111111111" ? (
                      <span className="font-mono text-yellow-600">Sin asignar</span>
                    ) : (
                      <a
                        href={explorerAddressUrl(p.mentor)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-gray-300 hover:text-gray-200 transition"
                      >
                        {shortAddress(p.mentor)}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
