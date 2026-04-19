import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('v_stok')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { nama, jenis, stok_awal, keterangan } = req.body
    if (!nama || !jenis) return res.status(400).json({ error: 'nama dan jenis wajib diisi' })
    const { data, error } = await supabase
      .from('barang')
      .insert([{ nama, jenis, stok_awal: stok_awal || 0, keterangan }])
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data[0])
  }

  if (req.method === 'PUT') {
    const { id, nama, jenis, stok_awal, keterangan } = req.body
    if (!id) return res.status(400).json({ error: 'id wajib' })
    const { data, error } = await supabase
      .from('barang')
      .update({ nama, jenis, stok_awal, keterangan })
      .eq('id', id)
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data[0])
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id wajib' })
    const { error } = await supabase.from('barang').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
  }
