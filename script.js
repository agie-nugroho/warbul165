/* =====================================================
   WARBUL 165 - MAIN JAVASCRIPT
   POS | Transaction | Report | Menu | Supabase
===================================================== */

/* ===== Utilitas ===== */

const $ = (s) => document.querySelector(s);
const rp = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
const num = (s) => parseInt(String(s).replace(/\D/g, "")) || 0;
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
const pad = (n) => String(n).padStart(2, "0");
const kunciTgl = (d) =>
  d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const jam = (d) => pad(d.getHours()) + "." + pad(d.getMinutes());
const tglIndo = (d) =>
  d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const baca = (k, f) => {
  try {
    return JSON.parse(localStorage.getItem(k)) || f;
  } catch (e) {
    return f;
  }
};

const tulis = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    toast("Gagal menyimpan data");
  }
};

let tt;

function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.style.display = "block";
  clearTimeout(tt);
  tt = setTimeout(() => (t.style.display = "none"), 1800);
}

/* ===== Data menu awal ===== */

function menuAwal() {
  let i = 0;

  const d = (nama, panas, dingin) => ({
    id: "m" + ++i,
    nama,
    kat: "minuman",
    panas,
    dingin,
    harga: 0,
    tambahan: [],
    gambar: FOTO_AWAL[nama] || "",
    gambarDingin: FOTO_DINGIN[nama] || "",
  });

  const f = (nama, harga, t) => ({
    id: "m" + ++i,
    nama,
    kat: "makanan",
    panas: 0,
    dingin: 0,
    harga,
    tambahan: t ? [{ nama: t[0], harga: t[1] }] : [],
    gambar: FOTO_AWAL[nama] || "",
  });

  return [
    d("Kapal Api", 3000, 0),
    d("ABC Susu", 4000, 0),
    d("Good Day All Variant", 4000, 5000),
    d("Good Day Freeze", 5000, 6000),
    d("ABC Klepon", 5000, 6000),
    d("Indocafe", 4000, 5000),
    d("Good Day Cappucino", 5000, 6000),
    d("Kopi Juwara", 10000, 11000),
    d("Kopi Gingseng", 10000, 11000),
    d("Teh Tawar", 2000, 0),
    d("Teh Manis", 3000, 4000),
    d("Teh Tarik", 4000, 5000),
    d("Susu Jahe", 4000, 5000),
    d("Milo", 4000, 5000),
    d("Ovaltine", 5000, 6000),
    d("Drink Beng Beng", 5000, 6000),
    d("Choclatos All Variant", 5000, 6000),
    d("Nutrisari All Variant", 3000, 4000),
    d("Pop Ice All Variant", 0, 6000),
    f("Indomie Goreng biasa", 6000, ["+ pake telor", 3000]),
    f("Indomie Rebus biasa", 6000, ["+ pake telor", 3000]),
    f("Pop Mie goreng", 5000),
    f("Pop Mie rebus", 5000),
    f("Roti Bakar ori", 7000, ["+ pake rasa", 2000]),
    f("Sosis goreng", 5000),
    f("Baso goreng", 5000),
    f("Kentang goreng", 5000),
    f("Mix platter", 7000),
  ];
}

/* ===== Supabase ===== */

const sb = supabase.createClient(
  "https://qjmhiuxadlqhljkzuvaq.supabase.co",
  "sb_publishable_KKZrrK1iD0icTNtfuAT8UA_T_vpW-r9",
);

async function dbUp(t, rows) {
  const sz = t === "menu" ? 5 : 200;

  for (let i = 0; i < rows.length; i += sz) {
    const { error } = await sb.from(t).upsert(
      rows.slice(i, i + sz).map((r) => ({
        id: r.id,
        data: r,
        updated_at: new Date().toISOString(),
      })),
    );

    if (error) {
      toast("Gagal sinkron: " + error.message);
      return false;
    }
  }

  return true;
}

async function dbDel(t, id) {
  if (!window.cloudSiap) return;

  const { error } = await sb.from(t).delete().eq("id", id);

  if (error) toast("Gagal hapus di cloud: " + error.message);
}

async function dbLoad(t) {
  let all = [],
    from = 0;

  for (;;) {
    const { data, error } = await sb
      .from(t)
      .select("data")
      .range(from, from + 999);

    if (error) throw error;

    all = all.concat(data.map((r) => r.data));

    if (data.length < 1000) break;

    from += 1000;
  }

  return all;
}

const dbUpS = (t, rows) => {
  if (window.cloudSiap) dbUp(t, rows);
};

/* ===== State ===== */

let menu = baca("warbul_menu", null);

if (!Array.isArray(menu)) menu = menuAwal();

/* Migrasi data lama: ganti nama Torabika & isi foto bawaan yang masih kosong */

menu.forEach((m) => {
  if (m.nama === "Torabika Cappucino") m.nama = "Good Day Cappucino";
  if (!m.gambar && FOTO_AWAL[m.nama]) m.gambar = FOTO_AWAL[m.nama];
});

/* Pembaruan sekali jalan: foto teh diganti ke foto es teh */

let mig2 = null;

try {
  mig2 = localStorage.getItem("warbul_mig2");
} catch (e) {}

if (!mig2) {
  menu.forEach((m) => {
    if (m.nama === "Teh Tawar" || m.nama === "Teh Manis")
      m.gambar = FOTO_AWAL[m.nama];
  });

  try {
    localStorage.setItem("warbul_mig2", "1");
  } catch (e) {}
}

/* Pembaruan sekali jalan: Teh Panas pakai foto teh hangat, varian Dingin pakai foto es teh */

let mig3 = null;

try {
  mig3 = localStorage.getItem("warbul_mig3");
} catch (e) {}

if (!mig3) {
  menu.forEach((m) => {
    if (m.nama === "Teh Tawar" || m.nama === "Teh Manis") {
      m.gambar = FOTO_AWAL[m.nama];
      m.gambarDingin = FOTO_DINGIN[m.nama];
    }
  });

  try {
    localStorage.setItem("warbul_mig3", "1");
  } catch (e) {}
}

tulis("warbul_menu", menu);

let trx = baca("warbul_trx", []);

if (!Array.isArray(trx)) trx = [];

let cart = [];
let kat = "panas";
let bayar = 0;
let editId = null;
let tipe = "Makan di tempat";
let strukAktif = null;
let ditahan = baca("warbul_hold", []);

if (!Array.isArray(ditahan)) ditahan = [];

const simpanMenu = () => {
  tulis("warbul_menu", menu);
  dbUpS("menu", menu);
};

const simpanTrx = () => tulis("warbul_trx", trx);

/* =====================================================
   NAVIGASI TAB & HAMBURGER MENU
===================================================== */

const menuToggle = $("#menuToggle");
const mainNav = $("#mainNav");

function bukaNavigasi() {
  if (!mainNav || !menuToggle) return;

  mainNav.classList.add("open");
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", "Tutup navigasi");
  menuToggle.textContent = "✕";
}

