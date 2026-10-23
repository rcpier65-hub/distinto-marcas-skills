import env from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import sharp from "sharp";
env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  ),
  file = "/tmp/distinto-creative-fixture.json";
const ok = async (p) => {
  const r = await p;
  if (r.error) throw r.error;
  return r.data;
};
if (process.argv.includes("--cleanup")) {
  const f = JSON.parse(await fs.readFile(file, "utf8"));
  await ok(s.from("publicaciones").delete().eq("marca_id", f.brand));
  await ok(s.from("strategy_records").delete().eq("marca_id", f.brand));
  await ok(s.from("team_members").delete().eq("id", f.member));
  await ok(s.auth.admin.deleteUser(f.user));
  await ok(s.from("marcas").delete().eq("id", f.brand));
  const files = await ok(s.storage.from(f.bucket).list());
  if (files.length)
    await ok(s.storage.from(f.bucket).remove(files.map((x) => x.name)));
  await ok(s.storage.deleteBucket(f.bucket));
  await fs.unlink(file);
  console.log("UI fixtures removed.");
  process.exit(0);
}
const f = {
  brand: randomUUID(),
  id: randomUUID(),
  member: randomUUID(),
  slug: "qa-revision-" + randomUUID(),
  bucket: "qa-review-" + randomUUID(),
  email: "qa-review-" + randomUUID() + "@example.com",
  password: randomBytes(24).toString("base64url"),
};
await fs.writeFile(file, JSON.stringify(f), { mode: 0o600 });
const user = await ok(
  s.auth.admin.createUser({
    email: f.email,
    password: f.password,
    email_confirm: true,
  }),
);
f.user = user.user.id;
await fs.writeFile(file, JSON.stringify(f), { mode: 0o600 });
await ok(
  s.from("marcas").insert({
    id: f.brand,
    slug: f.slug,
    nombre: "Marca de prueba · Revisión",
    activa: true,
  }),
);
await ok(
  s.from("team_members").insert({
    id: f.member,
    auth_user_id: f.user,
    email: f.email,
    nombre: "QA Revisión",
    rol_base: "director",
    activo: true,
    marcas_acceso: [f.brand],
    permisos_override: {
      diseno: { acceso: true },
      editor: { acceso: true },
      publicaciones: { acceso: true },
      marcas: { acceso: true },
    },
  }),
);
await ok(s.storage.createBucket(f.bucket, { public: false }));
const urls = [];
for (let v = 1; v <= 2; v++) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="750"><rect width="1100" height="750" fill="#f5f1ea"/><rect x="45" y="45" width="1010" height="660" rx="25" fill="white"/><text x="90" y="110" font-family="Arial" font-size="25" font-weight="bold" fill="#28213b">DISTINTO · DEMOSTRACIÓN</text><rect x="90" y="150" width="920" height="8" fill="${v === 1 ? "#a674ea" : "#2b8f80"}"/><text x="90" y="245" font-family="Arial" font-size="53" font-weight="bold" fill="#28213b">Una idea que toma forma.</text><text x="90" y="310" font-family="Arial" font-size="22" fill="#8a7d98">Primera propuesta visual · archivo de prueba ${v}</text><rect x="90" y="365" width="430" height="220" rx="24" fill="${v === 1 ? "#ebe3fb" : "#d9f1ec"}"/><circle cx="305" cy="475" r="65" fill="${v === 1 ? "#a674ea" : "#2b8f80"}"/><text x="570" y="410" font-family="Arial" font-size="30" fill="#28213b">Espacio para la marca</text><text x="570" y="460" font-family="Arial" font-size="21" fill="#8a7d98">Revisar color, título y composición.</text><rect x="570" y="510" width="230" height="55" rx="12" fill="#28213b"/><text x="600" y="545" font-family="Arial" font-size="19" fill="white">Conocer propuesta</text><text x="90" y="655" font-family="Arial" font-size="16" fill="#8a7d98">PRUEBA FUNCIONAL · NO ES UN DISEÑO DE CLIENTE</text></svg>`;
  const bytes = await sharp(Buffer.from(svg)).png().toBuffer();
  await ok(
    s.storage
      .from(f.bucket)
      .upload(`design-${v}.png`, bytes, { contentType: "image/png" }),
  );
  urls.push(
    (
      await ok(
        s.storage.from(f.bucket).createSignedUrl(`design-${v}.png`, 86400),
      )
    ).signedUrl,
  );
}
const objs = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>",
  "<< /Length 77 >>\nstream\nBT /F1 28 Tf 60 700 Td (DISTINTO - Propuesta de prueba) Tj 0 -60 Td (Pagina 1) Tj ET\nendstream",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
  "<< /Length 75 >>\nstream\nBT /F1 28 Tf 60 700 Td (Segunda pagina de la propuesta) Tj 0 -60 Td (Pagina 2) Tj ET\nendstream",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
];
for (const i of [3, 5]) {
  const stream = objs[i].split("\nstream\n")[1].split("\nendstream")[0];
  objs[i] = objs[i].replace(
    /Length \d+/,
    `Length ${Buffer.byteLength(stream)}`,
  );
}
let pdf = "%PDF-1.4\n",
  offsets = [0];
objs.forEach((o, i) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
});
const xref = Buffer.byteLength(pdf);
pdf +=
  "xref\n0 8\n0000000000 65535 f \n" +
  offsets
    .slice(1)
    .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
    .join("") +
  `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
await ok(
  s.storage.from(f.bucket).upload("proposal.pdf", Buffer.from(pdf), {
    contentType: "application/pdf",
  }),
);
f.pdf = (
  await ok(s.storage.from(f.bucket).createSignedUrl("proposal.pdf", 86400))
).signedUrl;
await ok(
  s.from("publicaciones").insert({
    id: f.id,
    marca_id: f.brand,
    nombre: "Presentación de diseño · Prueba de revisión",
    es_tarea_diseno: true,
    estado_tarea: "sin_empezar",
    tiene_boceto: true,
    drive_resultado_url: urls[0],
    created_by: f.user,
    updated_by: f.user,
  }),
);
await ok(
  s
    .from("publicaciones")
    .update({
      drive_resultado_url: urls[1],
      portada_editada_url: f.pdf,
      video_con_musica_url:
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      updated_by: f.user,
    })
    .eq("id", f.id),
);
f.urls = urls;
await fs.writeFile(file, JSON.stringify(f), { mode: 0o600 });
console.log(JSON.stringify({ id: f.id, slug: f.slug, file }));
