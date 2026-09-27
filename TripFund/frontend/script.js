// ==========================================
// SISTEM SDEPOSIT TRAVEL PLANNER
// Frontend JavaScript + Supabase
// ==========================================


// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================

// GANTI dua nilai di bawah dengan data dari Supabase kamu.

const SUPABASE_URL = "https://kxsouknzzuzxykkmfjhj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JroU7ZjvNXgclaUQXOKHtg_kAKCkBS8";

const { createClient } = supabase;

const db = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ==========================================
// 2. VARIABEL GLOBAL
// ==========================================

let transactions = [];
let customers = [];
let vendors = [];

let currentFilter = "ALL";
let currentSearch = "";


// ==========================================
// 3. SAAT HALAMAN SELESAI DIMUAT
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    // Isi tanggal transaksi dengan tanggal hari ini
    const tanggalInput = document.getElementById("tanggal");

    if (tanggalInput) {
        tanggalInput.value = getTodayDate();
    }

    // Ambil data dari Supabase
    loadAllData();

    // Event pencarian
    const searchInput = document.getElementById("searchInput");

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            currentSearch = this.value.toLowerCase();
            renderTransactions();
        });
    }

});


// ==========================================
// 4. LOAD SEMUA DATA
// ==========================================

async function loadAllData() {

    try {

        await Promise.all([
            loadCustomers(),
            loadVendors(),
            loadTransactions()
        ]);

        updateDashboard();

    } catch (error) {

        console.error("Gagal memuat data:", error);

        alert(
            "Gagal terhubung ke Supabase.\n\n" +
            "Periksa SUPABASE_URL dan SUPABASE_ANON_KEY di script.js."
        );

    }

}


// ==========================================
// 5. LOAD DATA PELANGGAN
// ==========================================

async function loadCustomers() {

    const { data, error } = await db
        .from("pelanggan")
        .select("*")
        .order("nama", { ascending: true });

    if (error) {
        console.error("Error pelanggan:", error);
        throw error;
    }

    customers = data || [];

    renderCustomerOptions();

    const jumlahPelanggan = document.getElementById("jumlahPelanggan");

    if (jumlahPelanggan) {
        jumlahPelanggan.textContent = customers.length;
    }

}


// ==========================================
// 6. LOAD DATA VENDOR
// ==========================================

async function loadVendors() {

    const { data, error } = await db
        .from("vendor")
        .select("*")
        .order("nama", { ascending: true });

    if (error) {
        console.error("Error vendor:", error);
        throw error;
    }

    vendors = data || [];

    renderVendorOptions();

    const jumlahVendor = document.getElementById("jumlahVendor");

    if (jumlahVendor) {
        jumlahVendor.textContent = vendors.length;
    }

}


// ==========================================
// 7. LOAD DATA TRANSAKSI
// ==========================================

async function loadTransactions() {

    const { data, error } = await db
        .from("transaksi_dp")
        .select(`
            *,
            pelanggan (
                id,
                kode_pelanggan,
                nama
            ),
            vendor (
                id,
                kode_vendor,
                nama
            )
        `)
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error transaksi:", error);
        throw error;
    }

    transactions = data || [];

    renderTransactions();

}


// ==========================================
// 8. MENAMPILKAN PILIHAN PELANGGAN
// ==========================================

function renderCustomerOptions() {

    const select = document.getElementById("pelanggan_id");

    if (!select) return;

    select.innerHTML = `
        <option value="">-- Pilih Pelanggan --</option>
    `;

    customers.forEach(function (customer) {

        const option = document.createElement("option");

        option.value = customer.id;

        option.textContent =
            customer.kode_pelanggan +
            " - " +
            customer.nama;

        select.appendChild(option);

    });

}


// ==========================================
// 9. MENAMPILKAN PILIHAN VENDOR
// ==========================================

function renderVendorOptions() {

    const select = document.getElementById("vendor_id");

    if (!select) return;

    select.innerHTML = `
        <option value="">-- Pilih Vendor --</option>
    `;

    vendors.forEach(function (vendor) {

        const option = document.createElement("option");

        option.value = vendor.id;

        option.textContent =
            vendor.kode_vendor +
            " - " +
            vendor.nama;

        select.appendChild(option);

    });

}


// ==========================================
// 10. UPDATE DASHBOARD
// ==========================================