function tutupNavigasi() {
  if (!mainNav || !menuToggle) return;

  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Buka navigasi");
  menuToggle.textContent = "☰";
}

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    if (mainNav.classList.contains("open")) {
      tutupNavigasi();
    } else {
      bukaNavigasi();
    }
  });

  /* Navigasi tab Kasir, Rekap, dan Menu */

  mainNav.querySelectorAll("button[data-t]").forEach((b) => {
    b.onclick = () => {
      mainNav
        .querySelectorAll("button[data-t]")
        .forEach((x) => x.classList.toggle("on", x === b));

      ["kasir", "rekap", "menu"].forEach(
        (t) =>
          ($("#v" + t[0].toUpperCase() + t.slice(1)).hidden =
            t !== b.dataset.t),
      );

      if (b.dataset.t === "rekap") renderRekap();
      if (b.dataset.t === "menu") renderKelola();

      $("#bar").style.display = b.dataset.t === "kasir" ? "" : "none";

      tutupNavigasi();
      scrollTo(0, 0);
    };
  });

  /* Tutup dropdown ketika mengeklik area di luar header */

  document.addEventListener("click", (e) => {
    if (mainNav.classList.contains("open") && !e.target.closest("header")) {
      tutupNavigasi();
    }
  });

  /* Tutup dropdown dengan tombol Escape */

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") tutupNavigasi();
  });

  /* Tutup navigasi ketika layar berubah ke desktop */

  const mediaDesktop = window.matchMedia("(min-width: 768px)");

  if (mediaDesktop.addEventListener) {
    mediaDesktop.addEventListener("change", (e) => {
      if (e.matches) tutupNavigasi();
    });
  } else {
    mediaDesktop.addListener((e) => {
      if (e.matches) tutupNavigasi();
    });
  }
}

/* ===== Gambar menu: foto unggahan, atau ikon emoji bawaan ===== */

function ikon(m) {
  const n = m.nama.toLowerCase();

  if (/indomie|pop mie/.test(n)) return "🍜";
  if (/roti/.test(n)) return "🍞";
  if (/sosis/.test(n)) return "🌭";
  if (/baso/.test(n)) return "🍢";
  if (/kentang/.test(n)) return "🍟";
  if (/platter/.test(n)) return "🍱";
  if (/teh/.test(n)) return "🍵";
  if (/pop ice|nutrisari/.test(n)) return "🧃";
  if (/susu|milo|ovaltine|choclatos|beng/.test(n)) return "🥛";

  return m.kat === "makanan" ? "🍽️" : "☕";
}

const foto = (m, c, v) => {
  const g = (v === "dingin" && m.gambarDingin) || m.gambar;

  return `<div class="${c}${g ? " img" : ""}">${g ? `<img src="${g}" alt="${esc(m.nama)}">` : ikon(m)}</div>`;
};

/* Perkecil foto (maks 320px, JPEG) supaya hemat ruang localStorage */

function kecilkan(file, cb) {
  const r = new FileReader();

  r.onload = () => {
    const im = new Image();

    im.onload = () => {
      const s = Math.min(1, 320 / Math.max(im.width, im.height));
      const c = document.createElement("canvas");

      c.width = Math.round(im.width * s);
      c.height = Math.round(im.height * s);

      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);

      cb(c.toDataURL("image/jpeg", 0.72));
    };

    im.onerror = () => toast("File bukan gambar yang valid");
    im.src = r.result;
  };

  r.readAsDataURL(file);
}

/* =====================================================
   KASIR: DAFTAR MENU
===================================================== */

document.querySelectorAll("#cats button").forEach(
  (b) =>
    (b.onclick = () => {
      kat = b.dataset.k;

      document
        .querySelectorAll("#cats button")
        .forEach((x) => x.classList.toggle("on", x === b));

      renderMenu();
    }),
);

$("#cari").oninput = renderMenu;

/* Jumlah terjual per menu (untuk tab Terlaris) */

function jualPerMenu() {
  const c = {};

  trx.forEach((t) =>
    t.item.forEach((i) => {
      let m = null;

      menu.forEach((x) => {
        if (
          (i.nama === x.nama || i.nama.startsWith(x.nama + " ")) &&
          (!m || x.nama.length > m.nama.length)
        )
          m = x;
      });

      if (m) c[m.id] = (c[m.id] || 0) + i.qty;
    }),
  );

  return c;
}

function tombol(m, k) {
  let b = "";

  if (k === "panas" && m.kat === "minuman" && m.panas > 0)
    b = `<button onclick="tambah('${m.id}','panas')">Panas <span>${rp(m.panas)}</span></button>`;

  if (k === "dingin" && m.kat === "minuman" && m.dingin > 0)
    b = `<button onclick="tambah('${m.id}','dingin')">Dingin <span>${rp(m.dingin)}</span></button>`;

  if (k === "makanan" && m.kat === "makanan") {
    b = `<button onclick="tambah('${m.id}','main')">Pesan <span>${rp(m.harga)}</span></button>`;

    m.tambahan.forEach(
      (t, i) =>
        (b += `<button class="ex" onclick="tambah('${m.id}','ex${i}')">${esc(t.nama)} <span>+${rp(t.harga)}</span></button>`),
    );
  }

  return b;
}

function renderMenu() {
  const q = $("#cari").value.trim().toLowerCase();

  let list = menu.slice();

  if (kat === "top") {
    const c = jualPerMenu();

    list = list
      .filter((m) => c[m.id])
      .sort((x, y) => c[y.id] - c[x.id])
      .slice(0, 12);
  }

  let h = "";

  list.forEach((m) => {
    if (q && !m.nama.toLowerCase().includes(q)) return;

    let btn =
      kat === "top"
        ? ["panas", "dingin", "makanan"].map((k) => tombol(m, k)).join("")
        : tombol(m, kat);

    if (btn && m.habis) btn = btn.replace(/<button /g, "<button disabled ");

    const v = kat === "top" ? (m.panas ? "panas" : "dingin") : kat;

    if (btn)
      h += `<div class="mi${m.habis ? " habis" : ""}">${foto(m, "ph", v)}<b>${esc(m.nama)}${m.habis ? " · Habis" : ""}</b>${btn}</div>`;
  });

  $("#menuGrid").innerHTML =
    h ||
    `<div class="empty">${kat === "top" ? "Belum ada penjualan. Menu terlaris akan muncul di sini." : "Menu tidak ditemukan."}</div>`;
}

function tambah(id, v) {
  const m = menu.find((x) => x.id === id);

  if (!m || m.habis) return;

  let nama = m.nama;
  let harga = 0;

  if (v === "panas") {
    nama += " (Panas)";
    harga = m.panas;
  } else if (v === "dingin") {
    nama += " (Dingin)";
    harga = m.dingin;
  } else if (v === "main") {
    harga = m.harga;
  } else {
    const t = m.tambahan[+v.slice(2)];
    nama += " " + t.nama;
    harga = t.harga;
  }

  const key = id + "|" + v;
  const ada = cart.find((c) => c.key === key);

  if (ada) ada.qty++;
  else cart.push({ key, nama, harga, qty: 1 });

  renderCart();
}

