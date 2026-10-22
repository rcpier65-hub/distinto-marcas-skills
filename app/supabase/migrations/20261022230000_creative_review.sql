-- One immutable link record per delivery; no inference of historical client requests.
CREATE TABLE public.creative_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 publicacion_id uuid NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
 slot text NOT NULL,
 category text NOT NULL CHECK(category IN ('diseno','video')),
 label text NOT NULL,
 version integer NOT NULL CHECK(version > 0),
 url text NOT NULL,
 asset_key text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by uuid,
 baseline boolean NOT NULL DEFAULT false,
 counts_change boolean NOT NULL DEFAULT false,
 exclusion_reason text,
 excluded_by uuid,
 request_id uuid UNIQUE,
 UNIQUE(publicacion_id,slot,version)
);
CREATE INDEX creative_versions_publicacion ON public.creative_versions(publicacion_id,created_at);
CREATE INDEX creative_versions_periodo ON public.creative_versions(created_at) WHERE NOT baseline;
CREATE TABLE public.creative_review_rounds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_id uuid NOT NULL REFERENCES public.creative_versions(id) ON DELETE CASCADE,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 closed_at timestamptz
);
CREATE UNIQUE INDEX creative_round_open ON public.creative_review_rounds(version_id) WHERE closed_at IS NULL;
CREATE TABLE public.creative_review_notes (
 id uuid PRIMARY KEY,
 version_id uuid NOT NULL REFERENCES public.creative_versions(id) ON DELETE CASCADE,
 round_id uuid REFERENCES public.creative_review_rounds(id) ON DELETE SET NULL,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 text text NOT NULL CHECK(length(text) BETWEEN 1 AND 4000),
 requested_by text NOT NULL DEFAULT '',
 page integer NOT NULL DEFAULT 1 CHECK(page BETWEEN 1 AND 10000),
 x double precision CHECK(x BETWEEN 0 AND 1),
 y double precision CHECK(y BETWEEN 0 AND 1),
 width double precision CHECK(width BETWEEN 0 AND 1),
 height double precision CHECK(height BETWEEN 0 AND 1),
 seconds double precision CHECK(seconds BETWEEN 0 AND 86400),
 attachments jsonb NOT NULL DEFAULT '[]',
 state text NOT NULL DEFAULT 'pendiente' CHECK(state IN ('pendiente','en_proceso','aplicado','validado')),
 applied_version_id uuid REFERENCES public.creative_versions(id) ON DELETE SET NULL
);
CREATE INDEX creative_notes_version ON public.creative_review_notes(version_id,created_at);
CREATE TABLE public.creative_review_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_id uuid NOT NULL REFERENCES public.creative_versions(id) ON DELETE CASCADE,
 note_id uuid REFERENCES public.creative_review_notes(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL,
 action text NOT NULL,
 detail jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.creative_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_review_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_review_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creative_versions,public.creative_review_rounds,public.creative_review_notes,public.creative_review_events FROM anon,authenticated;
GRANT ALL ON public.creative_versions,public.creative_review_rounds,public.creative_review_notes,public.creative_review_events TO service_role;

CREATE FUNCTION public.creative_asset_key(raw text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE clean text := btrim(raw); fid text;
BEGIN
 IF clean IS NULL OR clean !~* '^https?://[^[:space:]]+$' THEN RETURN NULL; END IF;
 IF clean ~* '^https://(drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)/' THEN
  fid := substring(clean from '/d/([a-zA-Z0-9_-]+)');
  IF fid IS NULL THEN fid := substring(clean from '[?&]id=([a-zA-Z0-9_-]+)'); END IF;
  IF fid IS NOT NULL THEN RETURN 'drive:' || fid; END IF;
 END IF;
 clean := split_part(clean,'#',1);
 clean := regexp_replace(clean,'([?&])(utm_[^=&]+|fbclid|gclid)=[^&]*','\1','gi');
 clean := regexp_replace(clean,'[?]&+','?','g');
 clean := regexp_replace(clean,'&{2,}','&','g');
 clean := regexp_replace(clean,'[?&]+$','');
 RETURN clean;
END $$;
CREATE FUNCTION public.creative_sources(p jsonb) RETURNS TABLE(slot text,category text,label text,url text) LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE arr jsonb; it jsonb; n integer := 0; has_slides boolean := false; resultado text;
BEGIN
 arr := p->'carrusel_slides';
 IF jsonb_typeof(arr)='array' THEN
  FOR it IN SELECT value FROM jsonb_array_elements(arr) LOOP
   n:=n+1;
   IF public.creative_asset_key(it#>>'{}') IS NOT NULL THEN
    has_slides:=true; slot:='slide_'||n; category:='diseno'; label:='Lámina '||n; url:=btrim(it#>>'{}'); RETURN NEXT;
   END IF;
  END LOOP;
 END IF;
 resultado:=p->>'drive_resultado_url';
 IF NOT has_slides THEN
  IF public.creative_asset_key(resultado) IS NOT NULL THEN
   slot:='diseno'; category:='diseno'; label:='Diseño'; url:=btrim(resultado); RETURN NEXT;
  END IF;
  IF public.creative_asset_key(p->>'portada_editada_url') IS NOT NULL AND public.creative_asset_key(p->>'portada_editada_url') IS DISTINCT FROM public.creative_asset_key(resultado) THEN
   slot:='portada'; category:='diseno'; label:='Portada'; url:=btrim(p->>'portada_editada_url'); RETURN NEXT;
  END IF;
 END IF;
 IF public.creative_asset_key(p->>'video_sin_musica_url') IS NOT NULL THEN
  slot:='video_sin_musica'; category:='video'; label:='Video sin música'; url:=btrim(p->>'video_sin_musica_url'); RETURN NEXT;
 END IF;
 IF public.creative_asset_key(p->>'video_con_musica_url') IS NOT NULL THEN
  slot:='video_con_musica'; category:='video'; label:='Video con música'; url:=btrim(p->>'video_con_musica_url'); RETURN NEXT;
 END IF;
END $$;
CREATE FUNCTION public.creative_capture(p jsonb, is_baseline boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s record; last_v public.creative_versions; aid uuid;
BEGIN
 aid:=coalesce(nullif(p->>'updated_by','')::uuid,nullif(p->>'created_by','')::uuid);
 FOR s IN SELECT * FROM public.creative_sources(p) LOOP
  SELECT * INTO last_v FROM public.creative_versions WHERE publicacion_id=(p->>'id')::uuid AND slot=s.slot ORDER BY version DESC LIMIT 1;
  IF last_v.id IS NULL OR last_v.asset_key IS DISTINCT FROM public.creative_asset_key(s.url) THEN
   INSERT INTO public.creative_versions(publicacion_id,slot,category,label,version,url,asset_key,created_by,baseline,counts_change)
    VALUES((p->>'id')::uuid,s.slot,s.category,s.label,coalesce(last_v.version,0)+1,s.url,public.creative_asset_key(s.url),CASE WHEN is_baseline THEN NULL ELSE aid END,is_baseline,last_v.id IS NOT NULL AND NOT is_baseline);
  END IF;
 END LOOP;
END $$;
CREATE FUNCTION public.creative_capture_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN PERFORM public.creative_capture(to_jsonb(NEW)); RETURN NEW; END $$;
CREATE TRIGGER creative_capture_delivery AFTER INSERT OR UPDATE OF drive_resultado_url,portada_editada_url,video_sin_musica_url,video_con_musica_url,carrusel_slides ON public.publicaciones FOR EACH ROW EXECUTE FUNCTION public.creative_capture_trigger();
-- Existing links become a clearly labelled starting point, not invented historical updates.
SELECT public.creative_capture(to_jsonb(p),true) FROM public.publicaciones p;
REVOKE ALL ON FUNCTION public.creative_capture(jsonb,boolean),public.creative_capture_trigger() FROM PUBLIC;
