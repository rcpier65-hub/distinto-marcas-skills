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
}: {
  sheet: any;
  data: any;
  clientId: string;
  follow: string;
  onStatus: (s: string) => void;
  onSelection: (id: string | null) => void;
}) {
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
  return (
    <div className="st-canvas">
      <Excalidraw
        initialData={{
          elements: initial.elements,
          files: initial.files,
          appState: {
            viewBackgroundColor: "#fcfbfe",
            gridSize: 20,
            gridModeEnabled: true,
          },
          scrollToContent: true,
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
      <div className="st-canvas-tip">
        Espacio + arrastrar para moverte · rueda + Ctrl para zoom · doble clic
        para escribir
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
