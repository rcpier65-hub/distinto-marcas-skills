// Resultado de conectar TikTok (lo ve también el cliente que usó el enlace).
export const dynamic = "force-dynamic";
export const metadata = { title: "Conexión con TikTok" };
const MSG: Record<string, string> = {
  conectada: "Esta marca ya tiene una cuenta de TikTok conectada. Si necesitas cambiarla, pide a Distinto Studio que la desconecte primero.",
  enlace: "Este enlace venció o no es válido. Pide uno nuevo a tu contacto en Distinto Studio.",
  cancelado: "La conexión se canceló en TikTok. Puedes volver a abrir el enlace cuando quieras.",
  config: "La conexión con TikTok no está disponible en este momento. Avísale a Distinto Studio.",
  fallo: "No pudimos completar la conexión.",
};
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const ok = q.ok === "1";
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f3fb", padding: 20, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 440, width: "100%", background: "#fff", borderRadius: 22, padding: "34px 28px", textAlign: "center", boxShadow: "0 20px 60px -20px rgba(40,20,80,.25)" }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", background: ok ? "#000" : "#fee2e2", color: ok ? "#fff" : "#b91c1c", fontSize: 28 }}>
          {ok ? "✓" : "!"}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1f1a2e" }}>{ok ? "¡TikTok conectado!" : "No se completó la conexión"}</h1>
        <p style={{ fontSize: 14.5, color: "#5b5470", lineHeight: 1.6, marginTop: 10 }}>
          {ok
            ? <>La cuenta {q.usuario ? <b>@{q.usuario}</b> : null} quedó conectada{q.marca ? <> a <b>{q.marca}</b></> : null}. Distinto Studio ya puede incluir sus métricas en los reportes mensuales. Solo se leen estadísticas: no se publica nada en tu cuenta.</>
            : <>{MSG[q.error ?? "fallo"] ?? MSG.fallo}{q.detalle ? <><br /><small style={{ color: "#9a93a8" }}>{q.detalle}</small></> : null}</>}
        </p>
        {ok && q.faltan && <p style={{ fontSize: 12.5, color: "#9a3412", background: "#fff7ed", borderRadius: 10, padding: "8px 10px" }}>No se aprobaron todos los permisos ({q.faltan}). Algunas métricas podrían no mostrarse.</p>}
        <p style={{ fontSize: 12, color: "#9a93a8", marginTop: 18 }}>Puedes cerrar esta ventana. · <a href="https://distintostudio.com/privacidad" style={{ color: "#7c3aed" }}>Política de privacidad</a></p>
      </div>
    </main>
  );
}
