import React, { useEffect, useMemo, useState } from "react";
import awankuVideo from "./assets/awanku.mp4";

// ===================== UTIL =====================
const DURATIONS = [
  { label: "3 Hari", days: 3 },
  { label: "1 Minggu", days: 7 },
  { label: "2 Minggu", days: 14 },
  { label: "3 Minggu", days: 21 },
  { label: "4 Minggu", days: 28 },
  { label: "5 Minggu", days: 35 },
  { label: "1 Bulan", days: 30 },
  { label: "2 Bulan", days: 60 },
  { label: "3 Bulan", days: 90 },
  { label: "4 Bulan", days: 120 },
  { label: "5 Bulan", days: 150 },
  { label: "1 Tahun", days: 365 },
  { label: "2 Tahun", days: 730 },
  { label: "3 Tahun", days: 1095 },
];

function fmtCurrency(n) {
  try { return "Rp " + (n || 0).toLocaleString("id-ID"); } catch { return `Rp ${n}`; }
}

function endDateFrom(startISO, days) {
  const d = new Date(startISO);
  const end = new Date(d.getTime() + days * 24 * 3600 * 1000);
  return end;
}

function secondsLeft(startISO, days) {
  const target = endDateFrom(startISO, days).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((target - now) / 1000));
}

function fmtCountdown(secs) {
  if (secs <= 0) return "Waktu Habis";
  const d = Math.floor(secs / (24 * 3600));
  const h = Math.floor((secs % (24 * 3600)) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  // perbaikan: suffix detik pakai 's', bukan 'd'
  return `${d}h ${h}j ${m}m ${s}s`;
}

// ===================== STORAGE =====================
const LS_KEYS = {
  RENTALS: "rental_dashboard_v2_rentals",
  INFOS: "rental_dashboard_v2_infos",
  LOGGED_IN: "rental_dashboard_v2_logged_in",
};

function loadLS(key, def) {
  try {
    const x = JSON.parse(localStorage.getItem(key));
    return x ?? def;
  } catch {
    return def;
  }
}

function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ===================== UI PRIMS =====================
function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 sm:p-5 ${className}`}>{children}</div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <Card>
      <div className="text-xs sm:text-sm text-gray-500">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">{value}</div>
      {sub && <div className="text-[11px] sm:text-xs text-gray-400 mt-1">{sub}</div>}
    </Card>
  );
}

function StatusBadge({ status }) {
  const color = status === "Normal" ? "bg-green-100 text-green-700" : status === "Perbaikan" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={`px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${color}`}>{status}</span>;
}

// ===================== APP =====================
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(loadLS(LS_KEYS.LOGGED_IN, false));

  const [rentals, setRentals] = useState(loadLS(LS_KEYS.RENTALS, []));
  const [infos, setInfos] = useState(loadLS(LS_KEYS.INFOS, []));

  // NEW: toggle sidebar untuk mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // live-tick to refresh countdown
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const [tick, setTick] = useState(0);

  // persist
  useEffect(() => saveLS(LS_KEYS.RENTALS, rentals), [rentals]);
  useEffect(() => saveLS(LS_KEYS.INFOS, infos), [infos]);
  useEffect(() => saveLS(LS_KEYS.LOGGED_IN, isLoggedIn), [isLoggedIn]);

  // auto-update status -> Waktu Habis
  useEffect(() => {
    setRentals((prev) => prev.map((r) => {
      const left = secondsLeft(r.startISO, r.durasiDays);
      if (left <= 0 && r.status !== "Waktu Habis") {
        return { ...r, status: "Waktu Habis" };
      }
      return r;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const totals = useMemo(() => {
    const totalOmset = rentals.reduce((s, r) => s + (r.harga || 0), 0);
    const tunai = rentals.filter((r) => r.metode === "Tunai").reduce((s, r) => s + (r.harga || 0), 0);
    const transfer = rentals.filter((r) => r.metode === "Transfer").reduce((s, r) => s + (r.harga || 0), 0);
    const active = rentals.filter((r) => secondsLeft(r.startISO, r.durasiDays) > 0).length;
    return { totalOmset, tunai, transfer, active };
  }, [rentals, tick]);

  function addRental(data) {
    const r = {
      id: Date.now(),
      nama: data.nama,
      jenis: data.jenis,
      gmail: data.gmail || "",
      harga: Number(data.harga || 0),
      metode: data.metode || "Tunai",
      durasiDays: Number(data.durasiDays),
      startISO: new Date().toISOString(),
      status: "Normal",
    };
    setRentals((x) => [r, ...x]);
    setInfos((x) => [
      { id: Date.now(), date: new Date().toLocaleString(), text: `Rental baru: ${r.nama} (${r.jenis}) senilai ${fmtCurrency(r.harga)}.`, chats: [] },
      ...x,
    ]);
  }

  function updateRental(id, patch) {
    setRentals((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function deleteRental(id) {
    setRentals((list) => list.filter((r) => r.id !== id));
  }

  function addInfo(text) {
    if (!text) return;
    setInfos((x) => [{ id: Date.now(), date: new Date().toLocaleString(), text, chats: [] }, ...x]);
  }

  function addChat(infoId, text) {
    if (!text) return;
    setInfos((arr) => arr.map((i) => (i.id === infoId ? { ...i, chats: [...i.chats, { id: Date.now(), text }] } : i)));
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setPage("dashboard");
  }

  function SidebarLink({ id, label, icon, adminOnly = false }) {
    if (adminOnly && !isLoggedIn) return null;
    const active = page === id;
    return (
      <button
        onClick={() => { setPage(id); setIsSidebarOpen(false); }}
        className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-xl transition ${active ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
      >
        <span className="text-lg">{icon}</span>
        <span className="font-medium text-sm sm:text-base">{label}</span>
      </button>
    );
  }

  return (
    <div className="h-screen w-full bg-indigo-50/60 flex relative">
      {/* MOBILE TOPBAR */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-lg border active:scale-95"
            onClick={() => setIsSidebarOpen((v) => !v)}
            aria-label="Toggle Sidebar"
          >
            ☰
          </button>
          <div className="text-sm font-semibold text-indigo-700">Awanku Digital</div>
        </div>
        <div className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</div>
      </div>

      {/* SIDEBAR */}
      {/* desktop: tetap terlihat; mobile: toggle sebagai drawer */}
      <aside
        className={`w-64 sm:w-72 bg-white h-full shadow-xl p-5 flex-col gap-4 z-40
        ${isSidebarOpen ? "fixed inset-y-0 left-0 flex" : "hidden sm:flex"}`}
      >
<div className="flex items-center justify-center mb-2">
  <video
    src={awankuVideo}
    autoPlay
    loop
    muted
    className="h-20 w-20 sm:h-28 sm:w-28 object-cover rounded-xl"
  />
</div>


        <div className="mt-2 flex flex-col gap-2">
          <SidebarLink id="dashboard" label="Dashboard" icon="☁" />
          <SidebarLink id="countdown" label="Countdowns" icon="" />
          <SidebarLink id="finance" label="Keuangan" icon="" adminOnly />
          <SidebarLink id="input" label="Input Data" icon="" adminOnly />
          <SidebarLink id="info" label="Informasi" icon=""/>
          <SidebarLink id="admin" label="Admin" icon="" adminOnly />
        </div>

        <div className="mt-auto">
          {isLoggedIn ? (
            <button onClick={handleLogout} className="w-full text-left px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100 flex items-center gap-3">
              <span className="text-lg">🚪</span>
              <span className="font-medium text-sm sm:text-base">Logout</span>
            </button>
          ) : (
            <button onClick={() => { setPage('login'); setIsSidebarOpen(false); }} className="w-full text-left px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100 flex items-center gap-3">
              <span className="text-lg"></span>
              <span className="font-medium text-sm sm:text-base">Login</span>
            </button>
          )}
          {/* <div className="text-[11px] sm:text-xs text-gray-400 mt-2"></div> */}
        </div>
      </aside>

      {/* BACKDROP mobile ketika drawer open */}
      {isSidebarOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* MAIN */}
      <main className={`flex-1 p-4 sm:p-6 overflow-y-auto w-full ${isSidebarOpen ? "pointer-events-none sm:pointer-events-auto" : ""} pt-20 sm:pt-6`}>

        {page === "dashboard" && (
          <div className="space-y-6 max-w-[1400px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Business Dashboard</h1>
              {/* perbaikan: tampilkan tanggal beneran */}
              <div className="text-xs sm:text-sm text-gray-500">{new Date().toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Stat label="Total Omset" value={fmtCurrency(totals.totalOmset)} sub="Akumulasi semua transaksi" />
              <Stat label="Tunai" value={fmtCurrency(totals.tunai)} sub="Metode tunai" />
              <Stat label="Transfer" value={fmtCurrency(totals.transfer)} sub="Metode transfer" />
              <Stat label="Aktif Berjalan" value={`${totals.active} rental`} sub="Belum habis masa durasi" />
            </div>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="text-base sm:text-lg font-semibold">Recent Rentals</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs sm:text-sm text-gray-500">
                      <th className="py-2 pr-4">Nama</th>
                      <th className="py-2 pr-4">Jenis</th>
                      <th className="py-2 pr-4">Durasi</th>
                      <th className="py-2 pr-4">Harga</th>
                      <th className="py-2 pr-4">Metode</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentals.slice(0, 6).map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 pr-4">{r.nama}</td>
                        <td className="py-2 pr-4">{r.jenis}</td>
                        <td className="py-2 pr-4">{r.durasiDays} hari</td>
                        <td className="py-2 pr-4">{fmtCurrency(r.harga)}</td>
                        <td className="py-2 pr-4">{r.metode}</td>
                        <td className="py-2"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                    {rentals.length === 0 && (
                      <tr>
                        <td className="py-3 text-gray-400 text-sm" colSpan={6}>Belum ada data. Masuk ke halaman Input Data.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {page === "input" && isLoggedIn && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold mb-4">Input Data Rental</h1>
            <Card>
              <RentalForm onSubmit={addRental} />
            </Card>
          </div>
        )}

        {page === "countdown" && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold">Countdowns</h1>
            <Card>
              <CountdownTable rentals={rentals} onChangeStatus={(id, s) => updateRental(id, { status: s })} isLoggedIn={isLoggedIn} />
            </Card>
          </div>
        )}

        {page === "finance" && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold">Keuangan</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat label="Total Omset" value={fmtCurrency(totals.totalOmset)} />
              <Stat label="Tunai" value={fmtCurrency(totals.tunai)} />
              <Stat label="Transfer" value={fmtCurrency(totals.transfer)} />
            </div>
            <Card>
              <TransactionsTable rentals={rentals} />
            </Card>
          </div>
        )}

        {page === "info" && (
  <TentangAwanku 
    isLoggedIn={isLoggedIn} 
    katalog={infos.katalog || []} 
    onAddProduk={(p) => setInfos((prev) => ({ ...prev, katalog: [...(prev.katalog||[]), p] }))} 
  />
)}

        {page === "admin" && isLoggedIn && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold">Admin Panel</h1>
            <Card>
              <AdminManager rentals={rentals} onUpdate={updateRental} onDelete={deleteRental} />
            </Card>
          </div>
        )}

        {page === 'login' && !isLoggedIn && (
          <div className="max-w-md mx-auto mt-8 sm:mt-20">
            <h1 className="text-xl sm:text-2xl font-bold mb-4">Login Admin</h1>
            <Card>
              <LoginForm onLogin={(user, pass) => {
                if (user === "Bagas" && pass === "9087") {
                  setIsLoggedIn(true);
                  setPage("dashboard");
                } else {
                  alert("Username atau password salah.");
                }
              }} />
            </Card>
          </div>
        )}

        {/* {(page === 'input' || page === 'info' || page === 'admin') && !isLoggedIn && (
          <div className="text-center mt-16 sm:mt-20">
            <h1 className="text-xl sm:text-2xl font-bold">Akses Ditolak</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Kamu harus login untuk mengakses halaman ini ya</p>
            <button onClick={() => setPage('login')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-indigo-700">Login</button>
          </div>
        )} */}
      </main>
    </div>
  );
}

// ===================== PAGES & WIDGETS =====================

// ===================== TENTANG AWANKU PAGE =====================
function TentangAwanku({ isLoggedIn, katalog, onAddProduk }) {
  const [newProduk, setNewProduk] = useState({ nama: "", harga: "" });

  function submitProduk(e) {
    e.preventDefault();
    if (!newProduk.nama || !newProduk.harga) return alert("Isi nama & harga");
    onAddProduk({ ...newProduk, id: Date.now() });
    setNewProduk({ nama: "", harga: "" });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
<video
  src={awankuVideo}
  className="w-full max-w-md mx-auto rounded-2xl object-cover h-48 sm:h-64 lg:h-80"
  autoPlay
  loop
  muted
/>


      {/* Section Deskripsi Awanku */}
<section className="max-w-4xl mx-auto p-6">
  {/* Judul */}
  <h2 className="text-3xl font-bold text-black-700 mb-4 text-center">
    AWANKU
  </h2>

  {/* Deskripsi */}
  <p className="text-sm text-gray-700 text-justify mb-6">
    Tempatnya buat kamu yang butuh semua layanan digital, Kita jual akun premium <strong>Netflix, CapCut, YouTube Music, Spotify</strong>, plus layanan digital lain sesuai kebutuhan kamu. Semua 100% original, jadi aman dan terpercaya.
  </p>

  <p className="text-sm text-gray-700 text-justify mb-6">
    Gak cuma akun premium, kita juga nyediain <strong>jasa bikin template</strong>—mulai dari poster, presentasi (PPT), sampai desain siap pakai. Buat yang pengen tampil beda, ada juga <strong>template PPT 3D lengkap sama animasinya</strong>.
  </p>

  <p className="text-sm text-gray-700 text-justify mb-6">
    Buat yang mau belajar, kita buka juga <strong>kelas online Bot WhatsApp</strong> dari nol sampai bisa jalan sendiri. Semua dibuat supaya gampang dipahami, gak ribet, dan bisa langsung dipraktikkin.
  </p>

  <p className="text-sm text-gray-700 text-justify mb-6">
    Sistem pembelian? Gampang banget:
    <ul className="list-disc list-inside mt-2">
      <li><strong>Akun premium</strong> via WhatsApp, langsung chat, cepat dan jelas.</li>
      <li><strong>Jasa Template & Kelas Online</strong> via website, pakai sistem pembayaran otomatis. Produk atau akses langsung dikirim setelah bayar.</li>
    </ul>
  </p>

  <p className="text-sm text-gray-700 text-justify mb-6">
    Jadi, kalau mau layanan digital yang <strong>cepat, aman, dan kualitas oke</strong>, AWANKU jawabannya.
  </p>

  {/* Highlight / Feature */}
{/* Highlight / Feature */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
  <a
    href="/proposal"
    className="bg-blue-200/90 hover:bg-blue-500/50 transition p-4 rounded-xl text-center font-medium text-white"
  >
    Proposal
  </a>

  <a
    href="/kelas-template"
    className="bg-green-500/30 hover:bg-green-500/50 transition p-4 rounded-xl text-center font-medium text-white"
  >
    Kelas & Jasa Template
  </a>
</div>

</section>


      {/* Katalog Jualan */}
      {/* <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-2">Katalog Produk</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {katalog.length > 0 ? (
            katalog.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm text-center">
                <div className="font-medium">{p.nama}</div>
                <div className="text-gray-500 text-sm">{`Rp ${Number(p.harga).toLocaleString("id-ID")}`}</div>
              </div>
            ))
          ) : (
            <div className="text-gray-400 col-span-full text-center">Belum ada produk.</div>
          )}
        </div> */}

        {/* Admin Input Produk */}
        {/* {isLoggedIn && (
          <Card className="mt-4">
            <h3 className="font-semibold mb-2">Tambah Produk Baru</h3>
            <form onSubmit={submitProduk} className="grid gap-2 sm:grid-cols-3">
              <input 
                type="text" placeholder="Nama Produk" 
                value={newProduk.nama} 
                onChange={(e)=>setNewProduk({...newProduk, nama:e.target.value})} 
                className="border rounded-xl px-3 py-2 text-sm"
              />
              <input 
                type="number" placeholder="Harga" 
                value={newProduk.harga} 
                onChange={(e)=>setNewProduk({...newProduk, harga:e.target.value})} 
                className="border rounded-xl px-3 py-2 text-sm"
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-indigo-700">Tambah</button>
            </form>
          </Card>
        )} */}
      </div>
    // </div>
  );
}

// ===================== RENTAL PAGE =====================

function RentalForm({ onSubmit }) {
  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState("");
  const [gmail, setGmail] = useState("");
  const [durasiDays, setDurasiDays] = useState(7);
  const [harga, setHarga] = useState("");
  const [metode, setMetode] = useState("Tunai");

  function submit(e) {
    e.preventDefault();
    if (!nama || !jenis || !harga) return alert("Lengkapi data wajib");
    onSubmit({ nama, jenis, gmail, durasiDays, harga: Number(harga), metode });
    setNama(""); setJenis(""); setGmail(""); setDurasiDays(7); setHarga(""); setMetode("Tunai");
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Nama Penyewa" value={nama} onChange={setNama} />
        <Input label="Jenis Barang" value={jenis} onChange={setJenis} />
      </div>
      <Input label="Email (opsional)" value={gmail} onChange={setGmail} type="email" />
      <div className="grid md:grid-cols-3 gap-4">
        <Select label="Durasi" value={durasiDays} onChange={setDurasiDays} options={DURATIONS} />
        <Input label="Harga Sewa" value={harga} onChange={setHarga} type="number" min="0" />
        <SelectSimple label="Metode" value={metode} onChange={setMetode} options={["Tunai","Transfer"]} />
      </div>
      <div className="flex gap-3 flex-wrap">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-indigo-700">Simpan</button>
        <button type="reset" onClick={() => { setNama(""); setJenis(""); setGmail(""); setDurasiDays(7); setHarga(""); setMetode("Tunai"); }} className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200">Reset</button>
      </div>
    </form>
  );
}

function CountdownTable({ rentals, onChangeStatus, isLoggedIn }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs sm:text-sm text-gray-500">
            <th className="py-2 pr-4">Nama</th>
            <th className="py-2 pr-4">Jenis</th>
            <th className="py-2 pr-4">Durasi</th>
            <th className="py-2 pr-4">Sisa Waktu</th>
            <th className="py-2 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => {
            const left = secondsLeft(r.startISO, r.durasiDays);
            return (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-4">{r.nama}</td>
                <td className="py-2 pr-4">{r.jenis}</td>
                <td className="py-2 pr-4">{r.durasiDays} hari</td>
                <td className={`py-2 pr-4 ${left === 0 ? "text-red-600" : "text-green-600"}`}>{fmtCountdown(left)}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {isLoggedIn && (
                      <select className="border rounded-lg text-xs sm:text-sm px-2 py-1" value={r.status} onChange={(e)=>onChangeStatus(r.id, e.target.value)}>
                        <option>Normal</option>
                        <option>Perbaikan</option>
                        <option>Waktu Habis</option>
                      </select>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {rentals.length === 0 && (
            <tr><td className="py-3 text-gray-400 text-sm" colSpan={5}>Belum ada data.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TransactionsTable({ rentals }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs sm:text-sm text-gray-500">
            <th className="py-2 pr-4">Nama</th>
            <th className="py-2 pr-4">Jenis</th>
            <th className="py-2 pr-4">Durasi</th>
            <th className="py-2 pr-4">Harga</th>
            <th className="py-2 pr-4">Metode</th>
            <th className="py-2 pr-4">Mulai</th>
            <th className="py-2 pr-4">Selesai</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => {
            const end = endDateFrom(r.startISO, r.durasiDays);
            return (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-4">{r.nama}</td>
                <td className="py-2 pr-4">{r.jenis}</td>
                <td className="py-2 pr-4">{r.durasiDays} hari</td>
                <td className="py-2 pr-4">{fmtCurrency(r.harga)}</td>
                <td className="py-2 pr-4">{r.metode}</td>
                <td className="py-2 pr-4">{new Date(r.startISO).toLocaleDateString()}</td>
                <td className="py-2 pr-4">{end.toLocaleDateString()}</td>
              </tr>
            );
          })}
          {rentals.length === 0 && (
            <tr><td className="py-3 text-gray-400 text-sm" colSpan={7}>Belum ada transaksi.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function InfoBoard({ infos, onPost, onReply }) {
  const [text, setText] = useState("");
  const [reply, setReply] = useState({});
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-col sm:flex-row">
        <input className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="Tulis info untuk user..." value={text} onChange={(e)=>setText(e.target.value)} />
        <button onClick={()=>{ onPost(text); setText(""); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl">Kirim</button>
      </div>
      <div className="space-y-3">
        {infos.map((i) => (
          <div key={i.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-[11px] sm:text-xs text-gray-400">{i.date}</div>
            <div className="mt-1 text-sm sm:text-base">{i.text}</div>
            <div className="mt-3 space-y-2">
              {i.chats.map((c) => (
                <div key={c.id} className="relative pl-6">
                  <span className="absolute left-0 top-1">➤</span>
                  <div className="inline-block bg-gray-100 px-3 py-1 rounded-xl text-sm">{c.text}</div>
                </div>
              ))}
              <div className="flex gap-2 flex-col sm:flex-row">
                <input className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="Balas (Anonim)" value={reply[i.id] || ""} onChange={(e)=>setReply({ ...reply, [i.id]: e.target.value })} />
                <button className="px-3 py-2 bg-gray-800 text-white rounded-xl" onClick={()=>{ onReply(i.id, reply[i.id]); setReply({ ...reply, [i.id]: "" }); }}>Balas</button>
              </div>
            </div>
          </div>
        ))}
        {infos.length === 0 && <div className="text-gray-400 text-sm">Belum ada info.</div>}
      </div>
    </div>
  );
}

function LoginForm({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  return (
    <div className="grid gap-4">
      <Input label="Username" value={user} onChange={setUser} />
      <Input label="Password" type="password" value={pass} onChange={setPass} />
      <button onClick={() => onLogin(user, pass)} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-indigo-700">Login</button>
    </div>
  );
}

function AdminManager({ rentals, onUpdate, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs sm:text-sm text-gray-500">
            <th className="py-2 pr-4">Nama</th>
            <th className="py-2 pr-4">Jenis</th>
            <th className="py-2 pr-4">Harga</th>
            <th className="py-2 pr-4">Metode</th>
            <th className="py-2 pr-4">Durasi</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-2 pr-4">{r.nama}</td>
              <td className="py-2 pr-4">{r.jenis}</td>
              <td className="py-2 pr-4">{fmtCurrency(r.harga)}</td>
              <td className="py-2 pr-4">{r.metode}</td>
              <td className="py-2 pr-4">{r.durasiDays} hari</td>
              <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <select className="border rounded-lg text-xs sm:text-sm px-2 py-1" value={r.status} onChange={(e)=>onUpdate(r.id, { status: e.target.value })}>
                    <option>Normal</option>
                    <option>Perbaikan</option>
                    <option>Waktu Habis</option>
                  </select>
                  <button className="px-3 py-1 bg-red-100 text-red-700 rounded-lg" onClick={()=>onDelete(r.id)}>Hapus</button>
                </div>
              </td>
            </tr>
          ))}
          {rentals.length === 0 && (
            <tr><td className="py-3 text-gray-400 text-sm" colSpan={7}>Tidak ada data.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ===================== SMALL INPUTS =====================
function Input({ label, value, onChange, type = "text", ...rest }) {
  return (
    <label className="block">
      <div className="text-xs sm:text-sm text-gray-600 mb-1">{label}</div>
      <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} {...rest} className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm" />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-xs sm:text-sm text-gray-600 mb-1">{label}</div>
      <select value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2 text-sm">
        {options.map((o) => (
          <option key={o.days} value={o.days}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function SelectSimple({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-xs sm:text-sm text-gray-600 mb-1">{label}</div>
      <select value={value} onChange={(e)=>onChange(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm">
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
