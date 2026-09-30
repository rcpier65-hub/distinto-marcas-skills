-- Estados de diseño para publicaciones (Pedro 30-sep-2026): "Diseñando"
-- mientras Ailyn la trabaja y "Diseñado" cuando entregó. La UI ya ofrecía
-- "Diseñando" pero el ENUM no lo tenía (elegirlo fallaba).
alter type public.estado_publicacion add value if not exists 'disenando' after 'disenar';
alter type public.estado_publicacion add value if not exists 'disenado' after 'disenando';
