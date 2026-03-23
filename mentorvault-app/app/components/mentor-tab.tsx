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
  buildReviewSubmissionData,
  fetchPoolsByMentor,
  fetchStudentAccessByAddress,
  type PoolAccount,
  type StudentAccessAccount,
  formatTxError,
  shortAddress,
  explorerAddressUrl,
  explorerTxUrl,
  solFromLamports,
} from "../lib/mentorvault";

type Metric = { label: string; value: string; hint?: string };

export function MentorTab({
  walletAddress,
  onMetrics,
}: {
  walletAddress: Address;
  onMetrics?: (items: Metric[]) => void;
}) {
  const { send, isSending } = useSendTransaction();
  const [pools, setPools] = useState<PoolAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentInputs, setStudentInputs] = useState<Record<string, string>>({});
  const [reviewStudents, setReviewStudents] = useState<Record<string, string>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});
  const [reviewApprove, setReviewApprove] = useState<Record<string, boolean>>({});
  const [reviewInfo, setReviewInfo] = useState<Record<string, StudentAccessAccount | null>>({});
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
  useEffect(() => {
    if (!onMetrics) return;
    const totalPools = pools.length;
    const totalRewarded = pools.reduce((s, p) => s + p.studentsRewarded, 0);
    const totalCapacity = pools.reduce((s, p) => s + p.maxStudents, 0);
    const pending = totalCapacity - totalRewarded;
    onMetrics([
      { label: "Pools asignados", value: String(totalPools) },
      { label: "Reclamados", value: String(totalRewarded) },
      { label: "Pendientes", value: String(pending) },
      { label: "Cupo total", value: String(totalCapacity) },
    ]);
  }, [onMetrics, pools]);

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
            { address: walletAddress, role: 3 },
            { address: poolPda, role: 0 },
            { address: studentAddr as Address, role: 0 },
            { address: studentAccessPda, role: 1 },
            { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
          ],
          data: buildApproveStudentData(),
        }],
      });

      setMsg({ type: "success", text: `Estudiante ${shortAddress(studentAddr)} registrado.`, sig: sig ?? undefined });
      setStudentInputs((prev) => ({ ...prev, [pool.address]: "" }));
    } catch (e) {
      console.error("Approve student failed", e);
      setMsg({ type: "error", text: formatTxError(e) });
    }
  };

  const handleLoadEvidence = async (pool: PoolAccount) => {
    const studentAddr = reviewStudents[pool.address]?.trim();
    if (!studentAddr) return;
    setMsg(null);
    try {
      const poolPda = await derivePoolPda(pool.sponsor, pool.poolName);
      const studentAccessPda = await deriveStudentAccessPda(poolPda, studentAddr as Address);
      const access = await fetchStudentAccessByAddress(studentAccessPda);
      setReviewInfo((prev) => ({ ...prev, [pool.address]: access }));
      if (!access) {
        setMsg({ type: "error", text: "No se encontró evidencia para ese estudiante." });
      }
    } catch (e) {
      console.error("Load evidence failed", e);
      setMsg({ type: "error", text: formatTxError(e) });
    }
  };

  const handleReviewSubmission = async (pool: PoolAccount) => {
    const studentAddr = reviewStudents[pool.address]?.trim();
    if (!studentAddr) return;
    setMsg(null);
    try {
      const poolPda = await derivePoolPda(pool.sponsor, pool.poolName);
      const studentAccessPda = await deriveStudentAccessPda(poolPda, studentAddr as Address);
      const approve = reviewApprove[pool.address] ?? true;
      const feedback = reviewFeedback[pool.address] ?? "";

      const sig = await send({
        instructions: [{
          programAddress: PROGRAM_ADDRESS,
          accounts: [
            { address: walletAddress, role: 3 },
            { address: poolPda, role: 0 },
            { address: studentAddr as Address, role: 0 },
            { address: studentAccessPda, role: 1 },
          ],
          data: buildReviewSubmissionData(approve, feedback),
        }],
      });

      setMsg({ type: "success", text: approve ? "Submission aprobada." : "Submission rechazada.", sig: sig ?? undefined });
      setReviewFeedback((prev) => ({ ...prev, [pool.address]: "" }));
      await handleLoadEvidence(pool);
    } catch (e) {
      console.error("Review submission failed", e);
      setMsg({ type: "error", text: formatTxError(e) });
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
        <p className="text-sm text-gray-400">Pools donde eres mentor</p>
        <button onClick={loadPools} disabled={loading} className="text-xs text-gray-500 hover:text-gray-300 transition">
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {pools.length === 0 && !loading && (
        <p className="text-sm text-gray-500 py-10 text-center">
          No eres mentor en ningun pool aun.
          <br />
          <span className="text-xs text-gray-600 mt-1 block">Pide al sponsor que te asigne como mentor.</span>
        </p>
      )}

      {pools.map((pool) => (
        <div key={pool.address} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-white">{pool.poolName}</p>
              <a
                href={explorerAddressUrl(pool.address)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-gray-500 mt-0.5 inline-flex hover:text-gray-300 transition"
              >
                {shortAddress(pool.address)}
              </a>
            </div>
            <div className="text-right text-xs text-gray-500 space-y-1">
              <div>Reward: <span className="text-gray-200">{solFromLamports(pool.rewardPerStudent)} SOL</span></div>
              <div className={`font-medium ${pool.studentsRewarded >= pool.maxStudents ? "text-gray-500" : "text-emerald-400"}`}>
                {pool.studentsRewarded}/{pool.maxStudents} reclamados
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-gray-400 font-medium">Registrar estudiante</label>
            <div className="flex gap-2">
              <input
                value={studentInputs[pool.address] ?? ""}
                onChange={(e) => setStudentInputs((prev) => ({ ...prev, [pool.address]: e.target.value.trim() }))}
                placeholder="Pubkey del estudiante (base58)..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-cyan-400/60 transition font-mono"
              />
              <button
                onClick={() => handleApproveStudent(pool)}
                disabled={isSending || !studentInputs[pool.address] || (studentInputs[pool.address]?.length ?? 0) < 32 || pool.studentsRewarded >= pool.maxStudents}
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSending ? "Confirmando..." : "Registrar"}
              </button>
            </div>
            {pool.studentsRewarded >= pool.maxStudents && (
              <p className="text-xs text-yellow-600">Pool completo — no se pueden registrar mas estudiantes.</p>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-white/10">
            <label className="block text-xs text-gray-400 font-medium">Revisar evidencia</label>
            <div className="flex gap-2">
              <input
                value={reviewStudents[pool.address] ?? ""}
                onChange={(e) => setReviewStudents((prev) => ({ ...prev, [pool.address]: e.target.value.trim() }))}
                placeholder="Pubkey del estudiante..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-cyan-400/60 transition font-mono"
              />
              <button
                onClick={() => handleLoadEvidence(pool)}
                disabled={isSending || !reviewStudents[pool.address]}
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/15 disabled:opacity-40"
              >
                Cargar
              </button>
            </div>

            {reviewInfo[pool.address] && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-gray-400 space-y-2">
                <div>
                  Evidencia:{" "}
                  {reviewInfo[pool.address]?.evidenceUri ? (
                    <a
                      href={reviewInfo[pool.address]?.evidenceUri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:text-cyan-200 underline"
                    >
                      {reviewInfo[pool.address]?.evidenceUri}
                    </a>
                  ) : (
                    <span className="text-gray-500">Sin evidencia</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className={`rounded-full px-2 py-0.5 ${reviewInfo[pool.address]?.isSubmitted ? "bg-cyan-500/15 text-cyan-300" : "bg-white/5 text-gray-500"}`}>
                    Enviado
                  </span>
                  <span className={`rounded-full px-2 py-0.5 ${reviewInfo[pool.address]?.isApproved ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-gray-500"}`}>
                    Aprobado
                  </span>
                </div>
                {reviewInfo[pool.address]?.mentorFeedback && (
                  <div>Feedback: <span className="text-gray-200">{reviewInfo[pool.address]?.mentorFeedback}</span></div>
                )}
              </div>
            )}

            <textarea
              value={reviewFeedback[pool.address] ?? ""}
              onChange={(e) => setReviewFeedback((prev) => ({ ...prev, [pool.address]: e.target.value.slice(0, 160) }))}
              placeholder="Feedback para el estudiante (max 160 chars)"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-cyan-400/60 transition"
              rows={2}
            />

            <div className="flex items-center gap-2">
              <select
                value={(reviewApprove[pool.address] ?? true) ? "approve" : "reject"}
                onChange={(e) => setReviewApprove((prev) => ({ ...prev, [pool.address]: e.target.value === "approve" }))}
                className="rounded-lg border border-white/10 bg-[#12151b] px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/60 transition"
              >
                <option value="approve">Aprobar</option>
                <option value="reject">Rechazar</option>
              </select>
              <button
                onClick={() => handleReviewSubmission(pool)}
                disabled={isSending || !reviewStudents[pool.address]}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSending ? "Enviando..." : "Enviar revision"}
              </button>
            </div>
          </div>

          <div className="pt-1 border-t border-white/10">
            <p className="text-xs text-gray-600">
              Sponsor:{" "}
              <a
                href={explorerAddressUrl(pool.sponsor)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-gray-500 hover:text-gray-300 transition"
              >
                {shortAddress(pool.sponsor)}
              </a>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
