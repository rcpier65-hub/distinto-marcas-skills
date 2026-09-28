import { z } from "zod";
import { requireSessionMember } from "@/lib/api/session-member";
import {
  studioActor,
  brandAccess,
  batchAccess,
  readBody,
  apiError,
  StudioError,
} from "@/lib/creative-studio/server";
import {
  profileSchema,
  batchDataSchema,
  scriptSchema,
  emptyProfile,
  scriptText,
  missingScript,
} from "@/lib/creative-studio/model";
import { readWebsite } from "@/lib/creative-studio/web-source";
import { generateCreative } from "@/lib/creative-studio/ai";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function GET(req: Request) {
  try {
    const a = await studioActor(req);
    const url = new URL(req.url);
    const batchId = url.searchParams.get("batch");
    if (batchId) {
      await batchAccess(a, batchId);
      const scriptId = z.string().uuid().parse(url.searchParams.get("script"));
      const step = z.coerce
        .number()
        .int()
        .min(0)
        .max(7)
        .parse(url.searchParams.get("step"));
      const { data, error } = await a.db
        .from("creative_generations")
        .select("id,result,created_at")
        .eq("batch_id", batchId)
        .eq("script_id", scriptId)
        .eq("kind", "suggest")
        .eq("step", step)
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return Response.json(
        { generations: data },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const generationId = url.searchParams.get("generation");
    if (generationId) {
      z.string().uuid().parse(generationId);
      const { data, error } = await a.db
        .from("creative_generations")
        .select("id,batch_id,status,result,created_at,completed_at")
        .eq("id", generationId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new StudioError("Propuesta no encontrada", 404);
      await batchAccess(a, data.batch_id);
      return Response.json(data, { headers: { "Cache-Control": "no-store" } });
    }
    const brandId = url.searchParams.get("brand");
    if (!brandId) {
      let q = a.db
        .from("marcas")
        .select("id,nombre,slug,emoji_marca,tono_voz,drive_url")
        .eq("activa", true)
        .order("nombre");
      if (a.brands) q = q.in("id", a.brands);
      const { data, error } = await q;
      if (error) throw error;
      return Response.json({
        brands: data,
        manager: a.manager,
        userId: a.user.id,
      });
    }
    await brandAccess(a, brandId);
    const results = await Promise.all([
      a.db
        .from("creative_brand_profiles")
        .select("*")
        .eq("marca_id", brandId)
        .maybeSingle(),
      a.db
        .from("creative_batches")
        .select("*")
        .eq("marca_id", brandId)
        .order("updated_at", { ascending: false })
        .limit(100),
      a.db
        .from("grabaciones")
        .select("id,fecha_planeada,estado")
        .eq("marca_id", brandId)
        .order("fecha_planeada", { ascending: false })
        .limit(100),
      a.db
        .from("publicaciones")
        .select("id,nombre,guion,created_at")
        .eq("marca_id", brandId)
        .not("guion", "is", null)
        .neq("guion", "")
        .order("created_at", { ascending: false })
        .limit(35),
    ]);
    for (const r of results) if (r.error) throw r.error;
    const ids = results[1].data.map((b: { id: string }) => b.id);
    const links = ids.length
      ? await a.db
          .from("creative_publication_links")
          .select("*")
          .in("batch_id", ids)
      : { data: [], error: null };
    if (links.error) throw links.error;
    return Response.json(
      {
        profile: results[0].data?.data ?? emptyProfile,
        profileRevision: results[0].data?.revision ?? 0,
        batches: results[1].data,
        recordings: results[2].data,
        history: results[3].data,
        links: links.data,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    const a = await studioActor(req);
    const body = await readBody(req);
    const action = z
      .enum([
        "profile",
        "create",
        "save",
        "source",
        "suggest",
        "assess",
        "publish",
        "settings",
      ])
      .parse(body.action);
    if (action === "profile") {
      await brandAccess(a, body.brandId);
      const data = profileSchema.parse(body.data);
      const revision = z.number().int().min(0).parse(body.revision);
      const query =
        revision === 0
          ? a.db
              .from("creative_brand_profiles")
              .insert({ marca_id: body.brandId, data, updated_by: a.user.id })
          : a.db
              .from("creative_brand_profiles")
              .update({
                data,
                revision: revision + 1,
                updated_at: new Date().toISOString(),
                updated_by: a.user.id,
              })
              .eq("marca_id", body.brandId)
              .eq("revision", revision);
      const r = await query.select().maybeSingle();
      if (r.error?.code === "23505" || (!r.data && !r.error))
        throw new StudioError(
          "Otra persona cambió la marca. Recarga y conserva tus notas antes de reintentar.",
          409,
        );
      if (r.error) throw r.error;
      return Response.json(r.data);
    }
    if (action === "create") {
      await brandAccess(a, body.brandId);
      const name = z.string().trim().min(1).max(160).parse(body.name);
      const data = batchDataSchema.parse(body.data);
      const id = z.string().uuid().parse(body.id);
      const recordingId = z
        .string()
        .uuid()
        .nullable()
        .parse(body.recordingId ?? null);
      if (recordingId) {
        const r = await a.db
          .from("grabaciones")
          .select("marca_id")
          .eq("id", recordingId)
          .single();
        if (r.error || r.data?.marca_id !== body.brandId)
          throw new StudioError(
            "La grabación debe pertenecer a la misma marca",
          );
      }
      const existing = await a.db
        .from("creative_batches")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) {
        await brandAccess(a, existing.data.marca_id);
        return Response.json(existing.data);
      }
      const r = await a.db
        .from("creative_batches")
        .insert({
          id,
          marca_id: body.brandId,
          name,
          recording_id: recordingId,
          data,
          created_by: a.user.id,
        })
        .select()
        .single();
      if (r.error) throw r.error;
      return Response.json(r.data);
    }
    if (action === "source") {
      await brandAccess(a, body.brandId);
      const url = z.string().url().max(2000).parse(body.url);
      try {
        return Response.json(await readWebsite(url));
      } catch (e) {
        throw new StudioError(
          e instanceof Error ? e.message : "No se pudo leer esta fuente",
        );
      }
    }
    const batch = await batchAccess(a, body.batchId);
    if (action === "settings") {
      const name = z.string().trim().min(1).max(160).parse(body.name);
      const recordingId = z
        .string()
        .uuid()
        .nullable()
        .parse(body.recordingId ?? null);
      if (recordingId) {
        const r = await a.db
          .from("grabaciones")
          .select("marca_id")
          .eq("id", recordingId)
          .single();
        if (r.error || r.data?.marca_id !== batch.marca_id)
          throw new StudioError("La grabación debe pertenecer a esta marca");
      }
      const data = batchDataSchema.parse({
        ...body.data,
        scripts: batch.data.scripts,
      });
      const revision = z.number().int().positive().parse(body.revision);
      const r = await a.db
        .from("creative_batches")
        .update({
          name,
          recording_id: recordingId,
          data,
          revision: revision + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", batch.id)
        .eq("revision", revision)
        .select()
        .maybeSingle();
      if (r.error) throw r.error;
      if (!r.data)
        throw new StudioError(
          "Otra persona cambió la tanda. Recarga antes de editar la configuración.",
          409,
        );
      return Response.json(r.data);
    }
    if (action === "save") {
      const data = batchDataSchema.parse(body.data);
      const revision = z.number().int().positive().parse(body.revision);
      const r = await a.db
        .from("creative_batches")
        .update({
          data,
          revision: revision + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", batch.id)
        .eq("revision", revision)
        .select()
        .maybeSingle();
      if (r.error) throw r.error;
      if (!r.data)
        throw new StudioError(
          "Otra persona editó esta tanda. Descarga tu respaldo y recarga antes de continuar.",
          409,
        );
      return Response.json(r.data);
    }
    if (action === "suggest" || action === "assess") {
      const script = scriptSchema.parse(body.script);
      if (!batch.data.scripts.some((s: { id: string }) => s.id === script.id))
        throw new StudioError("Guarda el guion antes de pedir sugerencias");
      const step =
        action === "assess"
          ? 8
          : z.number().int().min(0).max(7).parse(body.step);
      const mode = z.enum(["explore", "refine"]).parse(body.mode ?? "explore");
      const nonce = z.string().uuid().optional().parse(body.nonce);
      const instruction = z
        .string()
        .max(1000)
        .parse(body.instruction ?? "");
      const previous = z
        .array(z.string().max(300))
        .max(25)
        .parse(body.previous ?? []);
      const brand = await brandAccess(a, batch.marca_id);
      const [{ data: p, error: pe }, { data: history, error: he }] =
        await Promise.all([
          a.db
            .from("creative_brand_profiles")
            .select("data")
            .eq("marca_id", batch.marca_id)
            .maybeSingle(),
          a.db
            .from("publicaciones")
            .select("nombre,guion")
            .eq("marca_id", batch.marca_id)
            .not("guion", "is", null)
            .order("created_at", { ascending: false })
            .limit(12),
        ]);
      if (pe || he) throw pe || he;
      return Response.json(
        await generateCreative(a, batch.id, {
          kind: action,
          step,
          script,
          profile: profileSchema.parse(p?.data ?? emptyProfile),
          brand: brand.nombre,
          brief: batch.data.objective,
          platform: batch.data.platform,
          mode,
          nonce,
          history: (history ?? []).map(
            (x: { nombre: string; guion: string }) => ({
              ...x,
              guion: x.guion?.slice(0, 2200),
            }),
          ),
          siblings: batch.data.scripts
            .filter((s: { id: string }) => s.id !== script.id)
            .map((s: { title: string; idea: string }) => ({
              title: s.title,
              idea: s.idea,
            })),
          instruction,
          previous,
        }),
      );
    }
    const member = await requireSessionMember(req);
    if ("response" in member) return member.response;
    if (!member.member.puedeEditarPublicaciones)
      throw new StudioError("No tienes permiso para crear publicaciones", 403);
    const scriptId = z.string().uuid().parse(body.scriptId);
    const script = scriptSchema.parse(
      batch.data.scripts.find((s: { id: string }) => s.id === scriptId),
    );
    if (script.status !== "listo" || missingScript(script).length)
      throw new StudioError("Completa y revisa el guion primero");
    const r = await a.db.rpc("creative_link_publication", {
      p_batch: batch.id,
      p_script: scriptId,
      p_revision: batch.revision,
      p_text: scriptText(script),
      p_user: a.user.id,
    });
    if (r.error) throw r.error;
    return Response.json({ publicationId: r.data });
  } catch (e) {
    return apiError(e);
  }
}
