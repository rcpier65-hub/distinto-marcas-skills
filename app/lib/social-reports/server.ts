import "server-only";
import {
  brandBinding,
  connection,
  metaAccessToken,
  type BrandBinding,
} from "@/lib/meta-mcp/server";
import { StrategyError } from "@/lib/estrategia/access";
import { todayLima } from "@/lib/estrategia/model";
import {
  addDays,
  blankValues,
  chunks30,
  combineInstagram,
  daily,
  growth,
  insightRows,
  number,
  publicURL,
  reportPeriod,
  splitViews,
  total,
  uniqueReach,
  type Range,
  type Channel,
  type AdPeriod,
  type SocialReport,
  type Post,
  type PostReport,
} from "./model";

type JSONData = Record<string, unknown>;
async function graph(
  path: string,
  params: Record<string, string>,
  token: string,
): Promise<JSONData | null> {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v26.0/${path}?${new URLSearchParams(params)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    const data = await r.json();
    return r.ok && !data.error ? data : null;
  } catch {
    return null;
  }
}
const periodParams = (r: Range) => ({
  since: r.start,
  until: r.end,
  period: "day",
});
async function context(brandId: string) {
  const binding = await brandBinding(brandId),
    agency = await connection();
  if (!binding || !agency)
    throw new StrategyError(
      "Selecciona las cuentas de esta marca en Métricas → Elegir cuentas.",
      409,
    );
  return { binding, agency };
}
const signature = (b: BrandBinding, a: { updated_at: string }) =>
  `${b.updated_at}:${a.updated_at}`;
async function pageToken(pageId: string, token: string) {
  const p = await graph(pageId, { fields: "id,access_token" }, token);
  return p?.id === pageId && typeof p.access_token === "string"
    ? p.access_token
    : null;
}

