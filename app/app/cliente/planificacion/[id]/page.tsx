import { actor } from "@/lib/estrategia/access";
import { sheetData } from "@/lib/estrategia/sheets";
import { SheetWorkspace } from "@/components/estrategia/sheet-workspace";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let initial;
  try {
    const a = await actor(),
      data = await sheetData(a, (await params).id);
    initial = { ...data, authUserId: a.user.id };
  } catch (e) {
    return (
      <div className="p-10">
        <h1>Hoja no disponible</h1>
        <p>{(e as Error).message}</p>
        <a href="/cliente">Volver al portal</a>
      </div>
    );
  }
  return <SheetWorkspace initial={initial} />;
}
