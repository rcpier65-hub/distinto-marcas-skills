import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const source = await fs.readFile(new URL('../lib/publicaciones/visibility.ts', import.meta.url), 'utf8');
const { isPublishableContent } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));

for (const estado of ['disenar', 'disenando', 'aprobar', 'programar', 'publicado']) {
  for (const es_tarea_diseno of [true, false]) {
    assert.equal(isPublishableContent({estado, es_tarea_diseno, tipo_contenido:['INTERNO'], fecha_publicacion:'2026-11-02'}), false);
    assert.equal(isPublishableContent({estado, es_tarea_diseno, tipo_contenido:['POST', 'INTERNO']}), false);
  }
}
for (const tipo of ['POST', 'CARRUSEL', 'HISTORIA', 'REEL', 'VIDEO', ' historia ']) {
  assert.equal(isPublishableContent({es_tarea_diseno:true, tipo_contenido:[tipo]}), true);
}
assert.equal(isPublishableContent({es_tarea_diseno:true, tipo_contenido:[]}), false);
assert.equal(isPublishableContent({es_tarea_diseno:true, tipo_contenido:null}), false);
assert.equal(isPublishableContent({es_tarea_diseno:false, tipo_contenido:[]}), true);
assert.equal(isPublishableContent({es_tarea_diseno:null, tipo_contenido:null}), true);
console.log('PASS internos excluidos en cualquier estado/fecha; diseños publicables y videos conservados; tareas antiguas sin tipo excluidas');
