#!/usr/bin/env node
// mcp-distinto/src/index.ts
//
// MCP server de Distinto Agencia. Se conecta vía stdio a Claude
// Desktop / Claude Code y expone tools que consultan la app web de
// Pedro (https://distinto-app.vercel.app) a través de su API REST.
//
// Auth: variable de entorno DISTINTO_API_TOKEN.
// Base URL: DISTINTO_BASE_URL (default = producción).
//
// Tools disponibles:
//   - list_marcas
//   - list_publicaciones_semana
//   - list_publicaciones_mes
//   - list_grabaciones_proximas
//   - list_comentarios_pendientes
//   - list_tareas_diseno
//   - list_pendientes_rapidos
//   - crear_pendiente_rapido
//   - generar_reporte_dia
//   - get_marca_facts

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { apiGet, apiPost, asToolResult } from './client.js'

const server = new Server(
  {
    name: 'distinto-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

/* ============================================================
   Catálogo de tools — JSON Schema para que Claude las descubra
   ============================================================ */

const TOOLS = [
  {
    name: 'list_marcas',
    description:
      'Lista todas las marcas activas de Distinto Agencia (Manrique, TypHouse, Kintu, Lozano, etc.) con su nombre, slug, color, emoji, y objetivo de grabaciones mensuales. Útil para descubrir qué marcas existen antes de filtrar otras tools por marca.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'list_publicaciones_semana',
    description:
      'Lista las publicaciones programadas para la semana actual (lunes a domingo) en TODAS las marcas o filtradas por una marca específica. Devuelve título, fecha de publicación, estado, plataformas (Instagram/Facebook/TikTok), tipo de contenido y editor asignado.',
    inputSchema: {
      type: 'object',
      properties: {
        marca_slug: {
          type: 'string',
          description: 'Slug de la marca para filtrar (ej: "manrique"). Omitir para ver todas.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_publicaciones_mes',
    description:
      'Lista publicaciones del mes en curso. Útil para reportes mensuales y vista panorámica.',
    inputSchema: {
      type: 'object',
      properties: {
        marca_slug: {
          type: 'string',
          description: 'Slug de la marca para filtrar. Omitir para ver todas.',
        },
        estado: {
          type: 'string',
          description: 'Filtrar por estado: tareas, editar, disenar, aprobar, programar, enviado',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_grabaciones_proximas',
    description:
      'Lista las grabaciones planeadas a futuro (fecha >= hoy) con su fecha, hora (AM/PM), marca, estado y notas. Útil para coordinar con camarógrafos, recordar al equipo, o ver disponibilidad de calendario.',
    inputSchema: {
      type: 'object',
      properties: {
        marca_slug: {
          type: 'string',
          description: 'Slug de la marca para filtrar. Omitir para ver todas.',
        },
        limit: {
          type: 'number',
          description: 'Máximo de grabaciones a devolver (default 20)',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_comentarios_pendientes',
    description:
      'Lista los comentarios de redes sociales (Instagram, Facebook, TikTok) que el equipo todavía no respondió. Útil para que Pedro vea qué está pendiente sin abrir la app y para asignar prioridades.',
    inputSchema: {
      type: 'object',
      properties: {
        marca_slug: {
          type: 'string',
          description: 'Slug de la marca para filtrar (ej: "lozano"). Omitir para ver todas.',
        },
        limit: {
          type: 'number',
          description: 'Máximo de comentarios (default 50)',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_tareas_diseno',
    description:
      'Lista las tareas de diseño activas (estado="disenar", portada NO lista). Devuelve nombre, marca, fecha de diseño, sub-estado (sin_empezar/en_progreso/listo/pausada) y motivo de pausa si aplica. Útil para revisar el backlog de Ailyn.',
    inputSchema: {
      type: 'object',
      properties: {
        marca_slug: {
          type: 'string',
          description: 'Filtrar por marca. Omitir para todas.',
        },
        sub_estado: {
          type: 'string',
          description: 'Filtrar por sub-estado: sin_empezar | en_progreso | listo | pausada',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_pendientes_rapidos',
    description:
      'Lista los pendientes rápidos del chat de Inicio que el equipo escribió pero no completó. Cada miembro tiene los suyos; este endpoint devuelve los del admin (Pedro) o todos según permisos.',
    inputSchema: {
      type: 'object',
      properties: {
        completados: {
          type: 'boolean',
          description: 'Si true, incluye los completados. Por default solo pendientes.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'crear_pendiente_rapido',
    description:
      'Crea un pendiente rápido en el chat de Inicio. La IA del sistema parsea el texto y lo categoriza automáticamente (Diseño, Edición, Comunicación, Investigación, Personal, Urgente, Administrativo). Útil cuando Pedro está pensando algo y quiere anotarlo sin abrir la app.',
    inputSchema: {
      type: 'object',
      properties: {
        texto: {
          type: 'string',
          description: 'Texto en lenguaje natural. Ej: "Tengo que llamar a Cristal sobre Little Joe el viernes"',
        },
      },
      required: ['texto'],
      additionalProperties: false,
    },
  },
  {
    name: 'generar_reporte_dia',
    description:
      'Genera el reporte del día del admin (Pedro): qué publicaciones avanzaron, qué tareas se completaron, comentarios respondidos, hábitos cumplidos. Listo para copiar/pegar.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_marca_facts',
    description:
      'Devuelve la ficha completa de una marca: voz/tono, audiencia, oferta, sensibilidades, contactos del cliente, objetivos del mes. Útil para que Claude entienda el contexto antes de generar copys, grillas o respuestas a comentarios.',
    inputSchema: {
      type: 'object',
      properties: {
        marca_slug: {
          type: 'string',
          description: 'Slug de la marca (ej: "kintu", "manrique", "little-joe")',
        },
      },
      required: ['marca_slug'],
      additionalProperties: false,
    },
  },
]

/* ============================================================
   Handlers — convierten cada tool call en llamadas REST
   ============================================================ */

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params
  const a = args as Record<string, unknown>

  switch (name) {
    case 'list_marcas': {
      const r = await apiGet('/api/v1/marcas')
      return asToolResult(r)
    }

    case 'list_publicaciones_semana': {
      const r = await apiGet('/api/v1/publicaciones/semana', {
        marca: a.marca_slug as string | undefined,
      })
      return asToolResult(r)
    }

    case 'list_publicaciones_mes': {
      const r = await apiGet('/api/v1/publicaciones/mes', {
        marca: a.marca_slug as string | undefined,
        estado: a.estado as string | undefined,
      })
      return asToolResult(r)
    }

    case 'list_grabaciones_proximas': {
      const r = await apiGet('/api/v1/grabaciones/proximas', {
        marca: a.marca_slug as string | undefined,
        limit: (a.limit as number | undefined) ?? 20,
      })
      return asToolResult(r)
    }

    case 'list_comentarios_pendientes': {
      const r = await apiGet('/api/v1/comentarios/pendientes', {
        marca: a.marca_slug as string | undefined,
        limit: (a.limit as number | undefined) ?? 50,
      })
      return asToolResult(r)
    }

    case 'list_tareas_diseno': {
      const r = await apiGet('/api/v1/tareas-diseno', {
        marca: a.marca_slug as string | undefined,
        sub_estado: a.sub_estado as string | undefined,
      })
      return asToolResult(r)
    }

    case 'list_pendientes_rapidos': {
      const r = await apiGet('/api/v1/pendientes-rapidos', {
        completados: a.completados ? '1' : undefined,
      })
      return asToolResult(r)
    }

    case 'crear_pendiente_rapido': {
      if (!a.texto || typeof a.texto !== 'string') {
        return {
          content: [{ type: 'text', text: '❌ Falta el campo "texto".' }],
          isError: true,
        }
      }
      const r = await apiPost('/api/v1/pendientes-rapidos', { texto: a.texto })
      return asToolResult(r)
    }

    case 'generar_reporte_dia': {
      const r = await apiGet('/api/v1/reporte-dia')
      return asToolResult(r)
    }

    case 'get_marca_facts': {
      if (!a.marca_slug || typeof a.marca_slug !== 'string') {
        return {
          content: [{ type: 'text', text: '❌ Falta el campo "marca_slug".' }],
          isError: true,
        }
      }
      const r = await apiGet(`/api/v1/marcas/${encodeURIComponent(a.marca_slug)}/facts`)
      return asToolResult(r)
    }

    default:
      return {
        content: [{ type: 'text', text: `Tool desconocida: ${name}` }],
        isError: true,
      }
  }
})

/* ============================================================
   Start stdio
   ============================================================ */

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write('[distinto-mcp] servidor MCP iniciado vía stdio\n')
}

main().catch((err) => {
  process.stderr.write(`[distinto-mcp] FATAL: ${err}\n`)
  process.exit(1)
})
