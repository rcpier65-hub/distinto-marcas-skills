import { batchDataSchema, type Batch, type DeletedScript } from "./model";

// Both fields are committed together using the batch revision as a compare-and-swap.
export function changeScriptLifecycle(
  batch: Batch,
  scriptId: string,
  action: "delete-script" | "restore-script",
  now = new Date().toISOString(),
): { data: Batch["data"]; deleted_scripts: DeletedScript[] } {
  const deleted = batch.deleted_scripts ?? [];
  if (action === "delete-script") {
    const position = batch.data.scripts.findIndex((s) => s.id === scriptId);
    if (position === -1)
      throw new Error(
        "El guion ya no está en esta tanda. Recarga para ver los cambios.",
      );
    const script = batch.data.scripts[position];
    return {
      data: batchDataSchema.parse({
        ...batch.data,
        scripts: batch.data.scripts.filter((s) => s.id !== scriptId),
      }),
      deleted_scripts: [
        ...deleted.filter((item) => item.script.id !== scriptId),
        { script, deletedAt: now, position },
      ],
    };
  }
  const entry = deleted.find((item) => item.script.id === scriptId);
  if (!entry)
    throw new Error(
      "El guion ya no está en Eliminados. Recarga para ver los cambios.",
    );
  const quota =
    entry.script.type === "ads" ? batch.data.ads : batch.data.organic;
  if (
    batch.data.scripts.filter((s) => s.type === entry.script.type).length >=
    quota
  )
    throw new Error(
      `No hay cupo para otro guion ${entry.script.type === "ads" ? "Ads" : "orgánico"}. Aumenta la cantidad en la configuración de la tanda o elimina otro guion.`,
    );
  const scripts = [...batch.data.scripts];
  scripts.splice(Math.min(entry.position, scripts.length), 0, entry.script);
  return {
    data: batchDataSchema.parse({ ...batch.data, scripts }),
    deleted_scripts: deleted.filter((item) => item.script.id !== scriptId),
  };
}
