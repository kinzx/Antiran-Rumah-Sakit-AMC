// ============================================================
// RS AMC Muhammadiyah - Monitor Antrian Poliklinik Rawat Jalan
// Dynamic Card Rendering with 15-second Auto-Refresh
// ============================================================

// ---- CONFIGURATION ----
const ANTRIAN_DATA_URL = 'proxy.php';
const REFRESH_INTERVAL_MS = 15000; // 15 seconds
let refreshTimer = null;
let antrianData = [];

// ---- ICON MAP: nama poliklinik -> file di img/Icon Poli ----
const POLI_ICON_FILES = {
  'KLINIK PENYAKIT DALAM': 'Penyakit dalam.png',
  'KLINIK PENYAKIT DALAM B': 'Penyakit dalam b.png',
  'KLINIK KULIT & KELAMIN': 'kulit.png',
  'KLINIK NEUROLOGI': 'syaraf.png',
  'KLINIK GIGI': 'gigi.png',
  'KLINIK GIGI PROSTHODONTI': 'gigi.png',
  'KLINIK MATA': 'mata.png',
  'KLINIK BEDAH': 'bedah.png',
  'KLINIK BEDAH ANAK': 'bedah.png',
  'KLINIK ANAK': 'anak.png',
  'KLINIK OBSGYN 1': 'obgyn.png',
  'KLINIK OBSGYN': 'obgyn.png',
  'KLINIK ORTHOPAEDI DAN TRAUMATO': 'orthopedi.png',
  'KLINIK JANTUNG': 'jantung.png',
  'KLINIK THT': 'THT.png',
  'KLINIK PSIKIATRI': 'psikiatri.png',
  'KLINIK PSIKOLOG': 'psikiatri.png',
  'KLINIK PARU': 'paru.png',
  'KLINIK DOKTER UMUM': 'dokter umum.png',
  'IGD 24 JAM': 'IGD 24 Jam.png',
  'KLINIK BEAUTY CENTER': 'beauty center.png',
  'KLINIK HIPNOTERAPI': 'hipnoterapi.png',
  'KLINIK OKUPASI TERAPI': 'okupasi terapi.png',
  'KLINIK LAKTASI': 'laktasi.png',
  'KLINIK FISIOTERAPI': 'fisioterapi.png',
  'KLINIK AKUPUNKTUR': 'akupunkture.png',
  'KLINIK TERAPI WICARA': 'terapi wicara.png',
  'KLINIK REHAB MEDIK': 'rehab medik.png',
  'KLINIK VAKSIN': 'vaksin.png',
  'LABORATORIUM': 'laboratorium.png',
  'RADIOLOGI': 'radiologi.png',
  'KLINIK STEMCELL': 'stemcell.png',
  'KLINIK OZON': 'ozon.png'
};

const ICON_POLI_BASE = 'img/Icon Poli/';
const DEFAULT_ICON_FILE = 'dokter umum.png';

// ---- HELPER: Get Icon for Poliklinik ----
function getPoliIcon(poliName) {
  var file = POLI_ICON_FILES[String(poliName).toUpperCase()] || DEFAULT_ICON_FILE;
  return '<img src="' + ICON_POLI_BASE + encodeURIComponent(file) + '" alt="" width="36" height="36" class="poli-icon-img" loading="lazy">';
}

// ---- HELPER: status_praktik dari API -> label + kelas badge ----
// API baru kirim nilai snake_case; label Bahasa Indonesia, nilai tak dikenal apa adanya.
const STATUS_PRAKTIK_LABEL = {
  belum_mulai:      { label: 'Belum Mulai', class: 'badge-belum' },
  sedang_berjalan:  { label: 'Berjalan',     class: 'badge-hadir' },
  selesai:          { label: 'Selesai',      class: 'badge-selesai' }
};

// ---- HELPER: kode panggil dokter ----
// API baru kirim kode_panggil ("RP"); API lama tidak punya, ambil dari depan diproses ("RP-4" -> "RP").
function getKodePanggil(item) {
  if (item.kode_panggil) return String(item.kode_panggil).trim();
  const diproses = item.diproses && item.diproses !== '-' ? String(item.diproses) : '';
  return diproses ? diproses.split('-')[0] : '';
}

