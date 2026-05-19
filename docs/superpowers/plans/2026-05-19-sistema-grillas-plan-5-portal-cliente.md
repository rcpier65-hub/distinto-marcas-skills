# Plan 5 — Portal cliente básico

**Goal:** Cliente puede entrar a `/portal/[marca-slug]` con su email y ver su grilla actual + aprobar/rechazar.

**Tech:** Reusa Supabase Auth, RLS por marca, nueva tabla `marca_usuarios` para relación.

## Tasks

### T1: Migración tabla marca_usuarios

```sql
-- 20260519100001_marca_usuarios.sql
CREATE TABLE marca_usuarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    uuid NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  usuario_id  uuid NOT NULL,  -- FK soft a auth.users
  rol         rol_usuario NOT NULL DEFAULT 'cliente',
  email_invitacion text,  -- antes de que el user exista
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_marca_usuario UNIQUE (marca_id, usuario_id)
);

CREATE INDEX idx_marca_usuarios_marca ON marca_usuarios(marca_id);
CREATE INDEX idx_marca_usuarios_usuario ON marca_usuarios(usuario_id);

ALTER TABLE marca_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propias relaciones"
ON marca_usuarios FOR SELECT TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "Service role full"
ON marca_usuarios FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

### T2: Pantalla /portal/[slug]

Crear `app/app/portal/[slug]/page.tsx` que:
- Requiere auth
- Verifica que el user tiene relación con esa marca en marca_usuarios
- Muestra la última grilla en `esperando_aprobacion` o `enviada`
- Botón aprobar/pedir cambios

### T3: Server Action aprobar desde portal

`app/app/portal/[slug]/_actions.ts` con `aprobarDesdePortal(grilla_id)`.

### T4: Server Action invitar cliente (admin)

En settings, lista marcas. Para cada una, botón "Invitar cliente" que crea entry en marca_usuarios con email_invitacion.

### T5: Tag v0.5.0
