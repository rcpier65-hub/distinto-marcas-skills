import { requireUser } from "@/lib/auth/get-user";
import CreativeStudio from "./_components/creative-studio";
export const dynamic = "force-dynamic";
export const metadata = { title: "Creación de Ideas · Distinto" };
export default async function Page() {
  await requireUser();
  return <CreativeStudio />;
}
