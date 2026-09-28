import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { type Batch, type Profile, scriptText, checks } from "./model";
export async function createWord(
  batch: Batch,
  brand: string,
  profile: Profile,
) {
  const p = (text: string) =>
    new Paragraph({
      children: [new TextRun(text || "—")],
      spacing: { after: 120 },
    });
  const h = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 140 },
    });
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: brand, heading: HeadingLevel.TITLE }),
    h(batch.name),
    p(`Objetivo: ${batch.data.objective}`),
    p(
      `Plataforma: ${batch.data.platform} · ${batch.data.scripts.length} guiones · ${batch.data.ads} Ads / ${batch.data.organic} orgánicos`,
    ),
    p(`Grabación vinculada: ${batch.recording_id ? "Sí" : "Pendiente"}`),
    h("Guía de comunicación"),
    p(`Posicionamiento: ${profile.positioning}`),
    p(`Público: ${profile.audience}`),
    p(`Tono: ${profile.tone}`),
    p(`Mandatarios: ${profile.mandatory}`),
    p(`Qué decir: ${profile.say}`),
    p(`Qué evitar: ${profile.avoid}`),
  ];
  for (const [i, s] of batch.data.scripts.entries()) {
    children.push(
      new Paragraph({
        text: `${i + 1}. ${s.title || "Sin título"} · ${s.status === "listo" ? "Revisado" : "BORRADOR"}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),
    );
    const full = scriptText(s);
    const before = full.split("\n\nESCENAS\n")[0];
    for (const line of before.split("\n")) children.push(p(line));
    children.push(h("Plan de rodaje"));
    const rows = [
      [
        "Tiempo / función",
        "Plano / acción visual",
        "Audio / diálogo",
        "Texto en pantalla",
      ],
    ];
    let time = 0;
    for (const scene of s.scenes) {
      rows.push([
        `${time}–${time + scene.seconds}s · ${scene.purpose}`,
        `${scene.shot}\n${scene.visual}`,
        scene.audio,
        scene.text,
      ]);
      time += scene.seconds;
    }
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows.map(
          (row, r) =>
            new TableRow({
              tableHeader: r === 0,
              children: row.map(
                (cell) =>
                  new TableCell({
                    children: [p(cell)],
                    shading: r === 0 ? { fill: "EEE9FF" } : undefined,
                  }),
              ),
            }),
        ),
      }),
    );
    children.push(
      h("Prueba, resolución y acción"),
      p(`Prueba: ${s.proof}`),
      p(`Payoff: ${s.payoff}`),
      p(`CTA: ${s.cta}`),
      h("Requerimientos para el cliente"),
      p(s.requirements),
      h("Revisión creativa"),
      ...checks.map((c, j) => p(`${s.checks[j] ? "☑" : "☐"} ${c}`)),
      p("Criterios editoriales: no garantizan resultados ni viralidad."),
    );
  }
  children.push(
    new Paragraph({
      text: "Requerimientos consolidados",
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
    }),
    ...batch.data.scripts.flatMap((s) => [
      h(s.title || "Sin título"),
      p(s.requirements),
    ]),
    h("Fuentes de la marca"),
    ...profile.sources.flatMap((s) => [
      p(`${s.name} · ${s.verified ? "Revisada" : "Pendiente de revisar"}`),
      p(s.url),
    ]),
  );
  return Packer.toBuffer(
    new Document({
      creator: "Distinto",
      title: batch.name,
      styles: {
        default: {
          document: {
            run: { font: "Calibri", size: 22 },
            paragraph: { spacing: { after: 100 } },
          },
        },
      },
      sections: [
        {
          properties: {
            page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } },
          },
          children,
        },
      ],
    }),
  );
}