/* =====================================================
   KASIR: KERANJANG & PEMBAYARAN
===================================================== */

const subCart = () => cart.reduce((s, c) => s + c.harga * c.qty, 0);

/* Diskon: angka = rupiah, diakhiri % = persen */

function diskonCart() {
  const v = ($("#diskon").value || "").trim();
  const sub = subCart();

  if (!v || !sub) return 0;

  if (v.includes("%")) return Math.round((sub * Math.min(100, num(v))) / 100);

  return Math.min(sub, num(v));
}

const totalCart = () => Math.max(0, subCart() - diskonCart());
const jmlItem = () => cart.reduce((s, c) => s + c.qty, 0);

function ubahQty(key, d) {
  const c = cart.find((x) => x.key === key);

  if (!c) return;

  c.qty += d;

  if (c.qty <= 0) cart = cart.filter((x) => x !== c);

  renderCart();
}

function hapus(key) {
  cart = cart.filter((x) => x.key !== key);
  renderCart();
}

function renderCart() {
  $("#lines").innerHTML = cart.length
    ? cart
        .map(
          (c) => `
    <div class="line">
      <div><b>${esc(c.nama)}</b><br><small>${rp(c.harga)} × ${c.qty} = ${rp(c.harga * c.qty)}</small></div>
      <div class="q">
        <button onclick="ubahQty('${c.key}',-1)" aria-label="Kurangi">−</button><b>${c.qty}</b>
        <button onclick="ubahQty('${c.key}',1)" aria-label="Tambah">+</button>
        <button class="dng" onclick="hapus('${c.key}')" aria-label="Hapus">✕</button>
      </div>
    </div>`,
        )
        .join("")
    : '<div class="empty">Keranjang kosong.<br>Pilih menu untuk mulai.</div>';

  const t = totalCart();

  const dk = diskonCart();

  $("#sub").textContent = rp(subCart());
  $("#rDis").hidden = !dk;
  $("#dis").textContent = "- " + rp(dk);
  $("#total").textContent = rp(t);
  $("#barN").textContent = jmlItem() + " item · Lihat Pesanan";
  $("#barT").textContent = rp(t);

  renderBayar();
}

function renderBayar() {
  const t = totalCart();

  if (metode !== "Tunai") {
    bayar = t;
    $("#bayar").value = t ? rp(t) : "";
  }

  $("#bayar").disabled = metode !== "Tunai";

  const k = bayar - t;

  $("#kLabel").textContent = k < 0 && t > 0 ? "Status" : "Kembalian";

  const el = $("#kembali");

  if (t > 0 && k < 0) {
    el.textContent = "Uang kurang " + rp(-k);
    el.className = "warn";
  } else {
    el.textContent = rp(Math.max(k, 0));
    el.className = t > 0 && bayar > 0 ? "good" : "";
  }

  $("#btnBayar").disabled = !(t > 0 && bayar >= t);
}

function setBayar(n, isiInput) {
  bayar = n;

  if (isiInput) $("#bayar").value = n ? rp(n) : "";

  renderBayar();
}

$("#bayar").oninput = (e) => {
  bayar = num(e.target.value);
  e.target.value = bayar ? rp(bayar) : "";

  renderBayar();
};

$("#qk").innerHTML =
  '<button data-n="pas">Uang Pas</button>' +
  [5000, 10000, 20000, 50000, 100000]
    .map((n) => `<button data-n="${n}">${n.toLocaleString("id-ID")}</button>`)
    .join("");

$("#qk").onclick = (e) => {
  const b = e.target.closest("button");

  if (!b) return;
  if (metode !== "Tunai") return toast("Non-tunai: jumlah otomatis pas");

  if (!totalCart()) {
    toast("Keranjang masih kosong");
    return;
  }

  setBayar(b.dataset.n === "pas" ? totalCart() : +b.dataset.n, true);
};

$("#kosong").onclick = () => {
  if (!cart.length) return toast("Keranjang sudah kosong");

  if (confirm("Kosongkan semua pesanan?")) resetKasir();
};

function resetKasir() {
  setMetode("Tunai");
  cart = [];
  bayar = 0;
  $("#bayar").value = "";
  $("#catatan").value = "";
  $("#diskon").value = "";
  setTipe("Makan di tempat");
  renderCart();
}

/* Bottom sheet di HP */

function bukaSheet() {
  $("#cart").classList.add("open");
  $("#sheetBg").classList.add("on");
}

function tutupSheet() {
  $("#cart").classList.remove("open");
  $("#sheetBg").classList.remove("on");
}

$("#bar").onclick = bukaSheet;
$("#closeSheet").onclick = tutupSheet;
$("#sheetBg").onclick = tutupSheet;

/* Tipe pesanan & diskon */

function setTipe(p) {
  tipe = p;

  document
    .querySelectorAll("#tipe button")
    .forEach((b) => b.classList.toggle("on", b.dataset.p === p));
}

document
  .querySelectorAll("#tipe button")
  .forEach((b) => (b.onclick = () => setTipe(b.dataset.p)));

$("#diskon").oninput = renderCart;

/* Tahan pesanan (parkir): untuk pelanggan yang belum bayar */

const simpanTahan = () => tulis("warbul_hold", ditahan);

function jmlTahan() {
  $("#nTahan").textContent = ditahan.length;
}

$("#tahan").onclick = () => {
  if (!cart.length) return toast("Keranjang kosong");

  ditahan.push({
    id: "h" + Date.now(),
    cart: cart.map((c) => ({ ...c })),
    catatan: $("#catatan").value.trim(),
    tipe,
    diskon: $("#diskon").value,
    waktu: new Date().toISOString(),
  });

  simpanTahan();
  resetKasir();
  tutupSheet();
  jmlTahan();

  toast("Pesanan ditahan");
};

function renderTahan() {
  $("#listTahan").innerHTML = ditahan.length
    ? ditahan
        .map((h) => {
          const n = h.cart.reduce((a, c) => a + c.qty, 0);
          const t = h.cart.reduce((a, c) => a + c.harga * c.qty, 0);

          return `<div class="hd"><div><b>${esc(h.catatan || "Tanpa catatan")}</b><small>${n} item · ${rp(t)} · ${jam(new Date(h.waktu))}</small></div><div class="row"><button class="pri" onclick="bukaTahan('${h.id}')">Buka</button><button class="dng" onclick="hapusTahan('${h.id}')">Hapus</button></div></div>`;
        })
        .join("")
    : '<div class="empty">Tidak ada pesanan yang ditahan.</div>';
}

$("#lihatTahan").onclick = () => {
  renderTahan();
  $("#modalTahan").classList.add("on");
};

$("#tTutup").onclick = () => $("#modalTahan").classList.remove("on");

