"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Camera, Users, Music2, ArrowUpRight } from "lucide-react";
import type { SocialSummary } from "@/lib/estrategia/social-model";
import { Modal, PrettyDate } from "./common";
const icons = { instagram: Camera, facebook: Users, tiktok: Music2 };
export function SocialCard({
  slug,
  manager,
  compact = false,
}: {
  slug: string;
  manager: boolean;
  compact?: boolean;
}) {
  const [data, setData] = useState<SocialSummary | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    void loadSocial(slug, c.signal)
      .then((value) => {
        if (!c.signal.aborted) {
          setData(value);
          setError("");
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [slug]);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setData(await loadSocial(slug));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const networks = data && (
    <div className="st-social-networks">
      {data.networks.map((n) => {
        const Icon = icons[n.network];
        return (
          <div key={n.network}>
            <span className="st-network-title">
              <Icon size={14} />
              <strong>{n.label}</strong>
            </span>
            <b>
              {n.followers === null ? "—" : n.followers.toLocaleString("es-PE")}
            </b>
            <small>Seguidores</small>
          </div>
        );
      })}
    </div>
  );
  const full = data && (
    <div className="st-social-expanded">
      {data.networks.map((n) => (
        <div key={n.network}>
          <h3>{n.label}</h3>
          <p>
            {n.followers === null
              ? "Sin dato de seguidores"
              : `${n.followers.toLocaleString("es-PE")} seguidores`}
            {n.asOf && (
              <>
                {" "}
                al <PrettyDate value={n.asOf} />
              </>
            )}
          </p>
          {n.network === "instagram" && (
            <p>
              Alcance:{" "}
              {n.reach === null ? "—" : n.reach.toLocaleString("es-PE")} ·
              Interacciones:{" "}
              {n.interactions === null
                ? "—"
                : n.interactions.toLocaleString("es-PE")}
            </p>
          )}
          <small>{n.note}</small>
        </div>
      ))}
      <p>{data.message}</p>
      <small>
        Periodo: <PrettyDate value={data.start} /> —{" "}
        <PrettyDate value={data.end} /> · Consulta:{" "}
        {new Date(data.checkedAt).toLocaleTimeString("es-PE", {
          timeZone: "America/Lima",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        Lima
      </small>
      {manager && ["reconnect", "unconfigured"].includes(data.status) && (
        <p>
          Para mostrar cifras reales falta autorizar Facebook e Instagram
          profesional de la marca.
        </p>
      )}
      {manager && <a className="st-text-button" href={`/marca/${encodeURIComponent(slug)}/metricas`}>Ver Meta Ads y configurar conexión →</a>}
    </div>
  );
  return (
    <>
      <section
        className={`st-card st-social ${compact ? "st-social-compact" : ""}`}
        aria-label="Métricas de redes sociales"
      >
        <div className="st-row">
          <span className="st-eyebrow">REDES SOCIALES</span>
          <button className="st-text-button" onClick={() => setExpanded(true)}>
            Ver métricas <ArrowUpRight size={13} />
          </button>
        </div>
        {busy && !data && <p role="status">Consultando las redes…</p>}
        {error && <p role="alert">{error}</p>}
        {networks}
        {data && (
          <small className="st-social-status" role="status">
            {data.status === "unconfigured"
              ? "Meta · conexión pendiente"
              : data.status === "reconnect"
                ? "Meta · revisar autorización"
                : data.status === "unavailable"
                  ? "Meta · no disponible"
                  : `API de Meta · actualizado ${new Date(data.checkedAt).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" })}`}
          </small>
        )}
        {!compact && full}
      </section>
      {expanded && (
        <Modal
          title="Métricas de redes sociales"
          close={() => setExpanded(false)}
        >
          <div className="st-toolbar">
            <button disabled={busy} onClick={() => void refresh()}>
              <RefreshCw size={14} />
              Actualizar métricas
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
          {full || <p>Consultando las redes…</p>}
        </Modal>
      )}
    </>
  );
}
async function loadSocial(
  slug: string,
  signal?: AbortSignal,
): Promise<SocialSummary> {
  const response = await fetch(
    `/api/estrategia/metricas?marca=${encodeURIComponent(slug)}`,
    { signal },
  );
  if (response.redirected && new URL(response.url).pathname === "/login")
    throw new Error("Inicia sesión para consultar las métricas.");
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new Error("No se pudo consultar las redes de esta marca.");
  return response.json();
}