async function instagram(id: string, r: Range, token: string) {
  const parts = await Promise.all(
    chunks30(r).map(async (part) => {
      const [metrics, follows] = await Promise.all([
        graph(
          `${id}/insights`,
          {
            ...periodParams(part),
            metric_type: "total_value",
            metric:
              "views,reach,likes,comments,saves,shares,total_interactions",
          },
          token,
        ),
        graph(
          `${id}/insights`,
          {
            ...periodParams(part),
            metric_type: "total_value",
            metric: "follows_and_unfollows",
            breakdown: "follow_type",
          },
          token,
        ),
      ]);
      const rows = insightRows(metrics),
        v = blankValues();
      for (const key of [
        "views",
        "reach",
        "likes",
        "comments",
        "saves",
        "shares",
      ] as const)
        v[key] = total(rows, key);
      v.interactions = total(rows, "total_interactions");
      v.follows = growth(insightRows(follows), "FOLLOWER");
      v.unfollows = growth(insightRows(follows), "NON_FOLLOWER");
      return v;
    }),
  );
  return combineInstagram(parts);
}
async function facebook(id: string, r: Range, token: string) {
  const [metrics, reach, split] = await Promise.all([
    graph(
      `${id}/insights`,
      {
        ...periodParams(r),
        metric:
          "page_media_view,page_post_engagements,page_views_total,page_daily_follows_unique,page_daily_unfollows_unique,page_actions_post_reactions_total",
      },
      token,
    ),
    graph(
      `${id}/insights`,
      {
        ...periodParams(r),
        period: "total_over_range",
        metric: "page_total_media_view_unique",
      },
      token,
    ),
    graph(
      `${id}/insights`,
      {
        ...periodParams(r),
        metric: "page_media_view",
        breakdown: "is_from_ads",
      },
      token,
    ),
  ]);
  const rows = insightRows(metrics),
    values = blankValues();
  values.views = daily(rows, "page_media_view", r.days);
  values.interactions = daily(rows, "page_post_engagements", r.days);
  values.profileVisits = daily(rows, "page_views_total", r.days);
  values.follows = daily(rows, "page_daily_follows_unique", r.days);
  values.unfollows = daily(rows, "page_daily_unfollows_unique", r.days);
  values.likes = daily(
    rows,
    "page_actions_post_reactions_total",
    r.days,
    "like",
  );
  values.reactions = daily(
    rows,
    "page_actions_post_reactions_total",
    r.days,
    "all",
  );
  values.reach = uniqueReach(
    insightRows(reach),
    "page_total_media_view_unique",
  );
  const breakdown = splitViews(insightRows(split), r.days);
  return {
    values,
    ...(breakdown.organic !== null &&
    breakdown.paid !== null &&
    breakdown.organic + breakdown.paid === values.views
      ? breakdown
      : { organic: null, paid: null }),
  };
}
const emptyAd = (): AdPeriod => ({
  spend: null,
  conversations: null,
  costPerConversation: null,
});
async function ads(id: string, r: Range, token: string, currency: string) {
  const raw = await graph(
    `act_${id}/insights`,
    {
      fields: "account_id,account_currency,spend,actions",
      level: "account",
      time_range: JSON.stringify({ since: r.start, until: addDays(r.end, -1) }),
    },
    token,
  );
  if (!Array.isArray(raw?.data) || raw.data.length !== 1) return emptyAd();
  const d = raw.data[0];
  if (d.account_id !== id || d.account_currency !== currency) return emptyAd();
  const spend = number(d.spend),
    conversations = number(
      d.actions?.find(
        (x: { action_type: string }) =>
          x.action_type ===
          "onsite_conversion.messaging_conversation_started_7d",
      )?.value,
    );
  return {
    spend,
    conversations,
    costPerConversation:
      spend !== null && conversations !== null && conversations > 0
        ? spend / conversations
        : null,
  };
}
async function loadReport(
  binding: BrandBinding,
  month: string,
  token: string,
): Promise<SocialReport> {
  const period = reportPeriod(month, todayLima()),
    warnings: string[] = [],
    channels: Channel[] = [];
  if (!period.current.days)
    return {
      period,
      checkedAt: new Date().toISOString(),
      channels,
      ads: null,
      warnings: ["Este mes aún no tiene días completos para comparar."],
    };
  let adReport: SocialReport["ads"] = null;
  await Promise.all([
    (async () => {
      const id = binding.instagram_user_id;
      if (!id) return;
      const [profile, current, previous] = await Promise.all([
        graph(id, { fields: "id,username,followers_count" }, token),
        instagram(id, period.current, token),
        instagram(id, period.previous, token),
      ]);
      const notes = [
        "Las métricas de la cuenta pueden incluir contenido promocionado. Instagram no ofrece aquí el desglose orgánico/pagado.",
      ];
      if (period.current.days > 30 || period.previous.days > 30)
        notes.push(
          "Meta limita el alcance de Instagram a 30 días por consulta. En un mes de 31 días se suman solo métricas aditivas; el alcance único queda sin dato.",
        );
      if (current.views === null)
        notes.push(
          "No se pudo recuperar todo este periodo. Meta puede limitar el historial disponible o requerir revisar permisos.",
        );
      channels.push({
        network: "instagram",
        name:
          typeof profile?.username === "string"
            ? `@${profile.username}`
            : binding.display_data.instagramUsername || "Instagram",
        followers: profile?.id === id ? number(profile.followers_count) : null,
        current,
        previous,
        organic: null,
        paid: null,
        notes,
      });
    })(),
    (async () => {
      const id = binding.facebook_page_id;
      if (!id) return;
      const pt = await pageToken(id, token),
        notes = [
          "Las interacciones de Facebook incluyen clics y otras acciones; no equivalen exactamente a las interacciones de Instagram.",
        ];
      const [profile, current, previous] = pt
        ? await Promise.all([
            graph(id, { fields: "id,name,followers_count" }, pt),
            facebook(id, period.current, pt),
            facebook(id, period.previous, pt),
          ])
        : [
            null,
            { values: blankValues(), organic: null, paid: null },
            { values: blankValues(), organic: null, paid: null },
          ];
      if (current.values.views === null)
        notes.push(
          "No se pudo recuperar todo este periodo. Revisa la conexión o vuelve a intentar.",
        );
      channels.push({
        network: "facebook",
        name:
          typeof profile?.name === "string"
            ? profile.name
            : binding.display_data.facebookPageName || "Facebook",
        followers: profile?.id === id ? number(profile.followers_count) : null,
        current: current.values,
        previous: previous.values,
        organic: current.organic,
        paid: current.paid,
        notes,
      });
    })(),
    (async () => {
      const id = binding.ad_account_id;
      if (!id) return;
      const profile = await graph(
        `act_${id}`,
        { fields: "account_id,name,currency,timezone_name" },
        token,
      );
      if (profile?.account_id !== id || typeof profile.currency !== "string") {
        warnings.push("No se pudo consultar la cuenta publicitaria asignada.");
        return;
      }
      const [current, previous] = await Promise.all([
        ads(id, period.current, token, profile.currency),
        ads(id, period.previous, token, profile.currency),
      ]);
      adReport = {
        name: String(
          profile.name || binding.display_data.adAccountName || "Meta Ads",
        ),
        currency: profile.currency,
        timezone: String(profile.timezone_name || "Según cuenta Meta"),
        current,
        previous,
        note:
          current.spend === null
            ? "Meta no devolvió actividad consultable para este periodo."
            : null,
      };
    })(),
  ]);
  if (!channels.length)
    warnings.push(
      "Esta marca aún no tiene una página de Facebook o Instagram asignados.",
    );
  channels.sort((a, b) => a.network.localeCompare(b.network));
  return {
    period,
    channels,
    ads: adReport,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}

// Bound pagination and never follow provider URLs, which can include credentials.
async function postsFor(
  network: "instagram" | "facebook",
  id: string,
  r: Range,
  token: string,
) {
  const posts: Post[] = [];
  let after: string | undefined,
    truncated = false,
    failed = false;
  for (let page = 0; page < 2; page++) {
    const raw = await graph(
      `${id}/${network === "instagram" ? "media" : "published_posts"}`,
      {
        fields:
          network === "instagram"
            ? "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
            : "id,message,created_time,permalink_url,full_picture",
        since: r.start,
        until: r.end,
        limit: "50",
        ...(after ? { after } : {}),
      },
      token,
    );
    if (!Array.isArray(raw?.data)) {
      failed = true;
      break;
    }
    let older = false;
    for (const p of raw.data) {
      const timestamp = network === "instagram" ? p.timestamp : p.created_time,
        date = typeof timestamp === "string" ? timestamp.slice(0, 10) : "";
      if (date < r.start) {
        older = true;
        continue;
      }
      if (date >= r.end || !/^\d+(?:_\d+)?$/.test(p.id) || !date) continue;
      posts.push({
        id: p.id,
        network,
        caption: String(
          p.caption || p.message || "Publicación sin texto",
        ).slice(0, 500),
        publishedAt: timestamp,
        url: publicURL(
          network === "instagram" ? p.permalink : p.permalink_url,
          network,
        ),
        image: publicURL(
          network === "instagram"
            ? p.thumbnail_url || (p.media_type !== "VIDEO" ? p.media_url : null)
            : p.full_picture,
          "image",
        ),
        views: null,
        likes: network === "instagram" ? number(p.like_count) : null,
        comments: network === "instagram" ? number(p.comments_count) : null,
      });
    }
    const paging = raw.paging as
      | { next?: string; cursors?: { after?: string } }
      | undefined;
    if (!paging?.next || older) break;
    after = paging.cursors?.after;
    if (!after || page === 1) truncated = true;
    if (!after) break;
  }
  const distinct = [...new Map(posts.map((p) => [p.id, p])).values()];
  if (network === "instagram") {
    distinct.sort(
      (a, b) =>
        (b.likes ?? -1) +
        (b.comments ?? 0) -
        (a.likes ?? -1) -
        (a.comments ?? 0),
    );
    const top = distinct.filter((p) => p.likes !== null).slice(0, 3);
    await Promise.all(
      top.map(async (p) => {
        const raw = await graph(`${p.id}/insights`, { metric: "views" }, token);
        const row = insightRows(raw).find((x) => x.name === "views");
        p.views =
          row?.values?.length === 1 ? number(row.values[0].value) : null;
      }),
    );
    return {
      network,
      posts: top,
      note: `Ordenadas por Me gusta + comentarios de ${distinct.length} publicaciones del periodo. Cifras acumuladas hasta hoy, no solo del mes.${truncated ? " La lista está limitada a 100 publicaciones." : ""}${failed ? " Meta no entregó la lista completa." : ""}`,
    };
  }
  const candidates = distinct.slice(0, 30);
  for (let offset = 0; offset < candidates.length; offset += 4)
    await Promise.all(
      candidates.slice(offset, offset + 4).map(async (p) => {
        const raw = await graph(
          `${p.id}/insights`,
          {
            metric: "post_media_view,post_reactions_by_type_total",
            period: "lifetime",
          },
          token,
        );
        const rows = insightRows(raw),
          v = rows.find((x) => x.name === "post_media_view")?.values;
        p.views = v?.length === 1 ? number(v[0].value) : null;
        const reactions = rows.find(
          (x) => x.name === "post_reactions_by_type_total",
        )?.values?.[0]?.value;
        p.likes =
          reactions && typeof reactions === "object"
            ? "like" in reactions
              ? number(reactions.like)
              : 0
            : null;
      }),
    );
  return {
    network,
    posts: candidates
      .filter((p) => p.views !== null)
      .sort((a, b) => b.views! - a.views!)
      .slice(0, 3),
    note: `Ordenadas por visualizaciones de ${candidates.length} publicaciones del periodo. Cifras acumuladas hasta hoy.${truncated || distinct.length > 30 ? " Se analizaron las 30 publicaciones más recientes; no es el ranking completo del mes." : ""}${failed ? " Meta no entregó la lista completa." : ""}${candidates.some((p) => p.views === null) ? " Algunas publicaciones no tienen estadísticas disponibles y no participan del ranking." : ""}`,
  };
}
const cache = new Map<
  string,
  { until: number; promise: Promise<SocialReport | PostReport> }
>();
export async function socialReport(
  brandId: string,
  month: string,
  detail: "report" | "posts" = "report",
) {
  const period = reportPeriod(month, todayLima()),
    ctx = await context(brandId),
    stamp = signature(ctx.binding, ctx.agency);
  const key = [brandId, month, detail, stamp, todayLima()].join(":"),
    hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.promise;
  const promise = (async () => {
    const token = await metaAccessToken();
    let result: SocialReport | PostReport;
    if (detail === "report")
      result = await loadReport(ctx.binding, month, token);
    else {
      const groups: PostReport["groups"] = [];
      if (period.current.days)
        await Promise.all([
          (async () => {
            if (ctx.binding.instagram_user_id)
              groups.push(
                await postsFor(
                  "instagram",
                  ctx.binding.instagram_user_id,
                  period.current,
                  token,
                ),
              );
          })(),
          (async () => {
            if (ctx.binding.facebook_page_id) {
              const pt = await pageToken(ctx.binding.facebook_page_id, token);
              if (pt)
                groups.push(
                  await postsFor(
                    "facebook",
                    ctx.binding.facebook_page_id,
                    period.current,
                    pt,
                  ),
                );
              else
                groups.push({
                  network: "facebook",
                  posts: [],
                  note: "Meta no permitió consultar las publicaciones de esta página.",
                });
            }
          })(),
        ]);
      groups.sort((a, b) => a.network.localeCompare(b.network));
      result = { groups, checkedAt: new Date().toISOString() };
    }
    const latest = await context(brandId);
    if (signature(latest.binding, latest.agency) !== stamp)
      throw new StrategyError(
        "La selección o autorización de Meta cambió. Actualiza el reporte.",
        409,
      );
    return result;
  })();
  if (cache.size >= 40) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + 5 * 60000, promise });
  void promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
  });
  return promise;
}