function bukaTahan(id) {
  const h = ditahan.find((x) => x.id === id);

  if (!h) return;

  if (cart.length && !confirm("Pesanan saat ini akan diganti. Lanjutkan?"))
    return;

  cart = h.cart;
  $("#catatan").value = h.catatan || "";
  $("#diskon").value = h.diskon || "";
  setTipe(h.tipe || "Makan di tempat");

  ditahan = ditahan.filter((x) => x.id !== id);

  simpanTahan();
  jmlTahan();
  renderCart();

  $("#modalTahan").classList.remove("on");
}

function hapusTahan(id) {
  if (!confirm("Hapus pesanan yang ditahan ini?")) return;

  ditahan = ditahan.filter((x) => x.id !== id);

  simpanTahan();
  jmlTahan();
  renderTahan();
}

/* =====================================================
   SIMPAN TRANSAKSI
===================================================== */

$("#btnBayar").onclick = () => {
  const t = totalCart();

  if (!cart.length) return toast("Keranjang kosong");
  if (bayar < t) return toast("Uang kurang");

  const now = new Date();
  const hari = kunciTgl(now);

  const noTerakhir = trx
    .filter((x) => kunciTgl(new Date(x.tanggal)) === hari)
    .reduce((m, x) => Math.max(m, x.no), 0);

  const data = {
    id: "t" + now.getTime(),
    no: noTerakhir + 1,
    tanggal: now.toISOString(),
    catatan: $("#catatan").value.trim(),
    item: cart.map((c) => ({
      nama: c.nama,
      harga: c.harga,
      qty: c.qty,
    })),
    subtotal: subCart(),
    diskon: diskonCart(),
    tipe,
    total: t,
    dibayar: bayar,
    kembalian: bayar - t,
    metode,
  };

  trx.push(data);

  simpanTrx();
  dbUpS("trx", [data]);

  tutupSheet();
  chipHari();

  resetKasir();
  tampilStruk(data, true);
};

/* =====================================================
   STRUK
===================================================== */

function tampilStruk(t, baru) {
  strukAktif = t;

  const d = new Date(t.tanggal);

  const baris = (a, b, cls = "") =>
    `<div class="f ${cls}"><span>${a}</span><span>${b}</span></div>`;

  $("#struk").innerHTML = `
    <div class="c b" style="font-size:18px">WARBUL 165</div>
    <div class="c">Warkop</div><div class="d"></div>
    ${baris(tglIndo(d), jam(d))}
    ${baris("No. Transaksi", "#" + pad(t.no).padStart(3, "0"))}
    ${baris("Metode", t.metode || "Tunai")}
    ${t.tipe ? baris("Pesanan", t.tipe) : ""}
    ${t.catatan ? `<div>Catatan: ${esc(t.catatan)}</div>` : ""}
    <div class="d"></div>
    ${t.item.map((i) => `<div>${esc(i.nama)}</div>${baris(`${i.qty} x ${i.harga.toLocaleString("id-ID")}`, rp(i.harga * i.qty))}`).join("")}
    <div class="d"></div>
    ${t.diskon > 0 ? baris("Subtotal", rp(t.subtotal)) + baris("Diskon", "-" + rp(t.diskon)) : ""}
    ${baris("TOTAL", rp(t.total), "b")}
    ${baris("Uang Diterima", rp(t.dibayar))}
    ${baris("Kembalian", rp(t.kembalian))}
    <div class="d"></div>
    <div class="c">Terima kasih</div><div class="c">Sampai jumpa lagi!</div>`;

  $("#baru").textContent = baru ? "Transaksi Baru" : "Tutup";
  $("#modalStruk").classList.add("on");
}

$("#cetak").onclick = () => window.print();

/* Kirim struk lewat WhatsApp */

$("#wa").onclick = () => {
  const t = strukAktif;

  if (!t) return;

  const d = new Date(t.tanggal);

  let x = `*WARBUL 165*\n${tglIndo(d)} ${jam(d)}\nNo. #${pad(t.no).padStart(3, "0")}\n\n`;

  x += t.item
    .map((i) => `${i.qty}x ${i.nama} - ${rp(i.harga * i.qty)}`)
    .join("\n");

  if (t.diskon > 0) x += `\n\nDiskon: -${rp(t.diskon)}`;

  x += `\n*Total: ${rp(t.total)}*\nMetode: ${t.metode || "Tunai"}\n\nTerima kasih!`;

  window.open(
    "https://wa.me/?text=" + encodeURIComponent(x),
    "_blank",
    "noopener",
  );
};

$("#baru").onclick = () => {
  $("#modalStruk").classList.remove("on");

  if (!$("#vRekap").hidden) renderRekap();
};

/* =====================================================
   REKAP
===================================================== */

$("#tgl").value = kunciTgl(new Date());
$("#tgl").onchange = renderRekap;

/* Transaksi pada periode terpilih: harian, 7 hari terakhir, atau satu bulan penuh */

function trxHari() {
  if (!$("#tgl").value) $("#tgl").value = kunciTgl(new Date());

  const [y, mo, da] = $("#tgl").value.split("-").map(Number);
  const pr = $("#periode").value;

  let a, b;

  if (pr === "hari") {
    a = new Date(y, mo - 1, da);
    b = new Date(y, mo - 1, da + 1);
  } else if (pr === "minggu") {
    a = new Date(y, mo - 1, da - 6);
    b = new Date(y, mo - 1, da + 1);
  } else {
    a = new Date(y, mo - 1, 1);
    b = new Date(y, mo, 1);
  }

  return trx
    .filter((x) => {
      const t = new Date(x.tanggal);
      return t >= a && t < b;
    })
    .sort((p, q) => new Date(p.tanggal) - new Date(q.tanggal));
}

$("#periode").onchange = renderRekap;
$("#trenRange").onchange = renderTren;

/* Grafik tren pendapatan (garis) per hari atau per bulan, berakhir di tanggal terpilih */

