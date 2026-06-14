-- Migración 028 — grabaciones: campos completos estilo Google Calendar
--
-- Pedro pidió que el form de "nueva grabación" tenga las mismas opciones que
-- Google Calendar (nombre, fecha, hora, descripción) y que el evento se cree
-- como EVENTO en GCal, no como all-day. Opcionalmente, marcable como reunión
-- con Google Meet + invitados.
--
-- Reusamos lo que YA existe:
--   - hora_planeada (time)        — hora de inicio
--   - notas (text)                — descripción del evento
--   - google_event_id (text)      — ID del evento en GCal (ya tenía)
--
-- Agregamos:
--   - titulo (text)               — nombre del evento; default = "Grabación – {marca}"
--   - duracion_min (int, def 60)  — duración para calcular fin del evento en GCal
--   - es_reunion_meet (bool)      — checkbox del form: si true, crea evento con Google Meet
--   - meet_link (text)            — link de Meet generado por Google (solo si es_reunion_meet)
--   - invitados_emails (text[])   — emails a invitar (solo si es_reunion_meet)

ALTER TABLE grabaciones
  ADD COLUMN IF NOT EXISTS titulo text,
  ADD COLUMN IF NOT EXISTS duracion_min integer NOT NULL DEFAULT 60
    CHECK (duracion_min > 0 AND duracion_min <= 720),
  ADD COLUMN IF NOT EXISTS es_reunion_meet boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meet_link text,
  ADD COLUMN IF NOT EXISTS invitados_emails text[];

COMMENT ON COLUMN grabaciones.titulo IS
  'Nombre del evento en GCal (ej. "Grabación – Manrique"). Si NULL, el server action lo calcula.';
COMMENT ON COLUMN grabaciones.duracion_min IS
  'Duración del evento en minutos (default 60). Combinado con hora_planeada da el rango start/end.';
COMMENT ON COLUMN grabaciones.es_reunion_meet IS
  'Si true, el sync con GCal genera Google Meet y permite invitar emails. Si false, evento simple.';
COMMENT ON COLUMN grabaciones.meet_link IS
  'URL del Google Meet generado al crear el evento (solo si es_reunion_meet=true).';
COMMENT ON COLUMN grabaciones.invitados_emails IS
  'Array de emails que GCal agrega como attendees al evento. Solo aplica si es_reunion_meet=true.';
