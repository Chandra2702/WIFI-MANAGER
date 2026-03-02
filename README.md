# WiFi Manager

Aplikasi manajemen pelanggan WiFi dengan fitur:
- 📊 Database pelanggan (CRUD)
- 📅 Sesi penarikan (6 sesi per bulan)
- 📦 Paket WiFi management
- 🖨️ Print thermal receipt (58mm / 80mm / A4)
- 💾 Backup & Restore database
- ⚙️ Pengaturan sesi & printer

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MySQL

## Quick Install

### Via Curl (Otomatis)

```bash
curl -sL "https://raw.githubusercontent.com/Chandra2702/WIFI-MANAGER/main/install.sh?$(date +%s)" | sudo bash
```

### Manual Install

```bash
git clone https://github.com/Chandra2702/WIFI-MANAGER.git
cd WIFI-MANAGER
sudo bash install.sh
```

### Konfigurasi Yang Diminta

```
MySQL Root Password: *****
DB User [wifimanager]: 
DB Password: *****
Port Aplikasi [3000]: 
```

## Update

### Via Curl

```bash
curl -sL "https://raw.githubusercontent.com/Chandra2702/WIFI-MANAGER/main/update.sh?$(date +%s)" | sudo bash
```

### Manual

```bash
sudo bash /opt/wifi-manager/update.sh
```

## Systemd Service

```bash
# Status
systemctl status wifi-manager

# Stop / Start / Restart
systemctl stop wifi-manager
systemctl start wifi-manager
systemctl restart wifi-manager

# Lihat log
journalctl -u wifi-manager -f
```

## Struktur File

```
├── server.js          # Backend API (Express + MySQL)
├── src/App.tsx        # Frontend React
├── install.sh         # Script instalasi
├── update.sh          # Script update
├── .env.example       # Contoh konfigurasi
└── public/            # Frontend build output
```

## Konfigurasi (.env)

```env
DB_HOST=localhost
DB_USER=wifimanager
DB_PASS=password
DB_NAME=wifi_manager
PORT=3000
```

## API Endpoints

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/packages` | List semua paket |
| POST | `/api/packages` | Tambah paket |
| PUT | `/api/packages/:id` | Edit paket |
| DELETE | `/api/packages/:id` | Hapus paket |
| GET | `/api/clients` | List semua pelanggan |
| POST | `/api/clients` | Tambah pelanggan |
| PUT | `/api/clients/:id` | Edit pelanggan |
| DELETE | `/api/clients/:id` | Hapus pelanggan |
| GET | `/api/settings` | Get pengaturan |
| POST | `/api/settings` | Simpan pengaturan |
| GET | `/api/backup` | Download backup JSON |
| POST | `/api/restore` | Restore dari backup |

## License

MIT
