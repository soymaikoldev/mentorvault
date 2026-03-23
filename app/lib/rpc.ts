export const DEFAULT_DEVNET_RPC_URL = "https://api.devnet.solana.com";

export const HELIUS_RPC_URL =
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL?.trim() || DEFAULT_DEVNET_RPC_URL;

export const FALLBACK_RPC_URL = DEFAULT_DEVNET_RPC_URL;

type JsonRpcSuccess<T> = {
  jsonrpc: "2.0";
  id: number;
  result: T;
};

type JsonRpcFailure = {
  jsonrpc: "2.0";
  id: number;
  error: { code: number; message: string; data?: unknown };
};

export type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

function getRpcCandidates() {
  if (HELIUS_RPC_URL === FALLBACK_RPC_URL) return [FALLBACK_RPC_URL];
  return [HELIUS_RPC_URL, FALLBACK_RPC_URL];
}

export async function rpcRequest<T>(
  method: string,
  params: unknown[]
): Promise<{ data: JsonRpcSuccess<T>; endpoint: string }> {
  const endpoints = getRpcCandidates();
  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        }),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      }

      const data = (await resp.json()) as JsonRpcResponse<T>;
      if ("error" in data) {
        throw new Error(`RPC ${data.error.code}: ${data.error.message}`);
      }
      return { data, endpoint };
    } catch (error) {
      lastError = error;
    }
  }

  const msg =
    lastError instanceof Error ? lastError.message : "RPC request failed";
  throw new Error(`RPC failed on all endpoints. Last error: ${msg}`);
}
