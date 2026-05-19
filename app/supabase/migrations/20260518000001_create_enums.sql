-- Migración 001 — Enums del sistema de aprobación de grillas
-- Aplicada: 2026-05-18 (Task 6 Plan 1)

-- Estado del ciclo de vida de una grilla pendiente
CREATE TYPE estado_grilla AS ENUM (
  'pendiente',
  'procesando',
  'esperando_aprobacion',
  'aprobada',
  'enviada',
  'cancelada',
  'regenerar'
);

-- Acciones de aprobación (auditoría)
CREATE TYPE accion_aprobacion AS ENUM (
  'solicitar',
  'aprobar',
  'rechazar',
  'regenerar'
);

-- Canal por el que llegó la acción
CREATE TYPE via_aprobacion AS ENUM (
  'whatsapp',
  'dashboard',
  'api'
);

-- Tipo de envío
CREATE TYPE tipo_envio AS ENUM (
  'whatsapp_grupo',
  'whatsapp_dm',
  'email'
);

-- Rol de usuario interno
CREATE TYPE rol_usuario AS ENUM (
  'admin',
  'colaborador',
  'cliente'
);
