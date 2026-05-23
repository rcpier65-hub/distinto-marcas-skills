// services/whatsapp/src/index.ts
// Entry point. server.ts arranca el HTTP server + Baileys client automáticamente
// al importar (side effect). Mantenemos index.ts mínimo para que sea fácil de
// referenciar desde Dockerfile y scripts npm.

import './server.js'
