import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  const { type, format } = req.query

  let data = []
  if (type === 'barang') {
    const r = await supabase.from('v_stok').select('*').order('nama')
    data = r.data || []
  } else if (type === 'pemasukan') {
    const r = await supabase.from('pemasukan').select('*, barang(nama, jenis)').order('tanggal', { ascending: false })
    data = (r.data || []).map(x => ({
      id: x.id, tanggal: x.tanggal, pengirim: x.pengirim,
      nama_barang: x.barang?.nama, jenis: x.barang?.jenis,
      jumlah: x.jumlah, keterangan: x.keterangan
    }))
  } else if (type === 'pengeluaran') {
    const r = await supabase.from('pengeluaran').select('*, barang(nama, jenis)').order('tanggal', { ascending: false })
    data = (r.data || []).map(x => ({
      id: x.id, tanggal: x.tanggal, penerima: x.penerima,
      nama_barang: x.barang?.nama, jenis: x.barang?.jenis,
      jumlah: x.jumlah, keterangan: x.keterangan
    }))
  }

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="dans_${type}_${Date.now()}.json"`)
    return res.status(200).json(data)
  }

  // CSV
  if (!data.length) return res.status(200).send('')
  const keys = Object.keys(data[0])
  const csv = [
    keys.join(','),
    ...data.map(row => keys.map(k => `"${(row[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="dans_${type}_${Date.now()}.csv"`)
  return res.status(200).send(csv)
}
