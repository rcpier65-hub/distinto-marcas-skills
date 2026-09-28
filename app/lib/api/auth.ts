// app/lib/api/auth.ts
//
// Helper común para endpoints /api/v1/*. Valida que el request tenga
// el Bearer CRON_SECRET (mismo que usan los endpoints de comentarios).

import { NextResponse } from 'next/server'

export function checkApiBearer(request: Request): { ok: true } | { response: NextResponse } {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return {
      response: NextResponse.json(
        { ok: false, error: 'Unauthorized: necesita header Authorization: Bearer <token>' },
        { status: 401 },
      ),
    }
  }
  return { ok: true }
}
