/* Videos publicados en distintostudio.com y /servicios/social-media.
   Catálogo cotejado el 17-nov-2026; conservar los IDs originales de cada marca. */
const SITIO = "https://distintostudio.com";
// La portada de estos videos de Inicio la entrega TikTok; no existe un JPG local.
const SIN_PORTADA_LOCAL = new Set(["7572007722388901127", "7657714104076979476", "7515225188095626552", "7599808393359920405", "7416122613677804806", "7592728730338938119", "7618057901290065160", "7542665519757872392", "7521911696521235768", "7496687343806582071", "7627364519982976277", "7651787838555671829"]);
export const portada = (id: string) => SIN_PORTADA_LOCAL.has(id) ? undefined : `${SITIO}/images/social-covers/${id}.jpg`;
export const reproductorTikTok = (id: string, silenciado = true) => `https://www.tiktok.com/player/v1/${id}?autoplay=1&muted=${silenciado ? 1 : 0}&loop=1&controls=1&description=0&music_info=0&force_muted=${silenciado ? 1 : 0}`;
export const enlaceTikTok = (id: string) => `https://www.tiktok.com/@/video/${id}`;

export type MarcaPortafolio = { slug: string | null; nombre: string; rubro: string; videos: string[] };

export const MARCAS_PORTAFOLIO: MarcaPortafolio[] = [
  { slug: null, nombre: "Universitario", rubro: "Club de fútbol", videos: ["7659948361973337362"] },
  { slug: "la-victoria", nombre: "La Victoria", rubro: "Maderera", videos: ["7681874873286839573", "7681115523433762068", "7679623143446613268", "7678864718798392597", "7599808393359920405"] },
  { slug: "novalamps", nombre: "Novalamps", rubro: "Iluminación", videos: ["7679647178540797205", "7678140537483857172", "7677430270701604117", "7676665967795031317", "7657714104076979476"] },
  { slug: "mil-ideas", nombre: "Mil Ideas", rubro: "Decoración y regalos", videos: ["7684855092570230036", "7684086115631975700", "7683359887673298196", "7682614486959885589", "7681492204468096277", "7680769858681752852"] },
  { slug: "distribuidora-fitness", nombre: "Distribuidora Fitness", rubro: "Suplementos", videos: ["7684844663345286420", "7683352171420601621", "7682610785251527957", "7681489350323899668", "7416122613677804806"] },
  { slug: "little-joe", nombre: "Typhouse", rubro: "Accesorios para auto", videos: ["7684864916464946452", "7684084229675683093", "7683355161489640724", "7682619920600845589", "7515225188095626552"] },
  { slug: "lozano", nombre: "Muebles Lozano", rubro: "Muebles", videos: ["7684847099925564693", "7684076534197456149", "7683337612467408148", "7682597756162067732", "7572007722388901127"] },
  { slug: "manrique", nombre: "Manrique Abanza", rubro: "Psicología", videos: ["7683355455833312532", "7682646959672315157", "7681867148578393364", "7679624709423533332", "7592728730338938119"] },
  { slug: "kintu", nombre: "Kintu Oils", rubro: "Aromaterapia", videos: ["7684858844366802197", "7683353802577087765", "7682618281546632468", "7681867563768335636", "7627364519982976277"] },
  { slug: "vid-natur", nombre: "Vid Natur", rubro: "Productos naturales", videos: ["7684857403111656725", "7684087423147560212", "7683357118807788820", "7682616536179150100", "7651787838555671829"] },
  { slug: null, nombre: "Distinto Studio", rubro: "Agencia creativa", videos: ["7618057901290065160", "7542665519757872392"] },
  { slug: null, nombre: "JDH Outdoor", rubro: "Outdoor", videos: ["7521911696521235768"] },
  { slug: null, nombre: "Oral Beauty", rubro: "Odontología", videos: ["7496687343806582071"] },
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
