-- El módulo Editor ofrece los estados "Publicar", "Publicado" y "Borrador"
-- (EstadoPub en la app), pero el enum estado_publicacion de la BD nunca los
-- tuvo → al elegir "Publicar" en el Editor salía:
--   invalid input value for enum estado_publicacion: "publicar"
-- Los agregamos (aditivo, no toca datos existentes).

ALTER TYPE estado_publicacion ADD VALUE IF NOT EXISTS 'publicar';
ALTER TYPE estado_publicacion ADD VALUE IF NOT EXISTS 'publicado';
ALTER TYPE estado_publicacion ADD VALUE IF NOT EXISTS 'borrador';
