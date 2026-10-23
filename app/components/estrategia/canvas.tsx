"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import {
  Excalidraw,
  MainMenu,
  reconcileElements,
  convertToExcalidrawElements,
  CaptureUpdateAction,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { api } from "./common";
import { mergeScene } from "@/lib/estrategia/model";
if (typeof window !== "undefined")
  (window as any).EXCALIDRAW_ASSET_PATH = "/excalidraw/";

export default function Canvas({
  sheet,
  data,
  clientId,
  follow,
  onStatus,
  onSelection,
  focusAnchor = "",
}: {
  focusAnchor?: string;
  sheet: any;
  data: any;
  clientId: string;
  follow: string;
  onStatus: (s: string) => void;
  onSelection: (id: string | null) => void;
}) {
  const [ready, setReady] = useState(false);
  const [ex, setEx] = useState<ExcalidrawImperativeAPI | null>(null),
    pending = useRef<any>(null),
    saving = useRef(false),
    remote = useRef(false),
    lastSignature = useRef(""),
    pointer = useRef<any>(null),
    loaded = useRef(false),
    status = useRef(onStatus),
    selection = useRef(onSelection);
  useEffect(() => {
    status.current = onStatus;
    selection.current = onSelection;
  }, [onStatus, onSelection]);
  const url = `/api/estrategia/hojas/${sheet.id}`,
    backup = `distinto:lienzo:${data.me.id}:${sheet.id}`;
  useEffect(() => {
    (window as any).EXCALIDRAW_ASSET_PATH = "/excalidraw/";
  }, []);
  const [initial] = useState(() => {
    let scene = {
      elements: data.scene.elements,
      files: data.scene.files || {},
      dirty: false,
    };
    try {
      const saved = localStorage.getItem(backup);
      if (saved && !data.me.client) {
        const local = JSON.parse(saved);
        scene = {
          elements: mergeScene(scene.elements, local.elements),
          files: { ...scene.files, ...local.files },
          dirty: true,
        };
      }
    } catch {}
    if (
      !scene.elements.length &&
      sheet.data.template === "Reunión de estrategia" &&
      !data.me.client
    )
      scene = {
        ...scene,
        dirty: true,
        elements: templateElements(sheet.id, [
          {
            type: "text",
            x: 80,
            y: 85,
            text: sheet.title,
            fontSize: 28,
            fontFamily: 2,
          },
          ...[
            "Objetivo y contexto",
            "Ideas y referencias",
            "Decisiones",
            "Acuerdos por revisar",
          ].map((t, i) => ({
            type: "rectangle" as const,
            x: 80 + (i % 2) * 420,
            y: 180 + Math.floor(i / 2) * 280,
            width: 350,
            height: 210,
            backgroundColor: ["#f3e8ff", "#fff3bf", "#d3f9d8", "#e7f5ff"][i],
            strokeColor: "#d8c8e8",
            roughness: 0,
            roundness: { type: 3 as const },
            label: {
              text: t,
              fontSize: 18,
              fontFamily: 2,
              strokeColor: "#574666",
              verticalAlign: "top" as const,
            },
          })),
        ]),
      };
    return scene;
  });
  useEffect(() => {
    if (!ex || !ready || !initial.elements.length || focusAnchor) return;
    const frame = requestAnimationFrame(() => ex.scrollToContent(undefined, { fitToViewport: true, viewportZoomFactor: 0.86, maxZoom: 1 }));
    return () => cancelAnimationFrame(frame);
  }, [ex, ready, initial.elements.length, focusAnchor]);
  const remoteRevision = useRef(data.scene.revision);
  useEffect(() => {
    if (!ex || !loaded.current) return;
    if (data.scene && data.scene.revision !== remoteRevision.current) {
      remoteRevision.current = data.scene.revision;
      remote.current = true;
      ex.addFiles(Object.values(data.scene.files || {}));
      const elements = reconcileElements(
        ex.getSceneElementsIncludingDeleted(),
        data.scene.elements,
        ex.getAppState(),
      );
      ex.updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER });
      lastSignature.current = signature(elements, ex.getFiles());
      remote.current = false;
    }
    const collaborators = new Map<any, any>();
    for (const p of data.presence || [])
      if (p.client_id !== clientId)
        collaborators.set(p.client_id, {
          username: p.name,
          pointer: p.data.pointer
            ? { ...p.data.pointer, tool: "pointer" }
            : undefined,
          color: { background: "#c5a8f4", stroke: "#8048d5" },
          userState: "active",
        });
    const presenter = data.presence?.find((p: any) => p.client_id === follow)
      ?.data.viewport;
    ex.updateScene({
      collaborators,
      ...(presenter
        ? {
            appState: {
              scrollX: presenter.scrollX,
              scrollY: presenter.scrollY,
              zoom: { value: presenter.zoom },
            },
          }
        : {}),
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  }, [data.scene, data.presence, ex, clientId, follow]);
  useEffect(() => {
    if (!ex || data.me.client) return;
    let cancelled = false;
    async function save() {
      if (!pending.current || saving.current) return;
      saving.current = true;
      const snapshot = pending.current;
      status.current("Guardando…");
      try {
        await api(url, { action: "scene", ...snapshot });
        if (pending.current === snapshot) {
          pending.current = null;
          try {
            localStorage.removeItem(backup);
          } catch {}
        }
        if (!cancelled)
          status.current(pending.current ? "Cambios pendientes" : "Guardado");
      } catch (e) {
        if (!cancelled) status.current((e as Error).message);
      } finally {
        saving.current = false;
      }
    }
    const timer = setInterval(save, 1000),
      presence = setInterval(() => {
        const state = ex.getAppState();
        if (document.visibilityState === "visible")
          api(url, {
            action: "presence",
            clientId,
            pointer: pointer.current,
            viewport: {
              scrollX: state.scrollX,
              scrollY: state.scrollY,
              zoom: state.zoom.value,
            },
          }).catch(() => {});
      }, 2500);
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearInterval(presence);
      window.removeEventListener("beforeunload", warn);
      void save();
    };
  }, [ex, url, backup, data.me.client, clientId]);
  const [activeAnchor, setActiveAnchor] = useState(focusAnchor);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceMessage, setReferenceMessage] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const focused = useRef(false);
  const canvasContainer = useRef<HTMLDivElement>(null);
  const anchors = (data.scene?.elements || []).filter((e: any) => !e.isDeleted && e.customData?.deliveryVersionId);
  const focusVersion = (id: string) => {
    setActiveAnchor(id);
    const targets = ex?.getSceneElements().filter(e => e.id === id || e.id === `${id}-references`);
    if (!id) ex?.scrollToContent(undefined, { fitToViewport: true, viewportZoomFactor: 0.86, maxZoom: 1 });
    else if (targets?.length) ex?.scrollToContent(targets, { fitToViewport: true, viewportZoomFactor: 0.86, maxZoom: 1 });
  };
  useEffect(() => {
    if (!ex || !ready || focused.current || !focusAnchor) return;
    // Excalidraw restores elements before its viewport has finished measuring.
    // Fit only after the engine and the actual canvas agree on their dimensions.
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const fit = () => {
      const state = ex.getAppState(), box = canvasContainer.current?.getBoundingClientRect();
      if (!box || state.isLoading || state.width < 100 || state.height < 100 || Math.abs(state.width - box.width) > 4 || Math.abs(state.height - box.height) > 4) {
        if (++attempts < 30) timer = setTimeout(fit, 100);
        return;
      }
      const targets = ex.getSceneElements().filter(e => e.id === focusAnchor || e.id === `${focusAnchor}-references`);
      if (!targets.length) return;
      focused.current = true;
      ex.scrollToContent(targets, { fitToViewport: true, viewportZoomFactor: 0.86, maxZoom: 1, animate: false });
    };
    timer = setTimeout(fit, 100);
    return () => clearTimeout(timer);
  }, [ex, ready, focusAnchor, data.scene]);
  async function addReference(blob: Blob) {
    if (!ex) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) || blob.size > 20_000_000) throw Error('Usa una imagen PNG, JPG o WebP de hasta 20 MB.');
    const bitmap = await createImageBitmap(blob);
    const factor = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * factor); canvas.height = Math.round(bitmap.height * factor);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const dataURL = canvas.toDataURL('image/webp', 0.85);
    const id = crypto.randomUUID();
    const state = ex.getAppState();
    const anchor = ex.getSceneElements().find(e => e.id === activeAnchor);
    const x = anchor ? anchor.x + anchor.width + 70 : -state.scrollX + 140 / state.zoom.value;
    const y = anchor ? anchor.y + 100 : -state.scrollY + 140 / state.zoom.value;
    const displayScale = Math.min(1, 360 / canvas.width, 500 / canvas.height);
    const image = convertToExcalidrawElements([{ type: 'image', x, y, width: canvas.width * displayScale, height: canvas.height * displayScale, fileId: id, status: 'saved', scale: [1, 1] } as any]);
    ex.addFiles([{ id, mimeType: 'image/webp', dataURL, created: Date.now() } as any]);
    ex.updateScene({ elements: [...ex.getSceneElementsIncludingDeleted(), ...image], appState: { selectedElementIds: { [image[0].id]: true } }, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    ex.setActiveTool({ type: 'selection' });
    setReferenceMessage('Referencia añadida. Puedes moverla, cambiar su tamaño y dibujar encima.');
  }
  async function referenceAction(fn: () => Promise<void>) {
    setReferenceBusy(true); setReferenceMessage('');
    try { await fn(); } catch (e) { setReferenceMessage((e as Error).name === 'NotAllowedError' ? 'No se dio acceso. También puedes hacer una captura y pegarla con Ctrl/Cmd + V.' : (e as Error).message); }
    finally { setReferenceBusy(false); }
  }
  const pasteReference = () => referenceAction(async () => {
    if (!navigator.clipboard?.read) throw Error('Pega tu captura sobre el lienzo con Ctrl/Cmd + V.');
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find(t => ['image/png', 'image/jpeg', 'image/webp'].includes(t));
      if (type) { await addReference(await item.getType(type)); return; }
    }
    throw Error('El portapapeles no contiene una imagen. Copia una captura y vuelve a pegarla.');
  });
  const captureReference = () => referenceAction(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) throw Error('Este navegador no permite capturar. Usa una captura del sistema y pégala con Ctrl/Cmd + V.');
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const preview = document.createElement('video'); preview.muted = true; preview.srcObject = stream;
      await preview.play();
      if (preview.requestVideoFrameCallback) await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(Error('La captura no respondió. Puedes pegar una captura del sistema.')), 5000);
        preview.requestVideoFrameCallback(() => { clearTimeout(timeout); resolve(); });
      });
      const capture = document.createElement('canvas'); capture.width = preview.videoWidth; capture.height = preview.videoHeight;
      capture.getContext('2d')!.drawImage(preview, 0, 0);
      stream.getTracks().forEach(t => t.stop()); preview.srcObject = null;
      const blob = await new Promise<Blob | null>(resolve => capture.toBlob(resolve, 'image/png'));
      if (!blob) throw Error('No se pudo capturar. Puedes pegar una captura del sistema.');
      await addReference(blob);
    } finally { stream?.getTracks().forEach(t => t.stop()); }
  });
  return (
    <div className="st-canvas-wrap">
      {sheet.boceto_publicacion_id && !data.me.client && <div className="st-sketch-tools">
        <label>Versión <select aria-label="Zona de la versión" value={activeAnchor} onChange={e => focusVersion(e.target.value)}>
          <option value="">Todo el boceto</option>
          {anchors.map((e: any) => <option key={e.id} value={e.id}>{e.customData.deliveryLabel}</option>)}
        </select></label>
        <button onClick={() => { ex?.setActiveTool({ type: 'rectangle' }); ex?.updateScene({ appState: { currentItemBackgroundColor: 'transparent', currentItemStrokeColor: '#9c36b5', currentItemStrokeWidth: 2, currentItemRoughness: 0 } }); }}>▧ Señalar zona</button>
        <button onClick={() => ex?.setActiveTool({ type: 'arrow' })}>↗ Flecha</button>
        <button onClick={() => ex?.setActiveTool({ type: 'freedraw' })}>✎ Dibujar</button>
        <button disabled={referenceBusy} onClick={() => void pasteReference()}>Pegar captura</button>
        <button disabled={referenceBusy} onClick={() => void captureReference()}>Capturar pantalla</button>
        <button disabled={referenceBusy} onClick={() => upload.current?.click()}>+ Referencia</button>
        <input ref={upload} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void referenceAction(() => addReference(file)); e.target.value = ''; }} />
        {referenceMessage && <span role="status">{referenceMessage}</span>}
      </div>}
    <div className="st-canvas" ref={canvasContainer}>
      <Excalidraw
        initialData={{
          elements: initial.elements,
          files: initial.files,
          appState: {
            viewBackgroundColor: "#fcfbfe",
            gridSize: 20,
            gridModeEnabled: true,
          },
          scrollToContent: !focusAnchor,
        }}
        excalidrawAPI={setEx}
        langCode="es-ES"
        viewModeEnabled={data.me.client}
        isCollaborating={!data.me.client}
        onPointerUpdate={(p) => {
          pointer.current = p.pointer;
        }}
        onChange={(elements, state, files) => {
          selection.current(
            Object.keys(state.selectedElementIds || {})[0] || null,
          );
          if (!loaded.current) {
            const ids = new Set(elements.map((e) => e.id));
            if (initial.elements.some((e: any) => !ids.has(e.id))) return;
            loaded.current = true;
            setReady(true);
            lastSignature.current = signature(elements, files);
            if (initial.dirty) {
              pending.current = { elements, files };
              status.current("Cambios pendientes");
            }
            return;
          }
          if (remote.current || data.me.client) return;
          const sig = signature(elements, files);
          if (sig === lastSignature.current) return;
          lastSignature.current = sig;
          const snapshot = { elements, files };
          pending.current = snapshot;
          status.current("Cambios pendientes");
          try {
            localStorage.setItem(backup, JSON.stringify(snapshot));
          } catch {
            status.current("Guardando… mantén abierta esta hoja");
          }
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: { saveFileToDisk: true },
            changeViewBackgroundColor: true,
          },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
      </Excalidraw>
      <button className="st-fit-canvas" onClick={() => ex?.scrollToContent(undefined, { fitToViewport: true, viewportZoomFactor: 0.86, maxZoom: 1 })}>Ver todo el lienzo</button>
      <div className="st-canvas-tip">
        Espacio + arrastrar para moverte · rueda + Ctrl para zoom · doble clic
        para escribir
      </div>
    </div>
    </div>
  );
}
function signature(elements: readonly any[], files: any) {
  return (
    elements.map((e) => `${e.id}:${e.version}:${e.versionNonce}`).join("|") +
    "#" +
    Object.keys(files || {})
      .sort()
      .join(",")
  );
}

function templateElements(
  sheetId: string,
  input: Parameters<typeof convertToExcalidrawElements>[0],
) {
  const generated = convertToExcalidrawElements(input);
  const ids = new Map(
    generated.map((e, i) => [e.id, `${sheetId}-template-${i}`]),
  );
  return generated.map((e: any) => ({
    ...e,
    id: ids.get(e.id),
    containerId: e.containerId ? ids.get(e.containerId) : e.containerId,
    boundElements: e.boundElements?.map((b: any) => ({
      ...b,
      id: ids.get(b.id) || b.id,
    })),
  }));
}
