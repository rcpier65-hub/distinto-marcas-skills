"""
metricool-pro-mcp — MCP server enriquecido para Metricool.

Provee 26 tools de alto nivel para:
  • Publicar en TODAS las redes (IG story/post/reel/carrusel, FB, TikTok, multi-red)
  • Manejar INBOX (conversaciones, comentarios, reviews, marcar leído)
  • Listar/buscar/eliminar publicaciones programadas
  • Marcas y mejores horarios

Diseño:
  • Llama directo al API de Metricool (https://app.metricool.com/api).
  • Auto-normaliza URLs de Google Drive (/file/d/ID/view → lh3.googleusercontent.com/d/ID=w1080).
  • Defaults sensatos: timezone America/Lima, autoPublish=true, fecha = ahora+3min para "publicar ya".
  • Errores en español útil — no genéricos.

Autenticación: usa METRICOOL_USER_TOKEN + METRICOOL_USER_ID del entorno
(misma config que el MCP oficial).
"""

from __future__ import annotations

import os
import re
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

# ───────────────────────────────────────────────────────────────────────────
# CONFIG
# ───────────────────────────────────────────────────────────────────────────

API_BASE = "https://app.metricool.com/api"
TOKEN = os.environ.get("METRICOOL_USER_TOKEN", "").strip()
USER_ID = os.environ.get("METRICOOL_USER_ID", "").strip()
LIMA_TZ = timezone(timedelta(hours=-5))  # Distinto Agencia es Lima
DEFAULT_TZ_STR = "America/Lima"

if not TOKEN or not USER_ID:
    print(
        "❌ Faltan env vars METRICOOL_USER_TOKEN y/o METRICOOL_USER_ID. "
        "Configúralas en la entrada del MCP de Claude.",
        file=sys.stderr,
    )

# ───────────────────────────────────────────────────────────────────────────
# HELPERS
# ───────────────────────────────────────────────────────────────────────────

# Match Google Drive URLs in either format and extract the file ID
_DRIVE_PATTERNS = [
    re.compile(r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)"),
    re.compile(r"drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)"),
    re.compile(r"drive\.google\.com/uc\?[^#]*id=([a-zA-Z0-9_-]+)"),
    re.compile(r"drive\.usercontent\.google\.com/download\?[^#]*id=([a-zA-Z0-9_-]+)"),
]


def normalize_media_url(url: str, width: int = 1080) -> str:
    """Convierte cualquier URL de Drive a formato directo de imagen.

    /file/d/ID/view  → lh3.googleusercontent.com/d/ID=w1080
    /uc?export=download&id=ID → lh3.googleusercontent.com/d/ID=w1080
    Otras URLs se devuelven tal cual.
    """
    if not url:
        return url
    for pat in _DRIVE_PATTERNS:
        m = pat.search(url)
        if m:
            file_id = m.group(1)
            return f"https://lh3.googleusercontent.com/d/{file_id}=w{width}"
    return url


def normalize_media_list(urls: list[str], width: int = 1080) -> list[str]:
    return [normalize_media_url(u, width) for u in urls if u]


def future_lima_iso(minutes_from_now: int = 3) -> str:
    """Genera timestamp ISO en Lima TZ, N minutos en el futuro (mínimo 1)."""
    when = datetime.now(LIMA_TZ) + timedelta(minutes=max(1, minutes_from_now))
    return when.strftime("%Y-%m-%dT%H:%M:00")