function renderTren() {
  if (!$("#tgl").value) $("#tgl").value = kunciTgl(new Date());

  const [y, mo, da] = $("#tgl").value.split("-").map(Number);
  const r = $("#trenRange").value;
  const bln = r === "12m";

  const pts = [];

  if (bln) {
    for (let i = 11; i >= 0; i--) {
      const a = new Date(y, mo - 1 - i, 1);

      pts.push({
        lb: a.toLocaleDateString("id-ID", { month: "short" }),
        tip: a.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
        a,
        b: new Date(y, mo - i, 1),
        v: 0,
        n: 0,
      });
    }
  } else {
    for (let i = +r - 1; i >= 0; i--) {
      const a = new Date(y, mo - 1, da - i);

      pts.push({
        lb: a.getDate(),
        tip: tglIndo(a),
        a,
        b: new Date(y, mo - 1, da - i + 1),
        v: 0,
        n: 0,
      });
    }
  }

  trx.forEach((x) => {
    const t = new Date(x.tanggal);
    const p = pts.find((q) => t >= q.a && t < q.b);

    if (p) {
      p.v += x.total;
      p.n++;
    }
  });

  const tot = pts.reduce((s, p) => s + p.v, 0);

  if (!tot) {
    $("#tren").innerHTML =
      '<div class="empty">Belum ada penjualan pada rentang ini.</div>';
    return;
  }

  const f0 = pts[0].a;

  const pa = bln
    ? new Date(f0.getFullYear(), f0.getMonth() - 12, 1)
    : new Date(f0.getFullYear(), f0.getMonth(), f0.getDate() - pts.length);

  const prev = trx
    .filter((x) => {
      const t = new Date(x.tanggal);
      return t >= pa && t < f0;
    })
    .reduce((s, x) => s + x.total, 0);

  const best = pts.reduce((m, p) => (p.v > m.v ? p : m), pts[0]);
  const ch = prev > 0 ? ((tot - prev) / prev) * 100 : null;

  const W = 640;
  const H = 220;
  const L = 46;
  const R = 12;
  const T = 14;
  const B = 26;
  const mx = Math.max(...pts.map((p) => p.v)) * 1.1;

  const X = (i) =>
    L + (W - L - R) * (pts.length > 1 ? i / (pts.length - 1) : 0.5);

  const Y = (v) => T + (H - T - B) * (1 - v / mx);

  const kc = (v) =>
    v >= 1e6
      ? (v / 1e6).toFixed(1).replace(".0", "") + "jt"
      : Math.round(v / 1000) + "rb";

  let s = `<svg class="tsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik tren penjualan">`;

  for (let g = 0; g <= 4; g++) {
    const v = ((mx / 1.1) * g) / 4;
    const yy = Y(v);

    s += `<line class="tg" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="tx" x="${L - 6}" y="${yy + 4}" text-anchor="end">${kc(v)}</text>`;
  }

  const line = pts
    .map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.v).toFixed(1))
    .join(" ");

  s += `<path class="ta" d="${line} L${X(pts.length - 1)} ${H - B} L${X(0)} ${H - B}Z"/><path class="tl" d="${line}"/>`;

  const step = pts.length > 14 ? 5 : 1;

  pts.forEach((p, i) => {
    const last = i === pts.length - 1;

    if (pts.length <= 14 || last || p === best)
      s += `<circle class="${last ? "tn" : "td"}" cx="${X(i)}" cy="${Y(p.v)}" r="${last ? 5 : 3.5}"/>`;

    if (i % step === 0 || last)
      s += `<text class="tx" x="${X(i)}" y="${H - 8}" text-anchor="middle">${p.lb}</text>`;

    s += `<circle class="th2" cx="${X(i)}" cy="${Y(p.v)}" r="12"><title>${p.tip}: ${rp(p.v)} (${p.n} transaksi)</title></circle>`;
  });

  s += "</svg>";

  const sat = bln ? "bulan" : "hari";

  const cards = [
    ["Total " + (bln ? "12 Bulan" : pts.length + " Hari"), rp(tot)],
    ["Rata-rata / " + sat, rp(tot / pts.length)],
    [(bln ? "Bulan" : "Hari") + " Terbaik", best.tip + " · " + rp(best.v)],
    [
      "Dibanding periode sebelumnya",
      ch === null
        ? "-"
        : `<span class="${ch >= 0 ? "good" : "warn"}">${ch >= 0 ? "▲ +" : "▼ "}${Math.abs(ch).toFixed(0)}%</span>`,
    ],
  ];

  $("#tren").innerHTML =
    s +
    '<div class="stats">' +
    cards
      .map(
        ([a, b]) =>
          `<div class="stat"><small>${a}</small><div style="font-size:${a.startsWith("Hari") || a.startsWith("Bulan") ? "16px" : "22px"}">${b}</div></div>`,
      )
      .join("") +
    "</div>";
}

$("#hariIni").onclick = () => {
  $("#tgl").value = kunciTgl(new Date());
  renderRekap();
};

$("#kemarin").onclick = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);

  $("#tgl").value = kunciTgl(d);
  renderRekap();
};

function renderRekap() {
  renderTren();

  const L = trxHari();

  const tot = L.reduce((s, x) => s + x.total, 0);

  const qty = L.reduce((s, x) => s + x.item.reduce((a, i) => a + i.qty, 0), 0);

  const mt = (m) =>
    L.filter((x) => (x.metode || "Tunai") === m).reduce(
      (s, x) => s + x.total,
      0,
    );

  const kl = keluarHari();
  const tk = kl.reduce((s, x) => s + x.jumlah, 0);

  renderKeluar(kl);

  $("#stats").innerHTML = [
    ["Total Pendapatan", rp(tot)],
    ["Jumlah Transaksi", L.length],
    ["Item Terjual", qty],
    ["Rata-rata / Transaksi", rp(L.length ? tot / L.length : 0)],
    ["Tunai", rp(mt("Tunai"))],
    ["QRIS", rp(mt("QRIS"))],
    ["Transfer", rp(mt("Transfer"))],
    ["Pengeluaran", rp(tk)],
    ["Laba Bersih", rp(tot - tk)],
  ]
    .map(
      ([a, b]) =>
        `<div class="stat${a === "Total Pendapatan" || a === "Laba Bersih" ? " hi" : ""}"><small>${a}</small><div>${b}</div></div>`,
    )
    .join("");

  if (!L.length) {
    $("#tbTrx").innerHTML =
      '<div class="empty">Belum ada transaksi pada tanggal ini.</div>';

    $("#chart").innerHTML =
      '<div class="empty" style="width:100%">Belum ada data.</div>';

    $("#tbTop").innerHTML =
      '<div class="empty">Belum ada data penjualan.</div>';

    return;
  }

  /* Grafik batang pendapatan per jam */

  const jm = {};

  L.forEach((x) => {
    const j = new Date(x.tanggal).getHours();
    jm[j] = (jm[j] || 0) + x.total;
  });

  const hs = Object.keys(jm).map(Number);
  const lo = Math.min(...hs);
  const hi = Math.max(...hs);
  const mx = Math.max(...Object.values(jm));

  let cb = "";

  for (let i = lo; i <= hi; i++) {
    const v = jm[i] || 0;

    cb += `<div class="cb" title="${rp(v)}"><small>${v ? Math.round(v / 1000) + "rb" : ""}</small><i style="height:${Math.max(v ? 4 : 1, Math.round((v / mx) * 90))}px"></i><small>${pad(i)}</small></div>`;
  }

  $("#chart").innerHTML = cb;

  $("#tbTrx").innerHTML =
    `<table><tr><th>No</th><th>Jam</th><th>Item</th><th>Metode</th><th class="r">Total</th><th class="r">Bayar</th><th class="r">Kembali</th><th></th></tr>` +
    L.map(
      (
        x,
      ) => `<tr><td>${x.no}</td><td>${$("#periode").value === "hari" ? "" : new Date(x.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) + " "}${jam(new Date(x.tanggal))}</td>
    <td>${x.item.map((i) => esc(i.nama) + " ×" + i.qty).join(", ")}${x.catatan ? `<br><small style="color:var(--mt)">${esc(x.catatan)}</small>` : ""}</td>
    <td>${x.metode || "Tunai"}</td><td class="r">${rp(x.total)}</td><td class="r">${rp(x.dibayar)}</td><td class="r">${rp(x.kembalian)}</td>
    <td style="white-space:nowrap"><button onclick="lihat('${x.id}')">Struk</button> <button class="dng" onclick="batal('${x.id}')">Hapus</button></td></tr>`,
    ).join("") +
    "</table>";

  /* Ringkasan menu terlaris (hanya teks, tanpa foto) */

  const p = {};

  L.forEach((x) =>
    x.item.forEach((i) => {
      p[i.nama] = p[i.nama] || { q: 0, r: 0 };
      p[i.nama].q += i.qty;
      p[i.nama].r += i.qty * i.harga;
    }),
  );

  $("#tbTop").innerHTML =
    `<table><tr><th>Menu</th><th class="r">Terjual</th><th class="r">Pendapatan</th></tr>` +
    Object.entries(p)
      .sort((a, b) => b[1].q - a[1].q || b[1].r - a[1].r)
      .map(
        ([n, v]) =>
          `<tr><td>${esc(n)}</td><td class="r">${v.q}</td><td class="r">${rp(v.r)}</td></tr>`,
      )
      .join("") +
    "</table>";
}

