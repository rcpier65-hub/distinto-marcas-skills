"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Stats = {
  delivered: number;
  returned: number;
  updates: number;
  rate: number | null;
  items: {
    id: string;
    nombre: string;
    brand: string;
    category: string;
    deliveries: number;
    updates: number;
    pending: number;
  }[];
};
export function ReviewMetrics({
  brand = "",
  initialArea = "todos",
}: {
  brand?: string;
  initialArea?: string;
}) {
  const [month, setMonth] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
    })
      .format(new Date())
      .slice(0, 7),
  );
  const [area, setArea] = useState(
    ["todos", "diseno", "video"].includes(initialArea) ? initialArea : "todos",
  );
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const ac = new AbortController();
    queueMicrotask(() => {
      setError("");
      setData(null);
    });
    const q = new URLSearchParams({
      mes: month,
      area,
      ...(brand ? { marca: brand } : {}),
    });
    fetch("/api/creative-review/stats?" + q, {
      signal: ac.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "No se pudo cargar");
        if (!ac.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(e.message);
      });
    return () => ac.abort();
  }, [month, area, brand]);
  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5 text-slate-800">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grow">
          <h1 className="text-xl font-semibold">Revisiones y tasa de rebote</h1>
          <p className="text-sm text-slate-500">
            Diseños y videos ·{" "}
            {brand ? "marca seleccionada" : "tus marcas autorizadas"}
          </p>
        </div>
        <label className="text-sm">
          Mes
          <input
            aria-label="Mes de entregas"
            className="ml-2 rounded border p-2"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </label>
        <select
          aria-label="Área"
          className="rounded border p-2"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        >
          <option value="todos">Diseño y video</option>
          <option value="diseno">Diseño</option>
          <option value="video">Video</option>
        </select>
      </div>
      {error ? (
        <p role="alert" className="py-6 text-red-600">
          {error}
        </p>
      ) : !data ? (
        <p className="py-6" role="status">
          Cargando entregas…
        </p>
      ) : (
        <>
          <div className="my-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Tasa de rebote", data.rate === null ? "—" : data.rate + "%"],
              ["Trabajos con entrega", data.delivered],
              ["Trabajos con reentrega", data.returned],
              ["Actualizaciones", data.updates],
            ].map(([l, v]) => (
              <div className="rounded-xl bg-violet-50 p-4" key={l}>
                <small className="text-violet-700">{l}</small>
                <p className="text-2xl font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            Trabajos con una reentrega durante el mes ÷ trabajos con entregas
            durante el mes. Cada trabajo cuenta una vez por área; las variantes
            y láminas no multiplican el denominador. Cambiar un enlace no
            significa automáticamente un rechazo del cliente.
          </p>
          <div className="mt-5 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="p-2">Trabajo</th>
                  <th className="p-2">Área</th>
                  <th className="p-2">Entregas del mes</th>
                  <th className="p-2">Actualizaciones</th>
                  <th className="p-2">Cambios pendientes</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr className="border-b" key={i.id + i.category}>
                    <td className="p-3">
                      <Link
                        className="font-medium text-violet-700"
                        href={`/revision/${i.id}`}
                      >
                        {i.nombre} ↗
                      </Link>
                      <p className="text-xs text-slate-500">{i.brand}</p>
                    </td>
                    <td className="p-3">
                      {i.category === "video" ? "Video" : "Diseño"}
                    </td>
                    <td className="p-3">{i.deliveries}</td>
                    <td className="p-3">{i.updates}</td>
                    <td className="p-3">{i.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.items.length && (
              <p className="py-8 text-center text-slate-500">
                Aún no hay nuevas entregas registradas en este mes.
              </p>
            )}
          </div>
        </>
      )}
      <p className="mt-5 text-xs text-slate-400">
        El historial empieza al activar esta función. Los archivos que ya
        existían se conservan como V1 inicial, sin inventar fechas, autores ni
        cambios anteriores, y no se incluyen en las entregas del mes. Los
        enlaces corregidos por error pueden excluirse con un motivo.
      </p>
    </section>
  );
}
