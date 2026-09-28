import { lookup } from "node:dns/promises";
import https from "node:https";
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
export function publicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
export async function readWebsite(
  input: string,
  redirects = 0,
): Promise<{ name: string; content: string; url: string }> {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    redirects > 3
  )
    throw new Error("Usa una página pública HTTPS");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some((x) => !publicAddress(x.address)))
    throw new Error("La fuente debe ser una página pública");
  const result = await new Promise<{
    status: number;
    location?: string;
    type: string;
    body: string;
  }>((resolve, reject) => {
    const req = https.get(
      url,
      {
        family: addresses[0].family,
        headers: {
          "User-Agent": "DistintoStudio/1.0",
          Accept: "text/html,text/plain",
        },
        lookup: (_host, _options, cb) =>
          cb(null, addresses[0].address, addresses[0].family),
        signal: AbortSignal.timeout(10000),
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 1_000_000) {
            res.destroy();
            reject(
              new Error(
                "La página es muy grande. Pega un extracto como documento.",
              ),
            );
          } else chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode || 500,
            location: res.headers.location,
            type: res.headers["content-type"] || "",
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
  });
  if ([301, 302, 303, 307, 308].includes(result.status) && result.location)
    return readWebsite(new URL(result.location, url).href, redirects + 1);
  if (result.status !== 200)
    throw new Error(
      "No se pudo leer la página. Pega el contenido como documento.",
    );
  if (!/text\/(html|plain)/i.test(result.type))
    throw new Error("Para documentos, pega el texto relevante en la fuente.");
  const $ = load(result.body);
  const name = $("title").text().trim().slice(0, 160) || url.hostname;
  $("script,style,nav,footer,header,iframe,noscript,svg,form").remove();
  const content = ($("main").text() || $("body").text())
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18000);
  if (content.length < 40)
    throw new Error(
      "La página no ofrece texto legible. Pega su contenido en la fuente.",
    );
  return { name, content, url: url.href };
}
