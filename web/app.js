// ── Data ─────────────────────────────────────────────────────────────────────
let allDates = [];   // 'YYYY-MM-DD' strings
let allClose = [];   // float
let allOpen  = [];
let allHigh  = [];
let allLow   = [];
let sma50    = [];
let sma200   = [];

let fpStart, fpEnd;
let suppressRelayout = false;
let currentTicker = '';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
initTickerDropdown();

async function initTickerDropdown() {
  const resp = await fetch('../data/ticker/');
  const html = await resp.text();

  // Parse Python http.server directory listing for *_historical.csv links
  const matches = [...html.matchAll(/href="([A-Z0-9^._-]+_historical\.csv)"/gi)];
  const tickers = matches.map(m => m[1].replace(/_historical\.csv$/i, '').toUpperCase());

  const select = document.getElementById('ticker-select');
  select.innerHTML = '';
  tickers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => loadTicker(select.value));

  if (tickers.length > 0) loadTicker(tickers[0]);
}

// ── Load ticker ───────────────────────────────────────────────────────────────
async function loadTicker(ticker) {
  currentTicker = ticker;
  document.getElementById('ticker-select').value = ticker;

  // Update titles
  document.getElementById('chart-title').textContent = `${ticker} — Historical Performance`;
  document.getElementById('chart-subtitle').textContent = `${ticker} · Daily Closing Price`;
  document.title = `${ticker} — Historical Performance`;

  // Reset data
  allDates = []; allClose = []; allOpen = []; allHigh = []; allLow = [];

  const resp = await fetch(`../data/ticker/${ticker}_historical.csv`);
  const csv  = await resp.text();

  // The CSV has 3 header rows (Price / Ticker / Date) — skip them
  const lines = csv.split('\n').slice(3).join('\n');
  const result = Papa.parse(lines, { skipEmptyLines: true });

  result.data.forEach(row => {
    if (!row[0] || !row[1]) return;
    allDates.push(row[0].trim());
    allClose.push(parseFloat(row[1]));
    allHigh.push(parseFloat(row[2]));
    allLow.push(parseFloat(row[3]));
    allOpen.push(parseFloat(row[4]));
  });

  sma50  = computeSMA(allClose, 50);
  sma200 = computeSMA(allClose, 200);

  // Tear down existing Flatpickr instances before re-rendering
  if (fpStart) { fpStart.destroy(); fpStart = null; }
  if (fpEnd)   { fpEnd.destroy();   fpEnd   = null; }

  document.getElementById('return-bar').classList.add('hidden');
  document.querySelectorAll('.btn-range').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.btn-overlay').forEach(b => b.classList.remove('active'));

  renderChart();
  initDatePickers();
  initRangeButtons();
  initMAButtons();

  setRange('1Y');
  document.querySelector('.btn-range[data-range="1Y"]').classList.add('active');
}

// ── SMA ───────────────────────────────────────────────────────────────────────
function computeSMA(values, period) {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    return sum / period;
  });
}

// ── Chart ─────────────────────────────────────────────────────────────────────
function renderChart() {
  const tracePrice = {
    x: allDates,
    y: allClose,
    type: 'scatter',
    mode: 'lines',
    name: `${currentTicker} Close`,
    line: { color: '#58a6ff', width: 1.5 },
    hovertemplate: '<b>%{x}</b><br>Close: $%{y:.2f}<extra></extra>',
  };

  const traceSMA50 = {
    x: allDates,
    y: sma50,
    type: 'scatter',
    mode: 'lines',
    name: '50-Day MA',
    line: { color: '#f0a500', width: 1.5 },
    visible: false,
    hovertemplate: '<b>%{x}</b><br>50 MA: $%{y:.2f}<extra></extra>',
  };

  const traceSMA200 = {
    x: allDates,
    y: sma200,
    type: 'scatter',
    mode: 'lines',
    name: '200-Day MA',
    line: { color: '#e040fb', width: 1.5 },
    visible: false,
    hovertemplate: '<b>%{x}</b><br>200 MA: $%{y:.2f}<extra></extra>',
  };

  const layout = {
    paper_bgcolor: '#0d1117',
    plot_bgcolor: '#0d1117',
    margin: { t: 20, r: 20, b: 40, l: 70 },
    height: 460,
    xaxis: {
      type: 'date',
      gridcolor: '#21262d',
      linecolor: '#30363d',
      tickcolor: '#30363d',
      tickfont: { color: '#8b949e', size: 11 },
      rangeslider: { visible: false },
      showspikes: true,
      spikecolor: '#8b949e',
      spikethickness: 1,
      spikedash: 'dot',
      spikemode: 'across',
    },
    yaxis: {
      gridcolor: '#21262d',
      linecolor: '#30363d',
      tickcolor: '#30363d',
      tickfont: { color: '#8b949e', size: 11 },
      tickprefix: '$',
      showspikes: true,
      spikecolor: '#8b949e',
      spikethickness: 1,
      spikedash: 'dot',
    },
    legend: {
      font: { color: '#8b949e', size: 11 },
      bgcolor: 'rgba(0,0,0,0)',
      x: 0.01,
      y: 0.99,
    },
    dragmode: 'zoom',
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: '#161b22',
      bordercolor: '#30363d',
      font: { color: '#e6edf3', size: 12 },
    },
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
    displaylogo: false,
    scrollZoom: true,
  };

  Plotly.newPlot('chart', [tracePrice, traceSMA50, traceSMA200], layout, config);
  document.getElementById('chart').on('plotly_relayout', onRelayout);
}

