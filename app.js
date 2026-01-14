async function loadDashboard() {
  const feedbackRes = await fetch("/api/feedback");
  const feedback = await feedbackRes.json();

  const insightsRes = await fetch("/api/insights");
  const insights = await insightsRes.json();

  document.getElementById("total-count").textContent = feedback.length;

  const avgUrgency =
    feedback.reduce((sum, f) => sum + f.urgency, 0) / feedback.length;
  document.getElementById("avg-urgency").textContent = avgUrgency.toFixed(1);

  const topArea = feedback.reduce((acc, f) => {
    acc[f.product] = (acc[f.product] || 0) + 1;
    return acc;
  }, {});
  document.getElementById("top-area").textContent =
    Object.keys(topArea).sort((a, b) => topArea[b] - topArea[a])[0];

  const table = document.getElementById("feedback-table");
  table.innerHTML = "";
  feedback.forEach(f => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${f.product}</td>
      <td>${f.category}</td>
      <td>${f.businessImpact}</td>
      <td>${f.urgency}</td>
      <td>${f.confidenceLevel}</td>
      <td>${f.source}</td>
    `;
    table.appendChild(row);
  });

  document.getElementById("summary").textContent = insights.summary;
  const recList = document.getElementById("recommendations");
  recList.innerHTML = "";
  insights.recommendedFocus.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    recList.appendChild(li);
  });

  document.getElementById("last-updated").textContent =
    "Last updated: " + new Date().toLocaleString();
}

loadDashboard();
setInterval(loadDashboard, 15000);
