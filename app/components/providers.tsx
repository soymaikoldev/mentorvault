"use client";

import { SolanaProvider } from "@solana/react-hooks";
import { PropsWithChildren } from "react";

import { autoDiscover, createClient } from "@solana/client";
import { HELIUS_RPC_URL } from "../lib/rpc";

declare global {
  // Workaround for a minification bug in @solana/* bundles that references `alphabet4` as a free variable.
  // eslint-disable-next-line no-var
  var alphabet4: string | undefined;
}

if (typeof globalThis.alphabet4 === "undefined") {
  globalThis.alphabet4 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
}

const client = createClient({
  endpoint: HELIUS_RPC_URL,
  walletConnectors: autoDiscover(),
});

export function Providers({ children }: PropsWithChildren) {
  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}
