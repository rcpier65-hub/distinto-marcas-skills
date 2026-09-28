import test from "node:test";
import assert from "node:assert/strict";
import { newScript, type Batch } from "./model";
import { changeScriptLifecycle } from "./script-lifecycle";

function fixture(): Batch {
  return {
    id: crypto.randomUUID(),
    marca_id: crypto.randomUUID(),
    name: "Prueba",
    recording_id: null,
    revision: 1,
    updated_at: new Date().toISOString(),
    data: {
      objective: "Consultas",
      platform: "Instagram",
      ads: 2,
      organic: 1,
      scripts: [
        newScript("ads"),
        {
          ...newScript("ads"),
          title: "Conservar",
          research: "Hallazgos revisados",
          researchReviewed: true,
        },
        newScript("organico"),
      ],
    },
  };
}

test("Eliminar libera cupo, conserva contenido y recuperar mantiene ID y orden", () => {
  const before = fixture();
  const original = structuredClone(before);
  const target = before.data.scripts[1];
  const changes = changeScriptLifecycle(
    before,
    target.id,
    "delete-script",
    "2026-09-28T12:00:00.000Z",
  );
  assert.equal(changes.data.scripts.length, 2);
  assert.equal(changes.data.scripts.filter((s) => s.type === "ads").length, 1);
  assert.deepEqual(changes.deleted_scripts[0].script, target);
  assert.deepEqual(before, original);
  // Reopen from persisted JSON before restoring.
  const reopened = JSON.parse(JSON.stringify({ ...before, ...changes }));
  const restored = changeScriptLifecycle(reopened, target.id, "restore-script");
  assert.deepEqual(restored.data, before.data);
  assert.deepEqual(restored.deleted_scripts, []);
});

test("Recuperar no sobrepasa cupos ni desplaza guiones nuevos", () => {
  const before = fixture();
  const target = before.data.scripts[1];
  const deleted = {
    ...before,
    ...changeScriptLifecycle(before, target.id, "delete-script"),
  };
  deleted.data.scripts.push(newScript("ads"));
  const snapshot = structuredClone(deleted);
  assert.throws(
    () => changeScriptLifecycle(deleted, target.id, "restore-script"),
    /No hay cupo/,
  );
  assert.deepEqual(deleted, snapshot);
  deleted.data.ads = 3;
  assert.equal(
    changeScriptLifecycle(deleted, target.id, "restore-script").data.scripts
      .length,
    4,
  );
});

test("Rechaza IDs ajenos o repetidos y mantiene otros guiones eliminados", () => {
  const before = fixture();
  assert.throws(
    () => changeScriptLifecycle(before, crypto.randomUUID(), "delete-script"),
    /ya no está/,
  );
  const first = before.data.scripts[0].id;
  const second = before.data.scripts[1].id;
  const deleted = {
    ...before,
    ...changeScriptLifecycle(before, first, "delete-script"),
  };
  assert.throws(
    () => changeScriptLifecycle(deleted, first, "delete-script"),
    /ya no está/,
  );
  const two = {
    ...deleted,
    ...changeScriptLifecycle(deleted, second, "delete-script"),
  };
  const restored = changeScriptLifecycle(two, first, "restore-script");
  assert.equal(restored.deleted_scripts.length, 1);
  assert.equal(restored.deleted_scripts[0].script.id, second);
  assert.throws(
    () =>
      changeScriptLifecycle({ ...two, ...restored }, first, "restore-script"),
    /ya no está/,
  );
});
