"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Plus,
  Settings2,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Check,
  Download,
  FolderOpen,
  ArrowUpRight,
  Lightbulb,
  Clapperboard,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  FileText,
  GripVertical,
  Save,
} from "lucide-react";
import {
  type Brand,
  type Profile,
  type Batch,
  type Script,
  type Scene,
  newScript,
  newScene,
  awareness,
  formats,
  structures,
  shots,
  checks,
  stages,
  missingScript,
  scriptText,
  profileSchema,
  batchDataSchema,
} from "@/lib/creative-studio/model";
import "./studio.css";

type History = { id: string; nombre: string; guion: string };
type Recording = { id: string; fecha_planeada: string; estado: string };
type Link = { batch_id: string; script_id: string; publicacion_id: string };
type Suggestion = { title: string; reason: string; patch: Partial<Script> };
type BrandData = {
  profile: Profile;
  profileRevision: number;
  batches: Batch[];
  recordings: Recording[];
  history: History[];
  links: Link[];
};
async function api(path = "", body?: unknown) {
  const r = await fetch(
    `/api/creative-studio${path}`,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "No se pudo completar la acción");
  return d;
}
function Field({
  label,
  value,
  onChange,
  placeholder = "",
  small = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  small?: boolean;
}) {
  return (
    <label className="cs-field">
      <span>{label}</span>
      {small ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      )}
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="cs-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {!options.includes(value) && (
          <option value={value}>{value || "Seleccionar"}</option>
        )}
        {options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,textarea,select,a[href]",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="cs-overlay">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`cs-dialog ${wide ? "cs-dialog-wide" : ""}`}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="Cerrar" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
function localDraft(batch: Batch, userId: string): Batch | null {
  try {
    const raw = localStorage.getItem(`studio-draft-${userId}-${batch.id}`);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return batchDataSchema.safeParse(value.data).success ? value : null;
  } catch {
    return null;
  }
}
function download(data: Blob, name: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CreativeStudio() {
  const [brands, setBrands] = useState<Brand[]>([]),
    [brand, setBrand] = useState<Brand | null>(null),
    [brandData, setBrandData] = useState<BrandData | null>(null),
    [batch, setBatch] = useState<Batch | null>(null),
    [scriptId, setScriptId] = useState(""),
    [stage, setStage] = useState(0);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [saved, setSaved] = useState("Guardado"),
    [modal, setModal] = useState<
      "brand" | "batch" | "batch-edit" | "export" | "history" | null
    >(null),
    [manager, setManager] = useState(false),
    [userId, setUserId] = useState(""),
    [legacy, setLegacy] = useState<unknown[]>([]),
    [recovery, setRecovery] = useState<Batch | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]),
    [instruction, setInstruction] = useState(""),
    [aiBusy, setAiBusy] = useState(false),
    [undo, setUndo] = useState<Script | null>(null),
    [showAside, setShowAside] = useState(false),
    [showBrands, setShowBrands] = useState(false);
  const batchRef = useRef<Batch | null>(null),
    dirty = useRef(false),
    saving = useRef<Promise<Batch | null> | null>(null),
    blocked = useRef(false),
    loadId = useRef(0),
    uid = useRef("");
  const script = batch?.data.scripts.find((s) => s.id === scriptId);
  const closeModal = useCallback(() => setModal(null), []);
  const syncBatch = (b: Batch | null) => {
    batchRef.current = b;
    setBatch(b);
  };
  const persist = useCallback(
    async function savePending(): Promise<Batch | null> {
      if (saving.current) {
        await saving.current;
        if (dirty.current && !blocked.current) return savePending();
        return batchRef.current;
      }
      if (!dirty.current || !batchRef.current) return batchRef.current;
      if (blocked.current)
        throw new Error(
          "Recarga la tanda después de descargar tu respaldo para resolver el conflicto.",
        );
      const current = batchRef.current;
      dirty.current = false;
      setSaved("Guardando…");
      const work = (async () => {
        try {
          const fresh: Batch = await api("", {
            action: "save",
            batchId: current.id,
            revision: current.revision,
            data: current.data,
          });
          if (batchRef.current?.id === fresh.id) {
            const merged = { ...fresh, data: batchRef.current.data };
            batchRef.current = merged;
            setBatch(merged);
            setBrandData((d) =>
              d
                ? {
                    ...d,
                    batches: d.batches.map((b) =>
                      b.id === fresh.id ? merged : b,
                    ),
                  }
                : d,
            );
          }
          setSaved(dirty.current ? "Cambios pendientes" : "Guardado");
          if (!dirty.current)
            try {
              localStorage.removeItem(
                `studio-draft-${uid.current}-${current.id}`,
              );
            } catch {
              /* Server copy is saved even if local storage is unavailable. */
            }
          return fresh;
        } catch (e) {
          dirty.current = true;
          blocked.current = true;
          setSaved("Sin guardar");
          setError(e instanceof Error ? e.message : "No se pudo guardar");
          throw e;
        } finally {
          saving.current = null;
        }
      })();
      saving.current = work;
      await work;
      if (dirty.current && !blocked.current) return savePending();
      return batchRef.current;
    },
    [],
  );
  const editBatch = (fn: (b: Batch) => Batch) => {
    if (!batchRef.current) return;
    const next = fn(batchRef.current);
    syncBatch(next);
    dirty.current = true;
    setSaved("Cambios pendientes");
    try {
      localStorage.setItem(
        `studio-draft-${uid.current}-${next.id}`,
        JSON.stringify(next),
      );
    } catch {
      /* server save still available */
    }
  };
  const edit = (patch: Partial<Script>) => {
    editBatch((b) => ({
      ...b,
      data: {
        ...b.data,
        scripts: b.data.scripts.map((s) =>
          s.id === scriptId
            ? {
                ...s,
                ...patch,
                ...(Object.keys(patch).some(
                  (k) => !["checks", "brandReviewed", "status"].includes(k),
                )
                  ? { status: "borrador" as const, brandReviewed: false }
                  : {}),
              }
            : s,
        ),
      },
    }));
  };
  useEffect(() => {
    if (!dirty.current || blocked.current) return;
    const timer = setTimeout(() => {
      persist().catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [batch, persist]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty.current || saving.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, []);
  const openBatch = async (b: Batch) => {
    const fresh = await persist();
    if (fresh?.id === b.id) b = fresh;
    syncBatch(b);
    dirty.current = false;
    blocked.current = false;
    setScriptId(b.data.scripts[0]?.id || "");
    setStage(0);
    setSuggestions([]);
    setUndo(null);
    setShowBrands(false);
    setRecovery(null);
    try {
      const raw = localStorage.getItem(`studio-draft-${uid.current}-${b.id}`);
      if (raw) {
        const value = JSON.parse(raw);
        if (batchDataSchema.safeParse(value.data).success) setRecovery(value);
      }
    } catch {}
  };
  const openBrand = async (b: Brand) => {
    try {
      await persist();
      const request = ++loadId.current;
      setLoading(true);
      setError("");
      const data: BrandData = await api(`?brand=${b.id}`);
      if (request !== loadId.current) return;
      setBrand(b);
      setBrandData(data);
      setSaved("Guardado");
      syncBatch(null);
      setScriptId("");
      setRecovery(null);
      if (data.batches.length) {
        syncBatch(data.batches[0]);
        setRecovery(localDraft(data.batches[0], uid.current));
        setScriptId(data.batches[0].data.scripts[0]?.id || "");
      }
      setStage(0);
      setSuggestions([]);
      setUndo(null);
      setShowBrands(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let alive = true;
    api()
      .then(async (d) => {
        if (!alive) return;
        setBrands(d.brands);
        setManager(d.manager);
        setUserId(d.userId);
        uid.current = d.userId;
        if (d.brands.length) {
          const first =
            d.brands.find((b: Brand) => b.slug.includes("manrique")) ||
            d.brands[0];
          const data: BrandData = await api(`?brand=${first.id}`);
          if (!alive) return;
          setBrand(first);
          setBrandData(data);
          if (data.batches.length) {
            batchRef.current = data.batches[0];
            setBatch(data.batches[0]);
            setRecovery(localDraft(data.batches[0], d.userId));
            setScriptId(data.batches[0].data.scripts[0]?.id || "");
          }
        }
        try {
          const old = JSON.parse(
            localStorage.getItem("creacion-ideas.v1") || "{}",
          );
          if (Array.isArray(old.scripts)) setLegacy(old.scripts);
        } catch {}
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const addScript = async (type: Script["type"]) => {
    if (!batch) return;
    await persist();
    const s = {
      ...newScript(type),
      objective: batch.data.objective,
      character: brandData?.profile.character || "",
    };
    editBatch((b) => ({
      ...b,
      data: { ...b.data, scripts: [...b.data.scripts, s] },
    }));
    setScriptId(s.id);
    setStage(0);
    setSuggestions([]);
    setUndo(null);
  };
  const askAI = async () => {
    if (!script || !batch || aiBusy) return;
    setAiBusy(true);
    setError("");
    try {
      await persist();
      const d = await api("", {
        action: "suggest",
        batchId: batch.id,
        script,
        step: stage,
        instruction,
        previous: suggestions.map((s) => s.title),
      });
      setSuggestions(d.suggestions);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };
  const selectStage = (n: number) => {
    setStage(n);
    setSuggestions([]);
    setUndo(null);
    setInstruction("");
  };
  const exportWord = async (folderId?: string) => {
    await persist();
    const res = await fetch("/api/creative-studio/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: batch?.id, folderId }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error);
    }
    if (folderId) {
      const d = await res.json();
      setNotice(`Word guardado: ${d.name}`);
      return d.webViewLink as string;
    } else {
      download(await res.blob(), `${brand?.nombre} - ${batch?.name}.docx`);
      setNotice("Word descargado con guiones, planos y requerimientos.");
    }
  };
  const importLegacy = () =>
    run(async () => {
      if (!brand || !legacy.length) return;
      const scripts = legacy.slice(0, 30).map((raw) => {
        const old = raw as {
          title?: string;
          topic?: string;
          steps?: { text?: string; name?: string }[];
        };
        const s = newScript();
        s.title = String(old.title || "Guion recuperado").slice(0, 160);
        s.idea = String(old.topic || "").slice(0, 6000);
        s.scenes = (old.steps || []).slice(0, 30).map((x) => ({
          ...newScene(),
          audio: String(x.text || "").slice(0, 6000),
          visual: String(x.name || "").slice(0, 6000),
        }));
        return s;
      });
      const b = await api("", {
        action: "create",
        id: crypto.randomUUID(),
        brandId: brand.id,
        name: "Borradores recuperados",
        data: {
          objective: "Revisar y adaptar los borradores anteriores a esta marca",
          platform: "Instagram / TikTok",
          ads: 0,
          organic: scripts.length,
          scripts,
        },
      });
      setBrandData((d) => (d ? { ...d, batches: [b, ...d.batches] } : d));
      await openBatch(b);
      setLegacy([]);
      setNotice(
        "Borradores recuperados. Revisa la marca y completa los campos faltantes. El original sigue en este navegador.",
      );
    });
  const link = brandData?.links.find(
    (l) => l.batch_id === batch?.id && l.script_id === scriptId,
  );
  const ready =
    batch?.data.scripts.filter((s) => s.status === "listo").length || 0;
  const remaining = (type: Script["type"]) =>
    batch
      ? (type === "ads" ? batch.data.ads : batch.data.organic) -
        batch.data.scripts.filter((s) => s.type === type).length
      : 0;
  const hasProfile = !!brandData?.profile.positioning;
  return (
    <div className="cs-root">
      <header className="cs-top">
        <div>
          <span className="cs-eyebrow">ESTUDIO CREATIVO</span>
          <h1>
            Creación de ideas <span>✦</span>
          </h1>
        </div>
        <div className="cs-top-actions">
          <button
            className="cs-mobile-btn"
            onClick={() => setShowBrands(!showBrands)}
          >
            Marcas
          </button>
          <button
            className="cs-mobile-btn"
            onClick={() => setShowAside(!showAside)}
          >
            Guiones
          </button>
          <span
            className={`cs-save ${saved === "Sin guardar" ? "cs-danger" : ""}`}
            aria-live="polite"
          >
            {saved === "Guardado" ? <Check size={14} /> : <Save size={14} />}{" "}
            {saved}
          </span>
          <button
            disabled={!batch || busy}
            onClick={() =>
              run(async () => {
                await persist();
                setModal("export");
              })
            }
          >
            <Download size={16} /> Entregar tanda
          </button>
        </div>
      </header>
      {error && (
        <div className="cs-alert" role="alert">
          {error}
          <button
            onClick={() => {
              blocked.current = false;
              persist().catch(() => {});
            }}
          >
            Reintentar guardado
          </button>
          {batch && (
            <button
              onClick={() =>
                download(
                  new Blob([JSON.stringify(batch, null, 2)], {
                    type: "application/json",
                  }),
                  "respaldo-tanda.json",
                )
              }
            >
              Descargar respaldo
            </button>
          )}
          <button aria-label="Cerrar aviso" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="cs-notice" role="status">
          {notice}
          <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="cs-layout">
        <nav
          className={`cs-brands ${showBrands ? "cs-panel-open" : ""}`}
          aria-label="Marcas y tandas"
        >
          <div className="cs-rail-title">
            MARCAS <span>{brands.length}</span>
          </div>
          {brands.map((b) => (
            <div className="cs-brand" key={b.id}>
              <div
                className={`cs-brand-line ${brand?.id === b.id ? "active" : ""}`}
              >
                <button disabled={busy || aiBusy} onClick={() => openBrand(b)}>
                  <span>{b.emoji_marca || "◈"}</span>
                  <strong>{b.nombre}</strong>
                  <ChevronRight size={14} />
                </button>
                {brand?.id === b.id && (
                  <button
                    title="Configurar comunicación de marca"
                    aria-label={`Configurar ${b.nombre}`}
                    onClick={() => setModal("brand")}
                  >
                    <Settings2 size={16} />
                  </button>
                )}
              </div>
              {brand?.id === b.id && (
                <div className="cs-batches">
                  {brandData?.batches.map((b) => (
                    <button
                      disabled={busy || aiBusy}
                      key={b.id}
                      className={batch?.id === b.id ? "active" : ""}
                      onClick={() => run(() => openBatch(b))}
                    >
                      <Clapperboard size={15} />
                      <span>
                        {b.name}
                        <small>
                          {b.data.scripts.length}/{b.data.ads + b.data.organic}{" "}
                          guiones{b.recording_id ? " · grabación" : ""}
                        </small>
                      </span>
                    </button>
                  ))}
                  <button
                    className="cs-new-batch"
                    onClick={() => setModal("batch")}
                  >
                    <Plus size={15} /> Nueva tanda
                  </button>
                  <button
                    className="cs-knowledge"
                    onClick={() => setModal("brand")}
                  >
                    <BookOpen size={14} /> ADN y conocimiento
                  </button>
                </div>
              )}
            </div>
          ))}
          {!!legacy.length && (
            <button
              className="cs-import"
              disabled={!brand || busy}
              onClick={importLegacy}
            >
              <RotateCcw size={15} /> Recuperar {legacy.length} borradores en{" "}
              {brand?.nombre}
            </button>
          )}
          <div className="cs-rail-foot">
            Una idea a la vez.
            <br />
            Una voz propia en cada marca.
          </div>
        </nav>
        <main className="cs-workspace">
          {loading ? (
            <div className="cs-empty">Cargando el estudio…</div>
          ) : !brand ? (
            <div className="cs-empty">
              No hay marcas disponibles para tu usuario.
            </div>
          ) : !batch ? (
            <div className="cs-welcome">
              <span className="cs-orb">
                <Lightbulb size={30} />
              </span>
              <span className="cs-eyebrow">{brand.nombre}</span>
              <h2>
                La próxima buena idea
                <br />
                empieza aquí.
              </h2>
              <p>
                Define la voz de la marca y crea una tanda.
                <br />
                Construiremos cada guion, una decisión a la vez.
              </p>
              <div>
                <button onClick={() => setModal("brand")}>
                  <Settings2 size={16} /> Configurar marca
                </button>
                <button
                  className="cs-primary"
                  onClick={() => setModal("batch")}
                >
                  <Plus size={16} /> Crear primera tanda
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="cs-breadcrumb">
                {brand.nombre}
                <ChevronRight size={14} />
                {batch.name}
                <button
                  aria-label="Editar configuración de la tanda"
                  onClick={() =>
                    run(async () => {
                      await persist();
                      setModal("batch-edit");
                    })
                  }
                >
                  <Settings2 size={14} />
                </button>
                {batch.recording_id && (
                  <span className="cs-tag">
                    Grabación{" "}
                    {
                      brandData?.recordings.find(
                        (r) => r.id === batch.recording_id,
                      )?.fecha_planeada
                    }
                  </span>
                )}
              </div>
              {!hasProfile && (
                <button
                  className="cs-profile-nudge"
                  onClick={() => setModal("brand")}
                >
                  <Settings2 size={16} /> Define el posicionamiento y los
                  mandatarios de {brand.nombre}
                  <ArrowRight size={16} />
                </button>
              )}
              {recovery && (
                <div className="cs-notice">
                  Hay un borrador local sin guardar.
                  <button
                    onClick={() => {
                      editBatch((b) => ({ ...b, data: recovery.data }));
                      setRecovery(null);
                    }}
                  >
                    Recuperar sobre esta versión
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem(
                        `studio-draft-${userId}-${batch.id}`,
                      );
                      setRecovery(null);
                    }}
                  >
                    Descartar borrador local
                  </button>
                </div>
              )}
              {script ? (
                <>
                  <div className="cs-script-heading">
                    <div>
                      <span className="cs-eyebrow">
                        GUION{" "}
                        {batch.data.scripts.findIndex(
                          (s) => s.id === script.id,
                        ) + 1}{" "}
                        / {batch.data.ads + batch.data.organic}{" "}
                        <span className="cs-tag">
                          {script.type === "ads" ? "ADS" : "ORGÁNICO"}
                        </span>
                      </span>
                      <input
                        aria-label="Título del guion"
                        placeholder="Dale un nombre a esta idea"
                        value={script.title}
                        onChange={(e) => edit({ title: e.target.value })}
                      />
                    </div>
                    <button
                      title="Guiones anteriores de esta marca"
                      onClick={() => setModal("history")}
                    >
                      <BookOpen size={17} />
                      <span>Historial</span>
                    </button>
                  </div>
                  <nav className="cs-stages" aria-label="Etapas del guion">
                    {stages.map((s, i) => (
                      <button
                        key={s}
                        disabled={aiBusy}
                        aria-current={stage === i ? "step" : undefined}
                        className={stage === i ? "active" : ""}
                        onClick={() => selectStage(i)}
                      >
                        <span>{i + 1}</span>
                        {s}
                      </button>
                    ))}
                  </nav>
                  <div className="cs-stage-head">
                    <span className="cs-eyebrow">
                      PASO {stage + 1} DE {stages.length}
                    </span>
                    <h2>
                      {
                        [
                          "¿A quién le hablamos hoy?",
                          "¿Qué idea quieres contar?",
                          "Encuentra un ángulo propio.",
                          "Dale una forma a tu idea.",
                          "Los primeros segundos importan.",
                          "Vamos a llevarlo a cámara.",
                          "Demuestra y cumple tu promesa.",
                          "Una acción. Todo listo para grabar.",
                          "Tu guion, de principio a fin.",
                        ][stage]
                      }
                    </h2>
                    <p>
                      {
                        [
                          "Elige qué sabe tu audiencia antes de ver este video.",
                          "Escribe libremente o elige una propuesta para empezar.",
                          "Conecta una observación real con una mirada de la marca.",
                          "El formato cuenta cómo se ve; la estructura, cómo avanza.",
                          "Combina voz, acción visual y texto sin decir lo mismo tres veces.",
                          "El guion completo se cuenta aquí: inicio, desarrollo y cierre.",
                          "Toda afirmación necesita respaldo; todo gancho, una resolución.",
                          "El cierre debe responder al objetivo del video.",
                          "Revisa la coherencia de marca antes de agregarlo a la lista.",
                        ][stage]
                      }
                    </p>
                  </div>
                  {stage === 0 && (
                    <div className="cs-stage-body">
                      <div className="cs-type-toggle">
                        {(["ads", "organico"] as const).map((t) => (
                          <button
                            key={t}
                            disabled={script.type !== t && remaining(t) <= 0}
                            className={script.type === t ? "active" : ""}
                            onClick={() => edit({ type: t })}
                          >
                            {t === "ads"
                              ? "Ads · conversión"
                              : "Orgánico · conexión"}
                          </button>
                        ))}
                      </div>
                      <Field
                        label={
                          script.type === "ads"
                            ? "¿Qué conversión buscamos?"
                            : "¿Qué valor le damos a la audiencia?"
                        }
                        value={script.objective}
                        onChange={(v) => edit({ objective: v })}
                        placeholder={
                          script.type === "ads"
                            ? "Ej. Conseguir consultas por WhatsApp"
                            : "Ej. Ayudar a reconocer una situación y generar conversación"
                        }
                      />
                      <div className="cs-awareness">
                        {awareness.map(([name, description], i) => (
                          <button
                            key={name}
                            className={
                              script.awareness === i + 1 ? "active" : ""
                            }
                            onClick={() => edit({ awareness: i + 1 })}
                          >
                            <span className="cs-number">{i + 1}</span>
                            <div>
                              <strong>{name}</strong>
                              <small>{description}</small>
                            </div>
                            {script.awareness === i + 1 && (
                              <CheckCircle2 size={18} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {stage === 1 && (
                    <div className="cs-idea-note">
                      <span>✦ TU PUNTO DE PARTIDA</span>
                      <textarea
                        aria-label="Escribe tu idea"
                        placeholder="Escribe tu idea…\nUna pregunta que escuchaste, algo que viste o una historia que quieras contar."
                        value={script.idea}
                        onChange={(e) => edit({ idea: e.target.value })}
                      />
                      <small>
                        No tiene que estar perfecta. Vamos a darle forma juntos.
                      </small>
                    </div>
                  )}
                  {stage === 2 && (
                    <div className="cs-stage-body">
                      <div className="cs-context-note">
                        Idea elegida{" "}
                        <strong>
                          {script.idea || "Define tu idea en el paso anterior"}
                        </strong>
                      </div>
                      <Field
                        label="Insight · ¿qué verdad, tensión o deseo reconoces?"
                        value={script.insight}
                        onChange={(v) => edit({ insight: v })}
                        placeholder="Ej. Hay personas que esperan a sentirse desbordadas para pedir ayuda."
                      />
                      <Field
                        label="Ángulo · ¿desde qué mirada lo contaremos?"
                        value={script.angle}
                        onChange={(v) => edit({ angle: v })}
                        placeholder="Una mirada concreta, coherente con esta marca."
                      />
                    </div>
                  )}
                  {stage === 3 && (
                    <div className="cs-stage-body">
                      <div className="cs-format-grid">
                        {formats.map((f) => (
                          <button
                            key={f}
                            className={script.format === f ? "active" : ""}
                            onClick={() => edit({ format: f })}
                          >
                            {f}
                            {script.format === f && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                      <Field
                        label="Personaje / talento"
                        value={script.character}
                        onChange={(v) => edit({ character: v })}
                        placeholder="Quién habla o aparece. Si no aplica, indícalo."
                        small
                      />
                      <Select
                        label="Estructura narrativa (opcional)"
                        value={script.structure}
                        onChange={(v) => edit({ structure: v })}
                        options={structures}
                      />
                      {script.structure.startsWith("VIRAL") && (
                        <p className="cs-helper">
                          V: gancho · I: promesa de valor · R: respaldo · A:
                          desarrollo · L: cierre y CTA.
                        </p>
                      )}
                    </div>
                  )}
                  {stage === 4 && (
                    <div className="cs-stage-body">
                      <div className="cs-hook-label">
                        0–3 s <span>Gancho</span>
                      </div>
                      <Field
                        label="Lo que se escucha"
                        value={script.hookSpoken}
                        onChange={(v) => edit({ hookSpoken: v })}
                        placeholder="La primera frase, tal como la dirá el talento."
                      />
                      <Field
                        label="Lo que se ve"
                        value={script.hookVisual}
                        onChange={(v) => edit({ hookVisual: v })}
                        placeholder="Acción, plano o cambio visual que detiene la mirada."
                      />
                      <Field
                        label="Lo que se lee"
                        value={script.hookText}
                        onChange={(v) => edit({ hookText: v })}
                        placeholder="Texto breve que añade contexto (opcional)."
                      />
                      <details className="cs-details">
                        <summary>Explorar estructuras de gancho</summary>
                        <div className="cs-chip-list">
                          {[
                            "Pregunta inesperada",
                            "Error común",
                            "Contracorriente",
                            "Antes / después",
                            "Historia sin terminar",
                            "Demostración",
                            "Mito / realidad",
                          ].map((h) => (
                            <button
                              key={h}
                              onClick={() =>
                                setInstruction(
                                  `Proponer ganchos con estructura: ${h}`,
                                )
                              }
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                  {stage === 5 && (
                    <div className="cs-stage-body">
                      <div className="cs-row">
                        <span className="cs-tag">
                          {script.scenes.reduce((a, s) => a + s.seconds, 0)}{" "}
                          segundos · {script.scenes.length} escenas
                        </span>
                        <button
                          onClick={() =>
                            edit({
                              scenes: [
                                ...script.scenes,
                                newScene(
                                  script.scenes.length
                                    ? "Desarrollo"
                                    : "Gancho",
                                ),
                              ],
                            })
                          }
                          disabled={script.scenes.length >= 30}
                        >
                          <Plus size={16} /> Agregar escena
                        </button>
                      </div>
                      {!script.scenes.length && (
                        <div className="cs-empty-small">
                          Agrega escenas o pide una propuesta de rodaje a la IA.
                        </div>
                      )}
                      {script.scenes.map((s, i) => (
                        <SceneEditor
                          key={s.id}
                          scene={s}
                          index={i}
                          total={script.scenes.length}
                          onChange={(p) =>
                            edit({
                              scenes: script.scenes.map((x) =>
                                x.id === s.id ? { ...x, ...p } : x,
                              ),
                            })
                          }
                          onDelete={() =>
                            edit({
                              scenes: script.scenes.filter(
                                (x) => x.id !== s.id,
                              ),
                            })
                          }
                          onMove={(delta) => {
                            const scenes = [...script.scenes];
                            [scenes[i], scenes[i + delta]] = [
                              scenes[i + delta],
                              scenes[i],
                            ];
                            edit({ scenes });
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {stage === 6 && (
                    <div className="cs-stage-body">
                      <Field
                        label="Prueba / respaldo verificable"
                        value={script.proof}
                        onChange={(v) => edit({ proof: v })}
                        placeholder="Fuente, demostración o evidencia. Evita inventar cifras o testimonios. Si no aplica, explica por qué."
                      />
                      <Field
                        label="Payoff · ¿cómo resolvemos lo prometido?"
                        value={script.payoff}
                        onChange={(v) => edit({ payoff: v })}
                        placeholder="La respuesta o revelación que se lleva quien ve el video."
                      />
                      <div className="cs-context-note">
                        Promesa inicial{" "}
                        <strong>
                          {script.hookSpoken || "Completa tu gancho"}
                        </strong>
                      </div>
                    </div>
                  )}
                  {stage === 7 && (
                    <div className="cs-stage-body">
                      <Field
                        label={
                          script.type === "ads"
                            ? "CTA · una acción de conversión"
                            : "CTA · un cierre natural"
                        }
                        value={script.cta}
                        onChange={(v) => edit({ cta: v })}
                        placeholder={
                          script.type === "ads"
                            ? "Ej. Agenda una consulta desde el enlace."
                            : "Ej. Guarda esta idea para conversarla después."
                        }
                      />
                      <Field
                        label="Requerimientos listos para el cliente"
                        value={script.requirements}
                        onChange={(v) => edit({ requirements: v })}
                        placeholder="Talento y permisos\nLocación y disponibilidad\nProductos / vestuario / utilería\nEvidencias a validar\nTomas de apoyo y material que debe enviar"
                      />
                      <p className="cs-helper">
                        Se incluirán por guion y en una lista consolidada dentro
                        del Word. El envío al cliente lo haces desde tu canal
                        habitual.
                      </p>
                    </div>
                  )}
                  {stage === 8 && (
                    <div className="cs-stage-body">
                      <div className="cs-review-text">{scriptText(script)}</div>
                      <div className="cs-brand-review">
                        <strong>Revisión de comunicación</strong>
                        <p>
                          Mandatarios:{" "}
                          {brandData?.profile.mandatory || "Sin definir"}
                        </p>
                        <p>
                          Qué evitar:{" "}
                          {brandData?.profile.avoid || "Sin definir"}
                        </p>
                        <label>
                          <input
                            type="checkbox"
                            checked={script.brandReviewed}
                            onChange={(e) =>
                              edit({
                                brandReviewed: e.target.checked,
                                status: "borrador",
                              })
                            }
                          />{" "}
                          Revisé los mandatarios, las afirmaciones y la
                          coherencia de marca.
                        </label>
                      </div>
                      {missingScript(script).length > 0 && (
                        <p className="cs-helper">
                          Por completar: {missingScript(script).join(", ")}.
                        </p>
                      )}
                      <div className="cs-row">
                        <button
                          className="cs-primary"
                          disabled={missingScript(script).length > 0 || busy}
                          onClick={() =>
                            run(async () => {
                              edit({ status: "listo" });
                              await persist();
                              setNotice(
                                "Guion agregado a la lista de revisados. Puedes empezar el siguiente.",
                              );
                            })
                          }
                        >
                          <Check size={16} />{" "}
                          {script.status === "listo"
                            ? "Guion revisado"
                            : "Agregar a la lista de revisados"}
                        </button>
                        {link ? (
                          <a
                            className="cs-button"
                            href={`/publicaciones/${link.publicacion_id}`}
                          >
                            Abrir publicación <ArrowUpRight size={16} />
                          </a>
                        ) : (
                          <button
                            disabled={script.status !== "listo" || busy}
                            onClick={() =>
                              run(async () => {
                                await persist();
                                const d = await api("", {
                                  action: "publish",
                                  batchId: batch.id,
                                  scriptId,
                                });
                                setBrandData((b) =>
                                  b
                                    ? {
                                        ...b,
                                        links: [
                                          ...b.links,
                                          {
                                            batch_id: batch.id,
                                            script_id: scriptId,
                                            publicacion_id: d.publicationId,
                                          },
                                        ],
                                      }
                                    : b,
                                );
                                setNotice(
                                  "Publicación creada con el guion. La planificación continúa en Publicaciones.",
                                );
                              })
                            }
                          >
                            <ArrowUpRight size={16} /> Crear en Publicaciones
                          </button>
                        )}
                      </div>
                      {link && (
                        <p className="cs-helper">
                          El guion se copió a Publicaciones. Las revisiones
                          posteriores aquí no reemplazan esa copia.
                        </p>
                      )}
                    </div>
                  )}
                  {stage < 8 && (
                    <section className="cs-ai">
                      <div className="cs-row">
                        <div>
                          <span className="cs-eyebrow">
                            TU COPILOTO CREATIVO
                          </span>
                          <p>Propuestas para esta decisión</p>
                        </div>
                        <button
                          disabled={aiBusy || busy}
                          className="cs-ai-button"
                          onClick={askAI}
                        >
                          <Sparkles size={16} />
                          {aiBusy
                            ? "Pensando…"
                            : suggestions.length
                              ? "Pedir más ideas"
                              : "Sugerir con IA"}
                        </button>
                      </div>
                      <input
                        aria-label="Orientación para la IA"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="Dale una dirección: más cotidiano, menos técnico, otro formato…"
                      />
                      <div className="cs-suggestions">
                        {suggestions.map((s, i) => (
                          <article
                            key={`${s.title}-${i}`}
                            className={`cs-sticky cs-sticky-${i % 3}`}
                          >
                            <span>PROPUESTA {i + 1}</span>
                            <h3>{s.title}</h3>
                            <p>{s.reason}</p>
                            <details>
                              <summary>Ver propuesta completa</summary>
                              <pre>
                                {Object.entries(s.patch)
                                  .map(
                                    ([k, v]) =>
                                      `${({ objective: "Objetivo", awareness: "Conciencia", title: "Título", idea: "Idea", insight: "Insight", angle: "Ángulo", format: "Formato", character: "Personaje", structure: "Estructura", hookSpoken: "Voz", hookVisual: "Visual", hookText: "Texto", proof: "Prueba", payoff: "Payoff", cta: "CTA", requirements: "Requerimientos" } as Record<string, string>)[k] || k}: ${k === "scenes" ? (v as Scene[]).map((x) => `${x.seconds}s · ${x.shot}\n${x.visual}\n${x.audio}`).join("\n\n") : v}`,
                                  )
                                  .join("\n\n")}
                              </pre>
                            </details>
                            <button
                              onClick={() => {
                                setUndo(script);
                                edit(s.patch);
                                setNotice(
                                  "Propuesta aplicada a esta etapa. Puedes editarla o deshacer.",
                                );
                              }}
                            >
                              Usar esta propuesta <ArrowRight size={14} />
                            </button>
                          </article>
                        ))}
                      </div>
                      {undo && (
                        <button
                          onClick={() => {
                            edit(undo);
                            setUndo(null);
                          }}
                        >
                          <RotateCcw size={14} /> Deshacer propuesta
                        </button>
                      )}
                      <small>
                        La IA usa el ADN de marca, las fuentes revisadas y sus
                        guiones anteriores. Tú eliges y validas.
                      </small>
                    </section>
                  )}
                  <footer className="cs-step-footer">
                    <button
                      disabled={stage === 0 || aiBusy}
                      onClick={() => selectStage(stage - 1)}
                    >
                      <ChevronLeft size={16} /> Anterior
                    </button>
                    <span>
                      {stage + 1} de {stages.length}
                    </span>
                    {stage < 8 ? (
                      <button
                        className="cs-primary"
                        disabled={aiBusy}
                        onClick={() => selectStage(stage + 1)}
                      >
                        Continuar <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button
                        disabled={
                          busy ||
                          (remaining("ads") <= 0 && remaining("organico") <= 0)
                        }
                        onClick={() =>
                          run(() =>
                            addScript(
                              remaining("organico") > 0 ? "organico" : "ads",
                            ),
                          )
                        }
                      >
                        <Plus size={16} /> Siguiente guion
                      </button>
                    )}
                  </footer>
                </>
              ) : (
                <div className="cs-welcome">
                  <h2>Vamos con el primer guion.</h2>
                  <p>La tanda está creada. Elige por dónde empezar.</p>
                  <div>
                    {remaining("ads") > 0 && (
                      <button
                        className="cs-primary"
                        onClick={() => run(() => addScript("ads"))}
                      >
                        Crear guion Ads
                      </button>
                    )}
                    {remaining("organico") > 0 && (
                      <button onClick={() => run(() => addScript("organico"))}>
                        Crear guion orgánico
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
        <aside className={`cs-right ${showAside ? "cs-panel-open" : ""}`}>
          <div className="cs-rail-title">
            TU TANDA{" "}
            <span>
              {ready}/{batch ? batch.data.ads + batch.data.organic : 0}
            </span>
          </div>
          <h3>Guiones de la sesión</h3>
          <p className="cs-helper">Un guion a la vez, todos aquí.</p>
          <div className="cs-script-list">
            {batch?.data.scripts.map((s, i) => (
              <button
                disabled={aiBusy}
                key={s.id}
                className={scriptId === s.id ? "active" : ""}
                onClick={() => {
                  setScriptId(s.id);
                  selectStage(s.status === "listo" ? 8 : 0);
                  setShowAside(false);
                }}
              >
                <span className="cs-number">
                  {s.status === "listo" ? (
                    <Check size={15} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <span>
                  <strong>{s.title || "Nueva idea"}</strong>
                  <small>
                    {s.type === "ads" ? "Ads" : "Orgánico"} ·{" "}
                    {s.status === "listo" ? "Revisado" : "En creación"}
                  </small>
                </span>
              </button>
            ))}
          </div>
          {batch && (
            <div className="cs-add-scripts">
              {remaining("ads") > 0 && (
                <button
                  disabled={busy || aiBusy}
                  onClick={() => run(() => addScript("ads"))}
                >
                  <Plus size={14} /> Ads{" "}
                  <small>{remaining("ads")} pendientes</small>
                </button>
              )}
              {remaining("organico") > 0 && (
                <button
                  disabled={busy || aiBusy}
                  onClick={() => run(() => addScript("organico"))}
                >
                  <Plus size={14} /> Orgánico{" "}
                  <small>{remaining("organico")} pendientes</small>
                </button>
              )}
            </div>
          )}
          <div className="cs-checklist">
            <span className="cs-eyebrow">MIRADA CREATIVA</span>
            <h3>Checklist de viralidad</h3>
            {checks.map((c, i) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={script?.checks[i] || false}
                  disabled={!script}
                  onChange={(e) =>
                    script &&
                    edit({
                      checks: script.checks.map((v, j) =>
                        j === i ? e.target.checked : v,
                      ),
                    })
                  }
                />
                <span>{c}</span>
              </label>
            ))}
            <small>
              Valida lo que aplica a esta idea. No necesitas forzar los seis
              criterios y no garantizan viralidad.
            </small>
          </div>
          {brand && (
            <button
              className="cs-brand-settings"
              onClick={() => setModal("brand")}
            >
              <Settings2 size={16} />
              <span>
                ADN de {brand.nombre}
                <small>
                  {brandData?.profile.sources.filter((s) => s.verified)
                    .length || 0}{" "}
                  fuentes revisadas
                </small>
              </span>
            </button>
          )}
        </aside>
      </div>
      {modal === "brand" && brand && brandData && (
        <BrandDialog
          brand={brand}
          profile={brandData.profile}
          onClose={closeModal}
          onSave={async (data) => {
            const d = await api("", {
              action: "profile",
              brandId: brand.id,
              data,
              revision: brandData.profileRevision,
            });
            setBrandData((b) =>
              b ? { ...b, profile: d.data, profileRevision: d.revision } : b,
            );
            setNotice("Comunicación y fuentes de la marca guardadas.");
            setModal(null);
          }}
        />
      )}
      {(modal === "batch" || modal === "batch-edit") && brand && (
        <BatchDialog
          brand={brand}
          recordings={brandData?.recordings || []}
          initial={modal === "batch-edit" ? batch : null}
          onClose={closeModal}
          onCreate={async (value) => {
            const current = await persist();
            const editing = modal === "batch-edit";
            const b = await api("", {
              action: editing ? "settings" : "create",
              ...value,
              brandId: brand.id,
              batchId: editing ? current?.id : undefined,
              revision: editing ? current?.revision : undefined,
            });
            setBrandData((d) =>
              d
                ? {
                    ...d,
                    batches: editing
                      ? d.batches.map((x) => (x.id === b.id ? b : x))
                      : [b, ...d.batches],
                  }
                : d,
            );
            syncBatch(b);
            await openBatch(b);
            setModal(null);
          }}
        />
      )}
      {modal === "history" && (
        <Dialog
          title={`Guiones anteriores · ${brand?.nombre}`}
          onClose={closeModal}
          wide
        >
          <p className="cs-helper">
            Últimos 35 guiones de Publicaciones. La IA recibe los 12 más
            recientes como contexto.
          </p>
          <div className="cs-history">
            {brandData?.history.length ? (
              brandData.history.map((h) => (
                <details key={h.id}>
                  <summary>{h.nombre}</summary>
                  <pre>{h.guion}</pre>
                  <a
                    href={`/publicaciones/${h.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir publicación ↗
                  </a>
                </details>
              ))
            ) : (
              <p>
                Esta marca todavía no tiene guiones guardados en Publicaciones.
              </p>
            )}
          </div>
        </Dialog>
      )}
      {modal === "export" && batch && brand && (
        <ExportDialog
          brand={brand}
          batch={batch}
          manager={manager}
          onClose={closeModal}
          onExport={exportWord}
        />
      )}
    </div>
  );
}

function SceneEditor({
  scene: s,
  index,
  total,
  onChange,
  onDelete,
  onMove,
}: {
  scene: Scene;
  index: number;
  total: number;
  onChange: (p: Partial<Scene>) => void;
  onDelete: () => void;
  onMove: (delta: number) => void;
}) {
  return (
    <article className="cs-scene">
      <header>
        <strong>
          <GripVertical size={15} /> Escena {index + 1}
        </strong>
        <div>
          <button
            aria-label="Subir escena"
            disabled={!index}
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <button
            aria-label="Bajar escena"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
          <button aria-label="Eliminar escena" onClick={onDelete}>
            <X size={15} />
          </button>
        </div>
      </header>
      <div className="cs-scene-meta">
        <Select
          label="Función"
          value={s.purpose}
          onChange={(v) => onChange({ purpose: v as Scene["purpose"] })}
          options={["Gancho", "Desarrollo", "Prueba", "Payoff", "CTA"]}
        />
        <Select
          label="Tipo de plano"
          value={s.shot}
          onChange={(v) => onChange({ shot: v })}
          options={shots}
        />
        <label className="cs-field">
          <span>Segundos</span>
          <input
            type="number"
            min="1"
            max="120"
            value={s.seconds}
            onChange={(e) =>
              onChange({
                seconds: Math.max(
                  1,
                  Math.min(120, Number(e.target.value) || 1),
                ),
              })
            }
          />
        </label>
      </div>
      <Field
        label="Acción visual / movimiento de cámara"
        value={s.visual}
        onChange={(v) => onChange({ visual: v })}
      />
      <Field
        label="Diálogo, voz o sonido"
        value={s.audio}
        onChange={(v) => onChange({ audio: v })}
      />
      <Field
        label="Texto en pantalla"
        value={s.text}
        onChange={(v) => onChange({ text: v })}
        small
      />
    </article>
  );
}

function BrandDialog({
  brand,
  profile,
  onClose,
  onSave,
}: {
  brand: Brand;
  profile: Profile;
  onClose: () => void;
  onSave: (p: Profile) => Promise<void>;
}) {
  const [data, setData] = useState<Profile>(profile),
    [tab, setTab] = useState("voz"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reading, setReading] = useState<string | null>(null);
  const fields: [keyof Omit<Profile, "sources">, string, string][] = [
    [
      "positioning",
      "Posicionamiento",
      "¿Qué lugar ocupa la marca y qué la hace diferente?",
    ],
    [
      "audience",
      "Público y tensiones",
      "Quién es, qué desea, qué le preocupa y en qué contexto compra.",
    ],
    [
      "offer",
      "Oferta y productos",
      "Qué ofrece, para quién y con qué condiciones reales.",
    ],
    [
      "tone",
      "Tono de voz",
      "Cómo habla. Ejemplos de frases que sí suenan a la marca.",
    ],
    [
      "mandatory",
      "Mandatarios",
      "Mensajes obligatorios, menciones, avisos, identidad visual.",
    ],
    [
      "say",
      "Qué debemos decir",
      "Ideas fuerza, beneficios respaldados y vocabulario propio.",
    ],
    [
      "avoid",
      "Qué NO decir",
      "Promesas prohibidas, palabras, temas y enfoques que evitamos.",
    ],
    [
      "brandFormat",
      "Formato recurrente de marca",
      "Secciones, recursos visuales, apertura y cierre reconocibles.",
    ],
    [
      "character",
      "Personajes de marca",
      "Nombre, rol, personalidad, gestos y límites de cada personaje.",
    ],
  ];
  const sourceEdit = (id: string, patch: Partial<Profile["sources"][number]>) =>
    setData((d) => ({
      ...d,
      sources: d.sources.map((s) =>
        s.id === id
          ? {
              ...s,
              ...patch,
              ...("content" in patch || "url" in patch
                ? { verified: false }
                : {}),
            }
          : s,
      ),
    }));
  return (
    <Dialog title={`ADN de marca · ${brand.nombre}`} onClose={onClose} wide>
      <div className="cs-modal-tabs">
        <button
          className={tab === "voz" ? "active" : ""}
          onClick={() => setTab("voz")}
        >
          Comunicación y posicionamiento
        </button>
        <button
          className={tab === "sources" ? "active" : ""}
          onClick={() => setTab("sources")}
        >
          Fuentes de conocimiento ({data.sources.length})
        </button>
      </div>
      {error && (
        <p className="cs-error" role="alert">
          {error}
        </p>
      )}
      {tab === "voz" ? (
        <div className="cs-brand-fields">
          {fields.map(([key, label, placeholder]) => (
            <Field
              key={key}
              label={label}
              value={data[key]}
              onChange={(v) => setData((d) => ({ ...d, [key]: v }))}
              placeholder={placeholder}
            />
          ))}
          {!!brand.tono_voz && (
            <details className="cs-details">
              <summary>Consultar tono registrado en la marca</summary>
              <pre>{JSON.stringify(brand.tono_voz, null, 2)}</pre>
            </details>
          )}
        </div>
      ) : (
        <div>
          <p className="cs-helper">
            Conecta páginas, productos y documentos. Revisa el contenido antes
            de habilitarlo para la IA. Para PDF, Word o documentos privados,
            pega aquí el extracto relevante.
          </p>
          {data.sources.map((s) => (
            <article key={s.id} className="cs-source">
              <header>
                <strong>{s.name || "Nueva fuente"}</strong>
                <button
                  aria-label="Eliminar fuente"
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      sources: d.sources.filter((x) => x.id !== s.id),
                    }))
                  }
                >
                  <X size={16} />
                </button>
              </header>
              <div className="cs-two-col">
                <Field
                  label="Nombre"
                  value={s.name}
                  onChange={(v) => sourceEdit(s.id, { name: v })}
                  small
                />
                <label className="cs-field">
                  <span>Tipo</span>
                  <select
                    value={s.kind}
                    onChange={(e) =>
                      sourceEdit(s.id, {
                        kind: e.target.value as typeof s.kind,
                      })
                    }
                  >
                    <option value="web">Página web</option>
                    <option value="producto">Producto / catálogo</option>
                    <option value="documento">Documento</option>
                    <option value="nota">Nota / entrevista</option>
                  </select>
                </label>
              </div>
              <Field
                label="Enlace de referencia (opcional)"
                value={s.url}
                onChange={(v) => sourceEdit(s.id, { url: v })}
                placeholder="https://…"
                small
              />
              {s.url && s.kind !== "documento" && (
                <button
                  disabled={!!reading}
                  onClick={async () => {
                    setReading(s.id);
                    setError("");
                    try {
                      const r = await api("", {
                        action: "source",
                        brandId: brand.id,
                        url: s.url,
                      });
                      sourceEdit(s.id, {
                        name: s.name || r.name,
                        content: r.content,
                        url: r.url,
                        verified: false,
                      });
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setReading(null);
                    }
                  }}
                >
                  <BookOpen size={14} />
                  {reading === s.id ? "Leyendo…" : "Leer página pública"}
                </button>
              )}
              <Field
                label="Conocimiento extraído / texto del documento"
                value={s.content}
                onChange={(v) => sourceEdit(s.id, { content: v })}
                placeholder="Información real de la marca: características, evidencia, catálogo, preguntas frecuentes…"
              />
              <label className="cs-checkbox">
                <input
                  type="checkbox"
                  checked={s.verified}
                  disabled={!s.content.trim()}
                  onChange={(e) =>
                    sourceEdit(s.id, { verified: e.target.checked })
                  }
                />{" "}
                Revisé este contenido y puede usarse como fuente.
              </label>
            </article>
          ))}
          <button
            disabled={data.sources.length >= 30}
            onClick={() =>
              setData((d) => ({
                ...d,
                sources: [
                  ...d.sources,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    kind: "web",
                    url: "",
                    content: "",
                    verified: false,
                  },
                ],
              }))
            }
          >
            <Plus size={16} /> Agregar fuente
          </button>
        </div>
      )}
      <footer className="cs-modal-footer">
        <span>Se aplica a todas las tandas de esta marca.</span>
        <button
          disabled={busy || !!reading}
          className="cs-primary"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onSave(profileSchema.parse(data));
            } catch (e) {
              setError(e instanceof Error ? e.message : "Revisa los campos");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Guardando…" : "Guardar configuración"}
        </button>
      </footer>
    </Dialog>
  );
}
function BatchDialog({
  brand,
  recordings,
  initial,
  onClose,
  onCreate,
}: {
  brand: Brand;
  recordings: Recording[];
  initial?: Batch | null;
  onClose: () => void;
  onCreate: (v: {
    id: string;
    name: string;
    recordingId: string | null;
    data: {
      objective: string;
      platform: string;
      ads: number;
      organic: number;
      scripts: Script[];
    };
  }) => Promise<void>;
}) {
  const [id] = useState(() => initial?.id || crypto.randomUUID()),
    [name, setName] = useState(initial?.name || ""),
    [objective, setObjective] = useState(initial?.data.objective || ""),
    [ads, setAds] = useState(initial?.data.ads ?? 5),
    [organic, setOrganic] = useState(initial?.data.organic ?? 5),
    [recording, setRecording] = useState(initial?.recording_id || ""),
    [platform, setPlatform] = useState(
      initial?.data.platform || "Instagram / TikTok",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      title={`${initial ? "Configurar tanda" : "Nueva tanda"} · ${brand.nombre}`}
      onClose={onClose}
    >
      <p className="cs-helper">
        Un proyecto de guiones para una grabación. Después construirás cada
        video por separado.
      </p>
      <Field
        label="Nombre de la tanda"
        value={name}
        onChange={setName}
        placeholder="Octubre · 10 videos"
        small
      />
      <Field
        label="Objetivo de esta tanda"
        value={objective}
        onChange={setObjective}
        placeholder="Qué queremos comunicar o conseguir este mes."
      />
      <div className="cs-two-col">
        <label className="cs-field">
          <span>Guiones Ads</span>
          <input
            type="number"
            min="0"
            max="30"
            value={ads}
            onChange={(e) => setAds(Number(e.target.value))}
          />
        </label>
        <label className="cs-field">
          <span>Guiones orgánicos</span>
          <input
            type="number"
            min="0"
            max="30"
            value={organic}
            onChange={(e) => setOrganic(Number(e.target.value))}
          />
        </label>
      </div>
      <Select
        label="Plataforma"
        value={platform}
        onChange={setPlatform}
        options={[
          "Instagram / TikTok",
          "Instagram Reels",
          "TikTok",
          "YouTube Shorts",
          "Meta Ads",
          "YouTube",
          "Otra",
        ]}
      />
      <label className="cs-field">
        <span>Vincular con una grabación</span>
        <select
          value={recording}
          onChange={(e) => setRecording(e.target.value)}
        >
          <option value="">Sin grabación todavía</option>
          {recordings.map((r) => (
            <option key={r.id} value={r.id}>
              {r.fecha_planeada} · {r.estado}
            </option>
          ))}
        </select>
      </label>
      <p className="cs-helper">
        La tanda usa el ADN y las fuentes de {brand.nombre}. Puedes
        configurarlos desde la tuerquita.
      </p>
      {error && (
        <p className="cs-error" role="alert">
          {error}
        </p>
      )}
      <footer className="cs-modal-footer">
        <span>{ads + organic} guiones · máximo 30</span>
        <button
          className="cs-primary"
          disabled={
            busy ||
            !name.trim() ||
            !objective.trim() ||
            ads + organic < 1 ||
            ads + organic > 30 ||
            ads < 0 ||
            organic < 0
          }
          onClick={async () => {
            setBusy(true);
            try {
              await onCreate({
                id,
                name,
                recordingId: recording || null,
                data: { objective, platform, ads, organic, scripts: [] },
              });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? "Guardando…"
            : initial
              ? "Guardar cambios"
              : "Abrir mi pizarra"}{" "}
          <ArrowRight size={16} />
        </button>
      </footer>
    </Dialog>
  );
}
function ExportDialog({
  brand,
  batch,
  manager,
  onClose,
  onExport,
}: {
  brand: Brand;
  batch: Batch;
  manager: boolean;
  onClose: () => void;
  onExport: (folder?: string) => Promise<string | void>;
}) {
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]),
    [trail, setTrail] = useState<{ id: string; name: string }[]>([]),
    [folder, setFolder] = useState(""),
    [page, setPage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [needsAuth, setNeedsAuth] = useState(false),
    [drive, setDrive] = useState(false),
    [url, setUrl] = useState(""),
    [link, setLink] = useState("");
  const load = async (id?: string, name = "Mi unidad", more = false) => {
    setBusy(true);
    setError("");
    setNeedsAuth(false);
    try {
      const params = new URLSearchParams({
        brand: brand.id,
        ...(id ? { folder: id } : {}),
        ...(more && page ? { page } : {}),
      });
      const res = await fetch(`/api/creative-studio/drive?${params}`);
      const d = await res.json();
      if (!res.ok) {
        setNeedsAuth(res.status === 428);
        throw new Error(d.error);
      }
      setFolders((previous) => (more ? [...previous, ...d.files] : d.files));
      setFolder(d.id);
      setPage(d.nextPageToken || "");
      if (!more)
        setTrail((previous) => {
          const i = previous.findIndex((p) => p.id === d.id);
          return i >= 0
            ? previous.slice(0, i + 1)
            : [
                ...previous,
                {
                  id: d.id,
                  name: !id && d.id !== "root" ? brand.nombre : name,
                },
              ];
        });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const act = async (folderId?: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await onExport(folderId);
      if (result) setLink(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title="Entregar tanda de guiones" onClose={onClose}>
      <div className="cs-export-summary">
        <FileText size={30} />
        <div>
          <strong>{batch.name}</strong>
          <p>
            {batch.data.scripts.length} guiones ·{" "}
            {batch.data.scripts.filter((s) => s.status === "listo").length}{" "}
            revisados
          </p>
        </div>
      </div>
      <p>
        El Word incluye estrategia, guiones, tabla de escenas y planos,
        checklist y requerimientos consolidados para el cliente.
      </p>
      {batch.data.scripts.some((s) => s.status !== "listo") && (
        <p className="cs-helper">
          Los guiones pendientes de revisión se identificarán como BORRADOR.
        </p>
      )}
      <div className="cs-export-actions">
        <button
          disabled={busy || !batch.data.scripts.length}
          className="cs-primary"
          onClick={() => act()}
        >
          <Download size={16} /> Descargar Word
        </button>
        <button
          disabled={busy || !batch.data.scripts.length}
          onClick={() => {
            setDrive(true);
            load();
          }}
        >
          <FolderOpen size={16} /> Elegir carpeta en Drive
        </button>
      </div>
      {drive && (
        <div className="cs-drive">
          <h3>Guardar en Google Drive</h3>
          {needsAuth ? (
            <div>
              <p>
                Falta autorizar Drive en la cuenta de Google conectada a la
                agencia. Google pedirá acceso para explorar carpetas y guardar
                documentos.
              </p>
              {manager ? (
                <a
                  className="cs-button cs-primary"
                  href="/api/auth/google/start?drive=1&from=/creacion-de-ideas"
                >
                  Autorizar Drive con la cuenta de la agencia ↗
                </a>
              ) : (
                <p>Un administrador debe conectar Drive desde este módulo.</p>
              )}
            </div>
          ) : (
            <>
              <div className="cs-drive-trail">
                {trail.map((t) => (
                  <button
                    disabled={busy}
                    key={t.id}
                    onClick={() => load(t.id, t.name)}
                  >
                    {t.name}
                    <ChevronRight size={12} />
                  </button>
                ))}
              </div>
              <div className="cs-folder-list">
                {folders.map((f) => (
                  <button
                    disabled={busy}
                    key={f.id}
                    onClick={() => load(f.id, f.name)}
                  >
                    <FolderOpen size={17} />
                    {f.name}
                    <ChevronRight size={15} />
                  </button>
                ))}
                {!folders.length && !busy && <p>No hay subcarpetas.</p>}
                {page && (
                  <button
                    disabled={busy}
                    onClick={() => load(folder, "", true)}
                  >
                    Cargar más carpetas
                  </button>
                )}
              </div>
              <Field
                label="O pega el enlace de una carpeta"
                value={url}
                onChange={setUrl}
                placeholder="https://drive.google.com/drive/folders/…"
                small
              />
              <button
                disabled={busy || !url}
                onClick={() => {
                  const id = url.match(/\/folders\/([\w-]+)/)?.[1];
                  if (!id) {
                    setError("Pega un enlace de carpeta de Drive válido");
                    return;
                  }
                  load(id, "Carpeta elegida");
                }}
              >
                Abrir carpeta del enlace
              </button>
              <button
                className="cs-primary"
                disabled={busy || !folder}
                onClick={() => act(folder)}
              >
                <Save size={16} /> Guardar Word en «
                {trail.at(-1)?.name || "esta carpeta"}»
              </button>
            </>
          )}
        </div>
      )}
      {busy && <p role="status">Procesando…</p>}
      {error && (
        <p className="cs-error" role="alert">
          {error}
        </p>
      )}
      {link && (
        <p className="cs-notice">
          Documento guardado.{" "}
          <a href={link} target="_blank" rel="noreferrer">
            Abrir en Drive ↗
          </a>
        </p>
      )}
    </Dialog>
  );
}
