"use client";
/* Pestaña «Reporte de anuncios» del espacio de marca (Pedro 21-oct-2026): el
   historial mensual de pauta (el mismo de Reportes, sin pedir código al
   equipo) y, en Oral Beauty, el reporte 360 de la pauta al paciente. */
import { useCallback, useEffect, useState } from "react";
import { PautaHistorial } from "@/components/reportes/pauta-historial";
import type { MesPauta } from "@/lib/pauta/historial";
import { Reporte360 } from "./reporte-360";

type Res = { ok: true } | { ok: false; error: string };
const URL_H = "/api/estrategia/pauta/historial";

export function ReporteAnuncios({ slug, hoy }: { slug: string; hoy: string }) {
  const [datos, setDatos] = useState<{ meses: MesPauta[]; mesActual: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${URL_H}?marca=${encodeURIComponent(slug)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo cargar el historial");
      setDatos(j); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el historial"); }
  }, [slug]);
  useEffect(() => { const t = setTimeout(() => void cargar(), 0); return () => clearTimeout(t); }, [cargar]);

  const enviar = async (cuerpo: Record<string, unknown>): Promise<Res> => {
    const r = await fetch(URL_H, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marca: slug, ...cuerpo }) });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j.error || "No se pudo completar" };
    setDatos(j);
    return { ok: true };
  };

  return (
    <div className="st-ads">
      {slug === "oral-bueaty" && <Reporte360 slug={slug} hoy={hoy} />}
      {error && <p className="st-r360-error" role="alert">{error}</p>}
      {datos ? (
        <PautaHistorial slug={slug} meses={datos.meses} mesActual={datos.mesActual}
          onActualizar={() => enviar({ accion: "actualizar" })}
          onPresupuesto={(mes, monto) => enviar({ accion: "presupuesto", mes, monto })} />
      ) : !error && <p className="st-mt-hint">Cargando historial de pauta…</p>}
    </div>
  );
}
