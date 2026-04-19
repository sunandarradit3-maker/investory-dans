import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pengeluaran')
      .select(`
        *,
        barang ( nama, jenis )
      `)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { tanggal, penerima, barang_id, jumlah, keterangan } = req.body
    if (!tanggal || !penerima || !barang_id || !jumlah)
      return res.status(400).json({ error: 'semua field wajib' })
    if (jumlah <= 0)
      return res.status(400).json({ error: 'jumlah harus > 0' })

    // Guard: cek stok cukup
    const { data: stokData } = await supabase
      .from('v_stok')
      .select('stok_akhir')
      .eq('id', barang_id)
      .single()
    if (!stokData || stokData.stok_akhir < jumlah)
      return res.status(400).json({ error: `Stok tidak cukup. Stok tersedia: ${stokData?.stok_akhir ?? 0}` })

    const { data, error } = await supabase
      .from('pengeluaran')
      .insert([{ tanggal, penerima, barang_id, jumlah, keterangan }])
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data[0])
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const { error } = await supabase.from('pengeluaran').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
