#!/bin/bash

set -e

GEMINI_EXT_DIR="$HOME/.gemini/extensions/system-monitor-js"
LEGACY_DIR="$HOME/.local/share/mcp-servers/system-monitor-js"
MANIFEST_PATH="$GEMINI_EXT_DIR/manifest.txt"
REPO_URL="https://github.com/DarkPhilosophy/mcp-system-monitor-js.git"
SERVER_PATH="$GEMINI_EXT_DIR/src/index.js"

CODEX_CONFIG="$HOME/.codex/config.toml"
GEMINI_SETTINGS="$HOME/.gemini/settings.json"
AMP_SETTINGS="$HOME/.config/amp/settings.json"
OPENCODE_CONFIG="$HOME/.config/opencode/opencode.json"

snippet_codex=$(cat <<EOF_SNIP
[mcp_servers.system-monitor]
command = "node"
args = ["$SERVER_PATH"]
startup_timeout_sec = 30.0
EOF_SNIP
)

snippet_gemini=$(cat <<EOF_SNIP
{
  "mcpServers": {
    "system-monitor": {
      "command": "node",
      "args": [
        "$SERVER_PATH"
      ]
    }
  }
}
EOF_SNIP
)

snippet_amp=$(cat <<EOF_SNIP
{
  "amp.mcpServers": {
    "system-monitor": {
      "command": "node",
      "args": [
        "$SERVER_PATH"
      ]
    }
  }
}
EOF_SNIP
)

snippet_opencode=$(cat <<EOF_SNIP
{
  "mcp": {
    "system-monitor": {
      "type": "local",
      "command": [
        "node",
        "$SERVER_PATH"
      ],
      "enabled": true
    }
  }
}
EOF_SNIP
)

echo "🚀 Installing MCP System Monitor JS..."

# 1. Install/Update the Server
if [ -d "$GEMINI_EXT_DIR" ]; then
    echo "📦 Updating existing installation in $GEMINI_EXT_DIR..."
    cd "$GEMINI_EXT_DIR"
    git pull
else
    echo "📦 Cloning repository to $GEMINI_EXT_DIR..."
    mkdir -p "$(dirname "$GEMINI_EXT_DIR")"
    git clone "$REPO_URL" "$GEMINI_EXT_DIR"
    cd "$GEMINI_EXT_DIR"
fi

echo "📦 Installing dependencies..."
npm install --silent

# 2. Create/refresh legacy symlink for other MCP clients
mkdir -p "$(dirname "$LEGACY_DIR")"
ln -sfn "$GEMINI_EXT_DIR" "$LEGACY_DIR"
echo "🔗 Symlinked $LEGACY_DIR -> $GEMINI_EXT_DIR"

