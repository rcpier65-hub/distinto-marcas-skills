import { z } from "zod";
import { reviewActor } from "@/lib/creative-review/server";
import { strategyDB } from "@/lib/estrategia/db";
import { failure, StrategyError } from "@/lib/estrategia/access";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const a = await reviewActor(req);
    const q = new URL(req.url).searchParams;
    const month = z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .parse(q.get("mes"));
    const area = z
      .enum(["todos", "diseno", "video"])
      .parse(q.get("area") || "todos");
    const brand = q.get("marca") || null;
    if (brand) {
      const b = await strategyDB().query(
        "SELECT id FROM marcas WHERE slug=$1 AND activa=true",
        [brand],
      );
      if (!b.rows[0] || (a.brands && !a.brands.includes(b.rows[0].id)))
        throw new StrategyError("Marca no disponible", 404);
    }
    const { rows } = await strategyDB().query(
      `SELECT p.id,p.nombre,m.nombre AS brand,m.slug,v.category,
   count(*)::int AS deliveries,count(*) FILTER(WHERE v.counts_change AND v.exclusion_reason IS NULL)::int AS updates,
   max(v.created_at) AS last_at,
   (SELECT count(*)::int FROM creative_review_notes n JOIN creative_versions cv ON cv.id=n.version_id WHERE cv.publicacion_id=p.id AND cv.category=v.category AND n.state IN ('pendiente','en_proceso')) AS pending
   FROM creative_versions v JOIN publicaciones p ON p.id=v.publicacion_id JOIN marcas m ON m.id=p.marca_id
   WHERE NOT v.baseline AND m.activa=true AND ($1::uuid[] IS NULL OR m.id=ANY($1)) AND ($2::text IS NULL OR m.slug=$2)
   AND ($3='todos' OR v.category=$3)
   AND v.created_at>=($4::date::timestamp AT TIME ZONE 'America/Lima') AND v.created_at<(($4::date+interval '1 month')::timestamp AT TIME ZONE 'America/Lima')
   GROUP BY p.id,p.nombre,m.nombre,m.slug,v.category ORDER BY last_at DESC`,
      [a.brands, brand, area, month + "-01"],
    );
    const delivered = rows.length,
      returned = rows.filter((r) => r.updates > 0).length;
    return Response.json(
      {
        month,
        delivered,
        returned,
        updates: rows.reduce((s, r) => s + r.updates, 0),
        rate: delivered ? Math.round((returned / delivered) * 100) : null,
        items: rows,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
