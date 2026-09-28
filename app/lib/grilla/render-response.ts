/** Validación común para copiar, descargar y enviar: nunca aceptar HTML como PNG. */
function comprobarEstado(response: Response) {
  if (response.status === 401) throw new Error('Tu sesión venció. Vuelve a iniciar sesión y reintenta.')
  if (response.status === 403) throw new Error('No tienes permiso para generar esta grilla.')
  if ([408, 504].includes(response.status)) throw new Error('La generación tardó demasiado. Reintenta en unos segundos.')
  if (!response.ok) throw new Error('No se pudo generar la grilla. Reintenta en unos segundos.')
  if (response.redirected) throw new Error('La petición fue redirigida. Recarga la app y vuelve a intentar.')
}

export async function leerGrillaPNG(response: Response): Promise<Uint8Array<ArrayBuffer>> {
  comprobarEstado(response)
  if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'image/png') {
    throw new Error('El servidor no devolvió la imagen de la grilla. Recarga la app y vuelve a intentar.')
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (bytes.length < 33 || !signature.every((value, i) => bytes[i] === value) ||
      bytes[12] !== 73 || bytes[13] !== 72 || bytes[14] !== 68 || bytes[15] !== 82) {
    throw new Error('La imagen llegó incompleta o no es un PNG válido. Vuelve a intentar.')
  }
  return bytes
}

export async function leerGrillaHTML(response: Response): Promise<string> {
  comprobarEstado(response)
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('text/html') ||
      response.headers.get('x-distinto-grilla') !== '1') {
    throw new Error('No se recibió la vista previa de la grilla. Pulsa Recargar para reintentar.')
  }
  return response.text()
}

export async function solicitarGrillaPNG(url: string, options: RequestInit = {}) {
  let response: Response
  try {
    response = await fetch(url, { ...options, cache: 'no-store', redirect: 'error' })
  } catch {
    throw new Error('No se pudo conectar para generar la imagen. Revisa tu conexión y vuelve a intentar.')
  }
  return leerGrillaPNG(response)
}
