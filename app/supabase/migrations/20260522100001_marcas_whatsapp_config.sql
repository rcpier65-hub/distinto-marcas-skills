-- Migración 015 — WhatsApp config por marca + safety lock para envío real
-- Tres columnas nuevas en `marcas`:
--   1. grupo_whatsapp_chatid — chatId directo del grupo (ej. `120363339856209687@g.us`)
--      Bullet-proof vs group_name/alias (que dependen del wrapper Rubi).
--      Vimos en P15-T2 que group_name "New team" no resolvía pero chatId sí.
--   2. mention_number       — número a mencionar en caption real (sin '@', formato '51902414745')
--      Si está NULL, no se antepone mention al caption (legacy behavior).
--   3. envio_real_habilitado — SAFETY LOCK. Default FALSE.
--      El botón "Enviar al grupo WhatsApp" del cliente NO funciona hasta que
--      Pedro lo active explícitamente en Settings. Evita envíos accidentales
--      durante pruebas. El botón "Probar (New team)" NO depende de este flag.

ALTER TABLE marcas
  ADD COLUMN IF NOT EXISTS grupo_whatsapp_chatid text,
  ADD COLUMN IF NOT EXISTS mention_number       text,
  ADD COLUMN IF NOT EXISTS envio_real_habilitado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN marcas.grupo_whatsapp_chatid IS
  'chatId directo del grupo WhatsApp del cliente (formato 12036...@g.us). Preferido sobre grupo_whatsapp_alias/nombre porque no depende del wrapper de resolución de Rubi. Si NULL, el server action cae al alias o nombre.';

COMMENT ON COLUMN marcas.mention_number IS
  'Número a mencionar en el caption real (formato internacional sin +, ej. 51902414745). Se antepone como @<numero> al saludo del caption en modo envío real. En modo test, se mencionará al número del operador (Pedro).';

COMMENT ON COLUMN marcas.envio_real_habilitado IS
  'SAFETY LOCK. Cuando false (default), el server action enviarGrillaAlGrupo en modo=real rechaza la operación. Sólo el modo=test funciona. Cuando true, ambos botones funcionan. Pedro lo activa explícitamente por marca cuando confirma que la configuración WhatsApp es correcta.';
