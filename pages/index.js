import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

const JENIS_OPTIONS = ['Bungkus', 'Kodi', 'Picis', 'Golong', 'Meter']
const today = () => new Date().toISOString().split('T')[0]
const fmt = n => Number(n ?? 0).toLocaleString('id-ID')

// ─── API helpers ────────────────────────────────────────────
async function api(path, method = 'GET', body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Server error')
  return data
}

// ─── Toast ──────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([])
  const add = (msg, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }
  return { toasts, ok: m => add(m, 'success'), err: m => add(m, 'error'), info: m => add(m, 'info') }
}

// ─── Confirm dialog ─────────────────────────────────────────
function Confirm({ open, title, body, onOk, onCancel }) {
  if (!open) return null
  return (
    <div className="confirm-overlay open">
      <div className="confirm-box">
        <div className="confirm-header">{title}</div>
        <div className="confirm-body">{body}</div>
        <div className="confirm-footer">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Batal</button>
          <button className="btn btn-danger btn-sm" onClick={onOk}>Ya, Hapus</button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN ───────────────────────────────────────────────────
export default function Home() {
  const [page, setPage] = useState('dashboard')
  const [barang, setBarang] = useState([])
  const [pemasukan, setPemasukan] = useState([])
  const [pengeluaran, setPengeluaran] = useState([])
  const [loading, setLoading] = useState({ b: false, p: false, k: false })
  const [clock, setClock] = useState('')
  const toast = useToast()
  const [confirm, setConfirm] = useState(null)

  // Modal states
  const [modalBarang, setModalBarang] = useState(false)
  const [modalMasuk, setModalMasuk] = useState(false)
  const [modalKeluar, setModalKeluar] = useState(false)
  const [editBarang, setEditBarang] = useState(null)

  // Form states
  const [fBarang, setFBarang] = useState({ nama: '', jenis: '', stok_awal: '', keterangan: '' })
  const [fMasuk, setFMasuk] = useState({ tanggal: today(), pengirim: '', barang_id: '', jumlah: '', keterangan: '' })
  const [fKeluar, setFKeluar] = useState({ tanggal: today(), penerima: '', barang_id: '', jumlah: '', keterangan: '' })

  const [search, setSearch] = useState({ b: '', p: '', k: '' })

  // Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick(); const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [])

  // Fetch
  const loadBarang = useCallback(async () => {
    setLoading(l => ({ ...l, b: true }))
    try { setBarang(await api('/api/barang')) } catch (e) { toast.err(e.message) }
    setLoading(l => ({ ...l, b: false }))
  }, [])
  const loadMasuk = useCallback(async () => {
    setLoading(l => ({ ...l, p: true }))
    try { setPemasukan(await api('/api/pemasukan')) } catch (e) { toast.err(e.message) }
    setLoading(l => ({ ...l, p: false }))
  }, [])
  const loadKeluar = useCallback(async () => {
    setLoading(l => ({ ...l, k: true }))
    try { setPengeluaran(await api('/api/pengeluaran')) } catch (e) { toast.err(e.message) }
    setLoading(l => ({ ...l, k: false }))
  }, [])

  useEffect(() => { loadBarang(); loadMasuk(); loadKeluar() }, [])

  // Stok aktual per barang_id (formula: stok_awal + masuk - keluar)
  const getStokAkhir = id => {
    const b = barang.find(x => x.id === id)
    if (!b) return 0
    return (b.stok_akhir ?? b.stok_awal)
  }

  // Barang CRUD
  const submitBarang = async () => {
    try {
      const payload = { ...fBarang, stok_awal: parseInt(fBarang.stok_awal) || 0 }
      if (!payload.nama.trim()) { toast.err('Nama barang wajib diisi'); return }
      if (!payload.jenis) { toast.err('Pilih jenis satuan'); return }
      if (editBarang) {
        await api('/api/barang', 'PUT', { ...payload, id: editBarang.id })
        toast.ok('Barang berhasil diupdate')
      } else {
        await api('/api/barang', 'POST', payload)
        toast.ok('Barang berhasil ditambahkan')
      }
      setModalBarang(false); setEditBarang(null)
      setFBarang({ nama: '', jenis: '', stok_awal: '', keterangan: '' })
      loadBarang()
    } catch (e) { toast.err(e.message) }
  }
  const openEditBarang = b => {
    setEditBarang(b)
    setFBarang({ nama: b.nama, jenis: b.jenis, stok_awal: b.stok_awal, keterangan: b.keterangan || '' })
    setModalBarang(true)
  }
  const hapusBarang = id => {
    setConfirm({
      title: 'Hapus Barang',
      body: 'Semua data pemasukan & pengeluaran terkait barang ini juga akan terhapus. Lanjutkan?',
      onOk: async () => {
        setConfirm(null)
        try { await api('/api/barang', 'DELETE', { id }); toast.ok('Barang dihapus'); loadBarang(); loadMasuk(); loadKeluar() }
        catch (e) { toast.err(e.message) }
      }
    })
  }

  // Pemasukan
  const stokSebelumMasuk = fMasuk.barang_id ? getStokAkhir(fMasuk.barang_id) : 0
  const stokSesudahMasuk = stokSebelumMasuk + (parseInt(fMasuk.jumlah) || 0)
  const submitMasuk = async () => {
    try {
      if (!fMasuk.pengirim.trim()) { toast.err('Nama pengirim wajib'); return }
      if (!fMasuk.barang_id) { toast.err('Pilih barang'); return }
      if (!parseInt(fMasuk.jumlah) || parseInt(fMasuk.jumlah) <= 0) { toast.err('Jumlah harus > 0'); return }
      await api('/api/pemasukan', 'POST', { ...fMasuk, jumlah: parseInt(fMasuk.jumlah) })
      toast.ok('Pemasukan berhasil dicatat')
      setModalMasuk(false)
      setFMasuk({ tanggal: today(), pengirim: '', barang_id: '', jumlah: '', keterangan: '' })
      loadMasuk(); loadBarang()
    } catch (e) { toast.err(e.message) }
  }
  const hapusMasuk = id => {
    setConfirm({
      title: 'Hapus Transaksi',
      body: 'Hapus data pemasukan ini? Stok barang akan diperbarui otomatis.',
      onOk: async () => {
        setConfirm(null)
        try { await api('/api/pemasukan', 'DELETE', { id }); toast.ok('Transaksi dihapus'); loadMasuk(); loadBarang() }
        catch (e) { toast.err(e.message) }
      }
    })
  }

  // Pengeluaran
  const stokSebelumKeluar = fKeluar.barang_id ? getStokAkhir(fKeluar.barang_id) : 0
  const stokSesudahKeluar = stokSebelumKeluar - (parseInt(fKeluar.jumlah) || 0)
  const submitKeluar = async () => {
    try {
      if (!fKeluar.penerima.trim()) { toast.err('Nama penerima wajib'); return }
      if (!fKeluar.barang_id) { toast.err('Pilih barang'); return }
      if (!parseInt(fKeluar.jumlah) || parseInt(fKeluar.jumlah) <= 0) { toast.err('Jumlah harus > 0'); return }
      await api('/api/pengeluaran', 'POST', { ...fKeluar, jumlah: parseInt(fKeluar.jumlah) })
      toast.ok('Pengeluaran berhasil dicatat')
      setModalKeluar(false)
      setFKeluar({ tanggal: today(), penerima: '', barang_id: '', jumlah: '', keterangan: '' })
      loadKeluar(); loadBarang()
    } catch (e) { toast.err(e.message) }
  }
  const hapusKeluar = id => {
    setConfirm({
      title: 'Hapus Transaksi',
      body: 'Hapus data pengeluaran ini? Stok barang akan diperbarui otomatis.',
      onOk: async () => {
        setConfirm(null)
        try { await api('/api/pengeluaran', 'DELETE', { id }); toast.ok('Transaksi dihapus'); loadKeluar(); loadBarang() }
        catch (e) { toast.err(e.message) }
      }
    })
  }

  // Export
  const doExport = (type, format) => {
    window.open(`/api/export?type=${type}&format=${format}`, '_blank')
  }

  // Filter
  const filteredBarang = barang.filter(b =>
    b.nama.toLowerCase().includes(search.b.toLowerCase()) ||
    b.jenis.toLowerCase().includes(search.b.toLowerCase())
  )
  const filteredMasuk = pemasukan.filter(p =>
    (p.barang?.nama || '').toLowerCase().includes(search.p.toLowerCase()) ||
    (p.pengirim || '').toLowerCase().includes(search.p.toLowerCase()) ||
    (p.tanggal || '').includes(search.p)
  )
  const filteredKeluar = pengeluaran.filter(k =>
    (k.barang?.nama || '').toLowerCase().includes(search.k.toLowerCase()) ||
    (k.penerima || '').toLowerCase().includes(search.k.toLowerCase()) ||
    (k.tanggal || '').includes(search.k)
  )

  // Dashboard stats
  const totalStok = barang.reduce((s, b) => s + (b.stok_akhir ?? b.stok_awal), 0)
  const totalMasukUnit = pemasukan.reduce((s, p) => s + p.jumlah, 0)
  const totalKeluarUnit = pengeluaran.reduce((s, k) => s + k.jumlah, 0)

  const pageLabels = { dashboard: 'Dashboard', barang: 'Data Barang', pemasukan: 'Pemasukan', pengeluaran: 'Pengeluaran' }

  return (
    <>
      <Head>
        <title>DAN&apos;S Inventory System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="name">DAN&apos;S INVENTORY</div>
            <div className="sub">GUDANG TOPI · v2.0</div>
          </div>
          <nav>
            <div className="nav-group">
              <div className="nav-group-label">Overview</div>
              <div className={`nav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>
                <span className="nav-icon">◈</span> Dashboard
              </div>
            </div>
            <div className="nav-group">
              <div className="nav-group-label">Master Data</div>
              <div className={`nav-item ${page === 'barang' ? 'active' : ''}`} onClick={() => setPage('barang')}>
                <span className="nav-icon">◻</span> Data Barang
              </div>
            </div>
            <div className="nav-group">
              <div className="nav-group-label">Transaksi</div>
              <div className={`nav-item ${page === 'pemasukan' ? 'active' : ''}`} onClick={() => setPage('pemasukan')}>
                <span className="nav-icon">↓</span> Pemasukan
              </div>
              <div className={`nav-item ${page === 'pengeluaran' ? 'active' : ''}`} onClick={() => setPage('pengeluaran')}>
                <span className="nav-icon">↑</span> Pengeluaran
              </div>
            </div>
          </nav>
          <div className="sidebar-footer">
            Powered by Supabase + Vercel
          </div>
        </aside>

        {/* MAIN */}
        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <div className="topbar-breadcrumb">
                <span>DAN&apos;S Inventory</span>
                <span className="sep">/</span>
                <span className="current">{pageLabels[page]}</span>
              </div>
            </div>
            <div className="topbar-right">
              <span className="topbar-clock">{clock}</span>
            </div>
          </header>

          <div className="content">

            {/* ═══════════ DASHBOARD ═══════════ */}
            {page === 'dashboard' && (
              <>
                <div className="page-header">
                  <div className="page-title">Dashboard</div>
                  <div className="page-desc">Ringkasan inventaris gudang topi DAN&apos;S</div>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Total Produk</div>
                    <div className="stat-value">{barang.length}</div>
                    <div className="stat-sub">jenis barang terdaftar</div>
                  </div>
                  <div className="stat-card blue">
                    <div className="stat-label">Total Stok Akhir</div>
                    <div className="stat-value">{fmt(totalStok)}</div>
                    <div className="stat-sub">unit tersisa di gudang</div>
                  </div>
                  <div className="stat-card green">
                    <div className="stat-label">Total Pemasukan</div>
                    <div className="stat-value">{fmt(totalMasukUnit)}</div>
                    <div className="stat-sub">unit masuk ({pemasukan.length} transaksi)</div>
                  </div>
                  <div className="stat-card red">
                    <div className="stat-label">Total Pengeluaran</div>
                    <div className="stat-value">{fmt(totalKeluarUnit)}</div>
                    <div className="stat-sub">unit keluar ({pengeluaran.length} transaksi)</div>
                  </div>
                </div>

                <div className="export-row">
                  <button className="btn btn-ghost btn-sm" onClick={() => doExport('barang', 'csv')}>↓ Export Stok CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => doExport('pemasukan', 'csv')}>↓ Export Pemasukan CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => doExport('pengeluaran', 'csv')}>↓ Export Pengeluaran CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => doExport('barang', 'json')}>↓ Backup JSON</button>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Nama Barang</th>
                        <th>Jenis</th>
                        <th style={{ textAlign: 'right' }}>Stok Awal</th>
                        <th style={{ textAlign: 'right' }}>Total Masuk</th>
                        <th style={{ textAlign: 'right' }}>Total Keluar</th>
                        <th style={{ textAlign: 'right' }}>Stok Akhir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.b ? (
                        <tr><td colSpan={7}><div className="loading">Memuat data</div></td></tr>
                      ) : barang.length === 0 ? (
                        <tr><td colSpan={7}><div className="empty"><div className="empty-icon">◻</div>Belum ada barang. Tambah di menu Data Barang.</div></td></tr>
                      ) : barang.map((b, i) => (
                        <tr key={b.id}>
                          <td className="td-mono td-center">{i + 1}</td>
                          <td><strong>{b.nama}</strong></td>
                          <td><span className="badge badge-blue">{b.jenis}</span></td>
                          <td className="td-num">{fmt(b.stok_awal)}</td>
                          <td className="td-num green">+{fmt(b.total_masuk)}</td>
                          <td className="td-num red">−{fmt(b.total_keluar)}</td>
                          <td className="td-num blue" style={{ fontWeight: 700 }}>{fmt(b.stok_akhir)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ═══════════ BARANG ═══════════ */}
            {page === 'barang' && (
              <>
                <div className="page-header">
                  <div className="page-title">Data Barang</div>
                  <div className="page-desc">Daftarkan semua jenis barang di gudang beserta stok awal</div>
                </div>

                <div className="export-row">
                  <button className="btn btn-ghost btn-sm" onClick={() => doExport('barang', 'csv')}>↓ Export CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => doExport('barang', 'json')}>↓ Export JSON</button>
                </div>

                <div className="toolbar">
                  <div className="toolbar-left">
                    <div className="search-wrap">
                      <span className="search-icon">⌕</span>
                      <input className="search-input" placeholder="Cari nama / jenis..." value={search.b} onChange={e => setSearch(s => ({ ...s, b: e.target.value }))} />
                    </div>
                  </div>
                  <div className="toolbar-right">
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditBarang(null); setFBarang({ nama: '', jenis: '', stok_awal: '', keterangan: '' }); setModalBarang(true) }}>
                      + Tambah Barang
                    </button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Nama Barang</th>
                        <th>Jenis Satuan</th>
                        <th style={{ textAlign: 'right' }}>Stok Awal</th>
                        <th style={{ textAlign: 'right' }}>Total Masuk</th>
                        <th style={{ textAlign: 'right' }}>Total Keluar</th>
                        <th style={{ textAlign: 'right' }}>Stok Akhir</th>
                        <th style={{ textAlign: 'right' }}>Formula</th>
                        <th>Keterangan</th>
                        <th style={{ width: 100 }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.b ? (
                        <tr><td colSpan={10}><div className="loading">Memuat data</div></td></tr>
                      ) : filteredBarang.length === 0 ? (
                        <tr><td colSpan={10}><div className="empty"><div className="empty-icon">◻</div>{barang.length ? 'Tidak ditemukan' : 'Belum ada barang'}</div></td></tr>
                      ) : filteredBarang.map((b, i) => (
                        <tr key={b.id}>
                          <td className="td-mono td-center">{i + 1}</td>
                          <td><strong>{b.nama}</strong></td>
                          <td><span className="badge badge-blue">{b.jenis}</span></td>
                          <td className="td-num">{fmt(b.stok_awal)}</td>
                          <td className="td-num green">+{fmt(b.total_masuk)}</td>
                          <td className="td-num red">−{fmt(b.total_keluar)}</td>
                          <td className="td-num blue" style={{ fontWeight: 700 }}>{fmt(b.stok_akhir)}</td>
                          <td className="td-mono" style={{ fontSize: 10, color: '#8d8d8d', textAlign: 'right' }}>{b.stok_awal}+{b.total_masuk}−{b.total_keluar}</td>
                          <td style={{ color: '#8d8d8d', fontSize: 12 }}>{b.keterangan || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-ghost btn-xs" onClick={() => openEditBarang(b)}>Edit</button>
                              <button className="btn btn-danger btn-xs" onClick={() => hapusBarang(b.id)}>Hapus</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ═══════════ PEMASUKAN ═══════════ */}
            {page === 'pemasukan' && (
              <>
                <div className="page-header">
                  <div className="page-title">Pemasukan Barang</div>
                  <div className="page-desc">Catat setiap barang yang masuk ke gudang — stok otomatis bertambah</div>
                </div>

                <div className="summary-row">
                  <div className="summary-chip">
                    <div className="sc-label">Total Transaksi</div>
                    <div className="sc-val">{pemasukan.length}</div>
                  </div>
                  <div className="summary-chip green">
                    <div className="sc-label">Total Unit Masuk</div>
                    <div className="sc-val">+{fmt(totalMasukUnit)}</div>
                  </div>
                  <div className="summary-chip blue">
                    <div className="sc-label">Pengirim Unik</div>
                    <div className="sc-val">{new Set(pemasukan.map(p => p.pengirim)).size}</div>
                  </div>
                </div>

                <div className="export-row">
                  <button className="btn btn-ghost btn-sm" onClick={() => doExport('pemasukan', 'csv')}>↓ Export CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => doExport('pemasukan', 'json')}>↓ Export JSON</button>
                </div>

                <div className="toolbar">
                  <div className="toolbar-left">
                    <div className="search-wrap">
                      <span className="search-icon">⌕</span>
                      <input className="search-input" placeholder="Cari pengirim / barang / tgl..." value={search.p} onChange={e => setSearch(s => ({ ...s, p: e.target.value }))} />
                    </div>
                  </div>
                  <div className="toolbar-right">
                    <button className="btn btn-primary btn-sm" onClick={() => { setFMasuk({ tanggal: today(), pengirim: '', barang_id: '', jumlah: '', keterangan: '' }); setModalMasuk(true) }}>
                      + Tambah Pemasukan
                    </button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Tanggal</th>
                        <th>Pengirim</th>
                        <th>Nama Barang</th>
                        <th>Jenis</th>
                        <th style={{ textAlign: 'right' }}>Jumlah Masuk</th>
                        <th>Keterangan</th>
                        <th style={{ width: 70 }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.p ? (
                        <tr><td colSpan={8}><div className="loading">Memuat data</div></td></tr>
                      ) : filteredMasuk.length === 0 ? (
                        <tr><td colSpan={8}><div className="empty"><div className="empty-icon">↓</div>{pemasukan.length ? 'Tidak ditemukan' : 'Belum ada transaksi pemasukan'}</div></td></tr>
                      ) : filteredMasuk.map((p, i) => (
                        <tr key={p.id}>
                          <td className="td-mono td-center">{i + 1}</td>
                          <td className="td-mono">{p.tanggal}</td>
                          <td><strong>{p.pengirim}</strong></td>
                          <td>{p.barang?.nama || '—'}</td>
                          <td><span className="badge badge-blue">{p.barang?.jenis || '—'}</span></td>
                          <td className="td-num green" style={{ fontWeight: 700 }}>+{fmt(p.jumlah)}</td>
                          <td style={{ color: '#8d8d8d', fontSize: 12 }}>{p.keterangan || '—'}</td>
                          <td><button className="btn btn-danger btn-xs" onClick={() => hapusMasuk(p.id)}>Hapus</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ═══════════ PENGELUARAN ═══════════ */}
            {page === 'pengeluaran' && (
              <>
                <div className="page-header">
                  <div className="page-title">Pengeluaran Barang</div>
                  <div className="page-desc">Catat setiap barang yang keluar dari gudang — stok otomatis berkurang</div>
                </div>

                <div className="summary-row">
                  <div className="summary-chip">
                    <div className="sc-label">Total Transaksi</div>
                    <div className="sc-val">{pengeluaran.length}</div>
                  </div>
                  <div className="summary-chip red">
                    <div className="sc-label">Total Unit Keluar</div>
                    <div className="sc-val">−{fmt(totalKeluarUnit)}</div>
                  </div>
                  <div className="summary-chip blue">
                    <div className="sc-label">Penerima Unik</div>
                    <div className="sc-val">{new Set(pengeluaran.map(k => k.penerima)).size}</div>
                  </div>
                </div>

                <div className="export-row">
                  <button className="btn btn-ghost btn-sm" onClick={() => doExport('pengeluaran', 'csv')}>↓ Export CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => doExport('pengeluaran', 'json')}>↓ Export JSON</button>
                </div>

                <div className="toolbar">
                  <div className="toolbar-left">
                    <div className="search-wrap">
                      <span className="search-icon">⌕</span>
                      <input className="search-input" placeholder="Cari penerima / barang / tgl..." value={search.k} onChange={e => setSearch(s => ({ ...s, k: e.target.value }))} />
                    </div>
                  </div>
                  <div className="toolbar-right">
                    <button className="btn btn-primary btn-sm" onClick={() => { setFKeluar({ tanggal: today(), penerima: '', barang_id: '', jumlah: '', keterangan: '' }); setModalKeluar(true) }}>
                      + Tambah Pengeluaran
                    </button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Tanggal</th>
                        <th>Penerima</th>
                        <th>Nama Barang</th>
                        <th>Jenis</th>
                        <th style={{ textAlign: 'right' }}>Jumlah Keluar</th>
                        <th>Keterangan</th>
                        <th style={{ width: 70 }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.k ? (
                        <tr><td colSpan={8}><div className="loading">Memuat data</div></td></tr>
                      ) : filteredKeluar.length === 0 ? (
                        <tr><td colSpan={8}><div className="empty"><div className="empty-icon">↑</div>{pengeluaran.length ? 'Tidak ditemukan' : 'Belum ada transaksi pengeluaran'}</div></td></tr>
                      ) : filteredKeluar.map((k, i) => (
                        <tr key={k.id}>
                          <td className="td-mono td-center">{i + 1}</td>
                          <td className="td-mono">{k.tanggal}</td>
                          <td><strong>{k.penerima}</strong></td>
                          <td>{k.barang?.nama || '—'}</td>
                          <td><span className="badge badge-blue">{k.barang?.jenis || '—'}</span></td>
                          <td className="td-num red" style={{ fontWeight: 700 }}>−{fmt(k.jumlah)}</td>
                          <td style={{ color: '#8d8d8d', fontSize: 12 }}>{k.keterangan || '—'}</td>
                          <td><button className="btn btn-danger btn-xs" onClick={() => hapusKeluar(k.id)}>Hapus</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </div>{/* /content */}
        </div>{/* /main */}
      </div>{/* /layout */}

      {/* ═══ MODAL BARANG ═══ */}
      <div className={`modal-overlay ${modalBarang ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && setModalBarang(false)}>
        <div className="modal">
          <div className="modal-header">
            <div>
              <div className="modal-title">{editBarang ? 'Edit Barang' : 'Tambah Barang Baru'}</div>
              <div className="modal-subtitle">Master Data → Barang</div>
            </div>
            <button className="modal-close" onClick={() => setModalBarang(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="info-box">
              Stok akhir dihitung otomatis: <strong>Stok Awal + Total Pemasukan − Total Pengeluaran</strong>
            </div>
            <div className="modal-section-title">Informasi Barang</div>
            <div className="form-row">
              <div className="form-group">
                <label>Nama Barang <span style={{ color: 'red' }}>*</span></label>
                <input className="input" value={fBarang.nama} onChange={e => setFBarang(f => ({ ...f, nama: e.target.value }))} placeholder="Contoh: Topi Polos Hitam" />
              </div>
              <div className="form-group">
                <label>Jenis Satuan <span style={{ color: 'red' }}>*</span></label>
                <select className="input select" value={fBarang.jenis} onChange={e => setFBarang(f => ({ ...f, jenis: e.target.value }))}>
                  <option value="">— Pilih Jenis —</option>
                  {JENIS_OPTIONS.map(j => <option key={j}>{j}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Stok Awal</label>
              <input className="input" type="number" min="0" value={fBarang.stok_awal} onChange={e => setFBarang(f => ({ ...f, stok_awal: e.target.value }))} placeholder="0" />
              <div className="form-hint">Jumlah barang yang sudah ada di gudang sebelum sistem ini digunakan.</div>
            </div>
            <div className="form-group">
              <label>Keterangan</label>
              <input className="input" value={fBarang.keterangan} onChange={e => setFBarang(f => ({ ...f, keterangan: e.target.value }))} placeholder="Opsional..." />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost btn-sm" onClick={() => setModalBarang(false)}>Batal</button>
            <button className="btn btn-primary btn-sm" onClick={submitBarang}>
              {editBarang ? 'Simpan Perubahan' : 'Tambah Barang'}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL PEMASUKAN ═══ */}
      <div className={`modal-overlay ${modalMasuk ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && setModalMasuk(false)}>
        <div className="modal">
          <div className="modal-header">
            <div>
              <div className="modal-title">Tambah Pemasukan</div>
              <div className="modal-subtitle">Transaksi → Pemasukan Barang</div>
            </div>
            <button className="modal-close" onClick={() => setModalMasuk(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="info-box">
              Formula: <strong>Stok Sesudah = Stok Sebelum + Jumlah Masuk</strong>
            </div>
            <div className="modal-section-title">Detail Transaksi</div>
            <div className="form-row">
              <div className="form-group">
                <label>Tanggal <span style={{ color: 'red' }}>*</span></label>
                <input className="input" type="date" value={fMasuk.tanggal} onChange={e => setFMasuk(f => ({ ...f, tanggal: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Nama Pengirim <span style={{ color: 'red' }}>*</span></label>
                <input className="input" value={fMasuk.pengirim} onChange={e => setFMasuk(f => ({ ...f, pengirim: e.target.value }))} placeholder="Nama supplier / pengirim" />
              </div>
            </div>
            <div className="form-group">
              <label>Nama Barang <span style={{ color: 'red' }}>*</span></label>
              <select className="input select" value={fMasuk.barang_id} onChange={e => setFMasuk(f => ({ ...f, barang_id: e.target.value }))}>
                <option value="">— Pilih Barang —</option>
                {barang.map(b => <option key={b.id} value={b.id}>{b.nama} ({b.jenis}) — Stok: {fmt(b.stok_akhir)}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Jumlah Masuk <span style={{ color: 'red' }}>*</span></label>
                <input className="input" type="number" min="1" value={fMasuk.jumlah} onChange={e => setFMasuk(f => ({ ...f, jumlah: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-group">
                <label>Keterangan</label>
                <input className="input" value={fMasuk.keterangan} onChange={e => setFMasuk(f => ({ ...f, keterangan: e.target.value }))} placeholder="Opsional..." />
              </div>
            </div>

            {/* PREVIEW FORMULA */}
            {fMasuk.barang_id && (
              <div style={{ background: '#f4f4f4', border: '1px solid #e0e0e0', padding: '14px 16px', marginTop: 8 }}>
                <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#525252', marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>PREVIEW STOK</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#8d8d8d', fontFamily: 'IBM Plex Mono' }}>STOK SEBELUM</div>
                    <div style={{ fontSize: 20, fontFamily: 'IBM Plex Mono', fontWeight: 700 }}>{fmt(stokSebelumMasuk)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#8d8d8d', fontFamily: 'IBM Plex Mono' }}>MASUK</div>
                    <div style={{ fontSize: 20, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: '#198038' }}>+{fmt(parseInt(fMasuk.jumlah) || 0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#8d8d8d', fontFamily: 'IBM Plex Mono' }}>STOK SESUDAH</div>
                    <div style={{ fontSize: 20, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: '#0f62fe' }}>{fmt(stokSesudahMasuk)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost btn-sm" onClick={() => setModalMasuk(false)}>Batal</button>
            <button className="btn btn-primary btn-sm" onClick={submitMasuk}>Simpan Pemasukan</button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL PENGELUARAN ═══ */}
      <div className={`modal-overlay ${modalKeluar ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && setModalKeluar(false)}>
        <div className="modal">
          <div className="modal-header">
            <div>
              <div className="modal-title">Tambah Pengeluaran</div>
              <div className="modal-subtitle">Transaksi → Pengeluaran Barang</div>
            </div>
            <button className="modal-close" onClick={() => setModalKeluar(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="info-box">
              Formula: <strong>Stok Sesudah = Stok Sebelum − Jumlah Keluar</strong>
            </div>
            <div className="modal-section-title">Detail Transaksi</div>
            <div className="form-row">
              <div className="form-group">
                <label>Tanggal <span style={{ color: 'red' }}>*</span></label>
                <input className="input" type="date" value={fKeluar.tanggal} onChange={e => setFKeluar(f => ({ ...f, tanggal: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Nama Penerima <span style={{ color: 'red' }}>*</span></label>
                <input className="input" value={fKeluar.penerima} onChange={e => setFKeluar(f => ({ ...f, penerima: e.target.value }))} placeholder="Nama toko / pembeli / tujuan" />
              </div>
            </div>
            <div className="form-group">
              <label>Nama Barang <span style={{ color: 'red' }}>*</span></label>
              <select className="input select" value={fKeluar.barang_id} onChange={e => setFKeluar(f => ({ ...f, barang_id: e.target.value }))}>
                <option value="">— Pilih Barang —</option>
                {barang.map(b => <option key={b.id} value={b.id}>{b.nama} ({b.jenis}) — Stok: {fmt(b.stok_akhir)}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Jumlah Keluar <span style={{ color: 'red' }}>*</span></label>
                <input className="input" type="number" min="1" value={fKeluar.jumlah} onChange={e => setFKeluar(f => ({ ...f, jumlah: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-group">
                <label>Keterangan</label>
                <input className="input" value={fKeluar.keterangan} onChange={e => setFKeluar(f => ({ ...f, keterangan: e.target.value }))} placeholder="Opsional..." />
              </div>
            </div>

            {/* PREVIEW FORMULA */}
            {fKeluar.barang_id && (
              <div style={{ background: '#f4f4f4', border: '1px solid #e0e0e0', padding: '14px 16px', marginTop: 8 }}>
                <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#525252', marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>PREVIEW STOK</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#8d8d8d', fontFamily: 'IBM Plex Mono' }}>STOK SEBELUM</div>
                    <div style={{ fontSize: 20, fontFamily: 'IBM Plex Mono', fontWeight: 700 }}>{fmt(stokSebelumKeluar)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#8d8d8d', fontFamily: 'IBM Plex Mono' }}>KELUAR</div>
                    <div style={{ fontSize: 20, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: '#da1e28' }}>−{fmt(parseInt(fKeluar.jumlah) || 0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#8d8d8d', fontFamily: 'IBM Plex Mono' }}>STOK SESUDAH</div>
                    <div style={{ fontSize: 20, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: stokSesudahKeluar < 0 ? '#da1e28' : '#0f62fe' }}>
                      {fmt(stokSesudahKeluar)}
                      {stokSesudahKeluar < 0 && <span style={{ fontSize: 11, marginLeft: 6, color: '#da1e28' }}>⚠ TIDAK CUKUP</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost btn-sm" onClick={() => setModalKeluar(false)}>Batal</button>
            <button className="btn btn-primary btn-sm" onClick={submitKeluar} disabled={stokSesudahKeluar < 0 && !!fKeluar.barang_id}>
              Simpan Pengeluaran
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRM */}
      <Confirm
        open={!!confirm}
        title={confirm?.title}
        body={confirm?.body}
        onOk={confirm?.onOk}
        onCancel={() => setConfirm(null)}
      />

      {/* TOASTS */}
      <div className="toast-container">
        {toast.toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </>
  )
}
