"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  researchPrompt,
  type Suggestion,
} from "@/lib/creative-studio/ai-contract";
import {
  checks,
  stages,
  type Script,
  type Scene,
  type Profile,
  type Batch,
} from "@/lib/creative-studio/model";
import type { useCreativeAI } from "./use-creative-ai";
type AI = ReturnType<typeof useCreativeAI>;
const labels: Record<string, string> = {
  objective: "Objetivo",
  awareness: "Conciencia",
  title: "Título",
  idea: "Idea",
  insight: "Insight",
  angle: "Ángulo",
  format: "Formato",
  character: "Personaje",
  structure: "Estructura",
  hookSpoken: "Voz",
  hookVisual: "Visual",
  hookText: "Texto",
  proof: "Prueba",
  payoff: "Payoff",
  cta: "CTA",
  requirements: "Requerimientos",
};
export function CreativeCopilot({
  ai,
  stage,
  script,
  onApply,
  onUndo,
  hasUndo,
}: {
  ai: AI;
  stage: number;
  script: Script;
  onApply: (s: Suggestion) => void;
  onUndo: () => void;
  hasUndo: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [applied, setApplied] = useState("");
  const stale = ai.current && ai.current.contextKey !== ai.contextKey;
  return (
    <section
      className="cs-ai cs-copilot"
      aria-label={`Copiloto para ${stages[stage]}`}
    >
      <div className="cs-row">
        <div>
          <span className="cs-eyebrow">
            <Sparkles size={13} /> TU COPILOTO CREATIVO
          </span>
          <p>
            Cinco caminos para{" "}
            {stage === 1 ? "tu idea" : stages[stage].toLowerCase()}. Tú eliges.
          </p>
        </div>
        {ai.busy && (
          <span className="cs-ai-working" role="status">
            <Loader2 size={14} className="cs-spin" /> Conectando tus decisiones…
          </span>
        )}
      </div>
      <div className="cs-copilot-context">
        {script.type === "ads" ? "Ads · conversión" : "Orgánico · conexión"} ·
        Conciencia {script.awareness}
        <span>
          Objetivo: {script.objective || "Usaremos el objetivo de la tanda"}
        </span>
      </div>
      <label className="cs-refine-input">
        <span>¿Hacia dónde lo llevamos?</span>
        <input
          aria-label="Orientación para la IA"
          value={instruction}
          maxLength={1000}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Ej. conserva mi idea, haz el visual más inesperado y el texto más simple"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !ai.busy) void ai.ask({ instruction });
          }}
        />
      </label>
      <div className="cs-ai-actions">
        <button
          className="cs-ai-button"
          disabled={ai.busy || !ai.canSuggest}
          onClick={() => void ai.ask({ instruction })}
        >
          <Sparkles size={15} />
          {ai.current ? "Dame 5 más" : "Proponer 5 opciones"}
        </button>
        <button
          disabled={ai.busy || !ai.canSuggest}
          onClick={() => void ai.ask({ mode: "refine", instruction })}
        >
          Mejorar lo escrito
        </button>
        {hasUndo && (
          <button onClick={onUndo}>
            <RotateCcw size={14} />
            Deshacer
          </button>
        )}
      </div>
      {!ai.canSuggest && (
        <p className="cs-helper">
          Escribe el objetivo o una idea para que la IA tenga un punto de
          partida.
        </p>
      )}
      {ai.error && (
        <p className="cs-ai-error" role="alert">
          {ai.error}{" "}
          <button
            disabled={ai.busy}
            onClick={() => void ai.ask({ instruction })}
          >
            Reintentar
          </button>
        </p>
      )}
      {stale && (
        <p className="cs-ai-stale">
          El guion cambió desde estas propuestas.{" "}
          <button
            disabled={ai.busy}
            onClick={() => void ai.ask({ instruction })}
          >
            Actualizar con mis cambios
          </button>
        </p>
      )}
      {ai.current && (
        <>
          <div className="cs-proposals-label">
            <span>
              {ai.current.suggestions.length} propuestas · desliza para
              explorarlas
            </span>
            <a
              href={`/api/creative-studio?generation=${ai.current.id}`}
              target="_blank"
              rel="noreferrer"
              title="Registro guardado de estas propuestas"
            >
              Guardadas
            </a>
          </div>
          <div className="cs-suggestions cs-proposal-strip">
            {ai.current.suggestions.map((s, i) => (
              <article
                key={`${ai.current!.id}-${i}`}
                className={`cs-sticky cs-sticky-${i % 3}`}
              >
                <span>RUTA {i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.reason}</p>
                <details>
                  <summary>Ver propuesta completa</summary>
                  <pre>
                    {Object.entries(s.patch)
                      .map(
                        ([key, value]) =>
                          `${labels[key] || key}: ${key === "scenes" ? (value as Scene[]).map((x) => `${x.purpose} · ${x.seconds}s · ${x.shot}\nVisual: ${x.visual}\nVoz: ${x.audio}\nPantalla: ${x.text}`).join("\n\n") : value}`,
                      )
                      .join("\n\n")}
                  </pre>
                </details>
                <button
                  disabled={ai.busy}
                  onClick={() => {
                    onApply(s);
                    setApplied(`${ai.current!.id}-${i}`);
                  }}
                >
                  {applied === `${ai.current!.id}-${i}` ? (
                    <>
                      <Check size={14} /> Aplicada · puedes ajustarla
                    </>
                  ) : (
                    <>
                      Usar esta propuesta <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {ai.history.length > 1 && (
        <label className="cs-generation-history">
          Volver a propuestas anteriores
          <select
            aria-label="Propuestas anteriores"
            value={ai.current?.id || ""}
            onChange={(e) => ai.select(e.target.value)}
          >
            <option value="" disabled>
              Seleccionar generación
            </option>
            {ai.history.map((set) => (
              <option key={set.id} value={set.id}>
                {new Date(set.createdAt).toLocaleString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {set.suggestions[0]?.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <small>
        Se apoya en tu objetivo, decisiones, ADN, fuentes revisadas e historial.
        Aplicar una propuesta solo modifica esta etapa.
      </small>
    </section>
  );
}
export function ResearchAssistant({
  script,
  profile,
  brand,
  batch,
  onEdit,
}: {
  script: Script;
  profile: Profile;
  brand: string;
  batch: Batch;
  onEdit: (patch: Partial<Script>) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const prompt = researchPrompt(
    script,
    profile,
    brand,
    batch.data.objective,
    batch.data.platform,
  );
  return (
    <section className="cs-research" aria-label="Investigar el insight">
      <span className="cs-eyebrow">INVESTIGAR ANTES DE AFIRMAR</span>
      <h3>Descubre qué hay detrás de tu idea.</h3>
      <p>
        Este prompt conecta tu tema, objetivo, audiencia y marca. Cópialo a
        ChatGPT para investigar con fuentes y trae los hallazgos.
      </p>
      <div className="cs-row">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(prompt);
              setCopied(true);
              setError("");
            } catch {
              setError("Abre el prompt de abajo y cópialo manualmente.");
            }
          }}
        >
          <Copy size={15} />
          {copied ? "Prompt copiado" : "Copiar prompt para ChatGPT"}
        </button>
        <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
          Abrir ChatGPT ↗
        </a>
      </div>
      <details>
        <summary>Ver el prompt que vas a copiar</summary>
        <textarea
          aria-label="Prompt de investigación para ChatGPT"
          value={prompt}
          readOnly
          rows={10}
        />
        <small>
          El prompt se actualiza al cambiar el objetivo, la idea o el ADN.
          Puedes editarlo después de pegarlo en ChatGPT.
        </small>
      </details>
      {error && <p role="alert">{error}</p>}
      <label className="cs-field">
        <span>Hallazgos de la investigación + enlaces a fuentes</span>
        <textarea
          rows={4}
          value={script.research || ""}
          maxLength={6000}
          onChange={(e) =>
            onEdit({ research: e.target.value, researchReviewed: false })
          }
          placeholder="Pega el bloque HALLAZGOS PARA EL GUION. Incluye fuentes, tensiones y lo que aún falta validar."
        />
      </label>
      <label className="cs-research-reviewed">
        <input
          type="checkbox"
          checked={script.researchReviewed || false}
          disabled={!script.research?.trim()}
          onChange={(e) => onEdit({ researchReviewed: e.target.checked })}
        />{" "}
        Revisé los hallazgos y sus fuentes; pueden usarse como respaldo.
      </label>
      <small>
        Mientras no los revises, la IA los tratará como hipótesis. Usa
        «Actualizar con mis cambios» para obtener nuevos insights y ángulos.
      </small>
    </section>
  );
}
export function CreativeChecklist({
  ai,
  script,
  enabled,
}: {
  ai: AI;
  script?: Script;
  enabled: boolean;
}) {
  return (
    <div className="cs-checklist cs-auto-checklist">
      <span className="cs-eyebrow">MIRADA CREATIVA · IA</span>
      <h3>Checklist de viralidad</h3>
      <p className="cs-review-status" role="status">
        {!enabled
          ? "Resuelve el borrador pendiente para activar la IA."
          : ai.reviewBusy
            ? "La IA está revisando tu guion…"
            : ai.assessment
              ? "Evaluado sobre tu versión actual"
              : ai.hasContent
                ? "Se actualizará al terminar de escribir."
                : "Escribe tu idea para activar la revisión."}
      </p>
      {checks.map((label, i) => {
        const item = ai.assessment?.items[i];
        const status = item?.status || "pendiente";
        return (
          <details
            key={label}
            className={`cs-assessment-item cs-assessment-${status}`}
          >
            <summary>
              <input
                type="checkbox"
                readOnly
                checked={status === "cumple"}
                aria-label={label}
              />
              <span>
                {label}
                <em>
                  {
                    {
                      cumple: "Cumple",
                      mejorar: "Por mejorar",
                      sin_contexto: "Falta contexto",
                      pendiente: "Pendiente",
                    }[status]
                  }
                </em>
              </span>
            </summary>
            <p>
              {item?.reason || "La IA necesita evaluar el contenido actual."}
            </p>
            {item?.improvement && (
              <p>
                <strong>Siguiente ajuste:</strong> {item.improvement}
              </p>
            )}
          </details>
        );
      })}
      {ai.assessment?.summary && (
        <p className="cs-assessment-summary">{ai.assessment.summary}</p>
      )}
      {ai.reviewError && (
        <p className="cs-ai-error" role="alert">
          {ai.reviewError}
        </p>
      )}
      <button
        className="cs-review-button"
        disabled={!script || !enabled || !ai.hasContent || ai.reviewBusy}
        onClick={() => void ai.review(true)}
      >
        <Sparkles size={13} />
        {ai.reviewBusy ? "Evaluando…" : "Reevaluar ahora"}
      </button>
      <small>
        La IA explica cada marca. Evalúa el guion escrito; no garantiza
        viralidad ni reemplaza tu revisión de marca.
      </small>
    </div>
  );
}
