let rawFeedback = [];
let rawInsights = null;
let selectedItems = new Set();

let productChart = null;
let categoryChart = null;
let priorityChart = null;
let sentimentTrendChart = null;
let channelChart = null;

const el = (id) => document.getElementById(id);

function uniq(arr) {
  return Array.from(new Set(arr)).sort((a,b)=>a.localeCompare(b));
}

function fmtTime(d) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
}

function setStatus(text) {
  const statusEl = el("status");
  if (statusEl) statusEl.textContent = text;
}

function getFilters() {
  return {
    product: el("filter-product").value.trim(),
    category: el("filter-category").value.trim(),
    source: el("filter-source").value.trim(),
    sentiment: el("filter-sentiment") ? el("filter-sentiment").value.trim() : "",
    timerange: el("filter-timerange") ? el("filter-timerange").value : "all",
    minImpact: el("filter-min-impact") ? Number(el("filter-min-impact").value) : 1,
    search: el("search").value.trim().toLowerCase()
  };
}

function applyFilters(items, f) {
  return items.filter((x) => {
    if (f.product && x.product !== f.product) return false;
    if (f.category && x.category !== f.category) return false;
    if (f.source && x.source !== f.source) return false;
    if (f.sentiment && x.sentiment !== f.sentiment) return false;
    if (Number(x.businessImpact) < f.minImpact) return false;

    // Time range filter
    if (f.timerange !== "all" && x.timestamp) {
      const itemDate = new Date(x.timestamp);
      const daysAgo = parseInt(f.timerange);
      const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      if (itemDate < cutoff) return false;
    }

    if (f.search) {
      const blob = `${x.product} ${x.category} ${x.source} ${x.title || ""} ${x.description || ""}`.toLowerCase();
      if (!blob.includes(f.search)) return false;
    }
    return true;
  });
}

function renderFilters(items) {
  const products = uniq(items.map((x) => x.product));
  const categories = uniq(items.map((x) => x.category));
  const sources = uniq(items.map((x) => x.source));
  const sentiments = uniq(items.map((x) => x.sentiment || "Unknown").filter(Boolean));

  const keep = getFilters();

  const fill = (select, values, current) => {
    if (!select) return;
    select.querySelectorAll("option:not(:first-child)").forEach((n) => n.remove());
    for (const v of values) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    }
    if (current && values.includes(current)) select.value = current;
    else select.value = "";
  };

  fill(el("filter-product"), products, keep.product);
  fill(el("filter-category"), categories, keep.category);
  fill(el("filter-source"), sources, keep.source);
  fill(el("filter-sentiment"), sentiments, keep.sentiment);
}

function getSentimentScore(sentiment) {
  const scores = {
    "Angry": 1,
    "Frustrated": 2,
    "Disappointed": 3,
    "Concerned": 4,
    "Confused": 5,
    "Neutral": 6,
    "Hopeful": 7,
    "Excited": 8
  };
  return scores[sentiment] || 5;
}

function renderSummary(items) {
  el("total-feedback").textContent = String(items.length);

  // Most mentioned product
  const byProduct = new Map();
  for (const x of items) {
    byProduct.set(x.product, (byProduct.get(x.product) || 0) + 1);
  }

  let top = { product: "—", count: 0 };
  for (const [product, count] of byProduct.entries()) {
    if (count > top.count) top = { product, count };
  }
  el("highest-impact").textContent = top.product;

  // Average urgency
  const avgUrg = items.reduce((s, x) => s + Number(x.urgency), 0) / Math.max(items.length, 1);
  el("avg-urgency").textContent = items.length ? avgUrg.toFixed(1) : "—";

  // Critical count
  const critical = items.filter(x => Number(x.businessImpact) >= 4 && Number(x.urgency) >= 4).length;
  el("critical-count").textContent = String(critical);

  // Average sentiment
  const avgSent = items.reduce((s, x) => s + getSentimentScore(x.sentiment), 0) / Math.max(items.length, 1);
  el("avg-sentiment").textContent = items.length ? avgSent.toFixed(1) + "/8" : "—";

  // Top channel
  const byChannel = new Map();
  for (const x of items) {
    const ch = x.channel || x.source;
    byChannel.set(ch, (byChannel.get(ch) || 0) + 1);
  }
  let topCh = { channel: "—", count: 0 };
  for (const [channel, count] of byChannel.entries()) {
    if (count > topCh.count) topCh = { channel, count };
  }
  el("top-channel").textContent = topCh.channel;
}

