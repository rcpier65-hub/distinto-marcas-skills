/* Portafolio de Social Media (Pedro 21-oct-2026): los mismos videos que
   publica distintostudio.com/servicios/social-media, agrupados por marca y
   conectados con su slug del sistema para mostrar cómo se trabajó cada una. */
const SITIO = "https://distintostudio.com";
export const portada = (id: string) => `${SITIO}/images/social-covers/${id}.jpg`;
export const reproductorTikTok = (id: string) => `https://www.tiktok.com/player/v1/${id}?autoplay=1&muted=0&loop=1&controls=1&description=0&music_info=0`;

export type MarcaPortafolio = { slug: string | null; nombre: string; rubro: string; videos: string[] };

export const MARCAS_PORTAFOLIO: MarcaPortafolio[] = [
  { slug: "la-victoria", nombre: "La Victoria", rubro: "Maderera", videos: ["7681874873286839573", "7681115523433762068", "7679623143446613268", "7678864718798392597"] },
  { slug: "novalamps", nombre: "Novalamps", rubro: "Iluminación", videos: ["7679647178540797205", "7678140537483857172", "7677430270701604117", "7676665967795031317"] },
  { slug: "mil-ideas", nombre: "Mil Ideas", rubro: "Decoración y regalos", videos: ["7684855092570230036", "7684086115631975700", "7683359887673298196", "7682614486959885589", "7681492204468096277", "7680769858681752852"] },
  { slug: "distribuidora-fitness", nombre: "Distribuidora Fitness", rubro: "Suplementos", videos: ["7684844663345286420", "7683352171420601621", "7682610785251527957", "7681489350323899668"] },
  { slug: "little-joe", nombre: "Typhouse", rubro: "Accesorios para auto", videos: ["7684864916464946452", "7684084229675683093", "7683355161489640724", "7682619920600845589"] },
  { slug: "lozano", nombre: "Muebles Lozano", rubro: "Muebles", videos: ["7684847099925564693", "7684076534197456149", "7683337612467408148", "7682597756162067732"] },
  { slug: "manrique", nombre: "Manrique Abanza", rubro: "Psicología", videos: ["7683355455833312532", "7682646959672315157", "7681867148578393364", "7679624709423533332"] },
  { slug: "kintu", nombre: "Kintu Oils", rubro: "Aromaterapia", videos: ["7684858844366802197", "7683353802577087765", "7682618281546632468", "7681867563768335636"] },
  { slug: "vid-natur", nombre: "Vid Natur", rubro: "Productos naturales", videos: ["7684857403111656725", "7684087423147560212", "7683357118807788820", "7682616536179150100"] },
];

/* Producciones de ficción hechas por Distinto (video propio, no TikTok). */
export const PRODUCCIONES = [
  { titulo: "Seis de la tarde", n: 1 }, { titulo: "Se duerme en 2 min", n: 2 }, { titulo: "El rojo es mío", n: 3 },
  { titulo: "Tenía razón", n: 4 }, { titulo: "Culpa del café", n: 5 }, { titulo: "Cuenta regresiva", n: 6 }, { titulo: "No lo devolví", n: 7 },
].map((p) => ({ ...p, video: `${SITIO}/videos/portfolio/shoot-${p.n}.mp4`, portada: `${SITIO}/images/social-covers/shoot-${p.n}.jpg` }));

export const MEDIOS = {
  grabacion: { video: `${SITIO}/videos/production-loop.mp4`, poster: `${SITIO}/images/production-poster.jpg`, foto: `${SITIO}/images/ai/social-shoot-v2.jpg` },
  estrategia: { video: `${SITIO}/videos/strategy-loop.mp4`, poster: `${SITIO}/images/strategy-poster.jpg` },
  diseno: `${SITIO}/images/ai/design-illustrator-mac-v1.jpg`,
  sistema: `${SITIO}/images/ai/system-laptop-v1.jpg`,
  flujo: `${SITIO}/images/ai/system-workflow-v1.jpg`,
};
