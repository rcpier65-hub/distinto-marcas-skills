import type { ReviewNote } from './model';

export type SketchImage = {
  id: string; x: number; y: number; width: number; height: number;
  angle: number; scale?: readonly number[];
  customData?: { deliveryVersionId?: string; deliveryLabel?: string; page?: number; seconds?: number | null };
};
export type SketchViewport = { scrollX: number; scrollY: number; zoom: number };
export type Point = { x: number; y: number };
export type Zone = { x: number; y: number; width: number | null; height: number | null };
const clamp = (v: number) => Math.min(1, Math.max(0, v));

// Coordinates stay relative to the original image, independent of canvas zoom/pan.
export function imageToCanvas(image: SketchImage, point: Point): Point {
  const x = (point.x - .5) * image.width * (image.scale?.[0] || 1);
  const y = (point.y - .5) * image.height * (image.scale?.[1] || 1);
  return { x: image.x + image.width / 2 + x * Math.cos(image.angle) - y * Math.sin(image.angle), y: image.y + image.height / 2 + x * Math.sin(image.angle) + y * Math.cos(image.angle) };
}
export function canvasToImage(image: SketchImage, point: Point): Point {
  const x = point.x - image.x - image.width / 2, y = point.y - image.y - image.height / 2;
  return { x: clamp(.5 + (x * Math.cos(image.angle) + y * Math.sin(image.angle)) / image.width * (image.scale?.[0] || 1)), y: clamp(.5 + (-x * Math.sin(image.angle) + y * Math.cos(image.angle)) / image.height * (image.scale?.[1] || 1)) };
}
export function imageToScreen(image: SketchImage, point: Point, view: SketchViewport): Point {
  const p = imageToCanvas(image, point);
  return { x: (p.x + view.scrollX) * view.zoom, y: (p.y + view.scrollY) * view.zoom };
}
export function dragZone(a: Point, b: Point): Zone {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}
export function noteMatchesImage(note: ReviewNote, image: SketchImage) {
  const d = image.customData;
  return note.version_id === d?.deliveryVersionId && note.page === (d.page || 1) && (d.seconds == null ? note.seconds == null : note.seconds != null && Math.abs(d.seconds - note.seconds) < .05);
}
export function zonePolygon(image: SketchImage, zone: Zone, view: SketchViewport) {
  return [{ x: zone.x, y: zone.y }, { x: zone.x + (zone.width || 0), y: zone.y }, { x: zone.x + (zone.width || 0), y: zone.y + (zone.height || 0) }, { x: zone.x, y: zone.y + (zone.height || 0) }].map(p => { const s = imageToScreen(image, p, view); return `${s.x},${s.y}`; }).join(' ');
}
