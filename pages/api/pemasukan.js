import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pemasukan')
      .select(`
        *,
        barang ( nama, jenis )
      `)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })

    // compute stok_sebelum & stok_sesudah per row
    // We'll pass it raw; stok before/after is computed client-side from v_stok
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { tanggal, pengirim, barang_id, jumlah, keterangan } = req.body
    if (!tanggal || !pengirim || !barang_id || !jumlah)
      return res.status(400).json({ error: 'semua field wajib' })
    if (jumlah <= 0)
      return res.status(400).json({ error: 'jumlah harus > 0' })

    const { data, error } = await supabase
      .from('pemasukan')
      .insert([{ tanggal, pengirim, barang_id, jumlah, keterangan }])
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data[0])
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const { error } = await supabase.from('pemasukan').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
