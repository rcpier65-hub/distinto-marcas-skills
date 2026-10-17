import Link from "next/link";
import { actor, brandAccess } from "@/lib/estrategia/access";
import { todayLima } from "@/lib/estrategia/model";
import { MarcaLogo } from "@/components/marca-logo";
import { SocialReportView } from "@/components/estrategia/social-report";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    a = await actor(),
    brand = await brandAccess(a, slug);
  if (!a.manager || a.client)
    return (
      <main className="p-8">
        Solo administración puede consultar los reportes de redes.
      </main>
    );
  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link className="text-violet-600" href={`/marca/${slug}/estrategia`}>
          ← Volver a {brand.nombre}
        </Link>
        <Link className="text-violet-600" href={`/marca/${slug}/metricas`}>
          Elegir cuentas y ver Meta Ads →
        </Link>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <MarcaLogo
          slug={slug}
          nombre={brand.nombre}
          logoUrl={brand.logo_url}
          emoji={brand.emoji_marca}
          size={54}
        />
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-violet-600">
            Espacio de marca · {brand.nombre}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Reporte de redes sociales
          </h1>
        </div>
      </div>
      <SocialReportView slug={slug} today={todayLima()} />
    </main>
  );
}