// ---- HELPER: Baris "Kode dokter" = kode + nomor yang sedang diproses ----
// kode_panggil "RP" + diproses "RP-4" => "RP-4"; diproses "-" => "RP"; tanpa kode => "-".
// Terpisah dari baris jam praktik supaya user jelas bedanya: jam = kapan, kode = nomor panggil.
function getKodeDokterText(item) {
  const kode = getKodePanggil(item);
  if (!kode) return '-';
  if (kode.indexOf('-') !== -1) return kode;
  const nomor = String(item.diproses || '').match(/\d+/);
  return nomor ? `${kode}-${nomor[0]}` : kode;
}

// ---- HELPER: Determine doctor attendance status ----
// panggil: null=belum datang, 0=sudah datang, 1=dipanggil, 2=diperiksa, 3=terlewati
function getDoctorStatus(item) {
  // status_praktik (API baru) lebih baru dari heuristik panggil, jadi dipakai dulu
  const praktik = STATUS_PRAKTIK_LABEL[String(item.status_praktik || '').toLowerCase()];
  if (praktik) return praktik;
  if (item.status_praktik) {
    return { label: String(item.status_praktik), class: 'badge-belum' };
  }

  if (item.sudah_dilayani >= item.total_antrian && item.total_antrian > 0) {
    return { label: 'Selesai', class: 'badge-selesai' };
  }
  if (item.diproses && item.diproses !== '-') {
    return { label: 'Sudah Hadir', class: 'badge-hadir' };
  }
  const list = Array.isArray(item.antrian) ? item.antrian : [];
  if (list.some(a => ['0', '1', '2'].includes(String(a.panggil)))) {
    return { label: 'Sudah Hadir', class: 'badge-hadir' };
  }
  if (item.sudah_dilayani > 0) {
    return { label: 'Sudah Hadir', class: 'badge-hadir' };
  }
  return { label: 'Belum Hadir', class: 'badge-belum' };
}

// ---- HELPER: Determine serving banner (samakan endpoint resmi) ----
// Text ikut field diproses apa adanya. Warna: '-' => #d46852 (theme-coral),
// ada pasien => #a87930 (theme-mustard), selesai => #679875 (theme-green)
function getServingInfo(item) {
  if (item.sudah_dilayani >= item.total_antrian && item.total_antrian > 0) {
    return {
      text: 'Pasien selesai',
      theme: 'theme-green',
      isCode: false
    };
  }

  if (item.diproses && item.diproses !== '-') {
    // getKodeDokterText menambahkan kode dokter kalau diproses cuma nomor ("4" -> "RP-4")
    return {
      text: getKodeDokterText(item),
      theme: 'theme-mustard',
      isCode: true
    };
  }

  // diproses '-' dari endpoint: tampil '-' tanpa fallback panggil 1/2
  return {
    text: '-',
    theme: 'theme-coral',
    isCode: false
  };
}

