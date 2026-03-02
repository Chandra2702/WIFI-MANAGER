const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'wifi_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize Database Tables & Default Settings
async function initDatabase() {
    const conn = await pool.getConnection();
    try {
        await conn.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price INT NOT NULL
      )
    `);

        await conn.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        package_id INT,
        join_date VARCHAR(50) NOT NULL,
        FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
      )
    `);

        await conn.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

        // Default settings
        const defaultSettings = [
            ['sesi_1_start', '1'], ['sesi_1_end', '5'],
            ['sesi_2_start', '6'], ['sesi_2_end', '10'],
            ['sesi_3_start', '11'], ['sesi_3_end', '15'],
            ['sesi_4_start', '16'], ['sesi_4_end', '20'],
            ['sesi_5_start', '21'], ['sesi_5_end', '25'],
            ['sesi_6_start', '26'], ['sesi_6_end', '31']
        ];

        for (const [key, value] of defaultSettings) {
            await conn.query(
                'INSERT IGNORE INTO settings (`key`, value) VALUES (?, ?)',
                [key, value]
            );
        }

        console.log('✅ Database tables initialized');
    } finally {
        conn.release();
    }
}

async function startServer() {
    // Initialize database
    await initDatabase();

    const app = express();
    app.use(express.json());

    // Serve static frontend files
    app.use(express.static(path.join(__dirname, 'public')));

    // ==================== API Routes ====================

    // --- Packages ---
    app.get('/api/packages', async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM packages');
            res.json(rows);
        } catch (err) {
            console.error('Error fetching packages:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/packages', async (req, res) => {
        try {
            const { name, price } = req.body;
            const [result] = await pool.query(
                'INSERT INTO packages (name, price) VALUES (?, ?)',
                [name, price]
            );
            res.json({ id: result.insertId });
        } catch (err) {
            console.error('Error creating package:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.put('/api/packages/:id', async (req, res) => {
        try {
            const { name, price } = req.body;
            await pool.query(
                'UPDATE packages SET name = ?, price = ? WHERE id = ?',
                [name, price, req.params.id]
            );
            res.json({ success: true });
        } catch (err) {
            console.error('Error updating package:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.delete('/api/packages/:id', async (req, res) => {
        try {
            await pool.query('DELETE FROM packages WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            console.error('Error deleting package:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // --- Clients ---
    app.get('/api/clients', async (req, res) => {
        try {
            const [rows] = await pool.query(`
        SELECT clients.*, packages.name AS package_name, packages.price AS package_price
        FROM clients
        LEFT JOIN packages ON clients.package_id = packages.id
      `);
            res.json(rows);
        } catch (err) {
            console.error('Error fetching clients:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/clients', async (req, res) => {
        try {
            const { name, package_id, join_date } = req.body;
            const [result] = await pool.query(
                'INSERT INTO clients (name, package_id, join_date) VALUES (?, ?, ?)',
                [name, package_id, join_date]
            );
            res.json({ id: result.insertId });
        } catch (err) {
            console.error('Error creating client:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.put('/api/clients/:id', async (req, res) => {
        try {
            const { name, package_id, join_date } = req.body;
            await pool.query(
                'UPDATE clients SET name = ?, package_id = ?, join_date = ? WHERE id = ?',
                [name, package_id, join_date, req.params.id]
            );
            res.json({ success: true });
        } catch (err) {
            console.error('Error updating client:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.delete('/api/clients/:id', async (req, res) => {
        try {
            await pool.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            console.error('Error deleting client:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // --- Settings ---
    app.get('/api/settings', async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM settings');
            const settingsObj = rows.reduce((acc, curr) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});
            res.json(settingsObj);
        } catch (err) {
            console.error('Error fetching settings:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/settings', async (req, res) => {
        try {
            const updates = req.body;
            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();
                for (const [key, value] of Object.entries(updates)) {
                    await conn.query(
                        'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
                        [key, value, value]
                    );
                }
                await conn.commit();
            } catch (err) {
                await conn.rollback();
                throw err;
            } finally {
                conn.release();
            }
            res.json({ success: true });
        } catch (err) {
            console.error('Error saving settings:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // --- Backup & Restore ---
    app.get('/api/backup', async (req, res) => {
        try {
            const [packages] = await pool.query('SELECT * FROM packages');
            const [clients] = await pool.query('SELECT id, name, package_id, join_date FROM clients');
            const [settings] = await pool.query('SELECT * FROM settings');

            const backup = {
                version: '1.0',
                created_at: new Date().toISOString(),
                data: { packages, clients, settings }
            };

            const filename = `wifi_manager_backup_${new Date().toISOString().slice(0, 10)}.json`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/json');
            res.json(backup);
        } catch (err) {
            console.error('Error creating backup:', err);
            res.status(500).json({ error: 'Gagal membuat backup' });
        }
    });

    app.post('/api/restore', async (req, res) => {
        try {
            const { data } = req.body;
            if (!data || !data.packages || !data.clients || !data.settings) {
                return res.status(400).json({ error: 'Format backup tidak valid' });
            }

            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();
                await conn.query('SET FOREIGN_KEY_CHECKS = 0');

                // Clear existing data
                await conn.query('DELETE FROM clients');
                await conn.query('DELETE FROM packages');
                await conn.query('DELETE FROM settings');

                // Restore packages
                for (const pkg of data.packages) {
                    await conn.query(
                        'INSERT INTO packages (id, name, price) VALUES (?, ?, ?)',
                        [pkg.id, pkg.name, pkg.price]
                    );
                }

                // Restore clients
                for (const client of data.clients) {
                    await conn.query(
                        'INSERT INTO clients (id, name, package_id, join_date) VALUES (?, ?, ?, ?)',
                        [client.id, client.name, client.package_id, client.join_date]
                    );
                }

                // Restore settings
                for (const setting of data.settings) {
                    await conn.query(
                        'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
                        [setting.key, setting.value, setting.value]
                    );
                }

                await conn.query('SET FOREIGN_KEY_CHECKS = 1');
                await conn.commit();
            } catch (err) {
                await conn.rollback();
                throw err;
            } finally {
                conn.release();
            }

            res.json({ success: true });
        } catch (err) {
            console.error('Error restoring backup:', err);
            res.status(500).json({ error: 'Gagal restore backup' });
        }
    });

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 WiFi Manager running on http://localhost:${PORT}`);
    });
}

startServer().catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
