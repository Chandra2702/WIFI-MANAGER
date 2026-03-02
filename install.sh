#!/bin/bash

# ============================================
#  WiFi Manager - Installer Script
#  Support: Ubuntu, Debian, Armbian
#  Usage: curl -sL https://raw.githubusercontent.com/Chandra2702/WIFI-MANAGER/main/install.sh | sudo bash
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
REPO_URL="https://github.com/Chandra2702/WIFI-MANAGER"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════╗"
echo "║        WiFi Manager - Installer           ║"
echo "║        Node.js + MySQL Backend             ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Jalankan script ini sebagai root (sudo)${NC}"
  exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  echo -e "${RED}❌ OS tidak didukung${NC}"
  exit 1
fi

echo -e "${BLUE}📦 Sistem terdeteksi: ${OS} $(uname -m)${NC}"

# ==================== Install Dependencies ====================

echo -e "\n${YELLOW}[1/7] Menginstall dependencies...${NC}"

apt-get update -qq

apt-get install -y -qq curl git > /dev/null 2>&1

# Install Node.js
if ! command -v node &> /dev/null; then
  echo -e "${BLUE}   ➜ Menginstall Node.js 20 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
  echo -e "${GREEN}   ✅ Node.js $(node -v) terinstall${NC}"
else
  echo -e "${GREEN}   ✅ Node.js $(node -v) sudah tersedia${NC}"
fi

# Install MySQL
if ! command -v mysql &> /dev/null; then
  echo -e "${BLUE}   ➜ Menginstall MySQL Server...${NC}"
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq mysql-server > /dev/null 2>&1
  systemctl start mysql
  systemctl enable mysql > /dev/null 2>&1
  echo -e "${GREEN}   ✅ MySQL terinstall${NC}"
else
  echo -e "${GREEN}   ✅ MySQL sudah tersedia${NC}"
  systemctl start mysql 2>/dev/null || true
fi

# ==================== Konfigurasi MySQL (Input Manual) ====================

echo -e "\n${YELLOW}[2/7] Konfigurasi MySQL...${NC}"

DB_HOST="localhost"
DB_NAME="wifi_manager"

# MySQL root password dulu
MYSQL_ROOT_PASS=""
printf "   MySQL Root Password: "
while IFS= read -r -s -n1 char < /dev/tty; do
  if [[ -z "$char" ]]; then
    break
  elif [[ "$char" == $'\x7f' || "$char" == $'\b' ]]; then
    if [ -n "$MYSQL_ROOT_PASS" ]; then
      MYSQL_ROOT_PASS="${MYSQL_ROOT_PASS%?}"
      printf '\b \b'
    fi
  else
    MYSQL_ROOT_PASS+="$char"
    printf '*'
  fi
done
echo ""

read -p "   DB User [wifimanager]: " DB_USER < /dev/tty
DB_USER=${DB_USER:-wifimanager}

DB_PASS=""
printf "   DB Password: "
while IFS= read -r -s -n1 char < /dev/tty; do
  if [[ -z "$char" ]]; then
    break
  elif [[ "$char" == $'\x7f' || "$char" == $'\b' ]]; then
    if [ -n "$DB_PASS" ]; then
      DB_PASS="${DB_PASS%?}"
      printf '\b \b'
    fi
  else
    DB_PASS+="$char"
    printf '*'
  fi
done
echo ""

read -p "   Port Aplikasi [3000]: " APP_PORT < /dev/tty
APP_PORT=${APP_PORT:-3000}

echo ""

# ==================== Create Database & User ====================

echo -e "${YELLOW}[3/7] Membuat database & user MySQL...${NC}"

MYSQL_SETUP_SQL="
  CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
  ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
  GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
  FLUSH PRIVILEGES;
"

# Coba dengan root password, kalau kosong coba tanpa password
if [ -n "$MYSQL_ROOT_PASS" ]; then
  MYSQL_ROOT_CMD="mysql -u root -p${MYSQL_ROOT_PASS}"
else
  MYSQL_ROOT_CMD="mysql -u root"
fi

if $MYSQL_ROOT_CMD -e "$MYSQL_SETUP_SQL" 2>/dev/null; then
  echo -e "${GREEN}   ✅ Database '${DB_NAME}' siap${NC}"
  echo -e "${GREEN}   ✅ User '${DB_USER}' dibuat${NC}"
