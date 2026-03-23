# MentorVault

Proyecto presentado en hackathon. MentorVault conecta patrocinadores, mentores y estudiantes para financiar talento y dar seguimiento a su progreso.

## Problema
- Falta de financiamiento y acompanamiento continuo para estudiantes con potencial.
- Poca visibilidad para patrocinadores sobre el impacto real.

## Solucion
MentorVault crea un flujo simple donde:
- Patrocinadores financian cohortes o estudiantes.
- Mentores acompanian el progreso.
- Estudiantes reportan avances y hitos.

## Features clave
- Vistas dedicadas para patrocinador, mentor y estudiante.
- Flujo de aprobacion y seguimiento de evidencia.
- Panel con indicadores de progreso.

## Stack
- Frontend: React / Next.js
- Estilos: CSS moderno (tema oscuro)
- Blockchain: Solana (program + interacciones)

## Como ejecutar
```bash
npm install
npm run dev
```

## RPC de Helius en devnet
Configura la app para usar Helius tanto en local como en Vercel:

```bash
NEXT_PUBLIC_HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=TU_API_KEY
```

Notas:
- La misma API key de Helius funciona en devnet; cambia la base de la URL, no la key.
- Si no defines `NEXT_PUBLIC_HELIUS_RPC_URL`, la app usa `https://api.devnet.solana.com` como fallback.

## Demo
- (Agregar enlace o captura si aplica)

## Equipo
- Maikol Castellano

## Hackathon
Fork de plantilla oficial de WayLearn. Repositorio reorganizado para presentacion.