function getSentimentColor(sentiment) {
  const colors = {
    "Angry": "#dc2626",
    "Frustrated": "#ea580c",
    "Disappointed": "#f59e0b",
    "Concerned": "#eab308",
    "Confused": "#84cc16",
    "Neutral": "#6b7280",
    "Hopeful": "#3b82f6",
    "Excited": "#8b5cf6"
  };
  return colors[sentiment] || "#6b7280";
}

function showFeedbackModal(item) {
  const modal = el("modal-overlay");
  const title = el("modal-title");
  const meta = el("modal-meta");
  const body = el("modal-body");

  if (!modal || !title || !meta || !body) return;

  title.textContent = item.title || `${item.product} - ${item.category}`;
  
  const sentimentColor = getSentimentColor(item.sentiment);
  const channelInfo = item.channel ? `<strong>Channel:</strong> ${item.channel}` : "";
  const urlInfo = item.url ? `<br><strong>Link:</strong> <a href="${item.url}" target="_blank" style="color: #3b82f6;">${item.url}</a>` : "";
  
  meta.innerHTML = `
    <span><strong>ID:</strong> ${item.id || "N/A"}</span> •
    <span><strong>Product:</strong> ${item.product}</span> •
    <span><strong>Category:</strong> ${item.category}</span> •
    <span><strong>Source:</strong> ${item.source}</span><br>
    <span>${channelInfo}</span> •
    <span><strong>Sentiment:</strong> <span style="color: ${sentimentColor}; font-weight: 600;">${item.sentiment || "Unknown"}</span></span>${urlInfo}<br>
    <span><strong>Impact:</strong> ${item.businessImpact}/5</span> •
    <span><strong>Urgency:</strong> ${item.urgency}/5</span> •
    <span><strong>Confidence:</strong> ${item.confidenceLevel}/5</span>
  `;

  body.textContent = item.description || "No detailed description available.";

  // Set current status
  const statusSelect = el("modal-status");
  if (statusSelect) statusSelect.value = item.status || "Open";

  modal.classList.remove("hidden");
  modal.dataset.itemId = item.id;
}

function hideFeedbackModal() {
  const modal = el("modal-overlay");
  if (modal) modal.classList.add("hidden");
}

function updateFeedbackStatus(itemId, updates) {
  const item = rawFeedback.find(x => x.id === itemId);
  if (item) {
    Object.assign(item, updates);
    refreshView();
  }
}

