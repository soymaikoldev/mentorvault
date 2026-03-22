"use client";
import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import type { Address } from "@solana/kit";
import { WalletButton } from "./components/wallet-button";
import { SponsorTab } from "./components/sponsor-tab";
import { MentorTab } from "./components/mentor-tab";
import { StudentTab } from "./components/student-tab";

type Tab = "sponsor" | "mentor" | "estudiante";

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: "sponsor", label: "Sponsor", desc: "Crea pools y asigna mentores" },
  { id: "mentor", label: "Mentor", desc: "Aprueba estudiantes" },
  { id: "estudiante", label: "Estudiante", desc: "Reclama tu reward" },
];

export default function Home() {
  const { wallet, status } = useWalletConnection();
  const [tab, setTab] = useState<Tab>("sponsor");

  const walletAddress = wallet?.account.address as Address | undefined;
  const connected = status === "connected" && walletAddress;

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      {/* Header */}
      <header className="border-b border-white/8 bg-[#0d0d0f]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center text-sm font-black">M</div>
            <div>
              <p className="text-sm font-bold tracking-tight">MentorVault</p>
              <p className="text-xs text-gray-600 hidden sm:block">Rewards educativos en Solana</p>
            </div>
          </div>
          <WalletButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Hero */}
        <div className="mb-10 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Protocolo de Rewards Educativos
          </h1>
          <p className="text-sm text-gray-500 max-w-xl">
            Sponsors depositan SOL como recompensas, mentores validan quién las merece, y solo los estudiantes aprobados pueden reclamarlas.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="rounded-md bg-white/5 border border-white/8 px-2.5 py-1 font-mono text-xs text-gray-500">
              devnet
            </span>
            <span className="rounded-md bg-white/5 border border-white/8 px-2.5 py-1 font-mono text-xs text-gray-600 hidden sm:block">
              4RqpxT…m1yX
            </span>
          </div>
        </div>

        {!connected ? (
          <NotConnectedCard />
        ) : (
          <>
            {/* Tab selector */}
            <div className="flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1 mb-6">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    tab === t.id
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <span className="block">{t.label}</span>
                  <span className={`block text-xs font-normal mt-0.5 ${tab === t.id ? "text-violet-200" : "text-gray-700"}`}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-6">
              {tab === "sponsor" && <SponsorTab walletAddress={walletAddress} />}
              {tab === "mentor" && <MentorTab walletAddress={walletAddress} />}
              {tab === "estudiante" && <StudentTab walletAddress={walletAddress} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function NotConnectedCard() {
  const { connectors, connect, status } = useWalletConnection();
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center space-y-6">
      <div className="mx-auto h-12 w-12 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
        <span className="text-2xl">🔐</span>
      </div>
      <div>
        <p className="text-base font-semibold text-white">Conecta tu wallet</p>
        <p className="text-sm text-gray-500 mt-1">Para interactuar con MentorVault necesitas una wallet de Solana.</p>
      </div>
      {connectors.length === 0 ? (
        <p className="text-xs text-gray-600">No se detectaron wallets. Instala Phantom o Backpack.</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {connectors.map((c) => (
            <button
              key={c.id}
              onClick={() => connect(c.id)}
              disabled={status === "connecting"}
              className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-white/10 hover:-translate-y-0.5 disabled:opacity-60"
            >
              {status === "connecting" ? "Conectando…" : c.name}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-700">
        ¿Necesitas SOL de prueba?{" "}
        <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer" className="text-violet-500 hover:text-violet-400 underline">
          Faucet de devnet →
        </a>
      </p>
    </div>
  );
}