// ---- HELPER: Calculate Queue Category Stats ----
function getAntrianStats(item) {
  const list = Array.isArray(item.antrian) ? item.antrian : [];

  // Tentukan nomor antrean yang sedang dilayani / diproses
  let sedangDilayani = 0;
  if (item.diproses && item.diproses !== '-') {
    const match = String(item.diproses).match(/\d+/);
    if (match) sedangDilayani = parseInt(match[0], 10);
  }

  // Jika diproses '-' (misal jeda antar panggilan atau sudah selesai),
  // ambil nomor tertinggi yang sudah dipanggil/dilayani
  if (list.length > 0) {
    const maxServed = list
      .filter(a => ['1', '2'].includes(String(a.panggil)))
      .reduce((max, a) => {
        const num = parseInt(String(a.no_periksa).match(/\d+/)?.[0] || '0', 10);
        return Math.max(max, num);
      }, 0);
    if (maxServed > sedangDilayani) {
      sedangDilayani = maxServed;
    }
  }

  // Hitung kategori berdasarkan nilai field panggil:
  // Terlambat Belum Datang: panggil == null & nomor < sedang dilayani
  // Terlambat Sudah Datang: panggil == '0' & nomor < sedang dilayani
  // Dipanggil Tidak Hadir: panggil == '3'
  // Selesai: item.sudah_dilayani
  let belumDatang = 0;
  let sudahDatang = 0;
  let tidakHadir = 0;
  let selesai = item.sudah_dilayani || 0;

  list.forEach(a => {
    const p = a.panggil === null || a.panggil === undefined ? null : String(a.panggil);
    const noNum = parseInt(String(a.no_periksa).match(/\d+/)?.[0] || '0', 10);

    if (sedangDilayani > 0 && noNum < sedangDilayani) {
      if (p === null) {
        belumDatang++;
      } else if (p === '0') {
        sudahDatang++;
      }
    }

    if (p === '3') {
      tidakHadir++;
    }
  });

  // Jika di data list tidak ada panggil 3 namun item.terlewati ada data riil selain '-'
  if (tidakHadir === 0 && Array.isArray(item.terlewati)) {
    const validTerlewati = item.terlewati.filter(t => t && t !== '-');
    if (validTerlewati.length > 0) {
      tidakHadir = validTerlewati.length;
    }
  }

  return {
    terlambatBelumDatang: belumDatang > 0 ? belumDatang : '-',
    terlambatSudahDatang: sudahDatang > 0 ? sudahDatang : '-',
    dipanggilTidakHadir: tidakHadir > 0 ? tidakHadir : '-',
    selesai: selesai,
    totalPasien: item.total_antrian || 0
  };
}

// ---- CARD KEY GENERATOR ----
function getCardKey(item) {
  return `${item.poliklinik}__${item.dokter}`;
}

// ---- BUILD SINGLE CARD HTML ----
function buildCardHTML(item) {
  const status = getDoctorStatus(item);
  const serving = getServingInfo(item);
  const icon = getPoliIcon(item.poliklinik);
  const waiting = Math.max(0, item.total_antrian - item.sudah_dilayani);
  const stats = getAntrianStats(item);
  const cardKey = getCardKey(item);

  const servingValueClass = serving.isCode ? 'serving-value' : 'serving-value text-message';

  return `
    <article class="poli-card card-fade-in" data-card-key="${escapeHTML(cardKey)}">
      <div class="card-top">
        <h3 class="card-doctor-name">${escapeHTML(item.dokter)}</h3>
        <span class="badge-status ${status.class}" data-field="status">${status.label}</span>
      </div>

      <div class="card-middle">
        <div class="specialty-icon-circle">
          ${icon}
        </div>
        <div class="middle-info">
          <span class="badge-poli-name">${escapeHTML(item.poliklinik)}</span>
          <div class="waiting-box">
            <span class="waiting-label">Menunggu</span>
            <span class="waiting-count" data-field="waiting">${waiting}</span>
          </div>
        </div>
      </div>

      <div class="serving-banner ${serving.theme}" data-field="serving-banner">
        <span class="serving-caption">Sedang diperiksa</span>
        <span class="${servingValueClass}" data-field="serving-value">${escapeHTML(serving.text)}</span>
      </div>

      <table class="card-details-table">
        <tr>
          <td class="detail-label">Jam praktik</td>
          <td class="detail-value" data-field="jam-praktik">${escapeHTML(item.jam_praktik || '-')}</td>
        </tr>
        <tr>
          <td class="detail-label">Terlambat Belum Datang</td>
          <td class="detail-value" data-field="terlambat-belum">${stats.terlambatBelumDatang}</td>
        </tr>
        <tr>
          <td class="detail-label">Terlambat Sudah Datang</td>
          <td class="detail-value" data-field="terlambat-sudah">${stats.terlambatSudahDatang}</td>
        </tr>
        <tr>
          <td class="detail-label">Dipanggil Tidak Hadir</td>
          <td class="detail-value" data-field="tidak-hadir">${stats.dipanggilTidakHadir}</td>
        </tr>
        <tr>
          <td class="detail-label">Selesai</td>
          <td class="detail-value" data-field="selesai">${stats.selesai}</td>
        </tr>
        <tr>
          <td class="detail-label">Total Pasien</td>
          <td class="detail-value" data-field="total-pasien">${stats.totalPasien}</td>
        </tr>
      </table>
    </article>`;
}

