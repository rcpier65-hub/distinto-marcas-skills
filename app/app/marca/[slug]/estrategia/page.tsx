import { actor } from "@/lib/estrategia/access";
import { loadBrand } from "@/lib/estrategia/load";
import { BrandWorkspace } from "@/components/estrategia/brand-workspace";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let data;
  try {
    data = await loadBrand(await actor(), slug);
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
