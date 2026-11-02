import type { Account, Charge } from "./model";

export type QuickDraft = {
  kind: "income" | "expense";
  amount: number | null;
  currency: "PEN" | "USD";
  date: string;
  title: string;
  scope: "agency" | "personal";
  owner: "agency" | "pedro" | "nayeli" | null;
  accountIds: string[];
  chargeIds: string[];
  problems: string[];
  source: string;
};
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bvcp\b/g, "bcp")
    .replace(/\bb\s+c\s+p\b/g, "bcp")
    .replace(/\bb\s+b\s+v\s+a\b/g, "bbva")
    .replace(/\bpier\b/g, "pieer")
    .replace(/\btyp\s+house\b/g, "typhouse");
const numberWords: Record<string, number> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiun: 21,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
  doscientos: 200,
  trescientos: 300,
  cuatrocientos: 400,
  quinientos: 500,
  seiscientos: 600,
  setecientos: 700,
  ochocientos: 800,
  novecientos: 900,
};
function spokenNumber(s: string): number | null {
  let total = 0,
    group = 0;
  const parts = s.trim().split(/\s+/);
  if (!parts.length) return null;
  for (const word of parts) {
    if (word === "y") continue;
    if (word === "mil") {
      total += (group || 1) * 1000;
      group = 0;
    } else if (numberWords[word] !== undefined) group += numberWords[word];
    else return null;
  }
  return total + group;
}
// A comma or dot followed by three digits is a thousands separator, never cents.
export function parseMoney(s: string): number | null {
  s = normalize(s).trim();
  const fraction = s.match(/^(.+)\s+(?:con|coma|punto)\s+(.+)$/);
  if (fraction) {
    const whole = /^\d+$/.test(fraction[1])
      ? Number(fraction[1])
      : spokenNumber(fraction[1]);
    const decimal = fraction[2].replace(/\s+centimos?$/, "");
    const cents = /^\d+$/.test(decimal)
      ? Number(decimal)
      : spokenNumber(decimal);
    if (whole === null || cents === null || cents > 99) return null;
    const result = whole * 100 + cents;
    return result > 0 && result <= 100000000 ? result : null;
  }
  if (/^\d/.test(s)) {
    if (!/^\d{1,7}(?:[.,]\d{3})*(?:[.,]\d{1,2})?$/.test(s)) return null;
    const tail = s.match(/[.,](\d{1,2})$/);
    const whole = tail ? s.slice(0, -tail[0].length) : s;
    const cents =
      Number(whole.replace(/[.,]/g, "")) * 100 +
      (tail ? Number(tail[1].padEnd(2, "0")) : 0);
    return cents > 0 && cents <= 100000000 ? cents : null;
  }
  const [whole, decimal, ...extra] = s.split(/\s+(?:con|coma|punto)\s+/);
  if (extra.length) return null;
  const n = spokenNumber(whole),
    d = decimal ? spokenNumber(decimal.replace(/\s+centimos?$/, "")) : 0;
  if (n === null || d === null || d > 99) return null;
  const cents = n * 100 + d;
  return cents > 0 && cents <= 100000000 ? cents : null;
}
const wordAlternation = Object.keys(numberWords)
  .concat("mil", "y", "con", "coma", "punto")
  .join("|");
const numeric = `(?:\\d+(?:[.,]\\d+)*|(?:${wordAlternation})(?:\\s+(?:${wordAlternation}))*)`;
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
function offsetDate(day: string, delta: number) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
const validDate = (s: string) =>
  /^20\d{2}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s)) &&
  new Date(s).toISOString().slice(0, 10) === s;
