-- =========================================
-- SISTEM SDEPOSIT TRAVEL PLANNER
-- DATABASE POSTGRESQL - SUPABASE
-- =========================================


-- =========================================
-- 1. EXTENSION
-- =========================================

create extension if not exists "pgcrypto";


-- =========================================
-- 2. TABEL PELANGGAN
-- =========================================

create table public.pelanggan (
    id uuid primary key default gen_random_uuid(),

    kode_pelanggan varchar(20)
        unique
        not null,

    nama varchar(120)
        not null,

    no_hp varchar(30),

    email varchar(120),

    alamat text,

    created_at timestamptz
        default now()
);


-- =========================================
-- 3. TABEL VENDOR
-- =========================================

create table public.vendor (
    id uuid primary key default gen_random_uuid(),

    kode_vendor varchar(20)
        unique
        not null,

    nama varchar(120)
        not null,

    jenis_layanan varchar(80),

    no_hp varchar(30),

    email varchar(120),

    created_at timestamptz
        default now()
);


-- =========================================
-- 4. TABEL TRANSAKSI DP
-- =========================================

create table public.transaksi_dp (

    id uuid primary key
        default gen_random_uuid(),

    kode_transaksi varchar(30)
        unique
        not null,

    tanggal date
        not null
        default current_date,

    jenis varchar(20)
        not null
        check (
            jenis in (
                'DP_PELANGGAN',
                'DP_VENDOR'
            )
        ),

    pelanggan_id uuid
        references public.pelanggan(id)
        on delete set null,

    vendor_id uuid
        references public.vendor(id)
        on delete set null,

    nominal numeric(15,2)
        not null
        check (nominal > 0),

    metode_pembayaran varchar(30)
        not null
        default 'Transfer',

    status varchar(20)
        not null
        default 'Diterima'
        check (
            status in (
                'Diterima',
                'Menunggu',
                'Dibatalkan'
            )
        ),

    keterangan text,

    created_at timestamptz
        default now(),

    constraint transaksi_relasi_check
    check (

        (
            jenis = 'DP_PELANGGAN'
            and pelanggan_id is not null
            and vendor_id is null
        )

        OR

        (
            jenis = 'DP_VENDOR'
            and vendor_id is not null
            and pelanggan_id is null
        )

    )
);