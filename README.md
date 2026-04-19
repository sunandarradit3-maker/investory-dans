# DAN'S INVENTORY SYSTEM
**Sistem Inventaris Gudang Topi — Next.js + Supabase + Vercel**

---

## CARA DEPLOY (ikutin urutan ini)

### LANGKAH 1 — Setup Supabase (database gratis)

1. Buka https://supabase.com → Sign Up gratis
2. Klik **New Project** → isi nama project: `dans-inventory`
3. Pilih region: **Southeast Asia (Singapore)**
4. Tunggu project dibuat (~2 menit)
5. Di sidebar kiri klik **SQL Editor**
6. Copy semua isi file `supabase-schema.sql` → paste → klik **Run**
7. Selesai! Database siap.

**Ambil credentials:**
- Settings → API
- Copy **Project URL** → ini `SUPABASE_URL`
- Copy **anon public** key → ini `SUPABASE_ANON_KEY`

---

### LANGKAH 2 — Upload ke GitHub

1. Buka https://github.com → New Repository
2. Nama repo: `dans-inventory`
3. Upload semua file project ini (atau `git push`)

---

### LANGKAH 3 — Deploy ke Vercel

1. Buka https://vercel.com → Sign Up dengan GitHub
2. Klik **Add New Project** → pilih repo `dans-inventory`
3. Di bagian **Environment Variables**, tambahkan:
   ```
   NEXT_PUBLIC_SUPABASE_URL     = https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGci...
   ```
4. Klik **Deploy**
5. Tunggu ~2 menit → website lo live!

---

## FITUR

| Fitur | Keterangan |
|-------|-----------|
| Data Barang | Tambah, edit, hapus barang. Stok awal bisa diset. |
| Pemasukan | Catat barang masuk + nama pengirim. Stok otomatis bertambah. |
| Pengeluaran | Catat barang keluar + nama penerima. Stok otomatis berkurang. Validasi stok tidak bisa minus. |
| Formula Stok | `Stok Akhir = Stok Awal + Σ Masuk − Σ Keluar` (real-time dari database) |
| Preview Stok | Sebelum simpan, ada preview stok sebelum/sesudah |
| Export CSV | Export semua data ke Excel-compatible CSV |
| Export JSON | Backup data ke file JSON |
| Data Awet | Data disimpan di Supabase (PostgreSQL cloud) — tidak hilang meski hapus cache/browser/HP |

---

## JENIS SATUAN YANG TERSEDIA
- Bungkus
- Kodi
- Picis
- Golong
- Meter

---

## DEVELOPMENT LOKAL (opsional)

```bash
npm install
cp .env.local.example .env.local
# edit .env.local, isi SUPABASE_URL dan ANON_KEY
npm run dev
# buka http://localhost:3000
```

---

## STRUKTUR PROJECT
```
dans-inventory/
├── pages/
│   ├── index.js          # UI utama
│   ├── _app.js
│   └── api/
│       ├── barang.js     # CRUD barang
│       ├── pemasukan.js  # CRUD pemasukan
│       ├── pengeluaran.js# CRUD pengeluaran
│       └── export.js     # Export CSV/JSON
├── lib/
│   └── supabase.js       # Supabase client
├── styles/
│   └── globals.css       # IBM ERP style
├── supabase-schema.sql   # SQL untuk Supabase
├── .env.local.example
├── next.config.js
└── package.json
```