// ---- HELPER: Escape HTML ----
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- HELPER: Trigger update highlight on element ----
function updateTextWithHighlight(el, newText) {
  if (!el) return;
  const currentText = el.textContent.trim();
  const nextText = String(newText).trim();

  if (currentText !== nextText) {
    el.textContent = nextText;
    el.classList.remove('text-updated');
    // trigger reflow to restart css animation
    void el.offsetWidth;
    el.classList.add('text-updated');
  }
}

// ---- UPDATE EXISTING CARD IN-PLACE ----
function updateCardContent(cardEl, item) {
  const status = getDoctorStatus(item);
  const serving = getServingInfo(item);
  const waiting = Math.max(0, item.total_antrian - item.sudah_dilayani);
  const stats = getAntrianStats(item);

  // Status badge
  const statusEl = cardEl.querySelector('[data-field="status"]');
  if (statusEl) {
    if (statusEl.textContent.trim() !== status.label) {
      statusEl.className = `badge-status ${status.class} text-updated`;
      statusEl.textContent = status.label;
    }
  }

  // Waiting count
  const waitingEl = cardEl.querySelector('[data-field="waiting"]');
  updateTextWithHighlight(waitingEl, waiting);

  // Serving banner & value
  const bannerEl = cardEl.querySelector('[data-field="serving-banner"]');
  const servingValEl = cardEl.querySelector('[data-field="serving-value"]');
  if (bannerEl) {
    bannerEl.className = `serving-banner ${serving.theme}`;
  }
  if (servingValEl) {
    const desiredClass = serving.isCode ? 'serving-value' : 'serving-value text-message';
    if (servingValEl.textContent.trim() !== serving.text) {
      servingValEl.className = `${desiredClass} text-updated`;
      servingValEl.textContent = serving.text;
    } else {
      servingValEl.className = desiredClass;
    }
  }

  // Table rows
  const jamEl = cardEl.querySelector('[data-field="jam-praktik"]');
  updateTextWithHighlight(jamEl, item.jam_praktik || '-');

  const terlambatBelumEl = cardEl.querySelector('[data-field="terlambat-belum"]');
  updateTextWithHighlight(terlambatBelumEl, stats.terlambatBelumDatang);

  const terlambatSudahEl = cardEl.querySelector('[data-field="terlambat-sudah"]');
  updateTextWithHighlight(terlambatSudahEl, stats.terlambatSudahDatang);

  const tidakHadirEl = cardEl.querySelector('[data-field="tidak-hadir"]');
  updateTextWithHighlight(tidakHadirEl, stats.dipanggilTidakHadir);

  const selesaiEl = cardEl.querySelector('[data-field="selesai"]');
  updateTextWithHighlight(selesaiEl, stats.selesai);

  const totalEl = cardEl.querySelector('[data-field="total-pasien"]');
  updateTextWithHighlight(totalEl, stats.totalPasien);
}

// ---- RENDER OR UPDATE CARDS ----
function renderCards(data, animate) {
  const container = document.getElementById('poli-grid-container');
  if (!container) return;

  const existingCards = container.querySelectorAll('.poli-card[data-card-key]');

  // Initial load atau jumlah card berbeda struktur (misal dari skeleton atau daftar poli berubah)
  if (existingCards.length === 0 || existingCards.length !== data.length) {
    container.innerHTML = data.map(item => buildCardHTML(item)).join('');
    return;
  }

  // Update in-place hanya bagian teks/nilainya saja tanpa reload card
  const cardMap = new Map();
  existingCards.forEach(card => {
    cardMap.set(card.getAttribute('data-card-key'), card);
  });

  let canUpdateAll = true;
  for (const item of data) {
    const key = getCardKey(item);
    if (!cardMap.has(key)) {
      canUpdateAll = false;
      break;
    }
  }

  if (canUpdateAll) {
    data.forEach(item => {
      const key = getCardKey(item);
      const cardEl = cardMap.get(key);
      if (cardEl) {
        updateCardContent(cardEl, item);
      }
    });
  } else {
    // Jika ada daftar dokter/klinik yang berganti urutan/baru
    container.innerHTML = data.map(item => buildCardHTML(item)).join('');
  }
}