# 3. Update configs (Codex, Gemini, Amp, OpenCode)
if [[ -f "$CODEX_CONFIG" ]]; then
    backup="$CODEX_CONFIG.backup-$(date +%Y%m%d-%H%M)"
    cp -a "$CODEX_CONFIG" "$backup"

    if grep -q "\[mcp_servers\.system-monitor\]" "$CODEX_CONFIG"; then
        tmp="$CODEX_CONFIG.tmp"
        awk -v server_path="$SERVER_PATH" '
          BEGIN {in_block=0}
          /^\[mcp_servers\.system-monitor\]/ {print; in_block=1; next}
          /^\[/ {if (in_block) in_block=0; print}
          in_block==1 {
            if ($0 ~ /^command =/) {next}
            if ($0 ~ /^args =/) {next}
            if ($0 ~ /^startup_timeout_sec =/) {next}
            next
          }
          {print}
          END {}
        ' "$CODEX_CONFIG" > "$tmp"
        cat >> "$tmp" <<EOF_BLOCK
[mcp_servers.system-monitor]
command = "node"
args = ["$SERVER_PATH"]
startup_timeout_sec = 30.0
EOF_BLOCK
        mv "$tmp" "$CODEX_CONFIG"
    else
        printf "\n%s\n" "$snippet_codex" >> "$CODEX_CONFIG"
    fi

    echo "Updated: $CODEX_CONFIG"
    echo "Backup: $backup"
else
    echo "Codex config not found: $CODEX_CONFIG"
    echo "Manual snippet:"
    echo "$snippet_codex"
fi

echo

if [[ -f "$GEMINI_SETTINGS" ]]; then
    if ! command -v python3 >/dev/null 2>&1; then
        echo "python3 not found; cannot update $GEMINI_SETTINGS"
    else
        backup="$GEMINI_SETTINGS.backup-$(date +%Y%m%d-%H%M)"
        cp -a "$GEMINI_SETTINGS" "$backup"
        python3 - <<PY
import json
from pathlib import Path

path = Path("$GEMINI_SETTINGS")
with path.open("r", encoding="utf-8") as fh:
    data = json.load(fh)

servers = data.setdefault("mcpServers", {})
servers["system-monitor"] = {"command": "node", "args": ["$SERVER_PATH"]}

with path.open("w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2)
    fh.write("\\n")
PY
        echo "Updated: $GEMINI_SETTINGS"
        echo "Backup: $backup"
    fi
else
    echo "Gemini settings not found: $GEMINI_SETTINGS"
    echo "Manual snippet:"
    echo "$snippet_gemini"
fi

echo

if [[ -f "$AMP_SETTINGS" ]]; then
    if ! command -v python3 >/dev/null 2>&1; then
        echo "python3 not found; cannot update $AMP_SETTINGS"
    else
        backup="$AMP_SETTINGS.backup-$(date +%Y%m%d-%H%M)"
        cp -a "$AMP_SETTINGS" "$backup"
        python3 - <<PY
import json
from pathlib import Path

path = Path("$AMP_SETTINGS")
with path.open("r", encoding="utf-8") as fh:
    data = json.load(fh)

servers = data.setdefault("amp.mcpServers", {})
servers["system-monitor"] = {"command": "node", "args": ["$SERVER_PATH"]}

with path.open("w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2)
    fh.write("\\n")
PY
        echo "Updated: $AMP_SETTINGS"
        echo "Backup: $backup"
    fi
else
    echo "Amp settings not found: $AMP_SETTINGS"
    echo "Manual snippet:"
    echo "$snippet_amp"
fi

echo

if [[ -f "$OPENCODE_CONFIG" ]]; then
    if ! command -v python3 >/dev/null 2>&1; then
        echo "python3 not found; cannot update $OPENCODE_CONFIG"
    else
        backup="$OPENCODE_CONFIG.backup-$(date +%Y%m%d-%H%M)"
        cp -a "$OPENCODE_CONFIG" "$backup"
        python3 - <<PY
import json
from pathlib import Path

path = Path("$OPENCODE_CONFIG")
with path.open("r", encoding="utf-8") as fh:
    data = json.load(fh)

mcp = data.setdefault("mcp", {})
mcp["system-monitor"] = {"type": "local", "command": ["node", "$SERVER_PATH"], "enabled": True}

with path.open("w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2)
    fh.write("\\n")
PY
        echo "Updated: $OPENCODE_CONFIG"
        echo "Backup: $backup"
    fi
else
    echo "OpenCode config not found: $OPENCODE_CONFIG"
    echo "Manual snippet:"
    echo "$snippet_opencode"
fi

# 4. Write install manifest
VERSION="$(node -p \"require('./package.json').version\" 2>/dev/null || echo 'unknown')"
cat <<EOF > "$MANIFEST_PATH"
version=$VERSION
install_path=$GEMINI_EXT_DIR
legacy_path=$LEGACY_DIR
installed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
repo_url=$REPO_URL
EOF
echo "📦 Capturing installed file list (may take a moment)..."
{
    echo "files_sha256_start"
    find "$GEMINI_EXT_DIR" -type f -not -path "*/.git/*" -print0 | xargs -0 sha256sum
    echo "files_sha256_end"
} >> "$MANIFEST_PATH"
echo "🧾 Wrote manifest to $MANIFEST_PATH"

echo ""
echo "🎉 Installation complete!"
echo ""
echo "To run as a standalone HTTP server:"
echo "  node $GEMINI_EXT_DIR/src/index.js --http"
echo ""
