import type { Post, PostReport } from "./model";

/* Mejores publicaciones del mes para el PDF: las más vistas de cada red (hasta 3
   por red) completadas con las más vistas en general, sin repetir. Máximo 6,
   ordenadas por visualizaciones; la primera es la más vista del mes. */
export function mejoresPublicaciones(posts: PostReport | null | undefined, max = 6): Post[] {
  if (!posts) return [];
  const vistas = (p: Post) => p.views ?? -1;
  const elegidas: Post[] = [];
  const add = (p?: Post) => { if (p && elegidas.length < max && !elegidas.some((x) => x.id === p.id)) elegidas.push(p); };
  for (const g of posts.groups) [...g.posts].sort((a, b) => vistas(b) - vistas(a)).slice(0, Math.ceil(max / Math.max(1, posts.groups.length))).forEach(add);
  [...posts.groups.flatMap((g) => g.posts)].sort((a, b) => vistas(b) - vistas(a)).forEach(add);
  return elegidas.sort((a, b) => vistas(b) - vistas(a));
}