// ── Relayout handler ──────────────────────────────────────────────────────────
function onRelayout(event) {
  let x0 = event['xaxis.range[0]'];
  let x1 = event['xaxis.range[1]'];

  if (event['xaxis.autorange']) {
    x0 = allDates[0];
    x1 = allDates[allDates.length - 1];
  }

  if (!x0 || !x1) return;

  x0 = toDateStr(x0);
  x1 = toDateStr(x1);

  updateReturnBar(x0, x1);

  if (!suppressRelayout) {
    suppressRelayout = true;
    fpStart && fpStart.setDate(x0, true);
    fpEnd   && fpEnd.setDate(x1, true);

    const i0 = findClosestIndex(x0);
    const i1 = findClosestIndex(x1);
    if (i0 !== null && i1 !== null && i0 < i1) {
      Plotly.relayout('chart', { 'yaxis.range': computeYRange(i0, i1) });
    }

    suppressRelayout = false;
  }

  clearActiveRangeBtn();
}

// ── Return bar ────────────────────────────────────────────────────────────────
function updateReturnBar(dateStr0, dateStr1) {
  const i0 = findClosestIndex(dateStr0);
  const i1 = findClosestIndex(dateStr1);

  if (i0 === null || i1 === null || i0 >= i1) {
    document.getElementById('return-bar').classList.add('hidden');
    return;
  }

  const p0 = allClose[i0];
  const p1 = allClose[i1];
  const totalReturn = (p1 - p0) / p0 * 100;
  const days = dateDiffDays(allDates[i0], allDates[i1]);
  const years = days / 365.25;
  const cagr = years >= 1
    ? (Math.pow(p1 / p0, 1 / years) - 1) * 100
    : null;

  document.getElementById('return-bar').classList.remove('hidden');
  document.getElementById('return-dates').textContent       = `${allDates[i0]} → ${allDates[i1]}`;
  document.getElementById('return-start-price').textContent = `$${p0.toFixed(2)}`;
  document.getElementById('return-end-price').textContent   = `$${p1.toFixed(2)}`;

  const totalEl = document.getElementById('return-total');
  totalEl.textContent = `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`;
  totalEl.className   = 'return-value ' + (totalReturn >= 0 ? 'positive' : 'negative');

  const cagrItem = document.getElementById('cagr-item');
  if (cagr !== null) {
    const cagrEl = document.getElementById('return-cagr');
    cagrEl.textContent = `${cagr >= 0 ? '+' : ''}${cagr.toFixed(2)}%/yr`;
    cagrEl.className   = 'return-value ' + (cagr >= 0 ? 'positive' : 'negative');
    cagrItem.style.display = '';
  } else {
    cagrItem.style.display = 'none';
  }

  document.getElementById('return-duration').textContent = formatDuration(days);
}

// ── Date pickers ──────────────────────────────────────────────────────────────
function initDatePickers() {
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];
  const commonOpts = { dateFormat: 'Y-m-d', minDate, maxDate, disableMobile: true };

  fpStart = flatpickr('#date-start', {
    ...commonOpts,
    defaultDate: minDate,
    onChange([date]) {
      if (suppressRelayout) return;
      const d = toDateStr(date);
      const endVal = fpEnd.selectedDates[0];
      if (endVal && d >= toDateStr(endVal)) return;
      applyRange(d, toDateStr(endVal || maxDate));
    },
  });

  fpEnd = flatpickr('#date-end', {
    ...commonOpts,
    defaultDate: maxDate,
    onChange([date]) {
      if (suppressRelayout) return;
      const d = toDateStr(date);
      const startVal = fpStart.selectedDates[0];
      if (startVal && d <= toDateStr(startVal)) return;
      applyRange(toDateStr(startVal || minDate), d);
    },
  });
}

