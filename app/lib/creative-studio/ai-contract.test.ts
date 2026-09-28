import test from "node:test";
import assert from "node:assert/strict";
import {
  creativeContextKey,
  creativeContent,
  parseSuggestions,
  parseReview,
  researchPrompt,
  estimateGenerationCost,
} from "./ai-contract";
import { newScript, emptyProfile, scriptSchema } from "./model";
const script = {
  ...newScript("ads"),
  title: "Una semilla",
  objective: "Consultas por WhatsApp",
  idea: "Pedir ayuda antes de desbordarse",
};
const profile = {
  ...emptyProfile,
  positioning: "Atención responsable",
  avoid: "No prometer curas",
};
const stamp = (s = script, p = profile, goal = "Diagnósticos") =>
  creativeContextKey(s, p, goal, "Instagram");
test("La evaluación se invalida al cambiar cualquier decisión, marca, investigación u objetivo; no con autosave/checks", () => {
  const initial = stamp();
  assert.equal(
    stamp({
      ...script,
      checks: [true, true, true, true, true, true],
      brandReviewed: true,
    }),
    initial,
  );
  assert.notEqual(
    stamp({ ...script, hookVisual: "Plano detalle inesperado" }),
    initial,
  );
  assert.notEqual(
    stamp({ ...script, research: "Un hallazgo", researchReviewed: true }),
    initial,
  );
  assert.notEqual(
    stamp(script, { ...profile, character: "Talento de marca" }),
    initial,
  );
  assert.notEqual(stamp(script, profile, "Otro objetivo"), initial);
  const reordered = Object.fromEntries(
    Object.entries(script).reverse(),
  ) as typeof script;
  assert.equal(stamp(reordered), initial);
});
test("Los borradores anteriores reciben defaults y conservan su contenido", () => {
  const old = Object.fromEntries(
    Object.entries(script).filter(
      ([k]) => !["research", "researchReviewed"].includes(k),
    ),
  );
  const parsed = scriptSchema.parse(old);
  assert.equal(parsed.research, "");
  assert.equal(parsed.researchReviewed, false);
  assert.equal(parsed.idea, script.idea);
  assert.equal(
    creativeContextKey(
      old as typeof script,
      profile,
      "Diagnósticos",
      "Instagram",
    ),
    stamp(),
  );
  assert.ok(!("checks" in creativeContent(script)));
});
test("Exige cinco alternativas distintas, limita patch a la etapa y no deja que la IA apruebe el guion", () => {
  const raw = {
    suggestions: Array.from({ length: 5 }, (_, i) => ({
      title: `Ruta ${i}`,
      reason: "Conecta con el objetivo",
      patch: {
        title: `Video ${i}`,
        idea: `Giro ${i}`,
        objective: "No cambiar",
        status: "listo",
        checks: Array(6).fill(true),
      },
    })),
  };
  const result = parseSuggestions(raw, 1);
  assert.equal(result.length, 5);
  assert.deepEqual(Object.keys(result[0].patch).sort(), ["idea", "title"]);
  assert.throws(() =>
    parseSuggestions({ suggestions: raw.suggestions.slice(0, 3) }, 1),
  );
  assert.throws(() =>
    parseSuggestions({ suggestions: Array(5).fill(raw.suggestions[0]) }, 1),
  );
  assert.throws(() => parseSuggestions(raw, 4));
});
test("No aprueba formato o personaje de marca sin configuración y exige los seis criterios únicos", () => {
  const raw = {
    summary: "Revisión actual",
    items: Array.from({ length: 6 }, (_, i) => ({
      criterion: i,
      status: "cumple",
      reason: "Texto observado",
      improvement: "",
    })),
  };
  const review = parseReview(raw, script, profile);
  assert.equal(review.items[4].status, "sin_contexto");
  assert.equal(review.items[5].status, "sin_contexto");
  assert.throws(() =>
    parseReview(
      { ...raw, items: Array(6).fill(raw.items[0]) },
      script,
      profile,
    ),
  );
});
test("El prompt de investigación conecta marca, objetivo, idea, conciencia y fuentes; no finge investigación realizada", () => {
  const prompt = researchPrompt(
    script,
    profile,
    "Manrique",
    "Objetivo general de tanda",
    "Instagram",
  );
  for (const value of [
    "Manrique",
    "Objetivo general de tanda",
    script.objective,
    script.idea,
    "ADS",
    "Instagram",
    "No prometer curas",
    "URL directa",
    "Si no puedes navegar",
  ])
    assert.ok(prompt.includes(value), value);
});
test("Registra una estimación sin cobrar dos veces los tokens de entrada en caché", () => {
  assert.equal(estimateGenerationCost(null), null);
  assert.equal(
    estimateGenerationCost({
      prompt_tokens: 1000000,
      completion_tokens: 1000000,
      prompt_tokens_details: { cached_tokens: 500000 },
    }),
    0.7125,
  );
});

test("Una respuesta con relleno inválido fuera de la etapa no descarta cinco ideas válidas", () => {
  const raw = {
    suggestions: Array.from({ length: 5 }, (_, i) => ({
      title: `Ruta ${i}`,
      reason: "Un giro de la idea",
      patch: {
        title: `Video ${i}`,
        idea: `Idea ${i}`,
        scenes: [{ seconds: 0, purpose: "" }],
        awareness: 0,
        status: "listo",
      },
    })),
  };
  const parsed = parseSuggestions(raw, 1);
  assert.equal(parsed.length, 5);
  assert.ok(!("scenes" in parsed[0].patch));
  assert.ok(!("awareness" in parsed[0].patch));
});
