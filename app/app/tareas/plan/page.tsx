// app/app/tareas/plan/page.tsx
// La vista Plan vive DENTRO del módulo Tareas (misma ruta, ?vista=plan) —
// Pedro 31-ago-2026: "en el mismo módulo, no separado". Este redirect solo
// conserva los enlaces viejos.
import { redirect } from 'next/navigation'

export default function TareasPlanRedirect() {
  redirect('/tareas?vista=plan')
}