// ---- FILTER KARTU (klinik + dokter) ----
// State dipisah dari dropdown "Cek Antrian Saya" supaya filter kartu tidak
// mengubah pilihan cek nomor, dan sebaliknya.
let filterState = { klinik: '', dokter: '' };

function getFilteredData() {
  return antrianData.filter(d =>
    (!filterState.klinik || d.poliklinik === filterState.klinik) &&
    (!filterState.dokter || d.dokter === filterState.dokter)
  );
}

function renderFilteredCards(animate) {
  const data = getFilteredData();
  renderCards(data, animate);
  const empty = document.getElementById('filter-empty');
  if (empty) empty.hidden = data.length > 0;
}

function updateFilterDokterOptions(data, selectedKlinik) {
  const selDokter = document.getElementById('filter-dokter');
  if (!selDokter) return;
  const pool = selectedKlinik ? data.filter(d => d.poliklinik === selectedKlinik) : data;
  const dokters = [...new Set(pool.map(d => d.dokter))].sort();
  selDokter.innerHTML = '<option value="" selected>Pilih Dokter</option>' +
    dokters.map(d => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`).join('');
  filterState.dokter = '';
}

function populateFilterDropdowns(data) {
  const selKlinik = document.getElementById('filter-klinik');
  const selDokter = document.getElementById('filter-dokter');
  if (!selKlinik || !selDokter) return;

  const kliniks = [...new Set(data.map(d => d.poliklinik))].sort();
  selKlinik.innerHTML = '<option value="" selected>Pilih Klinik</option>' +
    kliniks.map(k => `<option value="${escapeHTML(k)}">${escapeHTML(k)}</option>`).join('');

  updateFilterDokterOptions(data, '');

  selKlinik.onchange = function () {
    filterState.klinik = this.value;
    updateFilterDokterOptions(data, filterState.klinik);
    renderFilteredCards(false);
  };

  selDokter.onchange = function () {
    filterState.dokter = this.value;
    renderFilteredCards(false);
  };

  const btnReset = document.getElementById('btn-reset-filter');
  if (btnReset) {
    btnReset.onclick = function () {
      filterState = { klinik: '', dokter: '' };
      selKlinik.value = '';
      updateFilterDokterOptions(data, '');
      renderFilteredCards(false);
    };
  }
}

// ---- POPULATE DROPDOWNS ----
function populateDropdowns(data) {
  const selectKlinik = document.getElementById('select-klinik');
  const selectDokter = document.getElementById('select-dokter');
  if (!selectKlinik || !selectDokter) return;

  // Get unique clinic names
  const uniqueKliniks = [...new Set(data.map(d => d.poliklinik))].sort();

  // Populate klinik
  selectKlinik.innerHTML = '<option value="" selected>Pilih Klinik</option>' +
    uniqueKliniks.map(k => `<option value="${escapeHTML(k)}">${escapeHTML(k)}</option>`).join('');

  // Reset dokter + nomor
  updateDokterDropdown(data, '', '');
  updateNomorDropdown();

  // Listen for klinik changes to filter doctor list
  selectKlinik.onchange = function() {
    updateDokterDropdown(data, this.value, '');
    updateNomorDropdown();
    resetCekResult();
  };

  const selectDokterEl = document.getElementById('select-dokter');
  if (selectDokterEl) {
    selectDokterEl.onchange = function() {
      updateNomorDropdown();
      resetCekResult();
    };
  }

  const selectNomorEl = document.getElementById('select-nomor');
  if (selectNomorEl) {
    selectNomorEl.onchange = function() {
      resetCekResult();
    };
  }
}

function findJadwal() {
  const selectKlinik = document.getElementById('select-klinik');
  const selectDokter = document.getElementById('select-dokter');
  if (!selectKlinik || !selectDokter || !selectKlinik.value || !selectDokter.value) return null;
  return antrianData.find(d => d.poliklinik === selectKlinik.value && d.dokter === selectDokter.value) || null;
}

// Label nomor antrean ikut kode dokter: "DV-1". Tanpa kode -> nomor saja.
function getNomorLabel(jadwal, nomor) {
  const kode = getKodePanggil(jadwal);
  return kode ? `${kode}-${nomor}` : String(nomor);
}

function updateNomorDropdown() {
  const selectNomor = document.getElementById('select-nomor');
  if (!selectNomor) return;
  const jadwal = findJadwal();
  if (!jadwal || !Array.isArray(jadwal.antrian) || jadwal.antrian.length === 0) {
    selectNomor.innerHTML = '<option value="" selected>Pilih Nomor</option>';
    return;
  }
  const nums = [...new Set(jadwal.antrian.map(a => String(a.no_periksa)))].sort((a, b) => Number(a) - Number(b));
  // value tetap nomor polos supaya pencocokan di tombol Cek tidak berubah
  selectNomor.innerHTML = '<option value="" selected>Pilih Nomor</option>' +
    nums.map(n => `<option value="${escapeHTML(n)}">${escapeHTML(getNomorLabel(jadwal, n))}</option>`).join('');
}

function resetCekResult() {
  const ids = ['val-nomor-antrean', 'val-pasien-depan', 'val-estimasi-waktu', 'val-status-nomor'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerText = '-';
      el.removeAttribute('title');
    }
  });
  const valStatus = document.getElementById('val-status-nomor');
  if (valStatus) valStatus.className = 'status-tile-value';
}

function updateDokterDropdown(data, selectedKlinik, currentDokter) {
  const selectDokter = document.getElementById('select-dokter');
  if (!selectDokter) return;

  let filteredDoctors = data;
  if (selectedKlinik) {
    filteredDoctors = data.filter(d => d.poliklinik === selectedKlinik);
  }

  const uniqueDoctors = [...new Set(filteredDoctors.map(d => d.dokter))].sort();

  selectDokter.innerHTML = '<option value="">Pilih Dokter</option>' +
    uniqueDoctors.map(d => `<option value="${escapeHTML(d)}" ${d === currentDokter ? 'selected' : ''}>${escapeHTML(d)}</option>`).join('');
}

// ---- FETCH & REFRESH DATA ----
async function fetchAntrianData() {
  try {
    // Cache-bust to ensure fresh data
    const response = await fetch(`${ANTRIAN_DATA_URL}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.warn('[Antrian] Gagal memuat data:', err.message);
    return null; // null = error, keep old data
  }
}

