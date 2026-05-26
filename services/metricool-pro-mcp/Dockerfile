# metricool-pro-mcp — Dockerfile para deploy remoto en Fly.io
#
# Build: docker build -t metricool-pro-mcp .
# Run:   docker run -p 8000:8000 -e MCP_TRANSPORT=sse \
#          -e METRICOOL_USER_TOKEN=... -e METRICOOL_USER_ID=... metricool-pro-mcp
#
# Fly deploy:
#   fly secrets set METRICOOL_USER_TOKEN=... METRICOOL_USER_ID=...
#   fly deploy

FROM python:3.12-slim

# Sistema mínimo + netcat para TCP healthcheck (puerto abierto)
RUN apt-get update && apt-get install -y --no-install-recommends netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps primero (mejor cache layer)
COPY pyproject.toml ./
RUN pip install --no-cache-dir 'mcp>=1.0.0' 'httpx>=0.27'

# Copy app code
COPY server.py ./

# Defaults para SSE transport en deploy remoto
ENV MCP_TRANSPORT=sse \
    MCP_HOST=0.0.0.0 \
    MCP_PORT=8000 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# Healthcheck Docker: TCP check (puerto 8000 abierto). SSE rechaza HTTP plano.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD nc -z localhost 8000 || exit 1

CMD ["python", "server.py"]
