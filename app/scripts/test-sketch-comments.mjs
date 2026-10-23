import assert from 'node:assert/strict';
import { imageToCanvas, canvasToImage, imageToScreen, dragZone, noteMatchesImage } from '../lib/creative-review/sketch-geometry.ts';
const base={id:'image',x:1500,y:450,width:420,height:840,angle:0,scale:[1,1],customData:{deliveryVersionId:'v1',page:2,seconds:null}};
for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/4]) for(const scale of [[1,1],[-1,1],[1,-1],[-1,-1]]) for(const point of [{x:0,y:0},{x:.3,y:.2},{x:1,y:1}]) {
 const image={...base,angle,scale}, canvas=imageToCanvas(image,point), back=canvasToImage(image,canvas);
 assert(Math.abs(back.x-point.x)<1e-10); assert(Math.abs(back.y-point.y)<1e-10);
 for(const zoom of [.25,.5,1,2]) { const viewport={scrollX:-1200,scrollY:60,zoom};const screen=imageToScreen(image,point,viewport);const restored=canvasToImage(image,{x:screen.x/zoom-viewport.scrollX,y:screen.y/zoom-viewport.scrollY});assert(Math.abs(restored.x-point.x)<1e-10);assert(Math.abs(restored.y-point.y)<1e-10); }
}
assert.deepEqual(dragZone({x:.8,y:.7},{x:.2,y:.1}),{x:.2,y:.1,width:.6000000000000001,height:.6});
assert.deepEqual(canvasToImage(base,{x:-10000,y:10000}),{x:0,y:1});
const note={version_id:'v1',page:2,seconds:null};
assert(noteMatchesImage(note,base));
assert(!noteMatchesImage({...note,version_id:'v2'},base));
assert(!noteMatchesImage({...note,page:1},base));
assert(!noteMatchesImage({...note,seconds:5},base));
const frame={...base,customData:{deliveryVersionId:'v1',page:1,seconds:5}};
assert(noteMatchesImage({...note,page:1,seconds:5.01},frame));
assert(!noteMatchesImage({...note,page:1,seconds:6},frame));
console.log('PASS: zonas en ambas direcciones, zoom, desplazamiento, rotación, imagen volteada, límites y aislamiento por versión/página/fotograma.');
