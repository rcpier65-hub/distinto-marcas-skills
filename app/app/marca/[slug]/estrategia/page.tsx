import { actor } from "@/lib/estrategia/access";
import { loadBrand } from "@/lib/estrategia/load";
import { BrandWorkspace } from "@/components/estrategia/brand-workspace";
import { loadClientBrandSpace } from "@/lib/cliente/brand-space";
import { ClientBrandSpace } from "@/components/cliente/brand-space";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await actor();
  if (access.client) {
    const clientData = await loadClientBrandSpace(slug);
    return <ClientBrandSpace key={clientData.brand.id} data={clientData} />;
  }
  let data;
  try {
    data = await loadBrand(access, slug);
  } catch (e) {
    return (
      <div className="p-10">
        <h1>No se pudo abrir el espacio de marca</h1>
        <p>{(e as Error).message}</p>
        <a href="/dashboard">Volver a marcas</a>
      </div>
    );
  }
  return <BrandWorkspace initial={data} />;
}
