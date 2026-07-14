// app/app/api/version/route.ts
//
// Devuelve el identificador del despliegue ACTUAL (el que está detrás del alias
// de producción, o sea el más nuevo). El cliente lo consulta cada tanto y, si no
// coincide con el build que tiene cargado (NEXT_PUBLIC_BUILD_ID), recarga la app
// sola. Ver components/pwa/auto-update.tsx.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const id = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_URL || 'dev'
  return NextResponse.json(
    { id },
    { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } },
  )
}
