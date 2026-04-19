-- =============================================
-- DAN'S INVENTORY - SUPABASE SCHEMA
-- Jalankan ini di Supabase SQL Editor
-- =============================================

-- TABEL BARANG
create table if not exists barang (
  id          uuid default gen_random_uuid() primary key,
  nama        text not null,
  jenis       text not null check (jenis in ('Bungkus','Kodi','Picis','Golong','Meter')),
  stok_awal   integer not null default 0,
  keterangan  text,
  created_at  timestamptz default now()
);

-- TABEL PEMASUKAN
create table if not exists pemasukan (
  id          uuid default gen_random_uuid() primary key,
  tanggal     date not null,
  pengirim    text not null,
  barang_id   uuid references barang(id) on delete cascade,
  jumlah      integer not null check (jumlah > 0),
  keterangan  text,
  created_at  timestamptz default now()
);

-- TABEL PENGELUARAN
create table if not exists pengeluaran (
  id          uuid default gen_random_uuid() primary key,
  tanggal     date not null,
  penerima    text not null,
  barang_id   uuid references barang(id) on delete cascade,
  jumlah      integer not null check (jumlah > 0),
  keterangan  text,
  created_at  timestamptz default now()
);

-- VIEW: stok aktual per barang (formula engine)
-- stok_akhir = stok_awal + SUM(pemasukan) - SUM(pengeluaran)
create or replace view v_stok as
select
  b.id,
  b.nama,
  b.jenis,
  b.stok_awal,
  coalesce(sum(p.jumlah), 0)::integer  as total_masuk,
  coalesce(sum(k.jumlah), 0)::integer  as total_keluar,
  (b.stok_awal + coalesce(sum(p.jumlah),0) - coalesce(sum(k.jumlah),0))::integer as stok_akhir,
  b.created_at
from barang b
left join pemasukan  p on p.barang_id = b.id
left join pengeluaran k on k.barang_id = b.id
group by b.id, b.nama, b.jenis, b.stok_awal, b.created_at;

-- Enable Row Level Security (optional, buka akses public untuk MVP)
alter table barang      enable row level security;
alter table pemasukan   enable row level security;
alter table pengeluaran enable row level security;

-- Policy: allow all (untuk MVP tanpa auth)
create policy "allow_all_barang"      on barang      for all using (true) with check (true);
create policy "allow_all_pemasukan"   on pemasukan   for all using (true) with check (true);
create policy "allow_all_pengeluaran" on pengeluaran for all using (true) with check (true);