// ── Quick range buttons ───────────────────────────────────────────────────────
function initRangeButtons() {
  document.querySelectorAll('.btn-range').forEach(btn => {
    // Clone to remove any old listeners
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener('click', () => {
      document.querySelectorAll('.btn-range').forEach(b => b.classList.remove('active'));
      fresh.classList.add('active');
      setRange(fresh.dataset.range);
    });
  });
}

function setRange(range) {
  const lastDate = new Date(allDates[allDates.length - 1]);
  let startDate;

  if (range === 'Max') {
    startDate = new Date(allDates[0]);
  } else if (range === 'YTD') {
    startDate = new Date(lastDate.getFullYear(), 0, 1);
  } else {
    const map = { '1W': 7, '1M': 30, '3M': 91, '6M': 182, '1Y': 365, '3Y': 1095, '5Y': 1826, '10Y': 3652 };
    startDate = new Date(lastDate);
    startDate.setDate(startDate.getDate() - map[range]);
  }

  applyRange(toDateStr(startDate), toDateStr(lastDate));
}

// ── MA toggle buttons ─────────────────────────────────────────────────────────
function initMAButtons() {
  ['btn-ma50', 'btn-ma200'].forEach(id => {
    const btn = document.getElementById(id);
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener('click', () => toggleTrace(id === 'btn-ma50' ? 1 : 2, fresh.id));
  });
}

function toggleTrace(traceIndex, btnId) {
  const btn = document.getElementById(btnId);
  const isVisible = document.getElementById('chart').data[traceIndex].visible !== false;
  Plotly.restyle('chart', { visible: !isVisible }, [traceIndex]);
  btn.classList.toggle('active', !isVisible);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function applyRange(startStr, endStr) {
  const i0 = findClosestIndex(startStr);
  const i1 = findClosestIndex(endStr);
  suppressRelayout = true;
  Plotly.relayout('chart', {
    'xaxis.range[0]': startStr,
    'xaxis.range[1]': endStr,
    'yaxis.range': (i0 !== null && i1 !== null && i0 < i1) ? computeYRange(i0, i1) : undefined,
  }).then(() => { suppressRelayout = false; });

  fpStart && fpStart.setDate(startStr, true);
  fpEnd   && fpEnd.setDate(endStr, true);
  updateReturnBar(startStr, endStr);
}

function toDateStr(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.substring(0, 10);
  if (d instanceof Date) return d.toISOString().substring(0, 10);
  return new Date(d).toISOString().substring(0, 10);
}

function findClosestIndex(dateStr) {
  if (!dateStr) return null;
  let lo = 0, hi = allDates.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (allDates[mid] < dateStr) lo = mid + 1;
    else hi = mid;
  }
  if (lo >= allDates.length) return allDates.length - 1;
  if (lo > 0 && allDates[lo] > dateStr) {
    return (Math.abs(new Date(allDates[lo]) - new Date(dateStr)) <
            Math.abs(new Date(allDates[lo - 1]) - new Date(dateStr)))
      ? lo : lo - 1;
  }
  return lo;
}

function dateDiffDays(d0, d1) {
  return Math.round((new Date(d1) - new Date(d0)) / 86400000);
}

function formatDuration(days) {
  if (days < 14) return `${days} day${days !== 1 ? 's' : ''}`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  if (days < 365) return `${Math.round(days / 30.44)} months`;
  const y = days / 365.25;
  return y % 1 < 0.1 ? `${Math.floor(y)} year${Math.floor(y) !== 1 ? 's' : ''}` : `${y.toFixed(1)} years`;
}

function clearActiveRangeBtn() {
  document.querySelectorAll('.btn-range').forEach(b => b.classList.remove('active'));
}

// ── Y-axis auto-fit ───────────────────────────────────────────────────────────
function computeYRange(i0, i1) {
  let min = Infinity, max = -Infinity;

  for (let i = i0; i <= i1; i++) {
    if (allClose[i] < min) min = allClose[i];
    if (allClose[i] > max) max = allClose[i];
  }

  if (document.getElementById('btn-ma50').classList.contains('active')) {
    for (let i = i0; i <= i1; i++) {
      if (sma50[i] != null) { if (sma50[i] < min) min = sma50[i]; if (sma50[i] > max) max = sma50[i]; }
    }
  }
  if (document.getElementById('btn-ma200').classList.contains('active')) {
    for (let i = i0; i <= i1; i++) {
      if (sma200[i] != null) { if (sma200[i] < min) min = sma200[i]; if (sma200[i] > max) max = sma200[i]; }
    }
  }

  const buf = (max - min) * 0.05;
  return [min - buf, max + buf];
}
