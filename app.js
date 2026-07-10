const exampleA = [
  { time: 0, value: 10.0 }, { time: 1, value: 10.8 }, { time: 2, value: 11.1 },
  { time: 3, value: 11.7 }, { time: 4, value: 12.4 }, { time: 5, value: 12.1 },
  { time: 6, value: 13.0 }, { time: 7, value: 13.4 }, { time: 8, value: 13.9 },
  { time: 9, value: 14.2 }, { time: 10, value: 14.8 }
];

const exampleB = [
  { time: 0, value: 9.8 }, { time: 1, value: 10.3 }, { time: 2, value: 10.9 },
  { time: 3, value: 11.4 }, { time: 4, value: 12.0 }, { time: 5, value: 12.5 },
  { time: 6, value: 12.7 }, { time: 7, value: 13.1 }, { time: 8, value: 13.6 },
  { time: 9, value: 14.0 }, { time: 10, value: 14.4 }
];

let dataA = exampleA;
let dataB = exampleB;
let comparisonChart;
let differenceChart;
let currentRows = [];

const fileA = document.querySelector("#fileA");
const fileB = document.querySelector("#fileB");
const xColumn = document.querySelector("#xColumn");
const yColumnA = document.querySelector("#yColumnA");
const yColumnB = document.querySelector("#yColumnB");
const tableBody = document.querySelector("#dataTableBody");
const searchInput = document.querySelector("#searchInput");

function parseCsv(file, callback) {
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: ({ data, errors }) => {
      if (errors.length) {
        alert(`CSV 읽기 오류: ${errors[0].message}`);
        return;
      }
      callback(data);
    },
    error: (error) => alert(`파일을 읽지 못했습니다: ${error.message}`)
  });
}

function columnsOf(data) {
  return data.length ? Object.keys(data[0]) : [];
}

function fillSelect(select, columns, preferredIndex = 0) {
  const previous = select.value;
  select.innerHTML = "";
  columns.forEach((column, index) => {
    const option = document.createElement("option");
    option.value = column;
    option.textContent = column;
    option.selected = column === previous || (!previous && index === preferredIndex);
    select.appendChild(option);
  });
}

function refreshColumnSelectors() {
  const columnsA = columnsOf(dataA);
  const columnsB = columnsOf(dataB);
  fillSelect(xColumn, columnsA, 0);
  fillSelect(yColumnA, columnsA, Math.min(1, columnsA.length - 1));
  fillSelect(yColumnB, columnsB, Math.min(1, columnsB.length - 1));
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildRows() {
  const xKey = xColumn.value;
  const aKey = yColumnA.value;
  const bKey = yColumnB.value;

  const mapB = new Map(dataB.map(row => [String(row[xKey]), finiteNumber(row[bKey])]));

  return dataA
    .map(row => {
      const x = row[xKey];
      const a = finiteNumber(row[aKey]);
      const b = mapB.has(String(x)) ? mapB.get(String(x)) : null;
      return {
        x,
        a,
        b,
        diff: a !== null && b !== null ? a - b : null
      };
    })
    .filter(row => row.x !== undefined && row.x !== null && row.a !== null);
}

function average(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 4 }).format(value);
}

function updateSummary(rows) {
  const avgA = average(rows.map(row => row.a));
  const avgB = average(rows.map(row => row.b));
  const validDiffs = rows.map(row => row.diff).filter(Number.isFinite);
  const avgDiff = average(validDiffs);
  const maxDiff = validDiffs.length ? Math.max(...validDiffs.map(Math.abs)) : null;

  document.querySelector("#countValue").textContent = rows.length;
  document.querySelector("#averageA").textContent = formatNumber(avgA);
  document.querySelector("#averageB").textContent = formatNumber(avgB);
  document.querySelector("#averageDiff").textContent = formatNumber(avgDiff);
  document.querySelector("#maxDiff").textContent = formatNumber(maxDiff);
}

function chartTextColor() {
  return getComputedStyle(document.body).getPropertyValue("--text").trim();
}

function chartGridColor() {
  return getComputedStyle(document.body).getPropertyValue("--border").trim();
}

function commonOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: false,
    scales: {
      x: {
        ticks: { color: chartTextColor(), maxRotation: 0, autoSkip: true },
        grid: { color: chartGridColor() }
      },
      y: {
        ticks: { color: chartTextColor() },
        grid: { color: chartGridColor() }
      }
    },
    plugins: {
      legend: { labels: { color: chartTextColor() } },
      zoom: {
        pan: { enabled: true, mode: "x" },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" }
      }
    }
  };
}

function renderCharts(rows) {
  const labels = rows.map(row => row.x);
  comparisonChart?.destroy();
  differenceChart?.destroy();

  comparisonChart = new Chart(document.querySelector("#comparisonChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `데이터 A · ${yColumnA.value}`,
          data: rows.map(row => row.a),
          borderWidth: 2,
          pointRadius: rows.length > 100 ? 0 : 2,
          tension: 0.15
        },
        {
          label: `데이터 B · ${yColumnB.value}`,
          data: rows.map(row => row.b),
          borderWidth: 2,
          pointRadius: rows.length > 100 ? 0 : 2,
          tension: 0.15
        }
      ]
    },
    options: commonOptions()
  });

  differenceChart = new Chart(document.querySelector("#differenceChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "A - B",
        data: rows.map(row => row.diff),
        borderWidth: 1
      }]
    },
    options: commonOptions()
  });
}

function renderTable(rows, search = "") {
  const normalized = search.trim().toLowerCase();
  const filtered = rows
    .filter(row => String(row.x).toLowerCase().includes(normalized))
    .slice(0, 200);

  tableBody.innerHTML = filtered.map(row => `
    <tr>
      <td>${escapeHtml(row.x)}</td>
      <td>${formatNumber(row.a)}</td>
      <td>${formatNumber(row.b)}</td>
      <td>${formatNumber(row.diff)}</td>
    </tr>
  `).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function draw() {
  currentRows = buildRows();
  updateSummary(currentRows);
  renderCharts(currentRows);
  renderTable(currentRows, searchInput.value);
}

fileA.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  parseCsv(file, parsed => {
    dataA = parsed;
    document.querySelector("#fileAName").textContent = file.name;
    refreshColumnSelectors();
    draw();
  });
});

fileB.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  parseCsv(file, parsed => {
    dataB = parsed;
    document.querySelector("#fileBName").textContent = file.name;
    refreshColumnSelectors();
    draw();
  });
});

document.querySelector("#drawButton").addEventListener("click", draw);
document.querySelector("#resetZoomButton").addEventListener("click", () => {
  comparisonChart?.resetZoom();
  differenceChart?.resetZoom();
});
document.querySelector("#downloadButton").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "graph-comparison.png";
  link.href = comparisonChart.toBase64Image("image/png", 1);
  link.click();
});
searchInput.addEventListener("input", () => renderTable(currentRows, searchInput.value));

document.querySelector("#themeButton").addEventListener("click", event => {
  document.body.classList.toggle("dark");
  event.target.textContent = document.body.classList.contains("dark") ? "라이트 모드" : "다크 모드";
  draw();
});

refreshColumnSelectors();
draw();
