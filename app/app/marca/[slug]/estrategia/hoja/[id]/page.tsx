import { actor } from "@/lib/estrategia/access";
import { sheetData } from "@/lib/estrategia/sheets";
import { SheetWorkspace } from "@/components/estrategia/sheet-workspace";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ zona?: string }>;
}) {
  const { slug, id } = await params;
  let initial;
  try {
    const a = await actor(),
      data = await sheetData(a, id);
    if (data.brand.slug !== slug)
      throw new Error("La hoja pertenece a otra marca");
    initial = { ...data, authUserId: a.user.id };
  } catch (e) {
    return (
      <div className="p-10">
        <h1>No se pudo abrir la hoja</h1>
        <p>{(e as Error).message}</p>
        <a href={`/marca/${slug}/estrategia`}>Volver a la marca</a>
      </div>
    );
  }
  return <SheetWorkspace initial={initial} focusAnchor={(await searchParams).zona || ""} />;
}