def auth_headers() -> dict[str, str]:
    return {
        "X-Mc-Auth": TOKEN,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def auth_params(blog_id: int, extra: dict | None = None) -> dict:
    params: dict = {"userId": USER_ID, "blogId": str(blog_id)}
    if extra:
        params.update({k: str(v) for k, v in extra.items() if v is not None})
    return params


def _http_request(
    method: str,
    path: str,
    blog_id: int | None,
    params_extra: dict | None = None,
    json_body: dict | None = None,
    timeout: float = 30.0,
) -> dict:
    """Hace una request HTTP al API de Metricool y devuelve dict.

    En caso de error, devuelve dict con clave 'error' descriptiva.
    """
    url = f"{API_BASE}{path}"
    params: dict = {}
    if blog_id is not None:
        params = auth_params(blog_id, params_extra)
    elif params_extra:
        params = {"userId": USER_ID}
        params.update({k: str(v) for k, v in params_extra.items() if v is not None})
    else:
        params = {"userId": USER_ID}

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.request(
                method,
                url,
                params=params,
                headers=auth_headers(),
                json=json_body,
            )
    except httpx.HTTPError as exc:
        return {
            "error": f"Error de red al llamar a Metricool: {exc}",
            "url": url,
        }

    if resp.status_code >= 400:
        try:
            body = resp.json()
        except Exception:
            body = resp.text[:500]
        return {
            "error": f"Metricool devolvió HTTP {resp.status_code}",
            "detail": body,
            "url": url,
        }

    # Respuestas vacías (DELETE 204, etc.)
    if not resp.content:
        return {"ok": True, "http_status": resp.status_code}

    try:
        return resp.json()
    except Exception:
        return {"raw_response": resp.text[:500], "http_status": resp.status_code}


def _build_post_body(
    *,
    network: str,
    image_urls: list[str] | None = None,
    video_url: str | None = None,
    text: str = "",
    when_iso: str,
    timezone_str: str = DEFAULT_TZ_STR,
    network_data: dict | None = None,
    draft: bool = False,
    auto_publish: bool = True,
    alt_texts: list[str] | None = None,
    extra: dict | None = None,
) -> dict:
    """Construye el body canónico para POST /v2/scheduler/posts.

    Centraliza la estructura correcta descubierta vía swagger:
      • media: array de strings (URLs)
      • providers[].network solo (sin type)
      • {network}Data.type controla POST/STORY/REEL/CAROUSEL
    """
    media = []
    if image_urls:
        media.extend(normalize_media_list(image_urls))
    if video_url:
        media.append(normalize_media_url(video_url))

    body: dict = {
        "publicationDate": {"dateTime": when_iso, "timezone": timezone_str},
        "text": text,
        "providers": [{"network": network}],
        "autoPublish": auto_publish,
        "draft": draft,
        "saveExternalMediaFiles": True,
    }
    if media:
        body["media"] = media
    if alt_texts:
        body["mediaAltText"] = alt_texts
    if network_data:
        body[f"{network}Data"] = network_data
    if extra:
        body.update(extra)
    return body


# ───────────────────────────────────────────────────────────────────────────
# MCP SERVER
# ───────────────────────────────────────────────────────────────────────────

mcp = FastMCP("metricool-pro")


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  📥 INBOX — conversaciones, comentarios, reviews                     ║
# ╚══════════════════════════════════════════════════════════════════════╝

@mcp.tool()
def inbox_listar_conversaciones(
    blog_id: int,
    network: str,
    only_unread: bool = False,
    limit: int = 50,
) -> dict:
    """Lista conversaciones (DMs/chats) del inbox para una marca y red social.

    Args:
      blog_id: ID de la marca en Metricool (usa listar_marcas si no lo conoces).
      network: red social — 'instagram', 'facebook', 'twitter', 'tiktok', 'linkedin', 'youtube'.
      only_unread: si True, solo conversaciones con mensajes sin leer.
      limit: máximo de conversaciones a devolver.
    """
    extra = {"provider": network, "limit": limit}
    if only_unread:
        extra["onlyUnread"] = "true"
    return _http_request("GET", "/v2/inbox/conversations", blog_id, extra)


@mcp.tool()
def inbox_obtener_mensajes(
    blog_id: int,
    network: str,
    conversation_id: str,
) -> dict:
    """Obtiene los mensajes de una conversación específica.

    Útil para LEER el historial antes de responder — siempre haz esto
    antes de mandar respuesta para entender el contexto del cliente.

    Args:
      blog_id: ID de la marca.
      network: red social de la conversación.
      conversation_id: ID de la conversación (lo obtienes de listar_conversaciones).
    """
    extra = {"provider": network, "conversationId": conversation_id}
    return _http_request("GET", "/v2/inbox/conversations", blog_id, extra)


@mcp.tool()
def inbox_enviar_mensaje(
    blog_id: int,
    network: str,
    text: str,
    conversation_id: str | None = None,
    recipient: str | None = None,
    attachment_url: str | None = None,
) -> dict:
    """Envía un mensaje en una conversación existente, o inicia una nueva.

    Args:
      blog_id: ID de la marca.
      network: red social — 'instagram', 'facebook', 'twitter', etc.
      text: contenido del mensaje (texto plano).
      conversation_id: para RESPONDER en una conversación existente.
      recipient: para INICIAR conversación nueva (handle o ID del destinatario).
      attachment_url: URL pública opcional de imagen/video adjunto (Drive auto-normalizado).
    """
    if not conversation_id and not recipient:
        return {
            "error": "Debes proveer conversation_id (para responder) o recipient (para iniciar)."
        }
    body: dict = {
        "provider": network,
        "text": text,
    }
    if conversation_id:
        body["conversationId"] = conversation_id
    if recipient:
        body["recipient"] = recipient
    if attachment_url:
        body["attachment"] = normalize_media_url(attachment_url)
    return _http_request("POST", "/v2/inbox/conversations", blog_id, json_body=body)


@mcp.tool()
def inbox_listar_comentarios(
    blog_id: int,
    network: str,
    only_unread: bool = False,
    limit: int = 50,
) -> dict:
    """Lista comentarios PENDIENTES en tus publicaciones (para responder).

    Diferencia con conversaciones: estos son comentarios públicos en tus posts,
    no DMs privados.
    """
    extra = {"provider": network, "limit": limit}
    if only_unread:
        extra["onlyUnread"] = "true"
    return _http_request("GET", "/v2/inbox/post-comments", blog_id, extra)


@mcp.tool()
def inbox_responder_comentario(
    blog_id: int,
    network: str,
    comment_id: str,
    text: str,
) -> dict:
    """Responde a un comentario público en una de tus publicaciones."""
    # Metricool API expects "objectId" (not "commentId") en el body del POST.
    # Campos válidos confirmados por la API: provider, objectId, attachment, text.
    body = {
        "provider": network,
        "objectId": comment_id,
        "text": text,
    }
    return _http_request("POST", "/v2/inbox/post-comments", blog_id, json_body=body)


@mcp.tool()
def inbox_eliminar_comentario(
    blog_id: int,
    network: str,
    comment_id: str,
) -> dict:
    """Elimina (oculta) un comentario en tu publicación. Úsalo con cuidado."""
    extra = {"provider": network, "commentId": comment_id}
    return _http_request("DELETE", "/v2/inbox/post-comments", blog_id, extra)


@mcp.tool()
def inbox_listar_reviews(
    blog_id: int,
    network: str = "gmb",
    only_unanswered: bool = False,
    limit: int = 50,
) -> dict:
    """Lista reseñas (Google Business Profile, Facebook si aplica).

    Args:
      network: 'gmb' (Google My Business — DEFAULT, lo más confiable en 2026),
               'facebook' (deprecado parcialmente por Meta, puede devolver 500
               si la Page no tiene reviews habilitadas).
    """
    extra = {"provider": network, "limit": limit}
    if only_unanswered:
        extra["onlyUnanswered"] = "true"
    return _http_request("GET", "/v2/inbox/reviews", blog_id, extra)


@mcp.tool()
def inbox_responder_review(
    blog_id: int,
    network: str,
    review_id: str,
    text: str,
) -> dict:
    """Responde a una reseña (Facebook / Google Business)."""
    body = {
        "provider": network,
        "reviewId": review_id,
        "text": text,
    }
    return _http_request("POST", "/v2/inbox/reviews/replies", blog_id, json_body=body)


@mcp.tool()
def inbox_marcar_leido(
    blog_id: int,
    network: str,
    conversation_id: str | None = None,
    comment_id: str | None = None,
    review_id: str | None = None,
    is_read: bool = True,
) -> dict:
    """Marca una conversación, comentario o review como leído (o no leído).

    Útil para limpiar el counter de pendientes después de procesar mensajes.

    Args:
      blog_id: ID de la marca.
      network: red social ('instagram', 'facebook', 'twitter', 'tiktok', 'linkedin', 'google').
      conversation_id: pasar SOLO esto para marcar un DM.
      comment_id: pasar SOLO esto para marcar un comentario.
      review_id: pasar SOLO esto para marcar un review (Google/Facebook).
      is_read: True para marcar leído, False para devolver a no-leído.
    """
    # /v2/inbox/status v2 — esquema unificado:
    # acepta un único par (conversationType, conversationId) más status READ/UNREAD.
    # El campo "read" (boolean) del esquema viejo fue deprecado.
    if comment_id:
        convo_type, convo_id = "COMMENT", comment_id
    elif review_id:
        convo_type, convo_id = "REVIEW", review_id
    elif conversation_id:
        convo_type, convo_id = "MESSAGE", conversation_id
    else:
        return {"error": "Debes proveer uno de: conversation_id, comment_id o review_id."}

    body = {
        "provider": network,
        "status": "READ" if is_read else "UNREAD",
        "conversationType": convo_type,
        "conversationId": convo_id,
    }
    return _http_request("PUT", "/v2/inbox/status", blog_id, json_body=body)


@mcp.tool()
def inbox_resumen_pendientes(blog_id: int) -> dict:
    """Resumen rápido de qué hay pendiente en el inbox de una marca.

    Devuelve counters de mensajes sin leer, comentarios sin responder,
    y reviews pendientes — útil como trigger de tareas programadas
    ("si hay >0 pendientes, procesalos").

    Maneja errores de redes específicas de forma elegante: si una red no
    soporta cierto endpoint (ej: Facebook Reviews deprecado), devuelve
    'no_disponible' en vez de hacer fallar todo el resumen.
    """
    def _count_or_status(resp: dict) -> int | str:
        if "data" in resp and isinstance(resp["data"], list):
            return len(resp["data"])
        if "error" in resp:
            detail = resp.get("detail", {})
            if isinstance(detail, dict) and detail.get("code") == "500":
                return "no_disponible_en_esta_red"
            return f"error: {str(detail)[:60]}"
        return "respuesta_inesperada"

    summary: dict = {"blog_id": blog_id, "pendientes": {}, "total_pendiente": 0}

    for net in ("instagram", "facebook"):
        convs = _http_request(
            "GET",
            "/v2/inbox/conversations",
            blog_id,
            {"provider": net, "limit": 100, "onlyUnread": "true"},
        )
        comments = _http_request(
            "GET",
            "/v2/inbox/post-comments",
            blog_id,
            {"provider": net, "limit": 100, "onlyUnread": "true"},
        )
        m = _count_or_status(convs)
        c = _count_or_status(comments)
        summary["pendientes"][net] = {
            "mensajes_sin_leer": m,
            "comentarios_sin_responder": c,
        }
        if isinstance(m, int):
            summary["total_pendiente"] += m
        if isinstance(c, int):
            summary["total_pendiente"] += c

    # Reviews: probamos gmb primero (más confiable en 2026)
    reviews_gmb = _http_request(
        "GET",
        "/v2/inbox/reviews",
        blog_id,
        {"provider": "gmb", "limit": 100, "onlyUnanswered": "true"},
    )
    r_gmb = _count_or_status(reviews_gmb)
    summary["pendientes"]["reviews_google_business"] = r_gmb
    if isinstance(r_gmb, int):
        summary["total_pendiente"] += r_gmb

    summary["accion_sugerida"] = (
        f"Hay {summary['total_pendiente']} ítems pendientes que requieren respuesta."
        if summary["total_pendiente"] > 0
        else "✓ Inbox al día — no hay pendientes."
    )
    return summary


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  📤 PUBLICAR — Instagram                                              ║
# ╚══════════════════════════════════════════════════════════════════════╝

@mcp.tool()
def publicar_instagram_story(
    blog_id: int,
    media_url: str,
    minutes_from_now: int = 3,
    when_iso: str | None = None,
    is_video: bool = False,
) -> dict:
    """Publica 1 story de Instagram (imagen o video).

    Args:
      blog_id: ID de la marca.
      media_url: URL pública de la imagen/video. URLs de Drive se normalizan automáticamente.
      minutes_from_now: minutos en el futuro para publicar (default 3 = "casi ya").
      when_iso: alternativa a minutes_from_now — fecha ISO específica en Lima TZ.
      is_video: True si media_url es video (default False = imagen).

    Returns:
      Detalle del post creado incluyendo el ID para verificar/eliminar después.
    """
    when = when_iso or future_lima_iso(minutes_from_now)
    body = _build_post_body(
        network="instagram",
        image_urls=None if is_video else [media_url],
        video_url=media_url if is_video else None,
        when_iso=when,
        network_data={"type": "STORY", "autoPublish": True},
    )
    return _http_request("POST", "/v2/scheduler/posts", blog_id, json_body=body)


@mcp.tool()
def publicar_secuencia_stories(
    blog_id: int,
    media_urls: list[str],
    minutes_from_now: int = 3,
    spacing_minutes: int = 1,
) -> dict:
    """Publica una SECUENCIA de stories de Instagram en orden cronológico.

    Tu patrón típico: HOOK → DESARROLLO → CIERRE para storytelling.
    Auto-espacia 1 minuto entre cada una para que IG las ponga en orden correcto.

    Args:
      blog_id: ID de la marca.
      media_urls: lista de URLs de imágenes (la primera = HOOK, etc.).
      minutes_from_now: cuánto esperar para la PRIMERA story.
      spacing_minutes: separación entre cada story (1 min default es seguro).
    """
    results = []
    for i, url in enumerate(media_urls):
        when = future_lima_iso(minutes_from_now + i * spacing_minutes)
        body = _build_post_body(
            network="instagram",
            image_urls=[url],
            when_iso=when,
            network_data={"type": "STORY", "autoPublish": True},
        )
        resp = _http_request("POST", "/v2/scheduler/posts", blog_id, json_body=body)
        results.append({
            "story_index": i + 1,
            "publica_a": when,
            "url_origen": url,
            "url_normalizada": normalize_media_url(url),
            "respuesta": resp,
        })
    return {"total_stories": len(results), "secuencia": results}


@mcp.tool()
def publicar_instagram_post(
    blog_id: int,
    image_url: str,
    caption: str = "",
    first_comment: str = "",
    minutes_from_now: int = 3,
    when_iso: str | None = None,
) -> dict:
    """Publica un POST normal al feed de Instagram (1 imagen).

    Args:
      blog_id: ID de la marca.
      image_url: URL pública de la imagen.
      caption: texto de la publicación (descripción + hashtags).
      first_comment: comentario que se publica automáticamente como primer comment
                     (útil para hashtags sin saturar el caption).
      minutes_from_now / when_iso: cuándo publicar.
    """
    when = when_iso or future_lima_iso(minutes_from_now)
    body = _build_post_body(
        network="instagram",
        image_urls=[image_url],
        text=caption,
        when_iso=when,
        network_data={"type": "POST", "autoPublish": True},
    )
    if first_comment:
        body["firstCommentText"] = first_comment
    return _http_request("POST", "/v2/scheduler/posts", blog_id, json_body=body)


@mcp.tool()
def publicar_instagram_carrusel(
    blog_id: int,
    image_urls: list[str],
    caption: str = "",
    first_comment: str = "",
    minutes_from_now: int = 3,
    when_iso: str | None = None,
) -> dict:
    """Publica un CARRUSEL al feed de Instagram (2-10 imágenes).

    Args:
      blog_id: ID de la marca.
      image_urls: lista de 2-10 URLs de imágenes (orden importa).
      caption: texto del carrusel.
      first_comment: comentario auto-posted.
    """
    if not (2 <= len(image_urls) <= 10):
        return {"error": f"Carrusel requiere 2-10 imágenes. Tienes {len(image_urls)}."}
    when = when_iso or future_lima_iso(minutes_from_now)
    body = _build_post_body(
        network="instagram",
        image_urls=image_urls,
        text=caption,
        when_iso=when,
        network_data={"type": "POST", "autoPublish": True},
    )
    if first_comment:
        body["firstCommentText"] = first_comment
    return _http_request("POST", "/v2/scheduler/posts", blog_id, json_body=body)


@mcp.tool()
def publicar_instagram_reel(
    blog_id: int,
    video_url: str,
    caption: str = "",
    first_comment: str = "",
    show_on_feed: bool = True,
    cover_seconds: int = 0,
    minutes_from_now: int = 3,
    when_iso: str | None = None,
) -> dict:
    """Publica un REEL en Instagram.

    Args:
      blog_id: ID de la marca.
      video_url: URL pública del video MP4 (aspect ratio 9:16 ideal).
      caption: descripción.
      show_on_feed: si True, el reel también aparece en el feed normal.
      cover_seconds: segundo del video para usar como portada (0 = primer frame).
    """
    when = when_iso or future_lima_iso(minutes_from_now)
    body = _build_post_body(
        network="instagram",
        video_url=video_url,
        text=caption,
        when_iso=when,
        network_data={
            "type": "REEL",
            "autoPublish": True,
            "showReelOnFeed": show_on_feed,
        },
    )
    if cover_seconds:
        body["videoCoverMilliseconds"] = cover_seconds * 1000
    if first_comment:
        body["firstCommentText"] = first_comment
    return _http_request("POST", "/v2/scheduler/posts", blog_id, json_body=body)


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  📤 PUBLICAR — Facebook                                               ║
# ╚══════════════════════════════════════════════════════════════════════╝

@mcp.tool()
def publicar_facebook_post(
    blog_id: int,
    text: str = "",
    image_urls: list[str] | None = None,
    minutes_from_now: int = 3,
    when_iso: str | None = None,
) -> dict:
    """Publica un POST al feed de Facebook (con o sin imagen).

    A diferencia de IG, FB acepta posts solo-texto sin imagen.
    """
    when = when_iso or future_lima_iso(minutes_from_now)
    body = _build_post_body(
        network="facebook",
        image_urls=image_urls,
        text=text,
        when_iso=when,
        network_data={"type": "POST"},
    )
    return _http_request("POST", "/v2/scheduler/posts", blog_id, json_body=body)


@mcp.tool()
def publicar_facebook_story(
    blog_id: int,
    media_url: str,
    is_video: bool = False,
    minutes_from_now: int = 3,
    when_iso: str | None = None,
) -> dict:
    """Publica una Story de Facebook (imagen o video, dura 24h)."""
    when = when_iso or future_lima_iso(minutes_from_now)
    body = _build_post_body(
        network="facebook",
        image_urls=None if is_video else [media_url],
        video_url=media_url if is_video else None,
        when_iso=when,
        network_data={"type": "STORY"},
    )
    return _http_request("POST", "/v2/scheduler/posts", blog_id, json_body=body)


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  📤 PUBLICAR — TikTok                                                 ║
# ╚══════════════════════════════════════════════════════════════════════╝

@mcp.tool()
def publicar_tiktok_video(
    blog_id: int,
    video_url: str,
    caption: str = "",
    music_id: str | None = None,
    sound_volume: int = 100,
    original_volume: int = 100,
    minutes_from_now: int = 3,
    when_iso: str | None = None,
) -> dict:
    """Publica un video en TikTok (con música opcional de la librería oficial).

    Args:
      blog_id: ID de la marca.
      video_url: URL pública del video MP4.
      caption: descripción (incluye hashtags).
      music_id: ID de track de TikTok (usa mejor_hora_publicar para descubrirlos).
                Si None, usa el audio original del video.
      sound_volume: 0-100, volumen de la música seleccionada.
      original_volume: 0-100, volumen del audio original del video.
    """
    when = when_iso or future_lima_iso(minutes_from_now)
    tiktok_data: dict = {"autoAddMusic": bool(music_id)}
    if music_id:
        tiktok_data["music"] = {
            "musicId": music_id,
            "soundVolume": sound_volume,
            "originalVolume": original_volume,
        }
    body = _build_post_body(
        network="tiktok",
        video_url=video_url,
        text=caption,
        when_iso=when,
        network_data=tiktok_data,
    )
    return _http_request("POST", "/v2/scheduler/posts", blog_id, json_body=body)


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  📤 PUBLICAR — Multi-plataforma                                       ║
# ╚══════════════════════════════════════════════════════════════════════╝

@mcp.tool()
def publicar_multiplataforma(
    blog_id: int,
    networks: list[str],
    text: str = "",
    image_urls: list[str] | None = None,
    video_url: str | None = None,
    minutes_from_now: int = 3,
    when_iso: str | None = None,
) -> dict:
    """Publica el MISMO contenido en varias redes a la vez (feed posts).

    Args:
      blog_id: ID de la marca.
      networks: lista de redes — ['instagram', 'facebook', 'tiktok', 'twitter'].
      text: caption/contenido.
      image_urls / video_url: media a publicar.

    Útil para anuncios o contenido evergreen que va a múltiples redes.
    Limitaciones: cada red tiene reglas distintas (IG requiere imagen, TikTok video, etc.).
    """
    when = when_iso or future_lima_iso(minutes_from_now)
    body = {
        "publicationDate": {"dateTime": when, "timezone": DEFAULT_TZ_STR},
        "text": text,
        "providers": [{"network": n} for n in networks],
        "autoPublish": True,
        "draft": False,
        "saveExternalMediaFiles": True,
    }
    media = []
    if image_urls:
        media.extend(normalize_media_list(image_urls))
    if video_url:
        media.append(normalize_media_url(video_url))
    if media:
        body["media"] = media
    return _http_request("POST", "/v2/scheduler/posts", blog_id, json_body=body)


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  📊 LISTAR / BUSCAR / OBTENER                                         ║
# ╚══════════════════════════════════════════════════════════════════════╝

@mcp.tool()
def listar_publicaciones_programadas(
    blog_id: int,
    start_date: str | None = None,
    end_date: str | None = None,
    timezone_str: str = DEFAULT_TZ_STR,
) -> dict:
    """Lista publicaciones programadas en un rango de fechas (calendario futuro).

    Args:
      blog_id: ID de la marca.
      start_date: YYYY-MM-DD (default: hoy).
      end_date: YYYY-MM-DD (default: +30 días).
      timezone_str: 'America/Lima' por default.
    """
    if not start_date:
        start_date = datetime.now(LIMA_TZ).strftime("%Y-%m-%d")
    if not end_date:
        end_date = (datetime.now(LIMA_TZ) + timedelta(days=30)).strftime("%Y-%m-%d")
    tz_encoded = timezone_str.replace("/", "%2F")
    extra = {
        "start": start_date,
        "end": end_date,
        "timezone": tz_encoded,
        "extendedRange": "true",
    }
    return _http_request("GET", "/v2/scheduler/posts", blog_id, extra)


@mcp.tool()
def listar_publicaciones_publicadas(
    blog_id: int,
    days_back: int = 7,
    timezone_str: str = DEFAULT_TZ_STR,
) -> dict:
    """Lista publicaciones YA publicadas en los últimos N días."""
    end = datetime.now(LIMA_TZ).strftime("%Y-%m-%d")
    start = (datetime.now(LIMA_TZ) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    tz_encoded = timezone_str.replace("/", "%2F")
    extra = {
        "start": start,
        "end": end,
        "timezone": tz_encoded,
        "extendedRange": "true",
    }
    return _http_request("GET", "/v2/scheduler/posts", blog_id, extra)


@mcp.tool()
def obtener_publicacion(blog_id: int, post_id: int) -> dict:
    """Obtiene el detalle completo de una publicación específica por ID.

    Útil para verificar status (PUBLISHED/PENDING/ERROR) o ver media/text exactos.
    """
    return _http_request("GET", f"/v2/scheduler/posts/{post_id}", blog_id)


@mcp.tool()
def mejor_hora_publicar(blog_id: int, network: str) -> dict:
    """Sugiere las mejores horas para publicar en una red social.

    Basado en analytics históricos de tu marca específica.

    Args:
      blog_id: ID de la marca.
      network: 'instagram', 'facebook', 'tiktok', 'twitter', etc.
    """
    return _http_request("GET", f"/v2/scheduler/besttimes/{network}", blog_id)


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  🔧 EDITAR / ELIMINAR                                                 ║
# ╚══════════════════════════════════════════════════════════════════════╝

@mcp.tool()
def eliminar_publicacion(blog_id: int, post_id: int) -> dict:
    """Elimina una publicación programada por ID.

    Si ya fue PUBLISHED, esto solo borra del calendario de Metricool —
    el post en la red social se mantiene (tendrías que borrarlo desde la app).
    """
    return _http_request("DELETE", f"/v2/scheduler/posts/{post_id}", blog_id)


@mcp.tool()
def actualizar_publicacion(blog_id: int, post_id: int, updates: dict) -> dict:
    """Actualiza campos de una publicación programada (solo si aún no fue PUBLISHED).

    Args:
      blog_id: ID de la marca.
      post_id: ID de la publicación a editar.
      updates: dict con campos a cambiar. Ejemplos:
        {"text": "nuevo caption"}
        {"publicationDate": {"dateTime": "2026-05-15T10:00:00", "timezone": "America/Lima"}}
        {"media": ["nueva_url"]}
    """
    return _http_request(
        "PATCH",
        f"/v2/scheduler/posts/{post_id}",
        blog_id,
        json_body=updates,
    )


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  🏢 MARCAS                                                            ║
# ╚══════════════════════════════════════════════════════════════════════╝

@mcp.tool()
def listar_marcas() -> dict:
    """Lista TODAS las marcas conectadas a tu cuenta Metricool con sus blog_ids.

    Devuelve para cada marca: label (nombre), id (blog_id), networksData
    (cuentas conectadas en cada red), timezone.
    """
    return _http_request("GET", "/v2/settings/brands", blog_id=None)


@mcp.tool()
def buscar_marca_por_nombre(nombre: str) -> dict:
    """Busca una marca por nombre parcial (case-insensitive).

    Útil cuando dices 'muebles lozano' en vez de recordar el blog_id 6206541.
    Devuelve TODAS las que coinciden (puedes filtrar después).
    """
    all_brands = _http_request("GET", "/v2/settings/brands", blog_id=None)
    if "error" in all_brands:
        return all_brands
    data = all_brands.get("data", {})
    brands_list = data.get("brands", {}).get("data", []) if isinstance(data, dict) else []
    if not brands_list and "data" in all_brands:
        brands_list = all_brands.get("data", [])
    needle = nombre.lower().strip()
    matches = []
    for b in brands_list:
        if not isinstance(b, dict):
            continue
        label = (b.get("label") or "").lower()
        if needle in label:
            matches.append({
                "id": b.get("id"),
                "label": b.get("label"),
                "networks": b.get("networksData") or b.get("networks"),
                "timezone": b.get("timezone"),
            })
    return {"buscado": nombre, "encontradas": len(matches), "marcas": matches}


# ───────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ───────────────────────────────────────────────────────────────────────────
#
# Transport modes:
#   - stdio (default): para uso local en Claude Desktop/Code (mcp pipes via stdin/stdout)
#   - sse: para deploy remoto (Fly.io, etc.) — expone HTTP server con SSE protocol
#         que clientes MCP remotos (Claude.ai, Anthropic Routines) pueden consumir
#
# Backwards compatible: si no se setea MCP_TRANSPORT, sigue funcionando como antes
# (stdio). Solo cambia de comportamiento cuando MCP_TRANSPORT=sse en el entorno.

def main_sync():
    """Entry point sync. Detecta transport del entorno y dispatch."""
    transport = os.environ.get("MCP_TRANSPORT", "stdio").lower().strip()
    if transport == "sse" or transport == "http":
        # Remote deploy mode — escuchamos HTTP/SSE en 0.0.0.0
        host = os.environ.get("MCP_HOST", "0.0.0.0")
        port = int(os.environ.get("MCP_PORT", "8000"))
        print(f"🌐 Starting MCP server in SSE mode on {host}:{port}", file=sys.stderr)
        mcp.settings.host = host
        mcp.settings.port = port

        # CRITICAL para deploy remoto: FastMCP tiene DNS rebinding protection
        # con allowed_hosts=['127.0.0.1:*', 'localhost:*'] por default. Esto
        # rechaza con HTTP 421 cualquier request con Host header distinto
        # (ej. distinto-metricool-pro.fly.dev). Como vivimos detrás de Fly proxy
        # con TLS terminado, no hay riesgo real de DNS rebinding clásico.
        try:
            from mcp.server.transport_security import TransportSecuritySettings
            mcp.settings.transport_security = TransportSecuritySettings(
                enable_dns_rebinding_protection=False,
                allowed_hosts=["*"],
                allowed_origins=["*"],
            )
            print("   transport_security: rebinding_protection=OFF (allow all hosts)", file=sys.stderr)
        except ImportError:
            print("   ⚠ TransportSecuritySettings no disponible — skip", file=sys.stderr)

        mcp.run(transport="sse")
    else:
        # stdio (default) — uso local Claude Desktop/Code
        mcp.run()


if __name__ == "__main__":
    main_sync()