async function refreshData(isInitial) {
  const newData = await fetchAntrianData();
  if (newData !== null) {
    antrianData = newData;
    renderFilteredCards(!isInitial);

    // Only populate dropdowns on initial load
    if (isInitial) {
      populateDropdowns(antrianData);
      populateFilterDropdowns(antrianData);
    }
  }
}

// ---- START AUTO-REFRESH ----
function startAutoRefresh() {
  // Clear previous timer if any
  if (refreshTimer) clearInterval(refreshTimer);

  // Initial fetch
  refreshData(true);

  // Start interval
  refreshTimer = setInterval(() => {
    refreshData(false);
  }, REFRESH_INTERVAL_MS);
}


// ============================================================
// 1. CLOCK DISPLAY (Live)
// ============================================================
function updateClock() {
  const now = new Date();

  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][now.getMonth()];
  const tanggal = now.getDate();
  const tahun = now.getFullYear();

  const jam = String(now.getHours()).padStart(2, '0');
  const menit = String(now.getMinutes()).padStart(2, '0');

  const clockElement = document.getElementById('clock-display');
  if (clockElement) {
    clockElement.innerHTML = `<span>${hari}, ${tanggal} ${bulan} ${tahun}</span> <span class="time-accent">${jam}:${menit} WIB</span>`;
  }
}

setInterval(updateClock, 1000);
updateClock();

