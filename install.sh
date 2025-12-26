#!/bin/bash

set -e

INSTALL_DIR="$HOME/.local/share/mcp-servers/mcp-system-monitor-js"
OPENCODE_CONFIG="$HOME/.config/opencode/opencode.json"
REPO_URL="https://github.com/DarkPhilosophy/mcp-system-monitor-js.git"

echo "🚀 Installing MCP System Monitor JS..."

# 1. Install/Update the Server
if [ -d "$INSTALL_DIR" ]; then
    echo "📦 Updating existing installation in $INSTALL_DIR..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "📦 Cloning repository to $INSTALL_DIR..."
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

echo "📦 Installing dependencies..."
npm install --silent

# 2. Configure OpenCode if available
if [ -f "$OPENCODE_CONFIG" ]; then
    echo "⚙️  Configuring OpenCode..."
    
    # Check if 'jq' is installed
    if ! command -v jq &> /dev/null; then
        echo "⚠️  'jq' is not installed. Skipping automatic config update."
        echo "Please add the following to your '$OPENCODE_CONFIG':"
        echo ""
        echo '  "mcp-system-monitor": {'
        echo '    "type": "local",'
        echo '    "command": ["node", "'$INSTALL_DIR'/src/index.js"],'
        echo '    "enabled": true'
        echo '  }'
    else
        # Use jq to update or add the entry
        TMP_FILE=$(mktemp)
        jq --arg cmd "$INSTALL_DIR/src/index.js" \
           '.mcp["mcp-system-monitor"] = { "type": "local", "command": ["node", $cmd], "enabled": true }' \
           "$OPENCODE_CONFIG" > "$TMP_FILE" && mv "$TMP_FILE" "$OPENCODE_CONFIG"
        echo "✅ OpenCode configuration updated!"
    fi
else
    echo "ℹ️  OpenCode configuration not found at $OPENCODE_CONFIG."
    echo "To use this server with an MCP client, add this command:"
    echo "  node $INSTALL_DIR/src/index.js"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "To run as a standalone HTTP server:"
echo "  node $INSTALL_DIR/src/index.js --http"
echo ""
