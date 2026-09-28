"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  creativeContextKey,
  type Suggestion,
} from "@/lib/creative-studio/ai-contract";
import type {
  Assessment,
  Batch,
  Profile,
  Script,
} from "@/lib/creative-studio/model";

type Input = {
  batch: Batch | null;
  script?: Script;
  profile?: Profile;
  stage: number;
  enabled: boolean;
  persist: () => Promise<Batch | null>;
  applyAssessment: (value: Assessment) => void;
};
type ProposalSet = {
  id: string;
  contextKey: string;
  suggestions: Suggestion[];
  createdAt: string;
};
async function request(body: unknown) {
  const res = await fetch("/api/creative-studio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "No se pudo consultar la IA");
  if (!data.pending) return data;
  if (!data.generationId)
    throw new Error(
      "Ya hay una propuesta en proceso. Reintenta en unos segundos.",
    );
  // Another tab or the previous navigation already started this same generation.
  for (let i = 0; i < 24; i++) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const poll = await fetch(
      `/api/creative-studio?generation=${data.generationId}`,
      { cache: "no-store" },
    );
    const saved = await poll.json();
    if (!poll.ok)
      throw new Error(saved.error || "No se pudo recuperar la propuesta");
    if (saved.status === "complete")
      return { ...saved.result, generationId: saved.id, cached: true };
    if (saved.status === "error")
      throw new Error("La generación no terminó. Pulsa Reintentar.");
  }
  throw new Error(
    "La IA está tardando. Pulsa Reintentar para consultar de nuevo.",
  );
}
export function useCreativeAI(input: Input) {
  const latest = useRef(input);
  useEffect(() => {
    latest.current = input;
  });
  const scope = `${input.batch?.id}:${input.script?.id}:${input.stage}`;
  const contextKey =
    input.script && input.profile && input.batch
      ? creativeContextKey(
          input.script,
          input.profile,
          input.batch.data.objective,
          input.batch.data.platform,
        )
      : "";
  const activeScope = useRef(scope);
  useEffect(() => {
    activeScope.current = scope;
  }, [scope]);
  const [proposal, setProposal] = useState<{
    scope: string;
    set: ProposalSet;
  } | null>(null);
  const [history, setHistory] = useState<{
    scope: string;
    sets: ProposalSet[];
  }>({ scope: "", sets: [] });
  const [busyScope, setBusyScope] = useState("");
  const [failure, setFailure] = useState<{ scope: string; message: string }>({
    scope: "",
    message: "",
  });
  const [reviewState, setReviewState] = useState<{
    key: string;
    status: "busy" | "error";
    message: string;
  } | null>(null);
  const memory = useRef(new Map<string, ProposalSet>());
  const seen = useRef(new Map<string, string[]>());
  const running = useRef(new Set<string>());
  const ask = useCallback(
    async (
      options: {
        mode?: "explore" | "refine";
        instruction?: string;
        auto?: boolean;
      } = {},
    ) => {
      const p = latest.current;
      if (!p.enabled || !p.script || !p.batch || !p.profile || p.stage > 7)
        return;
      const requestScope = `${p.batch.id}:${p.script.id}:${p.stage}`;
      if (running.current.has(requestScope)) return;
      const stamp = creativeContextKey(
        p.script,
        p.profile,
        p.batch.data.objective,
        p.batch.data.platform,
      );
      running.current.add(requestScope);
      setBusyScope(requestScope);
      setFailure({ scope: requestScope, message: "" });
      try {
        await p.persist();
        const result = await request({
          action: "suggest",
          batchId: p.batch.id,
          script: p.script,
          step: p.stage,
          mode: options.mode || "explore",
          instruction: options.instruction || "",
          previous: options.auto
            ? []
            : (seen.current.get(requestScope) || []).slice(-25),
          ...(options.auto ? {} : { nonce: crypto.randomUUID() }),
        });
        const set: ProposalSet = {
          id: result.generationId,
          suggestions: result.suggestions,
          contextKey: result.contextKey || stamp,
          createdAt: new Date().toISOString(),
        };
        memory.current.set(requestScope, set);
        seen.current.set(
          requestScope,
          [
            ...(seen.current.get(requestScope) || []),
            ...set.suggestions.map((s) => s.title),
          ].slice(-25),
        );
        if (activeScope.current === requestScope) {
          setProposal({ scope: requestScope, set });
          setHistory((old) => ({
            scope: requestScope,
            sets: [
              set,
              ...(old.scope === requestScope ? old.sets : []).filter(
                (s) => s.id !== set.id,
              ),
            ].slice(0, 12),
          }));
        }
      } catch (e) {
        if (activeScope.current === requestScope)
          setFailure({ scope: requestScope, message: (e as Error).message });
      } finally {
        running.current.delete(requestScope);
        setBusyScope((old) => (old === requestScope ? "" : old));
      }
    },
    [],
  );
  const canSuggest =
    input.enabled &&
    !!input.script &&
    !!input.batch &&
    !!(
      input.script.objective.trim() ||
      input.batch.data.objective.trim() ||
      input.script.idea.trim()
    );
  useEffect(() => {
    if (!canSuggest || input.stage > 7) return;
    let alive = true;
    const cached = memory.current.get(scope);
    const timer = setTimeout(() => {
      if (cached) setProposal({ scope, set: cached });
      else void ask({ auto: true });
    }, 700);
    const p = latest.current;
    fetch(
      `/api/creative-studio?batch=${p.batch!.id}&script=${p.script!.id}&step=${p.stage}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (!alive || !data) return;
        const sets = data.generations.map(
          (g: {
            id: string;
            result: { contextKey: string; suggestions: Suggestion[] };
            created_at: string;
          }) => ({
            id: g.id,
            contextKey: g.result.contextKey,
            suggestions: g.result.suggestions,
            createdAt: g.created_at,
          }),
        );
        setHistory((old) => ({
          scope,
          sets: [...(old.scope === scope ? old.sets : []), ...sets]
            .filter((v, i, all) => all.findIndex((x) => x.id === v.id) === i)
            .slice(0, 12),
        }));
        seen.current.set(
          scope,
          sets
            .flatMap((s: ProposalSet) => s.suggestions.map((x) => x.title))
            .slice(0, 25),
        );
      })
      .catch(() => {
        /* The generation itself reports connection errors. */
      });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [scope, canSuggest, input.stage, ask]);
  const review = useCallback(async (manual = false) => {
    const p = latest.current;
    if (!p.enabled || !p.script || !p.profile || !p.batch) return;
    const stamp = creativeContextKey(
      p.script,
      p.profile,
      p.batch.data.objective,
      p.batch.data.platform,
    );
    const key = `${p.batch.id}:${p.script.id}:${stamp}`;
    if (running.current.has(key)) return;
    running.current.add(key);
    setReviewState({ key, status: "busy", message: "" });
    try {
      await p.persist();
      const result = await request({
        action: "assess",
        batchId: p.batch.id,
        script: p.script,
        ...(manual ? { nonce: crypto.randomUUID() } : {}),
      });
      const now = latest.current;
      if (
        now.enabled &&
        now.script?.id === p.script.id &&
        now.batch?.id === p.batch.id &&
        now.profile &&
        creativeContextKey(
          now.script,
          now.profile,
          now.batch.data.objective,
          now.batch.data.platform,
        ) === stamp
      ) {
        now.applyAssessment(result.assessment);
      }
      setReviewState((old) => (old?.key === key ? null : old));
    } catch (e) {
      setReviewState({ key, status: "error", message: (e as Error).message });
    } finally {
      running.current.delete(key);
    }
  }, []);
  const hasContent =
    !!input.script &&
    [
      input.script.idea,
      input.script.angle,
      input.script.hookSpoken,
      input.script.scenes.map((s) => s.audio).join(" "),
    ].some((s) => s.trim().length > 15);
  const assessedKey = input.script?.assessment?.contextKey;
  useEffect(() => {
    if (!input.enabled || !hasContent || contextKey === assessedKey) return;
    const timer = setTimeout(() => {
      void review();
    }, 6500);
    return () => clearTimeout(timer);
  }, [contextKey, assessedKey, input.enabled, hasContent, review]);
  const reviewKey = `${input.batch?.id}:${input.script?.id}:${contextKey}`;
  const current = proposal?.scope === scope ? proposal.set : null;
  return {
    ask,
    review,
    current,
    canSuggest,
    hasContent,
    contextKey,
    busy: busyScope === scope,
    error: failure.scope === scope ? failure.message : "",
    history: history.scope === scope ? history.sets : [],
    select: (id: string) => {
      const set = history.sets.find((s) => s.id === id);
      if (set) {
        memory.current.set(scope, set);
        setProposal({ scope, set });
      }
    },
    reviewBusy: reviewState?.key === reviewKey && reviewState.status === "busy",
    reviewError:
      reviewState?.key === reviewKey && reviewState.status === "error"
        ? reviewState.message
        : "",
    assessment:
      input.script?.assessment?.contextKey === contextKey
        ? input.script.assessment
        : null,
  };
}
