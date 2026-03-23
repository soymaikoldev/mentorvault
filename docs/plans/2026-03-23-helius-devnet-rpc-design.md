# Helius Devnet RPC Design

**Goal:** Unificar el envio de transacciones y las lecturas RPC del frontend en un unico proveedor Helius devnet para reducir lecturas inconsistentes despues de crear pools y evitar depender del endpoint publico compartido de devnet.

**Current State**
- [app/components/providers.tsx](C:/Projects/mentorvault/app/components/providers.tsx) crea el cliente wallet con `https://api.devnet.solana.com`.
- [app/lib/mentorvault.ts](C:/Projects/mentorvault/app/lib/mentorvault.ts) hace lecturas RPC con `fetch` al mismo endpoint hardcodeado.
- En produccion se observan falsos negativos al crear pools: la UI reporta error pero tras recargar aparecen las cuentas creadas.

**Approach**
- Introducir una variable de entorno publica `NEXT_PUBLIC_HELIUS_RPC_URL`.
- Centralizar la resolucion del endpoint RPC en una utilidad compartida.
- Hacer que el `SolanaProvider` y todas las lecturas RPC consuman ese mismo endpoint.
- Mantener un fallback a `https://api.devnet.solana.com` solo si la variable no existe, para no romper desarrollo local.

**Trade-offs**
- Exponer un endpoint publico en cliente es aceptable para este hotfix, pero la key seguira visible en el navegador. Es suficiente para estabilizar devnet rapido, no para un endurecimiento de seguridad.
- Un proxy server-side ocultaria la key, pero agrega mas superficie y no es necesario para resolver el fallo actual.

**Validation**
- `npm run build` debe seguir compilando.
- La app debe poder leer pools y enviar transacciones usando el endpoint de Helius configurado.
