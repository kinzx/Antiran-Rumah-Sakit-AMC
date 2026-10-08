// ============================================================
// RS AMC Muhammadiyah - Monitor Antrian Poliklinik Rawat Jalan
// Dynamic Card Rendering with 15-second Auto-Refresh
// ============================================================

// ---- CONFIGURATION ----
const ANTRIAN_DATA_URL = 'proxy.php';
const REFRESH_INTERVAL_MS = 15000; // 15 seconds
let refreshTimer = null;
let antrianData = [];

// ---- SVG ICON MAP (per Poliklinik) ----
const POLI_ICONS = {
  'KLINIK PENYAKIT DALAM': `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M13 2c-1 0-2 1.5-2 3v3.5C8 9 6 11 6 14.5 6 18.5 9 22 13 22c3.5 0 6-2.5 6-6.5 0-3-1.5-5.5-4-6.5V5c0-1.5-1-3-2-3z"/>
    <path d="M9 14.5c1 1.2 2.5 1.5 4 1"/>
  </svg>`,
  'KLINIK KULIT & KELAMIN': `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v9"/>
    <path d="M9 4.5l3 3.5 3-3.5"/>
    <path d="M4 14h16"/>
    <path d="M6 18h12"/>
    <path d="M8 22h8"/>
    <circle cx="6" cy="8" r="0.8" fill="#374151"/>
    <circle cx="18" cy="8" r="0.8" fill="#374151"/>
    <circle cx="8" cy="11" r="0.8" fill="#374151"/>
    <circle cx="16" cy="11" r="0.8" fill="#374151"/>
  </svg>`,
  'KLINIK NEUROLOGI': `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <circle cx="19" cy="6" r="2"/>
    <circle cx="5" cy="6" r="2"/>
    <circle cx="5" cy="18" r="2"/>
    <circle cx="19" cy="18" r="2"/>
    <line x1="12" y1="9" x2="12" y2="3"/>
    <circle cx="12" cy="3" r="1.5"/>
    <line x1="10" y1="10" x2="6.5" y2="7.5"/>
    <line x1="14" y1="10" x2="17.5" y2="7.5"/>
    <line x1="10" y1="14" x2="6.5" y2="16.5"/>
    <line x1="14" y1="14" x2="17.5" y2="16.5"/>
  </svg>`,
  'KLINIK GIGI': `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 3C4.24 3 2 5.24 2 8c0 3.2 1.6 5.8 2.5 8.5C5.4 19.3 7 21 8.5 21c1.8 0 2.2-2.2 3.5-2.2s1.7 2.2 3.5 2.2c1.5 0 3.1-1.7 4-4.5.9-2.7 2.5-5.3 2.5-8.5 0-2.76-2.24-5-5-5-1.5 0-2.8.7-3.5 1.8C10.8 3.7 9.5 3 7 3z"/>
  </svg>`,
  'KLINIK MATA': `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M3 12c2.5-4 5.5-6 9-6s6.5 2 9 6c-2.5 4-5.5 6-9 6s-6.5-2-9-6z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`,
  'KLINIK BEDAH': `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 4v11"/>
    <circle cx="7" cy="18" r="2.2"/>
    <path d="M12 3v18"/>
    <path d="M10 4h4"/>
    <path d="M17 4v11"/>
    <circle cx="17" cy="18" r="2.2"/>
    <path d="M5.5 12h3"/>
    <path d="M15.5 12h3"/>
  </svg>`,
  'KLINIK ANAK': `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="5"/>
    <path d="M12 13v3"/>
    <path d="M9 21h6"/>
    <path d="M8 5c0-1 .5-2 2-2.5"/>
    <path d="M16 5c0-1-.5-2-2-2.5"/>
    <circle cx="10" cy="8" r="0.7" fill="#374151"/>
    <circle cx="14" cy="8" r="0.7" fill="#374151"/>
    <path d="M10 10.5c.8.6 1.5.8 2 .8s1.2-.2 2-.8"/>
  </svg>`,
  'KLINIK OBSGYN 1': `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="10" r="7"/>
    <path d="M12 3v2"/>
    <path d="M9 14c1 1.5 2 2 3 2s2-.5 3-2"/>
    <path d="M10 8.5l1 1.5 1-1.5"/>
    <path d="M7 18l2-3"/>
    <path d="M17 18l-2-3"/>
    <circle cx="9.5" cy="9" r="0.5" fill="#374151"/>
    <circle cx="14.5" cy="9" r="0.5" fill="#374151"/>
  </svg>`,
  'KLINIK ORTHOPAEDI DAN TRAUMATO': `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 4v16"/>
    <path d="M16 4v16"/>
    <path d="M6 8h4"/>
    <path d="M14 8h4"/>
    <path d="M6 16h4"/>
    <path d="M14 16h4"/>
    <circle cx="8" cy="12" r="2.5"/>
    <circle cx="16" cy="12" r="2.5"/>
    <path d="M10.5 12h3"/>
  </svg>`,
  'KLINIK JANTUNG': `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19.5 12.572l-7.5 7.428-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.566z"/>
    <path d="M3 12h4l2-4 3 8 2-4h7"/>
  </svg>`,
  'KLINIK THT': `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 8.5C6 5.46 8.69 3 12 3s6 2.46 6 5.5c0 2-1.2 3.7-3 4.5v2a3 3 0 0 1-6 0v-2c-1.8-.8-3-2.5-3-4.5z"/>
    <path d="M10 15v3a2 2 0 0 0 4 0v-3"/>
    <circle cx="10" cy="8" r="0.8" fill="#374151"/>
    <circle cx="14" cy="8" r="0.8" fill="#374151"/>
    <path d="M11 11h2"/>
  </svg>`,
  'KLINIK PSIKIATRI': `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M9 9c0-1.5 1.3-3 3-3s3 1.5 3 3c0 2-3 2.5-3 5"/>
    <circle cx="12" cy="18" r="0.8" fill="#374151"/>
  </svg>`,
  'KLINIK PARU': `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 4v8"/>
    <path d="M8 12c-3 0-5 2-5 5s2 4 5 4"/>
    <path d="M16 12c3 0 5 2 5 5s-2 4-5 4"/>
    <path d="M8 12c0-3 1.5-5 4-8"/>
    <path d="M16 12c0-3-1.5-5-4-8"/>
    <path d="M10 16h4"/>
  </svg>`,
};

