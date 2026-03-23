---
title: MentorVault repo cleanup (design)
date: 2026-03-23
owner: Maikol Castellano
status: approved
---

# Resumen
Preparar el repositorio para la presentacion del hackathon. El contenido real del proyecto vive en `mentorvault-app/`; se movera a la raiz del repo, se eliminaran carpetas del template, y se escribira un README en espanol enfocado al jurado. Se mantendra todo el historial (sin reescritura).

# Objetivos
- Al abrir GitHub, ver el proyecto directamente en la raiz.
- Mantener el historial completo de commits.
- README claro, corto y orientado al hackathon.

# No objetivos
- Reescribir historial.
- Cambiar el stack o funcionalidad de la app.
- Automatizar deploys.

# Enfoque
1. Mover el contenido de `mentorvault-app/` a la raiz con `git mv` para preservar historial por archivo.
2. Eliminar carpetas del template que no aportan al proyecto presentado.
3. Reemplazar `README.md` por uno propio (espanol) con: resumen, features, stack, como correr, demo/screenshot, equipo y nota de hackathon.
4. Hacer merge de `desarrollo` a `main` sin rebase ni squash.

# Estructura final esperada
- Raiz: codigo de la app, `README.md`, config necesaria del proyecto.
- `docs/plans/`: solo documentos relevantes del proyecto (incluye este design).

# Riesgos y mitigacion
- Riesgo: rutas relativas que asumian `mentorvault-app/`.
  - Mitigacion: revisar scripts/configs y ajustar si es necesario.
- Riesgo: eliminar algo util del template.
  - Mitigacion: todo queda en el historial; se puede recuperar si hiciera falta.

# Criterios de exito
- `git status -sb` limpio despues de los cambios.
- Repo abre mostrando el proyecto en la raiz.
- README describe el proyecto en menos de 2 minutos de lectura.
