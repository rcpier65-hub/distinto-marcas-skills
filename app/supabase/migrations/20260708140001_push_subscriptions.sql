-- Suscripciones a notificaciones push (Web Push) por dispositivo/navegador.
-- Pedro 08-jul: al confirmar una publicación, además del WhatsApp, mandar una
-- notificación push real al celular/PC de Pedro y Lorena.
--
-- Cada navegador que activa notificaciones guarda su endpoint + llaves.
-- endpoint es único (una suscripción por navegador). team_member_id para
-- filtrar a quién notificar.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE CASCADE,
  nombre text,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_member_idx ON public.push_subscriptions (team_member_id);
