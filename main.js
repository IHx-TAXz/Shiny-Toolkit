// server.js (Dijalankan menggunakan Node.js)
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const port = 3000; // Port untuk Node.js

// Path ke file Python Anda
const pythonFile = 'app.py';
// Log akan ditulis ke file ini
const logFile = 'python_output.log';

let pythonProcess = null;

// Fungsi untuk menjalankan/memulai Flask
function startPythonServer() {
    console.log(`\x1b[36m[Node.js]\x1b[0m Mencoba menjalankan file Python: ${pythonFile}`);
    
    // Hapus log lama jika ada
    if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
    }
    
    // Menjalankan Python sebagai subprocess
    // Catatan: Gunakan 'python' atau 'python3' tergantung konfigurasi OS Anda
    pythonProcess = spawn('python3', [pythonFile]); 

    pythonProcess.stdout.on('data', (data) => {
        const log = data.toString();
        // Tulis output ke file log
        fs.appendFileSync(logFile, log);
        console.log(`\x1b[32m[Python Log]\x1b[0m ${log.trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        const log = data.toString();
        fs.appendFileSync(logFile, log);
        console.error(`\x1b[31m[Python Error]\x1b[0m ${log.trim()}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`\x1b[35m[Node.js]\x1b[0m Python process terminated with code ${code}`);
        pythonProcess = null;
    });

    pythonProcess.on('error', (err) => {
        console.error(`\x1b[31m[Node.js Error]\x1b[0m Gagal menjalankan Python: ${err}`);
        fs.appendFileSync(logFile, `ERROR: Gagal menjalankan Python: ${err.message}\n`);
    });
}

// Mulai Python saat Node.js dimulai
startPythonServer();

// --- ROUTING API (Node.js) ---

// Endpoint untuk mendapatkan log terbaru
app.get('/api/log', (req, res) => {
    try {
        if (fs.existsSync(logFile)) {
            const logContent = fs.readFileSync(logFile, 'utf8');
            res.json({ log: logContent });
        } else {
            res.json({ log: 'Log file not found or Python not running.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to read log file.' });
    }
});

// Endpoint untuk status atau kontrol dasar (opsional)
app.get('/api/status', (req, res) => {
    res.json({ 
        status: pythonProcess ? 'Running' : 'Stopped',
        pid: pythonProcess ? pythonProcess.pid : null
    });
});

app.listen(port, () => {
    console.log(`\x1b[33m[Node.js]\x1b[0m Log Server berjalan di http://localhost:${port}`);
    console.log(`\x1b[33m[Node.js]\x1b[0m Buka browser untuk memantau log.`);
});
