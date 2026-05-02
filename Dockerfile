# syntax=docker/dockerfile:1
#
# Imagem única — executa `wails dev`, que serve a interface na porta 34115.
# O WebKitGTK precisa de um display para iniciar; o Xvfb fornece um invisível.
# A janela nativa vai para lá e nunca é vista — acesse a interface pelo navegador.
#
FROM python:3.12-bookworm

ARG GO_VERSION=1.25.0
ARG INSTALL_PRIMATE=true

# ── Go ────────────────────────────────────────────────────────────────────────
RUN curl -fsSL https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz \
    | tar -C /usr/local -xz \
    && rm -f go${GO_VERSION}.linux-amd64.tar.gz
ENV PATH="/usr/local/go/bin:/root/go/bin:${PATH}"

# ── Node.js LTS ───────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Dependências do sistema ───────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc pkg-config \
    libgtk-3-dev libwebkit2gtk-4.0-dev \
    xvfb \
    ffmpeg git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Wails CLI ─────────────────────────────────────────────────────────────────
RUN go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0

# ── Upload-Assistant ──────────────────────────────────────────────────────────
RUN git clone --depth 1 https://github.com/Audionut/Upload-Assistant.git /opt/upload-assistant \
    && pip install --no-cache-dir -r /opt/upload-assistant/requirements.txt \
    && cp /opt/upload-assistant/data/example-config.py /opt/upload-assistant/data/config.py

# ── PR1MATE PDF (opcional, falha silenciosa) ──────────────────────────────────
RUN if [ "$INSTALL_PRIMATE" = "true" ]; then \
      git clone --depth 1 https://gitlab.com/n1njapr1mate/pr1mate-pdf.git /opt/pr1mate-pdf \
      && (pip install --no-cache-dir -r /opt/pr1mate-pdf/requirements.txt 2>/dev/null || true); \
    fi

# ── Código-fonte da interface ─────────────────────────────────────────────────
WORKDIR /app
COPY . .

# Baixa dependências antecipadamente para o `wails dev` iniciar mais rápido
RUN go mod download
RUN cd frontend && npm install

# ── Arquivos padrão de configuração ──────────────────────────────────────────
# Copiados para /config na primeira execução caso o usuário ainda não tenha os seus
COPY docker/config/config.py        /defaults/config.py
COPY docker/config/gui_settings.json /defaults/gui_settings.json

RUN mkdir -p /config /data /state

COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

VOLUME ["/config", "/data", "/state"]

# Porta padrão do wails dev
EXPOSE 34115

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
