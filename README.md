# ✨ Shiny Portal - Ultimate Web Developer Toolkit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.8+](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Framework: Flask](https://img.shields.io/badge/Framework-Flask-000.svg)](https://flask.palletsprojects.com/)

**Shiny Portal** adalah kumpulan alat (toolkit) berbasis web yang dirancang untuk mempermudah tugas sehari-hari *Web Developer*. Dibangun menggunakan **Flask** (Python) dan *frontend* yang responsif (HTML/CSS/JS), alat ini menyediakan solusi cepat untuk *testing* API, *encoding*, *hashing*, dan *data generation*.

---

## 🌟 Fitur Utama

Shiny Portal dirancang dengan antarmuka gelap yang modern dan mencakup modul-modul penting:

1.  **🌐 HTTP Client (API Tester):**
    * Mengirim permintaan `GET`, `POST`, `PUT`, `DELETE`.
    * Mendukung *custom headers* dan *request body* (JSON/Raw).
    * Menampilkan status, waktu respons, dan ukuran data.
    * Fitur **History** dan **Save Request** (disimpan lokal menggunakan SQLite).

2.  **🔒 Encoder & Decoder:**
    * Mendukung *URL Encoding/Decoding*.
    * Mendukung *Base64 Encoding/Decoding*.
    * Fungsi *Hashing* satu arah: MD5, SHA1, SHA256, dan SHA512.

3.  **🔮 Data Generator:**
    * Menghasilkan **Secure Password** dan **API Key** (UUIDs).
    * Menghasilkan contoh **JWT Token** (JSON Web Tokens).
    * Menghasilkan **QR Code** dari teks atau URL.

4.  **🔎 JSON Analyzer:**
    * Memvalidasi format JSON.
    * Menganalisis dan menampilkan struktur, jalur (*path*), dan tipe data dari setiap properti JSON.

5.  **🐞 Issue Reporter (Terintegrasi Telegram):**
    * Mengirim laporan *bug* atau permintaan fitur langsung ke Telegram Bot (memerlukan konfigurasi *server-side*).

---

## 🛠️ Instalasi dan Setup

Ikuti langkah-langkah di bawah ini untuk menjalankan Shiny Portal di lingkungan lokal Anda.

### Prasyarat

* **Python 3.8+**
* **pip** (Package Installer for Python)

### Langkah-Langkah

1.  **Clone Repositori:**
    ```bash
    git clone https://github.com/IHx-TAXZ/Shiny-Toolkit.git
    cd Shiny-Toolkit
    ```

2.  **Instal Dependensi:**
    Proyek ini membutuhkan `Flask`, `requests`, `pyjwt`, `qrcode`, dan `Pillow`.
    ```bash
    pip install Flask requests pyjwt Pillow qrcode
    ```

3.  **Konfigurasi Telegram (Opsional):**
    Jika Anda ingin mengaktifkan fitur *Issue Reporter*, buka `app.py` dan ganti *placeholder* berikut:

    ```python
    TELEGRAM_TOKEN = 'PASTIKAN_INI_TOKEN_BOT_ANDA_YANG_BENAR' 
    TELEGRAM_CHAT_ID = 'ID_CHAT_ANDA' # (e.g., '-123456789')
    ```

4.  **Jalankan Aplikasi:**
    ```bash
    python app.py
    ```

5.  **Akses di Browser:**
    Buka peramban Anda dan akses:
    ```
    http://localhost:5000
    
    atau 
    
    http://127.0.0.1:5000
    ```

---

## 📝 Panduan Penggunaan

### Menguji API

1.  Buka tab **HTTP Client**.
2.  Pilih **HTTP Method** (`GET`, `POST`, `PUT`, `DELETE`).
3.  Masukkan URL Target (contoh: `https://httpbin.org/get`).
4.  Jika menggunakan `POST` atau `PUT`, isi *Request Body* di *textarea* **Request Body**.
5.  Klik **Submit Request**. Hasil respons (Status, Headers, Body) akan muncul di bagian bawah.

### Mengirim Laporan Isu (Telegram)

1.  Akses halaman **Report Issue** (`/report_issue`).
2.  Isi formulir dengan detail *bug* atau permintaan fitur.
3.  Klik **Submit Issue Report**.
4.  Flask akan memproses data dan mengirimkannya ke Chat ID Telegram yang telah Anda tentukan.

---

## 🤝 Kontribusi

Kontribusi dipersilakan! Jika Anda menemukan *bug* atau memiliki saran fitur, silakan:

1.  *Fork* repositori ini.
2.  Buat *branch* baru (`git checkout -b feature/AmazingFeature`).
3.  *Commit* perubahan Anda (`git commit -m 'Add some AmazingFeature'`).
4.  *Push* ke *branch* (`git push origin feature/AmazingFeature`).
5.  Buka *Pull Request*.

---

## 📄 Lisensi

Didistribusikan di bawah Lisensi MIT. Lihat `LICENSE` untuk informasi lebih lanjut.

***
*Copyright By Shiny -Dev*
