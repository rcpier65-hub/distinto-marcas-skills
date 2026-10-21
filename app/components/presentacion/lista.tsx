"use client";
/* Lista de presentaciones y creación de una nueva reunión (Pedro 21-oct-2026). */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { display, sans } from "./fuentes";
import "./presentacion.css";

type Fila = { id: string; data: { cliente: { nombre: string; empresa: string; rubro: string } }; propuesta_id: string | null; updated_at: string };

export function ListaPresentaciones() {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [form, setForm] = useState({ nombre: "", empresa: "", rubro: "", contacto: "" });
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/presentaciones", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (vivo) setFilas(j.sesiones ?? []); }).catch(() => { if (vivo) setFilas([]); });
    return () => { vivo = false; };
  }, []);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    try {
      const r = await fetch("/api/presentaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cliente: form }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo crear");
      router.push(`/presentaciones/${j.sesion.id}`);
    } catch (x) { toast.error(x instanceof Error ? x.message : "No se pudo crear"); setOcupado(false); }
  };

  return (
    <main className={`pr-lista ${display.variable} ${sans.variable}`}>
      <header>
        <h1>Presentaciones</h1>
        <p>Abre una reunión de venta: escuchamos al cliente, mostramos cómo trabajamos y salimos con la propuesta armada.</p>
      </header>
      <form className="pr-nueva" onSubmit={crear}>
        <h2>Nueva reunión · Desarrollo web</h2>
        <div className="pr-nueva-campos">
          <label>Empresa<input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} maxLength={200} placeholder="Ferretería Sol" /></label>
          <label>Persona de contacto<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} maxLength={160} placeholder="Ana Pérez" /></label>
          <label>Rubro<input value={form.rubro} onChange={(e) => setForm({ ...form, rubro: e.target.value })} maxLength={200} placeholder="Ferretería" /></label>
          <label>Correo o teléfono<input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} maxLength={180} placeholder="ana@ferreteriasol.pe" /></label>
        </div>
        <button className="pr-btn pr-btn-main" disabled={ocupado || (!form.empresa.trim() && !form.nombre.trim())}>{ocupado ? "Abriendo…" : "Empezar presentación"}</button>
      </form>
      <section className="pr-historial">
        <h2>Reuniones anteriores</h2>
        {filas === null ? <p className="pr-quiet">Cargando…</p> : filas.length === 0 ? <p className="pr-quiet">Todavía no hay reuniones guardadas.</p> : (
          <ul>
            {filas.map((f) => (
              <li key={f.id}>
                <Link href={`/presentaciones/${f.id}`}>
                  <strong>{f.data.cliente.empresa || f.data.cliente.nombre}</strong>
                  <span>{f.data.cliente.rubro || "Desarrollo web"}</span>
                  <small>{new Date(f.updated_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}{f.propuesta_id ? " · propuesta generada" : ""}</small>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