function updateDashboard() {

    let totalCustomerDP = 0;
    let totalVendorDP = 0;

    transactions.forEach(function (transaction) {

        // Hanya transaksi yang sudah diterima
        if (transaction.status !== "Diterima") {
            return;
        }

        const nominal = Number(transaction.nominal) || 0;

        if (transaction.jenis === "DP_PELANGGAN") {

            totalCustomerDP += nominal;

        } else if (transaction.jenis === "DP_VENDOR") {

            totalVendorDP += nominal;

        }

    });

    const saldoBersih =
        totalCustomerDP - totalVendorDP;


    setText(
        "totalCustomerDP",
        formatRupiah(totalCustomerDP)
    );

    setText(
        "totalVendorDP",
        formatRupiah(totalVendorDP)
    );

    setText(
        "saldoBersih",
        formatRupiah(saldoBersih)
    );

    setText(
        "totalTransaksi",
        transactions.length
    );

}


// ==========================================
// 11. RENDER TABEL TRANSAKSI
// ==========================================

function renderTransactions() {

    const tableBody = document.getElementById("transactionTable");

    if (!tableBody) return;


    let filteredTransactions = transactions.filter(function (transaction) {

        // FILTER JENIS
        if (
            currentFilter !== "ALL" &&
            transaction.jenis !== currentFilter
        ) {
            return false;
        }


        // SEARCH
        if (currentSearch !== "") {

            const partyName =
                transaction.jenis === "DP_PELANGGAN"
                    ? transaction.pelanggan?.nama || ""
                    : transaction.vendor?.nama || "";

            const searchableText = [

                transaction.kode_transaksi,
                transaction.jenis,
                partyName,
                transaction.metode_pembayaran,
                transaction.status,
                transaction.keterangan

            ]
                .join(" ")
                .toLowerCase();


            if (!searchableText.includes(currentSearch)) {
                return false;
            }

        }

        return true;

    });


    // Kalau tidak ada data
    if (filteredTransactions.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-data">
                    Belum ada transaksi.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML = "";


    filteredTransactions.forEach(function (transaction) {

        const row = document.createElement("tr");


        // Nama pihak
        let partyName = "-";

        if (transaction.jenis === "DP_PELANGGAN") {

            partyName =
                transaction.pelanggan?.nama || "-";

        } else {

            partyName =
                transaction.vendor?.nama || "-";

        }


        // Jenis transaksi
        let jenisLabel = "";

        if (transaction.jenis === "DP_PELANGGAN") {

            jenisLabel = `
                <span class="badge badge-customer">
                    DP Pelanggan
                </span>
            `;

        } else {

            jenisLabel = `
                <span class="badge badge-vendor">
                    DP Vendor
                </span>
            `;

        }


        // Status
        let statusClass = "status-menunggu";

        if (transaction.status === "Diterima") {
            statusClass = "status-diterima";
        }

        if (transaction.status === "Dibatalkan") {
            statusClass = "status-dibatalkan";
        }


        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHTML(transaction.kode_transaksi)}
                </strong>
            </td>

            <td>
                ${formatTanggal(transaction.tanggal)}
            </td>

            <td>
                ${jenisLabel}
            </td>

            <td>
                ${escapeHTML(partyName)}
            </td>

            <td>
                <strong>
                    ${formatRupiah(transaction.nominal)}
                </strong>
            </td>

            <td>
                ${escapeHTML(transaction.metode_pembayaran || "-")}
            </td>

            <td>
                <span class="status ${statusClass}">
                    ${escapeHTML(transaction.status)}
                </span>
            </td>

            <td>

                <button
                    class="btn-delete"
                    onclick="hapusTransaksi('${transaction.id}')"
                    title="Hapus transaksi"
                >
                    🗑
                </button>

            </td>

        `;

        tableBody.appendChild(row);

    });

}


// ==========================================
// 12. FILTER TRANSAKSI
// ==========================================

function filterTransaksi(filter, button) {

    currentFilter = filter;


    // Hapus class active dari semua tombol filter
    const buttons = document.querySelectorAll(".filter-btn");

    buttons.forEach(function (btn) {
        btn.classList.remove("active");
    });


    // Tambahkan active ke tombol yang dipilih
    if (button) {
        button.classList.add("active");
    }


    renderTransactions();

}


// ==========================================
// 13. UBAH JENIS TRANSAKSI
// ==========================================

function ubahJenis(jenis) {

    const jenisInput =
        document.getElementById("jenis");

    const pelangganGroup =
        document.getElementById("pelangganGroup");

    const vendorGroup =
        document.getElementById("vendorGroup");

    const formTitle =
        document.getElementById("formTitle");


    if (!jenisInput) return;


    jenisInput.value = jenis;


    if (jenis === "DP_PELANGGAN") {

        if (pelangganGroup) {
            pelangganGroup.style.display = "block";
        }

        if (vendorGroup) {
            vendorGroup.style.display = "none";
        }

        if (formTitle) {
            formTitle.textContent =
                "Catat DP Pelanggan";
        }


        const vendorSelect =
            document.getElementById("vendor_id");

        if (vendorSelect) {
            vendorSelect.value = "";
        }


    } else {

        if (pelangganGroup) {
            pelangganGroup.style.display = "none";
        }

        if (vendorGroup) {
            vendorGroup.style.display = "block";
        }

        if (formTitle) {
            formTitle.textContent =
                "Catat DP Vendor";
        }


        const customerSelect =
            document.getElementById("pelanggan_id");

        if (customerSelect) {
            customerSelect.value = "";
        }

    }

}


// ==========================================
// 14. SUBMIT FORM TRANSAKSI
// ==========================================

const transactionForm =
    document.getElementById("transactionForm");


if (transactionForm) {

    transactionForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const jenis =
                document.getElementById("jenis").value;

            const tanggal =
                document.getElementById("tanggal").value;

            const pelangganId =
                document.getElementById("pelanggan_id").value;

            const vendorId =
                document.getElementById("vendor_id").value;

            const nominal =
                Number(
                    document.getElementById("nominal").value
                );

            const metode =
                document.getElementById(
                    "metode_pembayaran"
                ).value;

            const status =
                document.getElementById("status").value;

            const keterangan =
                document.getElementById("keterangan").value;


            // VALIDASI
            if (!tanggal) {

                alert("Tanggal transaksi wajib diisi.");

                return;
            }


            if (!nominal || nominal <= 0) {

                alert(
                    "Nominal harus lebih besar dari 0."
                );

                return;
            }


            if (
                jenis === "DP_PELANGGAN" &&
                !pelangganId
            ) {

                alert("Silakan pilih pelanggan.");

                return;
            }


            if (
                jenis === "DP_VENDOR" &&
                !vendorId
            ) {

                alert("Silakan pilih vendor.");

                return;
            }


            // Buat kode transaksi otomatis
            const kodeTransaksi =
                generateKodeTransaksi(jenis);


            const transactionData = {

                kode_transaksi: kodeTransaksi,

                tanggal: tanggal,

                jenis: jenis,

                pelanggan_id:
                    jenis === "DP_PELANGGAN"
                        ? pelangganId
                        : null,

                vendor_id:
                    jenis === "DP_VENDOR"
                        ? vendorId
                        : null,

                nominal: nominal,

                metode_pembayaran: metode,

                status: status,

                keterangan: keterangan || null

            };


            try {

                const { error } = await db
                    .from("transaksi_dp")
                    .insert([transactionData]);


                if (error) {

                    console.error(
                        "Gagal menyimpan:",
                        error
                    );

                    alert(
                        "Gagal menyimpan transaksi:\n" +
                        error.message
                    );

                    return;
                }


                alert(
                    "Transaksi berhasil disimpan!"
                );


                // Reset form
                transactionForm.reset();


                // Kembalikan tanggal
                document.getElementById(
                    "tanggal"
                ).value = getTodayDate();


                // Kembali ke DP Pelanggan
                ubahJenis("DP_PELANGGAN");


                // Reload data
                await loadAllData();

            } catch (error) {

                console.error(error);

                alert(
                    "Terjadi kesalahan saat menyimpan transaksi."
                );

            }

        }
    );

}


// ==========================================
// 15. HAPUS TRANSAKSI
// ==========================================

async function hapusTransaksi(id) {

    const yakin = confirm(
        "Apakah kamu yakin ingin menghapus transaksi ini?"
    );


    if (!yakin) {
        return;
    }


    try {

        const { error } = await db
            .from("transaksi_dp")
            .delete()
            .eq("id", id);


        if (error) {

            console.error(
                "Gagal menghapus:",
                error
            );

            alert(
                "Gagal menghapus transaksi:\n" +
                error.message
            );

            return;
        }


        alert("Transaksi berhasil dihapus.");


        await loadAllData();

    } catch (error) {

        console.error(error);

        alert(
            "Terjadi kesalahan saat menghapus transaksi."
        );

    }

}


// ==========================================
// 16. TAMBAH PELANGGAN
// ==========================================

async function tambahPelanggan() {

    const nama = prompt(
        "Masukkan nama pelanggan:"
    );

    if (!nama) return;


    const noHp = prompt(
        "Masukkan nomor HP:"
    );


    const email = prompt(
        "Masukkan email:"
    );


    const alamat = prompt(
        "Masukkan alamat:"
    );


    const kode =
        generateKodeMaster("CUST");


    try {

        const { error } = await db
            .from("pelanggan")
            .insert([

                {
                    kode_pelanggan: kode,
                    nama: nama,
                    no_hp: noHp || null,
                    email: email || null,
                    alamat: alamat || null
                }

            ]);


        if (error) {

            console.error(error);

            alert(
                "Gagal menambahkan pelanggan:\n" +
                error.message
            );

            return;
        }


        alert(
            "Pelanggan berhasil ditambahkan."
        );


        await loadCustomers();


    } catch (error) {

        console.error(error);

        alert(
            "Terjadi kesalahan."
        );

    }

}


// ==========================================
// 17. TAMBAH VENDOR
// ==========================================

async function tambahVendor() {

    const nama = prompt(
        "Masukkan nama vendor:"
    );

    if (!nama) return;


    const jenisLayanan = prompt(
        "Masukkan jenis layanan:"
    );


    const noHp = prompt(
        "Masukkan nomor HP:"
    );


    const email = prompt(
        "Masukkan email:"
    );


    const kode =
        generateKodeMaster("VEND");


    try {

        const { error } = await db
            .from("vendor")
            .insert([

                {
                    kode_vendor: kode,
                    nama: nama,
                    jenis_layanan:
                        jenisLayanan || null,
                    no_hp: noHp || null,
                    email: email || null
                }

            ]);


        if (error) {

            console.error(error);

            alert(
                "Gagal menambahkan vendor:\n" +
                error.message
            );

            return;
        }


        alert(
            "Vendor berhasil ditambahkan."
        );


        await loadVendors();


    } catch (error) {

        console.error(error);

        alert(
            "Terjadi kesalahan."
        );

    }

}


// ==========================================
// 18. SCROLL KE FORM TRANSAKSI
// ==========================================

function scrollToTransaction() {

    const form =
        document.getElementById("transactionForm");


    if (form) {

        form.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


// ==========================================
// 19. EXPORT CSV
// ==========================================

function exportCSV() {

    let dataToExport =
        transactions.filter(function (transaction) {

            if (
                currentFilter !== "ALL" &&
                transaction.jenis !== currentFilter
            ) {
                return false;
            }

            return true;

        });


    if (dataToExport.length === 0) {

        alert(
            "Tidak ada data transaksi untuk diekspor."
        );

        return;
    }


    const rows = [];


    // Header CSV
    rows.push([

        "Kode Transaksi",
        "Tanggal",
        "Jenis",
        "Pihak",
        "Nominal",
        "Metode Pembayaran",
        "Status",
        "Keterangan"

    ]);


    // Data
    dataToExport.forEach(function (transaction) {

        const pihak =
            transaction.jenis === "DP_PELANGGAN"
                ? transaction.pelanggan?.nama || ""
                : transaction.vendor?.nama || "";


        rows.push([

            transaction.kode_transaksi,

            transaction.tanggal,

            transaction.jenis,

            pihak,

            transaction.nominal,

            transaction.metode_pembayaran,

            transaction.status,

            transaction.keterangan || ""

        ]);

    });


    const csvContent =
        rows
            .map(function (row) {

                return row
                    .map(csvEscape)
                    .join(",");

            })
            .join("\n");


    const blob = new Blob(
        [csvContent],
        {
            type: "text/csv;charset=utf-8;"
        }
    );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        "laporan-tripfund.csv";


    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

}


// ==========================================
// 20. FUNGSI BANTU
// ==========================================

function getTodayDate() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(now.getDate())
            .padStart(2, "0");


    return `${year}-${month}-${day}`;

}


// ------------------------------------------

function formatRupiah(value) {

    const number =
        Number(value) || 0;


    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }
    ).format(number);

}


// ------------------------------------------

function formatTanggal(dateString) {

    if (!dateString) {
        return "-";
    }


    const date =
        new Date(
            dateString + "T00:00:00"
        );


    return new Intl.DateTimeFormat(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(date);

}


// ------------------------------------------

function generateKodeTransaksi(jenis) {

    const prefix =
        jenis === "DP_PELANGGAN"
            ? "DP-CUST"
            : "DP-VEND";


    const now = new Date();


    const year =
        now.getFullYear();


    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");


    const day =
        String(now.getDate())
            .padStart(2, "0");


    const random =
        Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();


    return `${prefix}-${year}${month}${day}-${random}`;

}


// ------------------------------------------

function generateKodeMaster(prefix) {

    const now = new Date();


    const year =
        now.getFullYear();


    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");


    const day =
        String(now.getDate())
            .padStart(2, "0");


    const random =
        Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();


    return `${prefix}-${year}${month}${day}-${random}`;

}


// ------------------------------------------

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {
        element.textContent = value;
    }

}


// ------------------------------------------

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ------------------------------------------

function csvEscape(value) {

    if (value === null || value === undefined) {
        return "";
    }


    const text =
        String(value)
            .replace(/"/g, '""');


    return `"${text}"`;

}