else
  echo -e "${RED}   ❌ Gagal membuat database/user MySQL. Periksa password root.${NC}"
  exit 1
fi

# ==================== Download Application ====================

echo -e "\n${YELLOW}[4/7] Mendownload aplikasi...${NC}"

# Deteksi apakah dijalankan dari dalam repo lokal (manual install)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"

if [ -f "$SCRIPT_DIR/server.js" ] && [ -f "$SCRIPT_DIR/package.json" ]; then
  # Manual install: copy dari folder lokal
  echo -e "${BLUE}   ➜ Mengcopy dari folder lokal...${NC}"
  if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR"
    cp -rf "$SCRIPT_DIR"/* "$INSTALL_DIR"/ 2>/dev/null || true
    cp -rf "$SCRIPT_DIR"/.[!.]* "$INSTALL_DIR"/ 2>/dev/null || true
  fi
elif [ -d "$INSTALL_DIR/.git" ]; then
  # Sudah terinstall, update via git
  echo -e "${BLUE}   ➜ Update dari repository...${NC}"
  cd "$INSTALL_DIR"
  git reset --hard origin/main > /dev/null 2>&1 || true
  git pull origin main > /dev/null 2>&1 || true
else
  # Fresh install via curl: clone dari GitHub
  rm -rf "$INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR" > /dev/null 2>&1
  cd "$INSTALL_DIR"
fi

echo -e "${GREEN}   ✅ Aplikasi di ${INSTALL_DIR}${NC}"

# ==================== Install npm dependencies ====================

echo -e "\n${YELLOW}[5/7] Menginstall npm packages...${NC}"

cd "$INSTALL_DIR"
npm install --production > /dev/null 2>&1
echo -e "${GREEN}   ✅ npm packages terinstall${NC}"

# ==================== Create .env ====================

echo -e "\n${YELLOW}[6/7] Membuat konfigurasi .env...${NC}"

cat > "$INSTALL_DIR/.env" << EOF
DB_HOST=${DB_HOST}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME}
PORT=${APP_PORT}
EOF

echo -e "${GREEN}   ✅ File .env dibuat${NC}"

# Build frontend
echo -e "${BLUE}   ➜ Building frontend...${NC}"
npm install > /dev/null 2>&1
npx vite build --outDir public > /dev/null 2>&1
echo -e "${GREEN}   ✅ Frontend ter-build${NC}"

# ==================== Create Systemd Service ====================

echo -e "\n${YELLOW}[7/7] Membuat systemd service...${NC}"

# Support port di bawah 1024 (misal 80, 443)
SERVICE_EXTRA=""
if [ "$APP_PORT" -lt 1024 ] 2>/dev/null; then
  SERVICE_EXTRA="AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE"
  echo -e "${BLUE}   ➜ Port ${APP_PORT} < 1024, menambahkan CAP_NET_BIND_SERVICE${NC}"
fi

cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=WiFi Manager
After=network.target mysql.service
Wants=mysql.service
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) ${INSTALL_DIR}/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=${SERVICE_NAME}
${SERVICE_EXTRA}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE_NAME} > /dev/null 2>&1
systemctl restart ${SERVICE_NAME}

echo -e "${GREEN}   ✅ Service ${SERVICE_NAME} aktif (auto-start & auto-restart)${NC}"

# ==================== Done ====================

SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════╗"
echo -e "║       ✅ Instalasi Berhasil!               ║"
echo -e "╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}  📡 Akses aplikasi:${NC}"
echo -e "     Local:   http://localhost:${APP_PORT}"
echo -e "     Network: http://${SERVER_IP}:${APP_PORT}"
echo ""
echo -e "${BLUE}  📋 Perintah:${NC}"
echo -e "     Status:  ${CYAN}systemctl status ${SERVICE_NAME}${NC}"
echo -e "     Stop:    ${CYAN}systemctl stop ${SERVICE_NAME}${NC}"
echo -e "     Start:   ${CYAN}systemctl start ${SERVICE_NAME}${NC}"
echo -e "     Restart: ${CYAN}systemctl restart ${SERVICE_NAME}${NC}"
echo -e "     Logs:    ${CYAN}journalctl -u ${SERVICE_NAME} -f${NC}"
echo ""
echo -e "${YELLOW}  📁 Lokasi: ${INSTALL_DIR}${NC}"
echo -e "${YELLOW}  📝 Config: ${INSTALL_DIR}/.env${NC}"
echo ""
