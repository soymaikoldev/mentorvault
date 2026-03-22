"use client";
import { useWalletConnection } from "@solana/react-hooks";
import { useState } from "react";
import { shortAddress } from "../lib/mentorvault";

export function WalletButton() {
  const { connectors, connect, disconnect, wallet, status } = useWalletConnection();
  const [open, setOpen] = useState(false);

  if (status === "connected" && wallet) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-mono text-xs text-gray-300">
            {shortAddress(wallet.account.address.toString())}
          </span>
        </button>
        {open && (
          <div className="absolute right-0 mt-1 rounded-lg border border-white/10 bg-[#1c1c1f] shadow-xl z-50 p-2 min-w-[160px]">
            <button
              onClick={() => { disconnect(); setOpen(false); }}
              className="w-full rounded px-3 py-2 text-left text-sm text-red-400 hover:bg-white/5 transition"
            >
              Desconectar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={status === "connecting"}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60"
      >
        {status === "connecting" ? "Conectando…" : "Conectar Wallet"}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 rounded-lg border border-white/10 bg-[#1c1c1f] shadow-xl z-50 p-2 min-w-[200px]">
          {connectors.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500">No se encontraron wallets</p>
          )}
          {connectors.map((c) => (
            <button
              key={c.id}
              onClick={() => { connect(c.id); setOpen(false); }}
              className="w-full rounded px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/5 transition"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
