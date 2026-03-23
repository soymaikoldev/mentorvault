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
  buildSubmitEvidenceData,
  fetchStudentAccessByStudent,
  fetchPoolByAddress,
  type StudentAccessAccount,
  type PoolAccount,
  formatTxError,
  shortAddress,
  explorerAddressUrl,
  explorerTxUrl,
  solFromLamports,
} from "../lib/mentorvault";

type StudentEntry = {
  access: StudentAccessAccount;
  pool: PoolAccount | null;
};

type Metric = { label: string; value: string; hint?: string };

export function StudentTab({
  walletAddress,
  onMetrics,
}: {
  walletAddress: Address;
  onMetrics?: (items: Metric[]) => void;
}) {
  const { send, isSending } = useSendTransaction();
  const [entries, setEntries] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [evidenceInputs, setEvidenceInputs] = useState<Record<string, string>>({});
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
  useEffect(() => {
    if (!onMetrics) return;
    const total = entries.length;
    const submitted = entries.filter((e) => e.access.isSubmitted).length;
    const approved = entries.filter((e) => e.access.isApproved).length;
    const claimed = entries.filter((e) => e.access.hasClaimed).length;
    onMetrics([
      { label: "Accesos", value: String(total) },
      { label: "Evidencias", value: String(submitted) },
      { label: "Aprobados", value: String(approved) },
      { label: "Reclamados", value: String(claimed) },
    ]);
  }, [entries, onMetrics]);

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
            { address: walletAddress, role: 3 },
            { address: poolPda, role: 1 },
            { address: vaultPda, role: 1 },
            { address: studentAccessPda, role: 1 },
            { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
          ],
          data: buildClaimRewardData(),
        }],
      });

      setMsg({
        type: "success",
        text: `Reward reclamado: ${solFromLamports(entry.pool.rewardPerStudent)} SOL transferidos.`,
        sig: sig ?? undefined,
      });
      await loadData();
    } catch (e) {
      console.error("Claim reward failed", e);
      setMsg({ type: "error", text: formatTxError(e) });
    } finally {
      setClaiming(null);
    }
  };

  const handleSubmitEvidence = async (entry: StudentEntry) => {
    if (!entry.pool) return;
    const evidence = evidenceInputs[entry.access.address]?.trim();
    if (!evidence) return;
    setMsg(null);
    setSubmitting(entry.access.address);
    try {
      const poolPda = entry.access.pool;
      const studentAccessPda = await deriveStudentAccessPda(poolPda, walletAddress);

      const sig = await send({
        instructions: [{
          programAddress: PROGRAM_ADDRESS,
          accounts: [
            { address: walletAddress, role: 3 },
            { address: poolPda, role: 0 },
            { address: studentAccessPda, role: 1 },
          ],
          data: buildSubmitEvidenceData(evidence),
        }],
      });

      setMsg({
        type: "success",
        text: "Evidencia enviada correctamente.",
        sig: sig ?? undefined,
      });
      setEvidenceInputs((prev) => ({ ...prev, [entry.access.address]: "" }));
      await loadData();
    } catch (e) {
      console.error("Submit evidence failed", e);
      setMsg({ type: "error", text: formatTxError(e) });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Tus accesos a pools</p>
        <button onClick={loadData} disabled={loading} className="text-xs text-gray-500 hover:text-gray-300 transition">
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {entries.length === 0 && !loading && (
        <p className="text-sm text-gray-500 py-10 text-center">
          No tienes acceso en ningun pool.
          <br />
          <span className="text-xs text-gray-600 mt-1 block">Pide al mentor que te registre.</span>
        </p>
      )}

      <div className="space-y-4">
        {entries.map(({ access, pool }) => {
          const isBusy = isSending && claiming === access.address;
          return (
            <div key={access.address} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">
                    {pool?.poolName ?? <span className="text-gray-500 font-normal">Pool desconocido</span>}
                  </p>
                  <a
                    href={explorerAddressUrl(access.pool)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-gray-500 mt-0.5 inline-flex hover:text-gray-300 transition"
                  >
                    {shortAddress(access.pool)}
                  </a>
                </div>
                <div className="flex gap-2">
                  <StatusBadge label="Enviado" active={access.isSubmitted} />
                  <StatusBadge label="Aprobado" active={access.isApproved} />
                  <StatusBadge label="Reclamado" active={access.hasClaimed} />
                </div>
              </div>

              {pool && (
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div>Reward: <span className="text-gray-200">{solFromLamports(pool.rewardPerStudent)} SOL</span></div>
                  <div>
                    Sponsor:{" "}
                    <a
                      href={explorerAddressUrl(pool.sponsor)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-gray-400 hover:text-gray-200 transition"
                    >
                      {shortAddress(pool.sponsor)}
                    </a>
                  </div>
                  <div>
                    Mentor:{" "}
                    <a
                      href={explorerAddressUrl(pool.mentor)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-gray-400 hover:text-gray-200 transition"
                    >
                      {shortAddress(pool.mentor)}
                    </a>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {access.evidenceUri && (
                  <p className="text-xs text-gray-400">
                    Evidencia:{" "}
                    <a
                      href={access.evidenceUri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:text-cyan-200 underline"
                    >
                      {access.evidenceUri}
                    </a>
                  </p>
                )}
                {access.mentorFeedback && (
                  <p className="text-xs text-gray-400">Feedback: <span className="text-gray-200">{access.mentorFeedback}</span></p>
                )}

                {!access.isSubmitted && (
                  <div className="space-y-2">
                    <input
                      value={evidenceInputs[access.address] ?? ""}
                      onChange={(e) => setEvidenceInputs((prev) => ({ ...prev, [access.address]: e.target.value.slice(0, 200) }))}
                      placeholder="Link de evidencia (max 200 chars)"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-cyan-400/60 transition"
                    />
                    <button
                      onClick={() => handleSubmitEvidence({ access, pool })}
                      disabled={isSending || submitting === access.address || !evidenceInputs[access.address]}
                      className="rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submitting === access.address ? "Enviando..." : "Enviar evidencia"}
                    </button>
                  </div>
                )}

                {access.isSubmitted && !access.isApproved && (
                  <p className="text-xs text-yellow-500">Evidencia enviada. Pendiente de revision del mentor.</p>
                )}
                {access.isApproved && access.hasClaimed && (
                  <p className="text-xs text-gray-500">Ya reclamaste tu reward en este pool.</p>
                )}
                {access.isApproved && access.isSubmitted && !access.hasClaimed && (
                  <button
                    onClick={() => handleClaim({ access, pool })}
                    disabled={isSending || !pool}
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isBusy ? "Confirmando..." : `Reclamar ${pool ? solFromLamports(pool.rewardPerStudent) + " SOL" : "Reward"}`}
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