function lihat(id) {
  const t = trx.find((x) => x.id === id);

  if (t) tampilStruk(t, false);
}

function batal(id) {
  const t = trx.find((x) => x.id === id);

  if (!t) return;

  if (confirm(`Batalkan transaksi #${t.no} senilai ${rp(t.total)}?`)) {
    trx = trx.filter((x) => x.id !== id);

    simpanTrx();
    dbDel("trx", id);
    renderRekap();

    chipHari();
    toast("Transaksi dihapus");
  }
}

/* Export CSV */

$("#csv").onclick = () => {
  const L = trxHari();

  if (!L.length) return toast("Tidak ada data untuk diexport");

  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';

  const rows = [
    [
      "Tanggal",
      "No",
      "Jam",
      "Item",
      "Catatan",
      "Metode",
      "Total",
      "Dibayar",
      "Kembalian",
      "Diskon",
      "Tipe",
    ],
  ];

  L.forEach((x) =>
    rows.push([
      kunciTgl(new Date(x.tanggal)),
      x.no,
      jam(new Date(x.tanggal)),
      x.item.map((i) => i.nama + " x" + i.qty).join("; "),
      x.catatan,
      x.metode || "Tunai",
      x.total,
      x.dibayar,
      x.kembalian,
      x.diskon || 0,
      x.tipe || "",
    ]),
  );

  const blob = new Blob(
    ["\ufeff" + rows.map((r) => r.map(q).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download =
    "rekap-warbul165-" + $("#periode").value + "-" + $("#tgl").value + ".csv";

  document.body.appendChild(a);
  a.click();
  a.remove();
};

/* =====================================================
   KELOLA MENU
===================================================== */

function renderKelola() {
  const qm = ($("#cariMenu").value || "").trim().toLowerCase();
  const dm = menu.filter((m) => !qm || m.nama.toLowerCase().includes(qm));

  $("#tbMenu").innerHTML = dm.length
    ? `<table><tr><th>Nama</th><th>Kategori</th><th class="r">Panas</th><th class="r">Dingin</th><th>Tambahan</th><th></th></tr>` +
      dm
        .map(
          (
            m,
          ) => `<tr><td>${foto(m, "th")}${esc(m.nama)}${m.habis ? ' <small class="warn">(Habis)</small>' : ""}</td><td>${m.kat === "minuman" ? "Minuman" : "Makanan"}</td>
    <td class="r">${m.kat === "minuman" ? (m.panas ? rp(m.panas) : "-") : rp(m.harga)}</td>
    <td class="r">${m.kat === "minuman" ? (m.dingin ? rp(m.dingin) : "-") : "-"}</td>
    <td>${m.tambahan.map((t) => esc(t.nama) + " (+" + rp(t.harga) + ")").join(", ") || "-"}</td>
    <td style="white-space:nowrap"><button onclick="toggleHabis('${m.id}')">${m.habis ? "Tersedia" : "Habis"}</button> <button onclick="formMenu('${m.id}')">Ubah</button> <button class="dng" onclick="hapusMenu('${m.id}')">Hapus</button></td></tr>`,
        )
        .join("") +
      "</table>"
    : '<div class="empty">Menu tidak ditemukan. Tambahkan menu baru.</div>';
}

$("#cariMenu").oninput = renderKelola;

function aturForm() {
  const mn = $("#fKat").value === "minuman";

  $("#fMin").hidden = !mn;
  $("#fMak").hidden = mn;
}

$("#fKat").onchange = () => {
  aturForm();
  fotoPrev();
};

["fPanas", "fDingin", "fHarga", "fTamHarga"].forEach(
  (id) =>
    ($("#" + id).oninput = (e) => {
      const n = num(e.target.value);
      e.target.value = n ? n.toLocaleString("id-ID") : "";
    }),
);

function formMenu(id) {
  editId = id || null;

  const m = id
    ? menu.find((x) => x.id === id)
    : {
        nama: "",
        kat: "minuman",
        panas: 0,
        dingin: 0,
        harga: 0,
        tambahan: [],
      };

  const f = (n) => (n ? n.toLocaleString("id-ID") : "");

  $("#fJudul").textContent = id ? "Ubah Menu" : "Tambah Menu";
  $("#fNama").value = m.nama;
  $("#fKat").value = m.kat;
  $("#fPanas").value = f(m.panas);
  $("#fDingin").value = f(m.dingin);
  $("#fHarga").value = f(m.harga);

  const t = m.tambahan[0] || { nama: "", harga: 0 };

  $("#fTamNama").value = t.nama;
  $("#fTamHarga").value = f(t.harga);

  gambarForm = m.gambar || "";

  fotoPrev();
  aturForm();

  $("#modalForm").classList.add("on");
  $("#fNama").focus();
}

let gambarForm = "";

function fotoPrev() {
  $("#fPrev").innerHTML =
    foto(
      {
        nama: $("#fNama").value || "Menu",
        kat: $("#fKat").value,
        gambar: gambarForm,
      },
      "ph",
    ) +
    '<small style="color:var(--mt)">' +
    (gambarForm ? "Foto sendiri" : "Ikon bawaan") +
    "</small>";
}

$("#fFotoBtn").onclick = () => $("#fFile").click();

$("#fFotoHapus").onclick = () => {
  gambarForm = "";
  fotoPrev();
};

$("#fFile").onchange = (e) => {
  const f = e.target.files[0];

  e.target.value = "";

  if (f)
    kecilkan(f, (d) => {
      gambarForm = d;
      fotoPrev();
    });
};

$("#fNama").oninput = fotoPrev;

$("#tambahMenu").onclick = () => formMenu();

$("#fBatal").onclick = () => $("#modalForm").classList.remove("on");

$("#fSimpan").onclick = () => {
  const nama = $("#fNama").value.trim();
  const k = $("#fKat").value;

  if (!nama) return toast("Nama menu wajib diisi");

  const m = {
    id: editId || "m" + Date.now(),
    nama,
    kat: k,
    panas: 0,
    dingin: 0,
    harga: 0,
    tambahan: [],
    habis: editId ? !!(menu.find((x) => x.id === editId) || {}).habis : false,
    gambar: gambarForm,
    gambarDingin: editId
      ? (menu.find((x) => x.id === editId) || {}).gambarDingin || ""
      : "",
  };

  if (k === "minuman") {
    m.panas = num($("#fPanas").value);
    m.dingin = num($("#fDingin").value);

    if (!m.panas && !m.dingin)
      return toast("Isi minimal satu harga (Panas/Dingin)");
  } else {
    m.harga = num($("#fHarga").value);

    if (!m.harga) return toast("Harga wajib diisi");
  }

  const tn = $("#fTamNama").value.trim();
  const th = num($("#fTamHarga").value);

  if (tn && th) m.tambahan.push({ nama: tn, harga: th });

  if (editId) menu = menu.map((x) => (x.id === editId ? m : x));
  else menu.push(m);

  simpanMenu();

  $("#modalForm").classList.remove("on");

  renderKelola();
  renderMenu();

  toast("Menu disimpan");
};

function hapusMenu(id) {
  const m = menu.find((x) => x.id === id);

  if (m && confirm(`Hapus menu "${m.nama}"?`)) {
    menu = menu.filter((x) => x.id !== id);
    cart = cart.filter((c) => !c.key.startsWith(id + "|"));

    simpanMenu();
    dbDel("menu", id);

    renderKelola();
    renderMenu();
    renderCart();
  }
}

$("#resetMenu").onclick = () => {
  if (
    confirm(
      "Kembalikan semua menu ke daftar awal? Perubahan menu akan hilang (riwayat transaksi tetap aman).",
    )
  ) {
    menu = menuAwal();
    cart = [];

    tulis("warbul_menu", menu);

    if (window.cloudSiap)
      sb.from("menu")
        .delete()
        .neq("id", "")
        .then(() => dbUp("menu", menu));

    renderKelola();
    renderMenu();
    renderCart();

    toast("Menu dikembalikan");
  }
};

/* =====================================================
   TEMA GELAP / TERANG
===================================================== */

function setTema(t) {
  document.documentElement.dataset.tema = t;

  $("#tema").textContent = t === "terang" ? "🌙" : "☀️";
  $("#tema").setAttribute(
    "aria-label",
    t === "terang" ? "Ganti ke mode gelap" : "Ganti ke mode terang",
  );

  const mc = document.querySelector('meta[name="theme-color"]');

  if (mc) mc.content = t === "terang" ? "#f5f3ee" : "#0e0f12";

  try {
    localStorage.setItem("warbul_tema", t);
  } catch (e) {}
}

$("#tema").onclick = () =>
  setTema(
    document.documentElement.dataset.tema === "terang" ? "gelap" : "terang",
  );

let temaAwal = "gelap";

try {
  temaAwal =
    localStorage.getItem("warbul_tema") ||
    (matchMedia("(prefers-color-scheme: light)").matches ? "terang" : "gelap");
} catch (e) {}

setTema(temaAwal);

/* =====================================================
   PENGELUARAN & LABA BERSIH
===================================================== */

let keluar = baca("warbul_keluar", []);

if (!Array.isArray(keluar)) keluar = [];

const simpanKeluar = () => tulis("warbul_keluar", keluar);

function keluarHari() {
  if (!$("#tgl").value) $("#tgl").value = kunciTgl(new Date());

  const [y, mo, da] = $("#tgl").value.split("-").map(Number);
  const pr = $("#periode").value;

  let a, b;

  if (pr === "hari") {
    a = new Date(y, mo - 1, da);
    b = new Date(y, mo - 1, da + 1);
  } else if (pr === "minggu") {
    a = new Date(y, mo - 1, da - 6);
    b = new Date(y, mo - 1, da + 1);
  } else {
    a = new Date(y, mo - 1, 1);
    b = new Date(y, mo, 1);
  }

  return keluar
    .filter((x) => {
      const t = new Date(x.tanggal);
      return t >= a && t < b;
    })
    .sort((p, q) => new Date(p.tanggal) - new Date(q.tanggal));
}

function renderKeluar(kl) {
  $("#tbKeluar").innerHTML = kl.length
    ? `<table><tr><th>Tanggal</th><th>Keterangan</th><th class="r">Jumlah</th><th></th></tr>` +
      kl
        .map((x) => {
          const d = new Date(x.tanggal);

          return `<tr><td>${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${jam(d)}</td><td>${esc(x.ket)}</td><td class="r">${rp(x.jumlah)}</td><td><button class="dng" onclick="hapusKeluar('${x.id}')">Hapus</button></td></tr>`;
        })
        .join("") +
      "</table>"
    : '<div class="empty">Belum ada pengeluaran pada periode ini.</div>';
}

$("#tambahKeluar").onclick = () => {
  $("#kKet").value = "";
  $("#kJml").value = "";
  $("#kTgl").value = $("#tgl").value || kunciTgl(new Date());

  $("#modalKeluar").classList.add("on");
  $("#kKet").focus();
};

$("#kJml").oninput = (e) => {
  const n = num(e.target.value);
  e.target.value = n ? rp(n) : "";
};

$("#kBatal").onclick = () => $("#modalKeluar").classList.remove("on");

$("#kSimpan").onclick = () => {
  const ket = $("#kKet").value.trim();
  const jml = num($("#kJml").value);

  if (!ket) return toast("Isi keterangan pengeluaran");
  if (!jml) return toast("Isi jumlah pengeluaran");

  const [y, mo, da] = ($("#kTgl").value || kunciTgl(new Date()))
    .split("-")
    .map(Number);

  const n = new Date();

  keluar.push({
    id: "k" + Date.now(),
    tanggal: new Date(
      y,
      mo - 1,
      da,
      n.getHours(),
      n.getMinutes(),
    ).toISOString(),
    ket,
    jumlah: jml,
  });

  simpanKeluar();
  dbUpS("keluar", [keluar[keluar.length - 1]]);

  $("#modalKeluar").classList.remove("on");

  renderRekap();

  toast("Pengeluaran dicatat");
};

function hapusKeluar(id) {
  if (confirm("Hapus catatan pengeluaran ini?")) {
    keluar = keluar.filter((x) => x.id !== id);

    simpanKeluar();
    dbDel("keluar", id);
    renderRekap();
  }
}

/* =====================================================
   CETAK LAPORAN REKAP
===================================================== */

const namaPeriode = {
  hari: "Harian",
  minggu: "7 Hari Terakhir",
  bulan: "Bulanan",
};

$("#cetakRekap").onclick = () => {
  const [y, mo, da] = $("#tgl").value.split("-").map(Number);

  $("#judulCetak").textContent =
    "Laporan WARBUL 165 · " +
    namaPeriode[$("#periode").value] +
    " · " +
    tglIndo(new Date(y, mo - 1, da));

  document.body.classList.add("rekap");

  window.print();
};

window.addEventListener("afterprint", () =>
  document.body.classList.remove("rekap"),
);

/* =====================================================
   METODE PEMBAYARAN
===================================================== */

let metode = "Tunai";

function setMetode(m) {
  metode = m;

  document
    .querySelectorAll("#metode button")
    .forEach((b) => b.classList.toggle("on", b.dataset.m === m));
}

document.querySelectorAll("#metode button").forEach(
  (b) =>
    (b.onclick = () => {
      setMetode(b.dataset.m);

      if (b.dataset.m === "Tunai") {
        bayar = 0;
        $("#bayar").value = "";
      }

      renderBayar();
    }),
);

/* =====================================================
   TANDAI MENU HABIS / TERSEDIA
===================================================== */

function toggleHabis(id) {
  const m = menu.find((x) => x.id === id);

  if (m) {
    m.habis = !m.habis;

    simpanMenu();
    renderKelola();
    renderMenu();
  }
}

/* =====================================================
   CADANGKAN & PULIHKAN DATA
===================================================== */

$("#backup").onclick = () => {
  const blob = new Blob(
    [JSON.stringify({ app: "warbul165", menu, trx, keluar })],
    { type: "application/json" },
  );

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = "backup-warbul165-" + kunciTgl(new Date()) + ".json";

  document.body.appendChild(a);
  a.click();
  a.remove();

  tulis("warbul_backup", Date.now());

  infoBackup();

  toast("Cadangan diunduh");
};

$("#restore").onclick = () => $("#fileRestore").click();

$("#fileRestore").onchange = (e) => {
  const f = e.target.files[0];

  e.target.value = "";

  if (!f) return;

  const r = new FileReader();

  r.onload = () => {
    try {
      const d = JSON.parse(r.result);

      if (
        d.app !== "warbul165" ||
        !Array.isArray(d.menu) ||
        !Array.isArray(d.trx)
      )
        throw 0;

      if (
        !confirm(
          `Pulihkan ${d.trx.length} transaksi dan ${d.menu.length} menu? Data saat ini akan diganti.`,
        )
      )
        return;

      menu = d.menu;
      trx = d.trx;
      keluar = Array.isArray(d.keluar) ? d.keluar : [];

      tulis("warbul_menu", menu);
      simpanTrx();
      simpanKeluar();

      if (window.cloudSiap)
        (async () => {
          for (const t of ["menu", "trx", "keluar"])
            await sb.from(t).delete().neq("id", "");

          await dbUp("menu", menu);
          await dbUp("trx", trx);
          await dbUp("keluar", keluar);
        })();

      resetKasir();

      renderMenu();
      renderKelola();

      toast("Data dipulihkan");
    } catch (x) {
      toast("File cadangan tidak valid");
    }
  };

  r.readAsText(f);
};

/* =====================================================
   INFO CADANGAN & PENYIMPANAN PERMANEN
===================================================== */

function infoBackup() {
  const t = baca("warbul_backup", 0);

  $("#infoBackup").textContent = t
    ? "Cadangan terakhir: " +
      new Date(t).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Belum pernah dicadangkan";

  $("#infoBackup").style.color =
    !t || Date.now() - t > 7 * 864e5 ? "var(--er)" : "var(--mt)";
}

try {
  localStorage.setItem("_cek", "1");
  localStorage.removeItem("_cek");
} catch (e) {
  $("#peringatan").hidden = false;
}

try {
  if (navigator.storage && navigator.storage.persist)
    navigator.storage.persist();
} catch (e) {}

/* =====================================================
   MULAI APLIKASI
===================================================== */

renderMenu();
renderCart();
infoBackup();
jmlTahan();
chipHari();
statusOnl();

async function mulaiCloud() {
  const {
    data: { session },
  } = await sb.auth.getSession();

  if (!session) {
    $("#login").classList.add("on");
    return;
  }

  $("#login").classList.remove("on");

  try {
    const [m, t, k] = await Promise.all([
      dbLoad("menu"),
      dbLoad("trx"),
      dbLoad("keluar"),
    ]);

    if (!m.length && !t.length && !k.length) {
      await dbUp("menu", menu);
      await dbUp("trx", trx);
      await dbUp("keluar", keluar);

      toast("Data lama berhasil diunggah ke cloud");
    } else {
      if (m.length) menu = m;

      trx = t;
      keluar = k;

      tulis("warbul_menu", menu);
      tulis("warbul_trx", trx);
      tulis("warbul_keluar", keluar);

      toast("Tersambung ke cloud ✔");
    }

    window.cloudSiap = true;

    renderMenu();
    renderCart();
    renderKelola();
    chipHari();

    if (!$("#vRekap").hidden) renderRekap();
  } catch (e) {
    toast("Offline / gagal memuat cloud, memakai data lokal");
  }
}

$("#lMasuk").onclick = async () => {
  const { error } = await sb.auth.signInWithPassword({
    email: $("#lEmail").value.trim(),
    password: $("#lPass").value,
  });

  if (error) return toast("Login gagal: " + error.message);

  mulaiCloud();
};

$("#lPass").onkeydown = (e) => {
  if (e.key === "Enter") $("#lMasuk").click();
};

mulaiCloud();

/* =====================================================
   RINGKASAN HARI INI, STATUS KONEKSI, SHORTCUT
===================================================== */

function chipHari() {
  const h = kunciTgl(new Date());
  const L = trx.filter((x) => kunciTgl(new Date(x.tanggal)) === h);

  $("#hariChip").innerHTML =
    `<small>Hari ini</small><b>${rp(L.reduce((a, x) => a + x.total, 0))}</b><small>${L.length} transaksi</small>`;
}

function statusOnl() {
  const o = navigator.onLine;

  $("#onl").dataset.s = o ? "on" : "off";
  $("#onl").title = o ? "Online" : "Offline: data tersimpan di perangkat ini";
  $("#onlT").textContent = o ? "Online" : "Offline";
}

window.addEventListener("online", () => {
  statusOnl();
  toast("Kembali online");
});

window.addEventListener("offline", () => {
  statusOnl();
  toast("Offline: transaksi tetap tersimpan di perangkat");
});

/* Klik area gelap menutup modal (kecuali login) */

document.querySelectorAll(".modal").forEach((m) =>
  m.addEventListener("mousedown", (e) => {
    if (e.target === m && m.id !== "login") m.classList.remove("on");
  }),
);

document.addEventListener("keydown", (e) => {
  const aktif = document.activeElement ? document.activeElement.tagName : "";

  if (e.key === "Escape") {
    document
      .querySelectorAll(".modal.on")
      .forEach((m) => m.id !== "login" && m.classList.remove("on"));

    tutupSheet();
  } else if (
    e.key === "/" &&
    !/INPUT|SELECT|TEXTAREA/.test(aktif) &&
    !$("#vKasir").hidden
  ) {
    e.preventDefault();
    $("#cari").focus();
  } else if (
    e.key === "Enter" &&
    (e.ctrlKey || e.metaKey) &&
    !document.querySelector(".modal.on") &&
    !$("#btnBayar").disabled
  ) {
    $("#btnBayar").click();
  }
});
