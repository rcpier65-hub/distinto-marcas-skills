import assert from 'node:assert/strict'
import { idPortadaDrive, nombrePortada, tipoPortada } from '../lib/cliente/portada'
const id='1zzSA2B5qBJd5pjjeEOiXTLJFnBPy4HpO'
for (const url of [`https://drive.google.com/open?id=${id}&usp=drive_fs`,`https://drive.google.com/file/d/${id}/view?usp=sharing`,`https://docs.google.com/uc?export=download&id=${id}`]) assert.equal(idPortadaDrive(url),id)
for(const url of [null,'','https://evil.example/?id='+id,'https://drive.google.com.evil.example/file/d/'+id,'https://drive.google.com@evil.example/file/d/'+id,'http://drive.google.com/open?id='+id,'https://drive.google.com/open?id=..%2Fprivate']) assert.equal(idPortadaDrive(url),null)
assert.deepEqual(tipoPortada(Uint8Array.from([137,80,78,71,13,10,26,10])),{mime:'image/png',extension:'png'})
assert.equal(tipoPortada(Uint8Array.from([255,216,255]))?.extension,'jpg')
assert.equal(tipoPortada(Buffer.from('GIF89a'))?.extension,'gif')
assert.equal(tipoPortada(Buffer.from('RIFF0000WEBP'))?.extension,'webp')
assert.equal(tipoPortada(Buffer.from('0000ftypavif'))?.extension,'avif')
for(const text of ['<!DOCTYPE html><html>Iniciar sesión</html>','{"error":"forbidden"}','<svg onload="alert(1)">','']) assert.equal(tipoPortada(Buffer.from(text)),null)
assert.equal(nombrePortada('7. MÁRMOL O CRISTAL','png'),'portada-7-MARMOL-O-CRISTAL.png')
assert.equal(nombrePortada('\r\n"<>/','jpg'),'portada-publicacion.jpg')
console.log('PASS: enlaces Drive válidos, rechazo de hosts ajenos/HTML, formato de imagen y nombre seguro.')