function has(s: string, word: string) {
  return new RegExp("\\b" + word + "\\b").test(s);
}
export function prepareQuickEntry(
  text: string,
  context: {
    today: string;
    scope: "agency" | "personal";
    currency: "PEN" | "USD";
    accounts: Account[];
    charges: Charge[];
  },
): QuickDraft {
  let s = normalize(text).replace(/s\/\s*\./g, "s/");
  const d: QuickDraft = {
    kind: /\b(recibi|recibimos|cobre|cobro|ingreso|ingresaron|me pago|nos pago|me pagaron|nos pagaron|depositaron)\b/.test(
      s,
    )
      ? "income"
      : "expense",
    amount: null,
    currency: context.currency,
    date: context.today,
    title: "",
    scope: context.scope,
    owner: context.scope === "agency" ? "agency" : null,
    accountIds: [],
    chargeIds: [],
    problems: [],
    source: text.trim().slice(0, 2000),
  };
  if (text.trim().length < 3 || text.length > 2000)
    d.problems.push("Escribe una frase de hasta 2,000 caracteres.");
  if (
    /\b(transferi|transferencia|transfiere|traspasa|retiro|retire|anula|elimina|borra|reembolso)\b/.test(
      s,
    )
  )
    d.problems.push(
      "Para transferencias, retiros o anulaciones usa su opción en Cuentas o Movimientos.",
    );
  if (
    /\b(no pague|no he pagado|no gaste|no he gastado|no recibi|no he recibido|no cobre|no he cobrado|debo|pendiente|por pagar|por cobrar|pagare|voy a pagar|me pagaran|recuerda)\b/.test(
      s,
    )
  )
    d.problems.push(
      "El registro rápido es para dinero que ya entró o salió. Registra pendientes desde Cobros o Gastos y equipo.",
    );
  if (/\b(igv|retencion|detraccion|descuento)\b/.test(s))
    d.problems.push(
      "Revisa los impuestos o descuentos en el formulario completo del pago.",
    );
  if (/\b(manana|pasado manana|proximo)\b/.test(s))
    d.problems.push("Solo puedes registrar pagos ya realizados.");
  if (/(?:^|\s)-\s*\d/.test(s))
    d.problems.push("El importe debe ser positivo.");
  const dates: string[] = [];
  s = s.replace(/\b(20\d{2})-(\d{2})-(\d{2})\b/g, (_, y, m, day) => {
    dates.push(`${y}-${m}-${day}`);
    return " ";
  });
  s = s.replace(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/g, (_, day, m, y) => {
    dates.push(
      `${y || context.today.slice(0, 4)}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`,
    );
    return " ";
  });
  s = s.replace(
    new RegExp(
      `\\b(\\d{1,2}) de (${months.join("|")})(?: de (20\\d{2}))?\\b`,
      "g",
    ),
    (_, day, m, y) => {
      dates.push(
        `${y || context.today.slice(0, 4)}-${String(months.indexOf(m) + 1).padStart(2, "0")}-${day.padStart(2, "0")}`,
      );
      return " ";
    },
  );
  if (has(s, "anteayer")) dates.push(offsetDate(context.today, -2));
  else if (has(s, "ayer")) dates.push(offsetDate(context.today, -1));
  else if (has(s, "hoy")) dates.push(context.today);
  s = s.replace(/\b(hoy|ayer|anteayer)\b/g, " ");
  if (dates.length === 1) d.date = dates[0];
  if (dates.length > 1) d.problems.push("Indica una sola fecha por registro.");
  if (!validDate(d.date) || d.date > context.today)
    d.problems.push("Revisa la fecha: debe ser válida y no futura.");
  if (
    /\b(el|dia)\s+\d|\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(
      s,
    )
  )
    d.problems.push("Para la fecha escribe hoy, ayer o día/mes/año.");
  const pen = /\b(soles|sol|pen)\b|s\//.test(s),
    usd = /\b(dolares|dolar|usd)\b|\$/.test(s);
  if (pen && usd) d.problems.push("Usa una sola moneda por registro.");
  d.currency = usd ? "USD" : pen ? "PEN" : context.currency;
  const moneyMatches: { raw: string; full: string; index: number }[] = [];
  const after = new RegExp(`(?:s/|us\\$|\\$|usd|pen)\\s*(${numeric})\\b`, "g");
  const before = new RegExp(
    `\\b(${numeric})\\s*(?:sol(?:es)?|dolar(?:es)?|pen|usd)\\b(?:\\s+con\\s+(${numeric})(?:\\s+centimos?)?)?`,
    "g",
  );
  for (const pattern of [after, before])
    for (const m of s.matchAll(pattern)) {
      if (
        !moneyMatches.some(
          (x) => Math.abs(x.index - (m.index || 0)) < x.full.length,
        )
      )
        moneyMatches.push({
          raw: m[2] ? `${m[1]} con ${m[2]}` : m[1],
          full: m[0],
          index: m.index || 0,
        });
    }
  // Amounts without a currency still use the visibly selected currency.
  if (!moneyMatches.length) {
    for (const m of s.matchAll(/\b\d+(?:[.,]\d+)*\b/g))
      moneyMatches.push({ raw: m[0], full: m[0], index: m.index || 0 });
  }
  if (moneyMatches.length === 1) {
    d.amount = parseMoney(moneyMatches[0].raw);
    s = s.replace(moneyMatches[0].full, " ");
  } else if (moneyMatches.length > 1)
    d.problems.push(
      "Menciona un solo importe y una sola operación por registro.",
    );
  if (!d.amount) d.problems.push("Indica el importe, por ejemplo 100 soles.");
  if (/\b\d+(?:[.,]\d+)*\b/.test(s))
    d.problems.push(
      "Hay otros números en la frase. Separa las operaciones o aclara el importe y la fecha.",
    );
  if (/\b(personal|personales|para mi|mi casa)\b/.test(s)) {
    d.scope = "personal";
    d.owner = null;
  }
  if (/\b(agencia|distinto)\b/.test(s)) {
    d.scope = "agency";
    d.owner = "agency";
  }
  // Bank ownership does not decide whose income or expense it is.
  const bankPart =
    s.match(/\b(?:cuenta|bcp|bbva|yape|interbank|efectivo)\b.*$/)?.[0] || "";
  const transactionPart = s.replace(bankPart, "");
  if (d.scope === "personal") {
    if (has(transactionPart, "nayeli")) d.owner = "nayeli";
    else if (has(transactionPart, "pedro")) d.owner = "pedro";
  }
  const bank = ["bcp", "bbva", "interbank", "yape", "efectivo"].filter((b) =>
    has(s, b),
  );
  let candidates = context.accounts.filter((a) =>
    bank.some((b) => has(normalize(a.name), b)),
  );
  if (bank.length) {
    if (
      bank.length > 1 &&
      !(bank.length === 2 && bank.includes("bcp") && bank.includes("yape"))
    )
      d.problems.push("Menciona una sola cuenta para este pago.");
    const named = has(bankPart, "nayeli")
      ? "nayeli"
      : has(bankPart, "pedro")
        ? "pedro"
        : has(bankPart, "empresa") || has(bankPart, "agencia")
          ? "agency"
          : null;
    if (named)
      candidates = candidates.filter(
        (a) => a.owner === named || has(normalize(a.name), named),
      );
    d.accountIds = candidates.map((a) => a.id);
  }
  const stop = new Set([
    "mensualidad",
    "pago",
    "saldo",
    "servicio",
    "servicios",
    "de",
    "del",
    "la",
    "el",
    "para",
    "web",
    "pagina",
    "noviembre",
    "octubre",
    "honorarios",
    "equipo",
  ]);
  d.chargeIds = context.charges
    .filter(
      (c) =>
        c.state !== "void" &&
        c.kind === d.kind &&
        c.currency === d.currency &&
        c.base + c.tax - c.prior_credit - c.settled > 0,
    )
    .filter((c) => {
      const tokens = normalize(c.title)
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 4 && !stop.has(t));
      return tokens.some((t) => has(transactionPart, t));
    })
    .map((c) => c.id);
  const concept = s
    .replace(
      /\b(registra|registrar|anota|anotar|un|una|gasto|gaste|gastamos|pague|pagamos|pago|recibi|recibimos|cobre|cobro|ingreso|me|nos|pagaron|depositaron)\b/g,
      " ",
    )
    .replace(
      /\b(?:desde|con|por|de|en)\s+(?:mi|la|el)?\s*(?:cuenta|bcp|bbva|interbank|yape|efectivo)\b.*$/,
      " ",
    )
    .replace(/\b(?:bcp|bbva|interbank|yape|efectivo)\b.*$/, " ")
    .replace(/\b(?:de|para)\s+la\s+agencia\b/g, " ")
    .replace(/^\s*(?:(?:de|en|por|para|a|al)\s+)+/, "")
    .replace(/\s+/g, " ")
    .trim();
  d.title = concept
    ? concept[0].toUpperCase() + concept.slice(1, 300)
    : d.kind === "expense"
      ? "Gasto registrado"
      : "Cobro registrado";
  d.problems = [...new Set(d.problems)];
  return d;
}
