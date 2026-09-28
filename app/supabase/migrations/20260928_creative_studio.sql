CREATE TABLE IF NOT EXISTS public.creative_brand_profiles (
 marca_id uuid PRIMARY KEY REFERENCES public.marcas(id) ON DELETE CASCADE,
 data jsonb NOT NULL DEFAULT '{}', revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.creative_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), marca_id uuid NOT NULL REFERENCES public.marcas(id),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 160), recording_id uuid REFERENCES public.grabaciones(id) ON DELETE SET NULL,
 data jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
 created_by uuid REFERENCES auth.users(id), updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creative_batches_brand ON public.creative_batches(marca_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS public.creative_publication_links (
 batch_id uuid NOT NULL REFERENCES public.creative_batches(id), script_id uuid NOT NULL,
 publicacion_id uuid NOT NULL REFERENCES public.publicaciones(id), PRIMARY KEY(batch_id,script_id)
);
ALTER TABLE public.creative_brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_publication_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creative_brand_profiles, public.creative_batches, public.creative_publication_links FROM anon, authenticated;
GRANT ALL ON public.creative_brand_profiles, public.creative_batches, public.creative_publication_links TO service_role;
CREATE OR REPLACE FUNCTION public.creative_link_publication(p_batch uuid,p_script uuid,p_revision integer,p_text text,p_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE b creative_batches; s jsonb; result uuid;
BEGIN
 SELECT * INTO b FROM creative_batches WHERE id=p_batch FOR UPDATE;
 IF b.id IS NULL THEN RAISE EXCEPTION 'Tanda inexistente'; END IF;
 SELECT publicacion_id INTO result FROM creative_publication_links WHERE batch_id=p_batch AND script_id=p_script;
 IF result IS NOT NULL THEN RETURN result; END IF;
 IF b.revision <> p_revision THEN RAISE EXCEPTION 'La tanda cambió. Recarga antes de vincular.'; END IF;
 SELECT value INTO s FROM jsonb_array_elements(b.data->'scripts') WHERE value->>'id'=p_script::text;
 IF s IS NULL OR s->>'status'<>'listo' THEN RAISE EXCEPTION 'Revisa el guion antes de enviarlo a Publicaciones'; END IF;
 INSERT INTO publicaciones(marca_id,nombre,guion,created_by,updated_by) VALUES(b.marca_id,s->>'title',p_text,p_user,p_user) RETURNING id INTO result;
 INSERT INTO creative_publication_links(batch_id,script_id,publicacion_id) VALUES(p_batch,p_script,result);
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.creative_link_publication(uuid,uuid,integer,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creative_link_publication(uuid,uuid,integer,text,uuid) TO service_role;
