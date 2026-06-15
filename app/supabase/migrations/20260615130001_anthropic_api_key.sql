-- Migration: anthropic_api_key en integraciones
-- Guarda la API key de Anthropic (Claude) para generar copys de publicaciones
-- desde el guion + la voz de marca. Mismo patrón que openai_api_key.
-- (El runtime también la crea sola vía writeAnthropicKeyViaPg si no existe.)

ALTER TABLE integraciones ADD COLUMN IF NOT EXISTS anthropic_api_key text;

-- Recargar el schema cache de PostgREST para que el service client la vea.
NOTIFY pgrst, 'reload schema';