// ============================================================
// 2. INTERACTIVE "CEK" BUTTON
// ============================================================
document.getElementById('btn-cek-action').addEventListener('click', function() {
  const selectNomor = document.getElementById('select-nomor');
  const inputNomor = selectNomor ? selectNomor.value.trim().toUpperCase() : '';
  const valNomor = document.getElementById('val-nomor-antrean');
  const valDepan = document.getElementById('val-pasien-depan');
  const valEstimasi = document.getElementById('val-estimasi-waktu');
  const valStatus = document.getElementById('val-status-nomor');

  if (!inputNomor) {
    alert('Silakan pilih klinik, dokter, dan nomor antrean Anda!');
    return;
  }

  const jadwal = findJadwal();
  if (!jadwal) {
    alert('Silakan pilih klinik dan dokter terlebih dahulu!');
    return;
  }

  const list = Array.isArray(jadwal.antrian) ? jadwal.antrian : [];
  const saya = list.filter(a => String(a.no_periksa).toUpperCase() === inputNomor);
  if (saya.length === 0) {
    alert('Nomor tidak ditemukan pada jadwal dokter ini!');
    return;
  }

  valNomor.innerText = getNomorLabel(jadwal, inputNomor);

  // Status ikut kode panggil endpoint: null=belum datang, 0=sudah datang,
  // 1=dipanggil, 2=diperiksa, 3=terlewati
  const STATUS_LABEL = {
    'null': 'Belum Datang',
    '0': 'Sudah Datang',
    '1': 'Dipanggil',
    '2': 'Diperiksa',
    '3': 'Terlewati'
  };
  const st = saya[0].panggil === null || saya[0].panggil === undefined ? 'null' : String(saya[0].panggil);
  valStatus.innerText = STATUS_LABEL[st] || 'Menunggu';
  // Warna lewat kelas CSS, bukan inline style: inline style menang atas aturan tema
  // sehingga teks gelap tetap gelap di mode malam.
  valStatus.className = 'status-tile-value' +
    ((st === '1' || st === '2') ? ' is-active' : '') +
    (st === '3' ? ' is-late' : '');

  // Pasien di depan = nomor lebih kecil yang belum selesai (belum panggil=2)
  const myNum = parseInt(inputNomor.match(/\d+/)?.[0] || '0', 10);
  const seenBefore = new Set();
  const depan = list.filter(a => {
    const n = parseInt(String(a.no_periksa).match(/\d+/)?.[0] || '0', 10);
    const key = String(a.no_periksa);
    if (n < myNum && String(a.panggil) !== '2') {
      if (!seenBefore.has(key)) {
        seenBefore.add(key);
        return true;
      }
    }
    return false;
  }).length;
  valDepan.innerText = depan === 0 ? '0 Pasien' : `${depan} Pasien`;

  // Logika Estimasi giliran menggunakan format jam (pukul perkiraan dipanggil)
  if (st === '2') {
    valEstimasi.innerText = 'Selesai';
    valEstimasi.title = 'Pemeriksaan telah selesai';
  } else if (st === '1') {
    valEstimasi.innerText = 'Sekarang';
    valEstimasi.title = 'Nomor antrean Anda sedang dipanggil';
  } else if (st === '3') {
    valEstimasi.innerText = 'Terlewati';
    valEstimasi.title = 'Nomor antrean terlewati, silakan lapor ke petugas';
  } else if (depan === 0) {
    const now = new Date();
    const isStarted = jadwal.sudah_dilayani > 0 || (jadwal.diproses && jadwal.diproses !== '-');

    // Jika dokter belum mulai dan jam praktik belum tiba, tampilkan jam praktik
    if (!isStarted && jadwal.jam_praktik && jadwal.jam_praktik !== '-' && jadwal.jam_praktik.includes(':')) {
      const parts = jadwal.jam_praktik.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const scheduleDate = new Date();
        scheduleDate.setHours(h, m, 0, 0);
        if (now < scheduleDate) {
          const targetH = String(scheduleDate.getHours()).padStart(2, '0');
          const targetM = String(scheduleDate.getMinutes()).padStart(2, '0');
          valEstimasi.innerText = `± ${targetH}:${targetM} WIB`;
          valEstimasi.title = `Perkiraan giliran saat dokter mulai praktik (${targetH}:${targetM} WIB)`;
          return;
        }
      }
    }
    valEstimasi.innerText = 'Sekarang';
    valEstimasi.title = 'Giliran Anda berikutnya / segera dipanggil';
  } else {
    // Hitung perkiraan jam panggilan (asumsi rata-rata 5 menit per pasien)
    const now = new Date();
    let baseTime = new Date();

    const isStarted = jadwal.sudah_dilayani > 0 || (jadwal.diproses && jadwal.diproses !== '-');
    if (!isStarted && jadwal.jam_praktik && jadwal.jam_praktik !== '-' && jadwal.jam_praktik.includes(':')) {
      const parts = jadwal.jam_praktik.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const scheduleDate = new Date();
        scheduleDate.setHours(h, m, 0, 0);
        if (now < scheduleDate) {
          baseTime = scheduleDate;
        }
      }
    }

    const estimasiDate = new Date(baseTime.getTime() + (depan * 5 * 60 * 1000));
    const targetH = String(estimasiDate.getHours()).padStart(2, '0');
    const targetM = String(estimasiDate.getMinutes()).padStart(2, '0');
    valEstimasi.innerText = `± ${targetH}:${targetM} WIB`;
    valEstimasi.title = `Perkiraan jam ${targetH}:${targetM} WIB (± ${depan * 5} menit lagi)`;
  }
});

