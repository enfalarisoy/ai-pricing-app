// Results-only public build of the AI Pricing Benchmarks app.
// Loaded after app.js. The data file holds case-level results averaged over runs (no prices, no run-level
// answers, no reasoning). Views that need run-level data show fixed result tables computed once from the
// private data with the original app (payload.snapshots).
(function () {
  const HIDE_HEADINGS = [
    /pricing leaderboard/i, /under \/ similar \/ over pricing/i, /direction detail/i,
    /closest p-hat/i, /regression best-fit instances/i, /price estimates/i, /price gap/i,
  ];

  function hidePriceCards() {
    document.querySelectorAll("article").forEach(article => {
      const h2 = article.querySelector(".card-heading h2, h2");
      if (h2 && HIDE_HEADINGS.some(re => re.test(h2.textContent))) article.hidden = true;
    });
    ["#benchmarkRun", "#advancedRun"].forEach(id => {
      const el = document.querySelector(id);
      if (el) { const label = el.closest("label"); (label || el).hidden = true; }
    });
  }

  const PRICE_COL = /price gap|p_hat|p-hat|recommended price|price implied/i;
  function stripPriceColumns(root) {
    (root || document).querySelectorAll("table").forEach(table => {
      const head = table.querySelector("thead tr");
      if (!head) return;
      if (!table.dataset.priceDrop) {
        const drop = [...head.children].map((th, i) => (PRICE_COL.test(th.textContent) ? i : -1)).filter(i => i >= 0);
        table.dataset.priceDrop = JSON.stringify(drop);
        table.dataset.priceWidth = String(head.children.length);
      }
      const drop = JSON.parse(table.dataset.priceDrop);
      const width = Number(table.dataset.priceWidth);
      if (!drop.length) return;
      table.querySelectorAll("tr").forEach(tr => {
        const cells = [...tr.children];
        if (cells.length !== width) return;
        drop.slice().reverse().forEach(i => cells[i] && cells[i].remove());
      });
    });
    document.querySelectorAll("#overviewRegressionKpis > *").forEach(tile => { if (/price gap/i.test(tile.textContent)) tile.hidden = true; });
  }
  const TEXT_FIXES = [
    [/True demand and recommended prices/g, "True demand"],
    [/Ground-truth curve with the price history, the optimal price and model estimates/g, "Ground-truth curve with the price history and the optimal price"],
    [/Ground-truth revenue curve with the same recommended-price markers/g, "Ground-truth revenue curve"],
    [/ Colored markers are mean recommended prices[^.]*\./g, ""],
    [/Each model cell shows its recommended price and relative revenue loss\./g, "Each model cell shows its relative revenue loss."],
    [/; their price gaps are shown as n\/a\./g, "."],
    [/ and model price recommendations\./g, "."],
    [/ with optimal prices and model price recommendations/g, " with optimal prices"],
    [/Absolute percentage gaps compare the regression fit against the benchmark optimum\./g, "Absolute revenue gaps compare the regression fit against the benchmark optimum."],
  ];
  function fixTexts() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      let text = node.nodeValue, changed = false;
      TEXT_FIXES.forEach(([re, rep]) => { if (re.test(text)) { text = text.replace(re, rep); changed = true; } re.lastIndex = 0; });
      if (changed) node.nodeValue = text;
    }
  }
  function hidePriceSubpanels() {
    document.querySelectorAll(".compact-heading h2, .card-heading h2").forEach(h2 => {
      if (!/under \/ (equal|similar) \/ over pricing/i.test(h2.textContent)) return;
      const heading = h2.closest(".card-heading");
      const list = heading && heading.nextElementSibling;
      if (heading) heading.hidden = true;
      if (list && list.classList.contains("direction-list")) list.hidden = true;
    });
  }
  function cleanPrices() { hidePriceCards(); hidePriceSubpanels(); stripPriceColumns(); fixTexts(); }

  function fixedNote(text) {
    return `<article class="comparison-note card public-note"><strong>Fixed results</strong><span>${text}</span></article>`;
  }

  function bindSelect(selector, handler) {
    const el = document.querySelector(selector);
    if (el) el.addEventListener("change", event => handler(event.target.value));
  }

  // ---------- Runs: fixed tables for every basic model and split variable ----------
  let runModel = null, runField = "demand_model";
  renderRunTTests = function () {
    const s = payload.snapshots;
    const models = Object.keys(s.runs_fields);
    if (!models.includes(runModel)) runModel = models[0];
    const fields = s.runs_fields[runModel];
    if (!fields.includes(runField)) runField = fields.includes("demand_model") ? "demand_model" : fields[0];
    const section = document.querySelector("#tTestsRuns");
    section.innerHTML = fixedNote("Computed once from all five runs of each basic model (two for the advanced models), with every split level and no extra filters. Choose the model and the split variable; the tables do not recompute in this public version.")
      + s.runs[`${runModel}||${runField}`];
    section.querySelectorAll("#tTestRunsFilterPanel, #runComparisonRunList, #runComparisonLevelList, #runComparisonRunReset, #runComparisonLevelReset, #runComparisonRunSummary, #runComparisonLevelSummary").forEach(el => {
      const box = el.closest(".checkbox-filter") || el.closest("details") || el;
      box.remove();
    });
    const modelPicker = section.querySelector("#runComparisonModel");
    if (modelPicker) {
      modelPicker.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join("");
      modelPicker.value = runModel;
    }
    const fieldPicker = section.querySelector("#runComparisonField");
    if (fieldPicker) {
      fieldPicker.innerHTML = fields.map(f => `<option value="${f}">${s.group_options[f] || f}</option>`).join("");
      fieldPicker.value = runField;
    }
    bindSelect("#runComparisonModel", value => { runModel = value; renderRunTTests(); });
    bindSelect("#runComparisonField", value => { runField = value; renderRunTTests(); });
  };

  // ---------- ANOVA across models: fixed tables per method set and scenario ----------
  let anovaMethods = "all", anovaScenario = "all";
  renderAnovaModels = function () {
    const section = document.querySelector("#anovaModels");
    section.innerHTML = payload.snapshots.anova[`${anovaMethods}||${anovaScenario}`]
      + fixedNote("Each table is computed once from the run-level losses.");
    section.querySelector("#anovaModelsMethods").value = anovaMethods;
    section.querySelector("#anovaModelsScenario").value = anovaScenario;
    bindSelect("#anovaModelsMethods", value => { anovaMethods = value; renderAnovaModels(); });
    bindSelect("#anovaModelsScenario", value => { anovaScenario = value; renderAnovaModels(); });
  };

  // ---------- Role of noise: fixed tables per scenario ----------
  let noiseScenario = "all";
  renderNoiseRole = function () {
    const section = document.querySelector("#noiseRole");
    section.innerHTML = payload.snapshots.noise[noiseScenario];
    section.querySelector("#noiseScenario").value = noiseScenario;
    bindSelect("#noiseScenario", value => { noiseScenario = value; renderNoiseRole(); });
  };

  // ---------- Overview, all runs averaged: fixed per-run summary (losses only) ----------
  renderAllRuns = function () {
    document.querySelector("#averagedRunDetails").innerHTML = payload.snapshots.all_runs.html
      + fixedNote("Per-run summary computed once on all complete shared cases (no overview filters); price columns are not published.");
  };

  // ---------- Fitted demands: only the coverage summary ----------
  renderFittedDemand = function () {
    const section = document.querySelector("#fittedDemand");
    if (section.dataset.publicDone) return;
    section.innerHTML = payload.snapshots.fitted_coverage
      + fixedNote("How often each model states a linear demand line, and how close its slope is to the Regression Heuristic's. The individual stated lines and the prices they imply are not published.");
    section.dataset.publicDone = "1";
  };

  // ---------- Ground truth: no recommended-price markers or price table ----------
  const originalGroundTruth = renderGroundTruth;
  renderGroundTruth = function () {
    originalGroundTruth();
    cleanPrices();
  };

  // ---------- Shared cases table: loss only ----------
  const originalAdvancedTable = renderAdvancedCaseTable;
  renderAdvancedCaseTable = function (cases, completed) {
    originalAdvancedTable(cases, completed);
    document.querySelectorAll("#advancedModelsCases thead .quiet").forEach(el => { if (/price/i.test(el.textContent)) el.textContent = "Loss"; });
    document.querySelectorAll("#advancedModelsCases tbody tr").forEach(tr => {
      [...tr.children].slice(4).forEach(td => {
        const parts = td.innerHTML.split("<br>");
        if (parts.length > 1 && !/quiet/.test(parts[0])) td.innerHTML = parts.slice(1).join("<br>");
      });
    });
  };

  const originalRender = render;
  render = function () {
    originalRender();
    cleanPrices();
  };

  document.addEventListener("DOMContentLoaded", hidePriceCards);
  hidePriceCards();
})();
