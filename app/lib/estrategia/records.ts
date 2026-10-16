/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { randomUUID } from "node:crypto";
import {
  type Actor,
  brandAccess,
  recordAccess,
  mayManage,
  StrategyError,
} from "./access";
import { strategyDB, transaction } from "./db";
import {
  recordInput,
  recordDataSchema,
  safeURL,
  uid,
  sheetStates,
  campaignStates,
  type StrategyRecord,
} from "./model";
import { loadBrand } from "./load";

export async function saveRecord(a: Actor, slug: string, raw: unknown) {
  const brand = await brandAccess(a, slug),
    input = recordInput.parse(raw);
  input.data = recordDataSchema.parse(input.data);
  if (
    input.data.start &&
    input.data.end &&
    String(input.data.start) > String(input.data.end)
  )
    throw new StrategyError("El fin del periodo debe ser posterior al inicio");
  if (input.kind === "sheet" && !sheetStates.includes(input.data.state as any))
    throw new StrategyError("Estado de hoja inválido");
  if (
    input.kind === "campaign" &&
    !campaignStates.includes(input.data.state as any)
  )
    throw new StrategyError("Estado de campaña inválido");
  if (
    input.kind === "settings" &&
    input.data.confirmed &&
    !input.data.scopeSource
  )
    throw new StrategyError("Indica la referencia del alcance confirmado");
  if (
    input.kind === "approval" &&
    input.data.state === "Aprobada" &&
    !input.data.evidence
  )
    throw new StrategyError("Registra la evidencia de aprobación");
  if (input.data.budgetApproved && !input.data.budgetEvidence)
    throw new StrategyError(
      "Registra la referencia de aprobación del presupuesto",
    );
  if (input.data.metricURL && !safeURL(input.data.metricURL))
    throw new StrategyError("El enlace de resultados debe ser https://");
  if (
    ["messages", "appointments", "attended", "conversions"].some(
      (k) => typeof input.data[k] === "number",
    ) &&
    !input.data.metricSource
  )
    throw new StrategyError("Indica la fuente de los resultados");
  if (JSON.stringify(input.data).length > 80000)
    throw new StrategyError("El texto es demasiado largo");
  if (input.kind === "settings" && !a.manager)
    throw new StrategyError(
      "Solo dirección puede confirmar el alcance de la marca",
      403,
    );
  const campaignId = input.data.campaignId;
  if (campaignId) {
    const c = await recordAccess(a, String(campaignId), "campaign");
    if (c.marca_id !== brand.id)
      throw new StrategyError("La campaña debe pertenecer a esta marca");
  }
  if (input.data.ownerId) {
    const { data: owner } = await a.service
      .from("team_members")
      .select("activo,marcas_acceso")
      .eq("id", uid.parse(input.data.ownerId))
      .maybeSingle();
    if (
      !owner?.activo ||
      (owner.marcas_acceso && !owner.marcas_acceso.includes(brand.id))
    )
      throw new StrategyError("El responsable no tiene acceso a esta marca");
  }
  if (
    input.kind === "opportunity" &&
    input.data.url &&
    !safeURL(input.data.url)
  )
    throw new StrategyError("Usa una fuente con enlace https://");
  if (
    input.kind === "campaign" &&
    ["Lista", "Activa"].includes(String(input.data.state))
  ) {
    const pending = await strategyDB().query(
      "SELECT 1 FROM strategy_records WHERE marca_id=$1 AND kind='approval' AND data->>'campaignId'=$2 AND data->>'state' <> 'Aprobada' AND data->>'critical' IS DISTINCT FROM 'false' AND NOT archived LIMIT 1",
      [brand.id, input.id],
    );
    if (
      pending.rowCount ||
      (input.data.paid === true && input.data.budgetApproved !== true)
    )
      throw new StrategyError(
        "Resuelve las aprobaciones y el presupuesto pendiente antes de activar la campaña",
      );
  }
  return transaction(async (c) => {
    const old = (
      await c.query("SELECT * FROM strategy_records WHERE id=$1 FOR UPDATE", [
        input.id,
      ])
    ).rows[0] as StrategyRecord | undefined;
    if (old) {
      if (old.marca_id !== brand.id || old.kind !== input.kind)
        throw new StrategyError("Registro no encontrado", 404);
      if (old.revision !== input.revision)
        throw new StrategyError(
          "Otra persona actualizó este registro. Recarga para revisar sus cambios antes de guardar.",
          409,
        );
      if (
        old.archived !== input.archived ||
        old.data.sharedWithClient !== input.data.sharedWithClient ||
        old.data.ownerId !== input.data.ownerId ||
        input.kind === "settings"
      )
        mayManage(a, old);
      if (
        old.kind === "campaign" &&
        (old.data.budgetApproved !== input.data.budgetApproved ||
          ["Lista", "Activa"].includes(String(input.data.state)))
      )
        mayManage(a, old);
      if (old.kind === "sheet" && old.archived && !!input.archived)
        throw new StrategyError("La hoja está archivada", 409);
      await c.query(
        "INSERT INTO strategy_history(record_id,actor_id,label,snapshot) VALUES($1,$2,$3,$4)",
        [old.id, a.user.id, "Datos anteriores", JSON.stringify(old)],
      );
      return (
        await c.query(
          "UPDATE strategy_records SET title=$2,data=$3,archived=$4,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",
          [input.id, input.title, JSON.stringify(input.data), input.archived],
        )
      ).rows[0];
    }
    if (input.revision !== 0)
      throw new StrategyError("Registro no encontrado", 404);
    const data = {
      ...input.data,
      ...(input.kind === "sheet"
        ? { sharedWithClient: input.data.sharedWithClient === true }
        : {}),
      ownerId: input.data.ownerId || a.member.id,
    };
    const r = (
      await c.query(
        "INSERT INTO strategy_records(id,marca_id,kind,title,data,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [
          input.id,
          brand.id,
          input.kind,
          input.title,
          JSON.stringify(data),
          a.member.id,
        ],
      )
    ).rows[0];
    if (input.kind === "sheet")
      await c.query("INSERT INTO strategy_scenes(sheet_id) VALUES($1)", [
        input.id,
      ]);
    return r;
  });
}
export async function duplicateSheet(a: Actor, id: string) {
  const r = await recordAccess(a, id, "sheet"),
    newId = randomUUID();
  return transaction(async (c) => {
    const copy = (
      await c.query(
        "INSERT INTO strategy_records(id,marca_id,kind,title,data,created_by) VALUES($1,$2,'sheet',$3,$4,$5) RETURNING *",
        [
          newId,
          r.marca_id,
          `${r.title} · copia`,
          JSON.stringify({
            ...r.data,
            ownerId: a.member.id,
            state: "Borrador",
            sharedWithClient: false,
            meetingDate: "",
          }),
          a.member.id,
        ],
      )
    ).rows[0];
    await c.query(
      "INSERT INTO strategy_scenes(sheet_id,elements,files) SELECT $1,elements,files FROM strategy_scenes WHERE sheet_id=$2",
      [newId, id],
    );
    return copy;
  });
}
export async function linkWork(a: Actor, slug: string, input: any) {
  const b = await loadBrand(a, slug),
    target = b.activities.find(
      (x) => x.source === input.targetType && x.sourceId === input.targetId,
    );
  if (!target)
    throw new StrategyError(
      "El trabajo no pertenece a esta marca o no tienes acceso",
      403,
    );
  if (target.source === "calendar")
    throw new StrategyError("Este evento se consulta desde el calendario. Vincula un registro interno para asociarlo a una campaña.");
  if (!input.campaignId && !input.sheetId)
    throw new StrategyError("Elige una campaña o una hoja");
  for (const [id, kind] of [
    [input.campaignId, "campaign"],
    [input.sheetId, "sheet"],
  ])
    if (id) {
      const r = await recordAccess(a, id, kind, true);
      if (r.marca_id !== b.brand.id)
        throw new StrategyError("No se pueden mezclar marcas");
    }
  await strategyDB().query(
    "INSERT INTO strategy_links(id,marca_id,campaign_id,sheet_id,target_type,target_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
    [
      randomUUID(),
      b.brand.id,
      input.campaignId || null,
      input.sheetId || null,
      target.source,
      target.sourceId,
    ],
  );
  return { ok: true };
}