// ============================================================
// 3. MOBILE NAVIGATION DRAWER
// ============================================================
const btnOpenMenu = document.getElementById('btn-open-menu');
const btnCloseMenu = document.getElementById('btn-close-menu');
const mobileDrawer = document.getElementById('mobile-drawer');
const mobileOverlay = document.getElementById('mobile-overlay');

function openDrawer() {
  if (mobileDrawer && mobileOverlay) {
    mobileDrawer.classList.add('active');
    mobileOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeDrawer() {
  if (mobileDrawer && mobileOverlay) {
    mobileDrawer.classList.remove('active');
    mobileOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

if (btnOpenMenu) {
  btnOpenMenu.addEventListener('click', openDrawer);
}

if (btnCloseMenu) {
  btnCloseMenu.addEventListener('click', closeDrawer);
}

if (mobileOverlay) {
  mobileOverlay.addEventListener('click', closeDrawer);
}

// Close drawer on ESC key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeDrawer();
  }
});

// Mobile Dropdowns Toggle (AMW, Layanan, Informasi)
document.querySelectorAll('.mobile-dropdown-btn').forEach(button => {
  button.addEventListener('click', function(e) {
    e.preventDefault();
    const parentItem = this.closest('.has-dropdown');
    if (parentItem) {
      parentItem.classList.toggle('open');
    }
  });
});

// Close drawer when clicking regular navigation links
document.querySelectorAll('.mobile-drawer a').forEach(link => {
  link.addEventListener('click', () => {
    closeDrawer();
  });
});


// ============================================================
// 4. THEME TOGGLE (mode terang / mode malam)
// ============================================================
(function () {
  const btn = document.getElementById('theme-toggle');
  const root = document.documentElement;

  // Ikon + label selalu menunjukkan mode yang AKAN dipakai setelah klik
  function syncButton(theme) {
    if (!btn) return;
    const nextIsDark = theme === 'dark';
    btn.title = nextIsDark ? 'Mode Terang' : 'Mode Gelap';
    btn.setAttribute('aria-label', nextIsDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
    btn.setAttribute('aria-pressed', String(!nextIsDark));
  }

  function applyTheme(theme, save) {
    root.setAttribute('data-theme', theme);
    syncButton(theme);
    if (save) {
      try { localStorage.setItem('amc-theme', theme); } catch (e) {}
    }
  }

  // Set atribut sudah dipasang script inline di <head>; ini hanya sinkronkan UI
  syncButton(root.getAttribute('data-theme') || 'light');

  if (btn) {
    btn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  // Tema mengikuti pilihan user saja (default terang), tidak ikut pengaturan sistem
})();


// ============================================================
// 5. TOMBOL NAIK KE ATAS
// ============================================================
(function () {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  // Ambang 400px: di bawah itu tombol hanya mengganggu, layar masih penuh konten
  const THRESHOLD = 400;
  let ticking = false;

  function sync() {
    btn.classList.toggle('is-visible', window.scrollY > THRESHOLD);
    ticking = false;
  }

  // requestAnimationFrame: scroll event bisa 60x/detik, jangan paksa layout tiap kali
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(sync);
  }, { passive: true });

  sync();

  btn.addEventListener('click', function () {
    // hormati preferensi "kurangi gerakan"
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();


// ============================================================
// 6. INITIALIZE: Start auto-refresh on DOM ready
// ============================================================
startAutoRefresh();
