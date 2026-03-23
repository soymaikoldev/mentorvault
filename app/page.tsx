"use client";
import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import type { Address } from "@solana/kit";
import { WalletButton } from "./components/wallet-button";
import { SponsorTab } from "./components/sponsor-tab";
import { MentorTab } from "./components/mentor-tab";
import { StudentTab } from "./components/student-tab";
import { KpiStrip } from "./components/kpi-strip";
import { PROGRAM_ADDRESS, explorerAddressUrl, shortAddress } from "./lib/mentorvault";

type Tab = "sponsor" | "mentor" | "estudiante";

type Metric = {
  label: string;
  value: string;
  hint?: string;
};

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: "sponsor", label: "Sponsor", desc: "Crea pools y asigna mentores" },
  { id: "mentor", label: "Mentor", desc: "Revisa evidencia y aprueba" },
  { id: "estudiante", label: "Estudiante", desc: "Envia evidencia y reclama" },
];

const DEFAULT_KPIS: Metric[] = [
  { label: "Pools activos", value: "0" },
  { label: "Estudiantes", value: "0" },
  { label: "Evidencias", value: "0" },
  { label: "Rewards", value: "0" },
];

export default function Home() {
  const { wallet, status } = useWalletConnection();
  const [tab, setTab] = useState<Tab>("sponsor");
  const [kpis, setKpis] = useState<Metric[]>(DEFAULT_KPIS);

  const walletAddress = wallet?.account.address as Address | undefined;
  const connected = status === "connected" && walletAddress;

  return (
    <div className="min-h-screen text-white">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400/80 to-violet-500/80 flex items-center justify-center text-sm font-black">
              M
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">MentorVault</p>
              <p className="text-xs text-gray-500 hidden sm:block">
                Rewards educativos con evidencia en Solana
              </p>
            </div>
          </div>
          <WalletButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400">
            devnet
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Evidencia real, recompensas reales
            </h1>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl">
              Sponsors financian el aprendizaje, mentores validan evidencia y los estudiantes solo cobran cuando demuestran progreso.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/5 border border-white/10 px-2.5 py-1 font-mono text-xs text-gray-500">
              programa
            </span>
            <a
              href={explorerAddressUrl(PROGRAM_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-white/5 border border-white/10 px-2.5 py-1 font-mono text-xs text-gray-500 hover:text-gray-300 transition"
            >
              {shortAddress(PROGRAM_ADDRESS)}
            </a>
          </div>
        </section>

        <KpiStrip items={kpis} />

        {!connected ? (
          <NotConnectedCard />
        ) : (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    tab === t.id
                      ? "bg-gradient-to-r from-cyan-500/90 to-violet-500/90 text-white shadow"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <span className="block">{t.label}</span>
                  <span className={`block text-xs font-normal mt-1 ${tab === t.id ? "text-white/80" : "text-gray-600"}`}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              {tab === "sponsor" && (
                <SponsorTab walletAddress={walletAddress} onMetrics={setKpis} />
              )}
              {tab === "mentor" && (
                <MentorTab walletAddress={walletAddress} onMetrics={setKpis} />
              )}
              {tab === "estudiante" && (
                <StudentTab walletAddress={walletAddress} onMetrics={setKpis} />
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function NotConnectedCard() {
  const { connectors, connect, status } = useWalletConnection();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center space-y-6 backdrop-blur">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center">
        <span className="text-2xl">🔐</span>
      </div>
      <div>
        <p className="text-base font-semibold text-white">Conecta tu wallet</p>
        <p className="text-sm text-gray-400 mt-1">
          Para interactuar con MentorVault necesitas una wallet de Solana.
        </p>
      </div>
      {connectors.length === 0 ? (
        <p className="text-xs text-gray-500">No se detectaron wallets. Instala Phantom o Backpack.</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {connectors.map((c) => (
            <button
              key={c.id}
              onClick={() => connect(c.id)}
              disabled={status === "connecting"}
              className="rounded-lg border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-white/15 disabled:opacity-60"
            >
              {status === "connecting" ? "Conectando..." : c.name}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500">
        ¿Necesitas SOL de prueba?{" "}
        <a
          href="https://faucet.solana.com/"
          target="_blank"
          rel="noreferrer"
          className="text-cyan-300 hover:text-cyan-200 underline"
        >
          Faucet de devnet {"->"}
        </a>
      </p>
    </div>
  );
}
