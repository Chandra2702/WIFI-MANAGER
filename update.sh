#!/bin/bash

# ============================================
#  WiFi Manager - Update Script
#  Usage: sudo bash update.sh
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="/opt/wifi-manager"
SERVICE_NAME="wifi-manager"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════╗"
echo "║        WiFi Manager - Updater             ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Jalankan script ini sebagai root (sudo)${NC}"
  exit 1
fi

# Check install dir
if [ ! -d "$INSTALL_DIR" ]; then
  echo -e "${RED}❌ WiFi Manager belum terinstall di ${INSTALL_DIR}${NC}"
  echo -e "${YELLOW}   Jalankan install.sh terlebih dahulu.${NC}"
  exit 1
fi

cd "$INSTALL_DIR"

# Step 1: Stop service
echo -e "${YELLOW}[1/5] Menghentikan service...${NC}"
systemctl stop ${SERVICE_NAME} 2>/dev/null || true
echo -e "${GREEN}   ✅ Service dihentikan${NC}"

# Step 2: Backup .env
echo -e "\n${YELLOW}[2/5] Backup konfigurasi...${NC}"
cp -f .env .env.backup 2>/dev/null || true
echo -e "${GREEN}   ✅ .env di-backup ke .env.backup${NC}"

# Step 3: Pull latest
echo -e "\n${YELLOW}[3/5] Mengupdate dari repository...${NC}"
git pull origin main 2>&1 | tail -1
echo -e "${GREEN}   ✅ Repository ter-update${NC}"

# Step 4: Install dependencies & rebuild
echo -e "\n${YELLOW}[4/5] Update dependencies & build...${NC}"
cp -f .env.backup .env 2>/dev/null || true
npm install --production > /dev/null 2>&1

if [ -f "package.json" ] && grep -q '"build"' package.json; then
  npm install > /dev/null 2>&1
  npx vite build --outDir public > /dev/null 2>&1
  echo -e "${GREEN}   ✅ Frontend di-rebuild${NC}"
fi

echo -e "${GREEN}   ✅ Dependencies ter-update${NC}"

# Step 5: Restart service
echo -e "\n${YELLOW}[5/5] Memulai ulang service...${NC}"
systemctl daemon-reload
systemctl start ${SERVICE_NAME}
echo -e "${GREEN}   ✅ Service ${SERVICE_NAME} berjalan${NC}"

# Done
SERVER_IP=$(hostname -I | awk '{print $1}')
APP_PORT=$(grep -oP 'PORT=\K.*' .env 2>/dev/null || echo "3000")

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════╗"
echo -e "║       ✅ Update Berhasil!                  ║"
echo -e "╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}  📡 Akses: http://${SERVER_IP}:${APP_PORT}${NC}"
echo -e "${BLUE}  📋 Status: ${CYAN}systemctl status ${SERVICE_NAME}${NC}"
echo -e "${BLUE}  📋 Logs:   ${CYAN}journalctl -u ${SERVICE_NAME} -f${NC}"
echo ""
