BEGIN;
ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS tiene_boceto boolean NOT NULL DEFAULT false;
ALTER TABLE strategy_records ADD COLUMN IF NOT EXISTS boceto_publicacion_id uuid REFERENCES publicaciones(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS strategy_boceto_publicacion ON strategy_records(boceto_publicacion_id) WHERE boceto_publicacion_id IS NOT NULL;
ALTER TABLE strategy_records ADD CONSTRAINT strategy_boceto_sheet CHECK(boceto_publicacion_id IS NULL OR kind='sheet');

-- La tarea y su lienzo se crean en la misma transacción. Reintentar no crea copias.
CREATE OR REPLACE FUNCTION sync_diseno_boceto() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE hoja uuid; miembro uuid; marca_slug text;
BEGIN
  IF NOT NEW.tiene_boceto THEN RETURN NEW; END IF;
  SELECT slug INTO marca_slug FROM marcas WHERE id=NEW.marca_id AND activa;
  IF marca_slug IS NULL OR marca_slug='interno' THEN
    RAISE EXCEPTION 'Selecciona la marca principal para guardar su boceto en Planificación';
  END IF;
  SELECT id INTO hoja FROM strategy_records WHERE boceto_publicacion_id=NEW.id;
  IF hoja IS NULL THEN
    SELECT id INTO miembro FROM team_members WHERE auth_user_id=NEW.created_by AND activo LIMIT 1;
    IF miembro IS NULL OR NOT NEW.es_tarea_diseno THEN RAISE EXCEPTION 'El boceto requiere una tarea de diseño creada por el equipo'; END IF;
    hoja := gen_random_uuid();
    INSERT INTO strategy_records(id,marca_id,kind,title,data,created_by,boceto_publicacion_id)
    VALUES(hoja,NEW.marca_id,'sheet','Boceto · '||NEW.nombre,
      jsonb_build_object('state','Borrador','sharedWithClient',false,'ownerId',miembro,
        'objective','Planificar el diseño: imágenes, referencias, notas y bocetos.'),miembro,NEW.id);
    INSERT INTO strategy_scenes(sheet_id) VALUES(hoja);
  ELSE
    IF TG_OP='UPDATE' AND NEW.marca_id IS DISTINCT FROM OLD.marca_id THEN
      DELETE FROM strategy_links WHERE sheet_id=hoja;
    END IF;
    -- Cambiar la marca nunca comparte automáticamente el boceto con otro cliente.
    UPDATE strategy_records SET marca_id=NEW.marca_id,
      title=CASE WHEN TG_OP='UPDATE' AND NEW.nombre IS DISTINCT FROM OLD.nombre THEN 'Boceto · '||NEW.nombre ELSE title END,
      data=CASE WHEN marca_id<>NEW.marca_id THEN (data-'campaignId')||'{"sharedWithClient":false}'::jsonb ELSE data END,
      archived=CASE WHEN TG_OP='UPDATE' AND ((NEW.archived_at IS NOT NULL OR NEW.estado_tarea::text='archivado') IS DISTINCT FROM (OLD.archived_at IS NOT NULL OR OLD.estado_tarea::text='archivado'))
        THEN NEW.archived_at IS NOT NULL OR NEW.estado_tarea::text='archivado' ELSE archived END,
      revision=revision+1,updated_at=now() WHERE id=hoja;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION sync_diseno_boceto() FROM PUBLIC;
CREATE TRIGGER publicaciones_boceto AFTER INSERT OR UPDATE OF tiene_boceto,nombre,marca_id,archived_at,estado_tarea
  ON publicaciones FOR EACH ROW WHEN (NEW.tiene_boceto) EXECUTE FUNCTION sync_diseno_boceto();
-- Los enlaces de contexto no deben impedir eliminar la tarea original y su lienzo.
CREATE OR REPLACE FUNCTION clean_diseno_boceto_links() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  DELETE FROM strategy_links WHERE sheet_id=OLD.id;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION clean_diseno_boceto_links() FROM PUBLIC;
CREATE TRIGGER strategy_boceto_delete BEFORE DELETE ON strategy_records
  FOR EACH ROW WHEN (OLD.boceto_publicacion_id IS NOT NULL) EXECUTE FUNCTION clean_diseno_boceto_links();
NOTIFY pgrst,'reload schema';
COMMIT;