function renderTable(items) {
  const body = el("feedback-body");
  body.innerHTML = "";
  
  for (const x of items) {
    const tr = document.createElement("tr");
    tr.className = "feedback-row";
    tr.style.cursor = "pointer";
    tr.dataset.id = x.id;
    
    const sentimentColor = getSentimentColor(x.sentiment);
    const status = x.status || "Open";
    const statusClass = status.toLowerCase().replace(/\s+/g, '-');
    const assignedTo = x.assignee ? x.assignee.split('@')[0].replace('.', ' ') : '—';
    
    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" data-id="${x.id}" onclick="event.stopPropagation()"></td>
      <td>${x.product}</td>
      <td>${x.category}</td>
      <td>${x.businessImpact}</td>
      <td>${x.urgency}</td>
      <td>${x.confidenceLevel}</td>
      <td>${x.source}</td>
      <td><span style="color: ${sentimentColor}; font-weight: 600;">${x.sentiment || "Unknown"}</span></td>
      <td style="font-size: 13px; color: var(--muted);">${assignedTo}</td>
      <td><span class="status-badge status-${statusClass}">${status}</span></td>
      <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${x.title || "—"}</td>
    `;
    
    tr.addEventListener("click", (e) => {
      if (!e.target.classList.contains('row-checkbox')) {
        showFeedbackModal(x);
      }
    });
    body.appendChild(tr);
  }
  
  const rowCount = el("row-count");
  if (rowCount) rowCount.textContent = String(items.length);
}

function countBy(items, key) {
  const m = new Map();
  for (const x of items) {
    const v = x[key];
    m.set(v, (m.get(v) || 0) + 1);
  }
  const labels = Array.from(m.keys()).sort((a,b)=>String(a).localeCompare(String(b)));
  const data = labels.map((l) => m.get(l));
  return { labels, data };
}

function filterByPriority(level) {
  const filtered = rawFeedback.filter((item) => {
    const impact = Number(item.businessImpact);
    const urgency = Number(item.urgency);
    
    const highImpact = impact >= 4;
    const highUrgency = urgency >= 4;
    
    if (level === 'critical') return highImpact && highUrgency;
    if (level === 'important') return highImpact && !highUrgency;
    if (level === 'urgent') return !highImpact && highUrgency;
    if (level === 'backlog') return !highImpact && !highUrgency;
    return true;
  });
  
  renderTable(applyFilters(filtered, getFilters()));
  
  const tableCard = document.querySelector('.table-card');
  if (tableCard) {
    tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderCharts(items) {
  const byProd = countBy(items, "product");
  const byCat = countBy(items, "category");

  if (productChart) productChart.destroy();
  if (categoryChart) categoryChart.destroy();
  if (priorityChart) priorityChart.destroy();
  if (sentimentTrendChart) sentimentTrendChart.destroy();
  if (channelChart) channelChart.destroy();

  // Product chart
  const ctxP = el("chart-product").getContext("2d");
  productChart = new Chart(ctxP, {
    type: "bar",
    data: {
      labels: byProd.labels,
      datasets: [{ label: "Count", data: byProd.data, backgroundColor: "#F6821F" }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.parsed.y} items - Click to filter`;
            }
          }
        }
      },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const product = byProd.labels[index];
          el("filter-product").value = product;
          refreshView();
          document.querySelector('.table-card').scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  });

  // Category chart
  const ctxC = el("chart-category").getContext("2d");
  categoryChart = new Chart(ctxC, {
    type: "bar",
    data: {
      labels: byCat.labels,
      datasets: [{ label: "Count", data: byCat.data, backgroundColor: "#0051C3" }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.parsed.y} items - Click to filter`;
            }
          }
        }
      },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const category = byCat.labels[index];
          el("filter-category").value = category;
          refreshView();
          document.querySelector('.table-card').scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  });

  // Sentiment trend over time
  const sortedByTime = [...items].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const sentimentData = sortedByTime.map(x => ({
    x: new Date(x.timestamp),
    y: getSentimentScore(x.sentiment)
  }));

  const ctxST = el("chart-sentiment-trend").getContext("2d");
  sentimentTrendChart = new Chart(ctxST, {
    type: "line",
    data: {
      datasets: [{
        label: "Sentiment Score",
        data: sentimentData,
        borderColor: "#F6821F",
        backgroundColor: "rgba(246, 130, 31, 0.1)",
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { type: 'time', time: { unit: 'day' } },
        y: { min: 0, max: 9, ticks: { stepSize: 1 } }
      }
    }
  });

  // Channel performance
  const byChannel = new Map();
  for (const x of items) {
    const ch = x.channel || x.source;
    byChannel.set(ch, (byChannel.get(ch) || 0) + 1);
  }
  const channelLabels = Array.from(byChannel.keys()).sort();
  const channelData = channelLabels.map(l => byChannel.get(l));

  const ctxCh = el("chart-channel").getContext("2d");
  channelChart = new Chart(ctxCh, {
    type: "doughnut",
    data: {
      labels: channelLabels,
      datasets: [{
        data: channelData,
        backgroundColor: ["#F6821F", "#0051C3", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#6366f1"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // Priority matrix
  const matrix = {
    critical: 0,
    important: 0,
    urgent: 0,
    backlog: 0
  };

  for (const item of items) {
    const impact = Number(item.businessImpact);
    const urgency = Number(item.urgency);
    
    const highImpact = impact >= 4;
    const highUrgency = urgency >= 4;
    
    if (highImpact && highUrgency) matrix.critical++;
    else if (highImpact && !highUrgency) matrix.important++;
    else if (!highImpact && highUrgency) matrix.urgent++;
    else matrix.backlog++;
  }

  const ctxM = el("chart-priority").getContext("2d");
  priorityChart = new Chart(ctxM, {
    type: "bar",
    data: {
      labels: [
        "Critical (High Impact + High Urgency)",
        "Important (High Impact + Low Urgency)",
        "Urgent (Low Impact + High Urgency)",
        "Backlog (Low Impact + Low Urgency)"
      ],
      datasets: [{
        label: "Count",
        data: [matrix.critical, matrix.important, matrix.urgent, matrix.backlog],
        backgroundColor: ["#dc2626", "#f97316", "#fbbf24", "#9ca3af"]
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = items.length;
              const count = context.parsed.x;
              const percent = ((count / total) * 100).toFixed(1);
              return `${count} items (${percent}%) - Click to filter`;
            }
          }
        }
      },
      scales: {
        x: { 
          beginAtZero: true, 
          ticks: { precision: 0 },
          title: { display: true, text: "Number of Items" }
        }
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const priorities = ['critical', 'important', 'urgent', 'backlog'];
          filterByPriority(priorities[index]);
        }
      }
    }
  });
}

function renderInsights(insights) {
  if (!insights) return;
  const summary = el("summary");
  const recommendations = el("recommendations");
  
  if (summary) summary.textContent = insights.summary || "—";
  
  if (recommendations) {
    recommendations.innerHTML = "";
    for (const rec of (insights.recommendedFocus || [])) {
      const li = document.createElement("li");
      li.textContent = rec;
      recommendations.appendChild(li);
    }
  }
}

function refreshView() {
  const f = getFilters();
  const filtered = applyFilters(rawFeedback, f);
  renderSummary(filtered);
  renderTable(filtered);
  renderCharts(filtered);
}

async function fetchJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return await res.json();
}

async function loadData() {
  setStatus("Refreshing…");
  try {
    const [feedback, insights] = await Promise.all([
      fetchJSON("/api/feedback"),
      fetchJSON("/api/insights")
    ]);

    rawFeedback = Array.isArray(feedback) ? feedback : [];
    
    // Add default status if not present
    rawFeedback.forEach(item => {
      if (!item.status) item.status = "Open";
    });
    
    rawInsights = insights || null;

    renderFilters(rawFeedback);
    renderInsights(rawInsights);
    
    const lastUpdated = el("last-updated");
    if (lastUpdated) lastUpdated.textContent = fmtTime(new Date());
    
    refreshView();
    setStatus("OK");
  } catch (e) {
    console.error(e);
    setStatus("Error");
  }
}

function exportCSV() {
  const f = getFilters();
  const filtered = applyFilters(rawFeedback, f);
  
  const headers = ["ID", "Product", "Category", "Impact", "Urgency", "Confidence", "Source", "Sentiment", "Status", "Title"];
  const rows = filtered.map(x => [
    x.id,
    x.product,
    x.category,
    x.businessImpact,
    x.urgency,
    x.confidenceLevel,
    x.source,
    x.sentiment,
    x.status || "Open",
    `"${(x.title || "").replace(/"/g, '""')}"`
  ]);
  
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `feedback-export-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF() {
  alert("PDF export would generate a formatted report. This requires a PDF library like jsPDF.");
}

function wireEvents() {
  ["filter-product","filter-category","filter-source","filter-sentiment","filter-timerange","filter-min-impact","search"].forEach((id) => {
    const elem = el(id);
    if (elem) {
      elem.addEventListener("input", refreshView);
      elem.addEventListener("change", refreshView);
    }
  });

  const resetBtn = el("reset-filters");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      ["filter-product","filter-category","filter-source","filter-sentiment"].forEach(id => {
        const elem = el(id);
        if (elem) elem.value = "";
      });
      const timerange = el("filter-timerange");
      if (timerange) timerange.value = "all";
      const search = el("search");
      if (search) search.value = "";
      refreshView();
    });
  }

  // Export buttons
  const exportCSVBtn = el("export-csv");
  if (exportCSVBtn) exportCSVBtn.addEventListener("click", exportCSV);
  
  const exportPDFBtn = el("export-pdf");
  if (exportPDFBtn) exportPDFBtn.addEventListener("click", exportPDF);

  // Modal handlers
  const modalClose = el("modal-close");
  const modalOverlay = el("modal-overlay");
  
  if (modalClose) modalClose.addEventListener("click", hideFeedbackModal);
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) hideFeedbackModal();
    });
  }

  // Modal save
  const modalSave = el("modal-save");
  if (modalSave) {
    modalSave.addEventListener("click", () => {
      const itemId = modalOverlay.dataset.itemId;
      const status = el("modal-status").value;
      const assignee = el("modal-assignee").value;
      const tags = el("modal-tags").value;
      
      updateFeedbackStatus(itemId, { status, assignee, tags });
      hideFeedbackModal();
    });
  }

  // Select all checkbox
  const selectAll = el("select-all");
  if (selectAll) {
    selectAll.addEventListener("change", (e) => {
      document.querySelectorAll(".row-checkbox").forEach(cb => {
        cb.checked = e.target.checked;
        if (cb.checked) selectedItems.add(cb.dataset.id);
        else selectedItems.delete(cb.dataset.id);
      });
      updateBulkActionsVisibility();
    });
  }

  // Row checkboxes
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("row-checkbox")) {
      if (e.target.checked) selectedItems.add(e.target.dataset.id);
      else selectedItems.delete(e.target.dataset.id);
      updateBulkActionsVisibility();
    }
  });

  // Bulk actions
  const bulkAssign = el("bulk-assign");
  if (bulkAssign) {
    bulkAssign.addEventListener("click", () => {
      el("assign-modal").classList.remove("hidden");
    });
  }

  const assignConfirm = el("assign-confirm");
  if (assignConfirm) {
    assignConfirm.addEventListener("click", () => {
      const assignee = el("assign-input").value;
      selectedItems.forEach(id => updateFeedbackStatus(id, { assignee }));
      el("assign-modal").classList.add("hidden");
      selectedItems.clear();
      updateBulkActionsVisibility();
    });
  }

  const bulkTag = el("bulk-tag");
  if (bulkTag) {
    bulkTag.addEventListener("click", () => {
      el("tag-modal").classList.remove("hidden");
    });
  }

  const tagConfirm = el("tag-confirm");
  if (tagConfirm) {
    tagConfirm.addEventListener("click", () => {
      const tags = el("tag-input").value;
      selectedItems.forEach(id => updateFeedbackStatus(id, { tags }));
      el("tag-modal").classList.add("hidden");
      selectedItems.clear();
      updateBulkActionsVisibility();
    });
  }

  const bulkStatus = el("bulk-status");
  if (bulkStatus) {
    bulkStatus.addEventListener("click", () => {
      el("status-modal").classList.remove("hidden");
    });
  }

  const statusConfirm = el("status-confirm");
  if (statusConfirm) {
    statusConfirm.addEventListener("click", () => {
      const status = el("status-input").value;
      selectedItems.forEach(id => updateFeedbackStatus(id, { status }));
      el("status-modal").classList.add("hidden");
      selectedItems.clear();
      updateBulkActionsVisibility();
    });
  }
}

function updateBulkActionsVisibility() {
  const bulkActions = el("bulk-actions");
  if (bulkActions) {
    bulkActions.style.display = selectedItems.size > 0 ? "flex" : "none";
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  wireEvents();
  await loadData();
  setInterval(loadData, 15000);
});
