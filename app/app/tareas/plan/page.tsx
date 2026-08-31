// app/app/tareas/plan/page.tsx
// El Plan (Gantt/calendario/filtro por marca) vive DENTRO del tablero de
// /tareas — Pedro 31-ago-2026: "dentro de la oficial, sin abrir otra
// pestaña". Redirect para enlaces viejos.
import { redirect } from 'next/navigation'

export default function TareasPlanRedirect() {
  redirect('/tareas')
}
