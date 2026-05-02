#!/bin/bash
set -e

UA_PATH="${UA_PATH:-/opt/upload-assistant}"
CONFIG_DIR="${CONFIG_DIR:-/config}"
STATE_DIR="${STATE_DIR:-/state}"

mkdir -p "$STATE_DIR"

# ── Primeira execução: cria os arquivos de configuração no diretório mapeado ──
# O usuário edita esses arquivos e reinicia o container para aplicar as mudanças.
if [ ! -f "$CONFIG_DIR/config.py" ]; then
    cp /defaults/config.py "$CONFIG_DIR/config.py"
fi
if [ ! -f "$CONFIG_DIR/gui_settings.json" ]; then
    cp /defaults/gui_settings.json "$CONFIG_DIR/gui_settings.json"
fi

# ── Aplica o config.py no Upload-Assistant ────────────────────────────────────
cp "$CONFIG_DIR/config.py" "$UA_PATH/data/config.py"

# ── O Wails lê gui_settings.json e tracker_stats.db do diretório de trabalho ─
ln -sf "$CONFIG_DIR/gui_settings.json" /app/gui_settings.json
touch "$STATE_DIR/tracker_stats.db"
ln -sf "$STATE_DIR/tracker_stats.db" /app/tracker_stats.db

# ── Xvfb ─────────────────────────────────────────────────────────────────────
# O WebKitGTK (usado pelo Wails) precisa de um display para inicializar,
# mesmo que ninguém o veja — a interface real é servida pelo navegador na porta 34115.
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
export DISPLAY=:99

# ── Inicialização ─────────────────────────────────────────────────────────────
cd /app
exec wails dev
