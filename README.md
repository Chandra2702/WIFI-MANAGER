# WiFi Manager

Aplikasi manajemen pelanggan WiFi dengan fitur:
- 📊 Database pelanggan (CRUD)
- 📅 Sesi penarikan (6 sesi per bulan)
- 📦 Paket WiFi management
- 🖨️ Print thermal receipt
- ⚙️ Pengaturan sesi & printer

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: React + Tailwind CSS (pre-built)

## Quick Install (Linux)

```bash
curl -sL https://raw.githubusercontent.com/Chandra2702/WIFI-MANAGER/main/install.sh | sudo bash
```

## Manual Install

### 1. Prerequisites

- Node.js 18+ 
- MySQL 5.7+

### 2. Clone & Install

```bash
git clone https://github.com/Chandra2702/WIFI-MANAGER.git
cd WIFI-MANAGER
npm install --production
```

### 3. Setup Database

```sql
CREATE DATABASE wifi_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Configure

```bash
cp .env.example .env
nano .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=wifi_manager
PORT=3000
```

### 5. Run

```bash
node server.js
```

Buka `http://localhost:3000`

## Systemd Service

```bash
sudo nano /etc/systemd/system/wifi-manager.service
```

```ini
[Unit]
Description=WiFi Manager
After=network.target mysql.service

[Service]
Type=simple
WorkingDirectory=/path/to/WIFI-MANAGER
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable wifi-manager
sudo systemctl start wifi-manager
```

## Development

Untuk development frontend:

```bash
npm install          # Install semua deps (termasuk devDeps)
npm run build        # Build frontend ke folder public/
npm run start        # Jalankan server
```

## License

MIT