// Default icon for unknown clinics
const DEFAULT_ICON = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2v20M2 12h20"/>
  <circle cx="12" cy="12" r="9"/>
</svg>`;

// ---- HELPER: Get Icon for Poliklinik ----
function getPoliIcon(poliName) {
  return POLI_ICONS[poliName] || DEFAULT_ICON;
}

// ---- HELPER: Determine doctor attendance status ----
// panggil: null=belum datang, 0=sudah datang, 1=dipanggil, 2=diperiksa, 3=terlewati
function getDoctorStatus(item) {
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
    return {
      text: item.diproses,
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
        <span class="serving-caption">Sedang dilayani</span>
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

function updateNomorDropdown() {
  const selectNomor = document.getElementById('select-nomor');
  if (!selectNomor) return;
  const jadwal = findJadwal();
  if (!jadwal || !Array.isArray(jadwal.antrian) || jadwal.antrian.length === 0) {
    selectNomor.innerHTML = '<option value="" selected>Pilih Nomor</option>';
    return;
  }
  const nums = [...new Set(jadwal.antrian.map(a => String(a.no_periksa)))].sort((a, b) => Number(a) - Number(b));
  selectNomor.innerHTML = '<option value="" selected>Pilih Nomor</option>' +
    nums.map(n => `<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`).join('');
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
  if (valStatus) valStatus.style.color = '';
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
    renderCards(antrianData, !isInitial);

    // Only populate dropdowns on initial load
    if (isInitial) {
      populateDropdowns(antrianData);
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

  valNomor.innerText = inputNomor;

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
  valStatus.style.color = (st === '1' || st === '2') ? '#2fa360' : '#1f2937';

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
    // Hitung perkiraan jam panggilan (asumsi rata-rata 7 menit per pasien)
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

    const estimasiDate = new Date(baseTime.getTime() + (depan * 7 * 60 * 1000));
    const targetH = String(estimasiDate.getHours()).padStart(2, '0');
    const targetM = String(estimasiDate.getMinutes()).padStart(2, '0');
    valEstimasi.innerText = `± ${targetH}:${targetM} WIB`;
    valEstimasi.title = `Perkiraan jam ${targetH}:${targetM} WIB (± ${depan * 7} menit lagi)`;
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
// 4. INITIALIZE: Start auto-refresh on DOM ready
// ============================================================
startAutoRefresh();
