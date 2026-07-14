(function () {
  "use strict";

  const data = globalThis.WorkflowData;
  if (!data || typeof globalThis.cytoscape !== "function") {
    document.body.innerHTML = "<p style='padding:24px'>工作流数据或 Cytoscape 加载失败。</p>";
    return;
  }

  const state = {
    analysts: new Set(data.analystOrder),
    depth: 1,
    selectedId: "start",
    promptLanguage: "zh",
    simulation: [],
    step: -1,
    timer: null,
  };

  const byId = Object.fromEntries(data.nodes.map((item) => [item.id, item]));
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const phaseNames = {
    control: "控制节点", analysis: "分析阶段", tool: "工具节点", research: "研究辩论",
    trading: "交易阶段", risk: "风险辩论", manager: "经理裁决", storage: "持久化",
  };

  const displayPositions = {
    start: { x: 60, y: 90 },
    market: { x: 270, y: 90 }, "market-tools": { x: 270, y: 210 },
    sentiment: { x: 490, y: 90 },
    news: { x: 710, y: 90 }, "news-tools": { x: 710, y: 210 },
    fundamentals: { x: 930, y: 90 }, "fundamentals-tools": { x: 930, y: 210 },
    bull: { x: 120, y: 380 }, bear: { x: 350, y: 380 },
    "research-manager": { x: 580, y: 380 }, trader: { x: 840, y: 380 },
    aggressive: { x: 120, y: 590 }, conservative: { x: 350, y: 590 }, neutral: { x: 580, y: 590 },
    "portfolio-manager": { x: 820, y: 590 }, end: { x: 1040, y: 590 },
    checkpoint: { x: 350, y: 740 }, memory: { x: 690, y: 740 },
  };

  function enabledNodeIds() {
    const ids = new Set(data.nodes.map((item) => item.id));
    for (const analyst of data.analystOrder) {
      if (!state.analysts.has(analyst)) {
        ids.delete(analyst);
        const toolId = data.toolNodeByAnalyst[analyst];
        if (toolId) ids.delete(toolId);
      }
    }
    return ids;
  }

  function analystSequenceEdges() {
    const selected = data.analystOrder.filter((id) => state.analysts.has(id));
    const edges = [{ id: "sequence-start", source: "start", target: selected[0], kind: "fixed", label: "初始状态" }];
    selected.forEach((id, index) => {
      edges.push({
        id: `sequence-${id}`,
        source: id,
        target: selected[index + 1] || "bull",
        kind: "fixed",
        label: index === selected.length - 1 ? "分析完成" : "下一份报告",
      });
    });
    return edges;
  }

  function graphElements() {
    const enabled = enabledNodeIds();
    const nodes = data.nodes
      .filter((item) => enabled.has(item.id))
      .map((item) => ({
        data: { id: item.id, label: item.shortLabel || item.label, phase: item.phase, kind: item.kind },
        position: displayPositions[item.id] || item.position,
      }));
    const allEdges = [...data.edges, ...analystSequenceEdges()];
    const edges = allEdges
      .filter((edge) => enabled.has(edge.source) && enabled.has(edge.target))
      .map((edge) => ({ data: edge }));
    return [...nodes, ...edges];
  }

  const graphStyle = [
    {
      selector: "node",
      style: {
        width: 116, height: 52, shape: "round-rectangle", "corner-radius": 5,
        label: "data(label)", "text-wrap": "wrap", "text-max-width": 96,
        "font-size": 12, "font-weight": 650, color: "#24303b",
        "background-color": "#ffffff", "border-width": 1.5, "border-color": "#9aa6b2",
        "text-valign": "center", "text-halign": "center", "overlay-opacity": 0,
      },
    },
    { selector: "node[phase='analysis']", style: { "background-color": "#e5eefc", "border-color": "#2457a6" } },
    { selector: "node[phase='tool']", style: { shape: "barrel", width: 104, height: 44, "background-color": "#dff5ec", "border-color": "#087f5b", "font-size": 11 } },
    { selector: "node[phase='research']", style: { "background-color": "#fff0d6", "border-color": "#a25b00" } },
    { selector: "node[phase='risk']", style: { "background-color": "#fde8e7", "border-color": "#b42318" } },
    { selector: "node[phase='manager']", style: { "background-color": "#eee8fa", "border-color": "#6842a8", "border-width": 2 } },
    { selector: "node[phase='trading']", style: { "background-color": "#e6f3f0", "border-color": "#087f5b", "border-width": 2 } },
    { selector: "node[phase='storage']", style: { shape: "round-diamond", width: 112, height: 64, "background-color": "#f2eef8", "border-color": "#6842a8", "font-size": 10 } },
    { selector: "node[phase='control']", style: { shape: "round-hexagon", "background-color": "#17202a", "border-color": "#17202a", color: "#ffffff" } },
    {
      selector: "edge",
      style: {
        width: 1.7, "line-color": "#78838e", "target-arrow-color": "#78838e",
        "target-arrow-shape": "triangle", "arrow-scale": 0.8, "curve-style": "bezier",
        label: "data(label)", "font-size": 8, color: "#66717c", "text-rotation": "autorotate",
        "text-background-color": "#edf1f4", "text-background-opacity": 0.88,
        "text-background-padding": 2, "overlay-opacity": 0,
      },
    },
    { selector: "edge[kind='conditional']", style: { "line-style": "dashed", "line-color": "#a25b00", "target-arrow-color": "#a25b00" } },
    { selector: "edge[kind='loop']", style: { "line-style": "dashed", "line-color": "#b42318", "target-arrow-color": "#b42318", "curve-style": "unbundled-bezier", "control-point-distances": -45, "control-point-weights": 0.5 } },
    { selector: "edge[kind='persistence']", style: { "line-style": "dotted", "line-color": "#6842a8", "target-arrow-color": "#6842a8" } },
    { selector: "edge[kind='memory']", style: { "line-style": "dashed", "line-color": "#087f5b", "target-arrow-color": "#087f5b" } },
    { selector: "node:selected", style: { "border-width": 4, "border-color": "#111820", "underlay-color": "#ffffff", "underlay-opacity": 0.9, "underlay-padding": 5 } },
    { selector: ".completed", style: { "background-color": "#d7f1e7", "border-color": "#087f5b", opacity: 1 } },
    { selector: ".active-step", style: { "border-width": 5, "border-color": "#087f5b", "underlay-color": "#56c6a5", "underlay-opacity": 0.24, "underlay-padding": 9 } },
  ];

  let cy;

  function createGraph(preserveViewport = false) {
    const viewport = cy && preserveViewport ? { zoom: cy.zoom(), pan: cy.pan() } : null;
    if (cy) cy.destroy();
    cy = cytoscape({
      container: $("#workflow-canvas"), elements: graphElements(), style: graphStyle,
      layout: { name: "preset", fit: false }, minZoom: 0.28, maxZoom: 2.2, wheelSensitivity: 0.16,
      selectionType: "single", boxSelectionEnabled: false,
    });
    if (viewport) {
      cy.zoom(viewport.zoom);
      cy.pan(viewport.pan);
    } else {
      const mobile = window.matchMedia("(max-width: 760px)").matches;
      if (mobile) {
        cy.zoom(0.55);
        cy.pan({ x: 32, y: 78 });
      } else {
        cy.fit(cy.elements(), 35);
      }
    }
    cy.on("tap", "node", (event) => selectNode(event.target.id()));
    cy.on("tap", "edge", (event) => renderEdge(event.target.data()));
    const selectable = cy.$id(state.selectedId);
    if (selectable.length) selectable.select(); else selectNode("start");
    updateGraphStatus();
    applySimulationClasses();
  }

  function tokens(target, values, emptyLabel = "无") {
    const root = $(target);
    root.innerHTML = "";
    const items = values && values.length ? values : [emptyLabel];
    items.forEach((value) => {
      const chip = document.createElement("span");
      chip.textContent = value;
      root.appendChild(chip);
    });
  }

  function selectNode(id) {
    const item = byId[id];
    if (!item) return;
    state.selectedId = id;
    cy.nodes().unselect();
    cy.$id(id).select();
    $("#detail-phase").textContent = phaseNames[item.phase] || item.phase;
    $("#detail-title").textContent = item.label;
    $("#detail-model").textContent = item.model;
    $("#detail-summary").textContent = item.summary;
    $("#detail-route").textContent = item.route;
    tokens("#detail-inputs", item.inputs);
    tokens("#detail-outputs", item.outputs);
    tokens("#detail-tools", item.tools);
    $("#tools-section").hidden = !item.tools.length;
    renderPrompt();
    const source = $("#detail-source");
    source.textContent = `查看源码 · ${item.source}`;
    source.href = `https://github.com/lemonhall/TradingAgents/blob/main/${item.source}`;
  }

  function renderEdge(edge) {
    state.selectedId = "";
    cy.nodes().unselect();
    $("#detail-phase").textContent = "路由边";
    $("#detail-title").textContent = edge.label || "状态传递";
    $("#detail-model").textContent = edge.kind;
    $("#detail-summary").textContent = `${byId[edge.source]?.label || edge.source} → ${byId[edge.target]?.label || edge.target}`;
    $("#detail-route").textContent = routeExplanation(edge);
    tokens("#detail-inputs", [edge.source]);
    tokens("#detail-outputs", [edge.target]);
    $("#tools-section").hidden = true;
    $("#detail-prompt").textContent = "这是一条图路由，不调用 LLM。路由是否触发由节点输出、tool_calls、当前发言者或计数器决定。";
    const source = $("#detail-source");
    source.textContent = "查看路由源码 · tradingagents/graph/setup.py";
    source.href = "https://github.com/lemonhall/TradingAgents/blob/main/tradingagents/graph/setup.py";
  }

  function routeExplanation(edge) {
    const explanations = {
      fixed: "上游节点完成后无条件传递共享状态。",
      conditional: "ConditionalLogic 根据 tool_calls、发言者标签或轮数计数选择目标。",
      loop: "状态更新后回到前序角色，开始下一次工具调用或辩论发言。",
      persistence: "SQLite checkpoint 在图外保存或清理节点状态。",
      memory: "Markdown 记忆日志跨运行保存决策、结果和反思。",
    };
    return `${explanations[edge.kind] || "图路由。"} 当前边条件：${edge.label || "无标签"}`;
  }

  function renderPrompt() {
    const item = byId[state.selectedId];
    if (!item) return;
    $("#detail-prompt").textContent = state.promptLanguage === "zh" ? item.promptZh : item.promptEn;
  }

  function setPromptLanguage(language) {
    state.promptLanguage = language;
    const zh = language === "zh";
    $("#prompt-tab-zh").classList.toggle("active", zh);
    $("#prompt-tab-en").classList.toggle("active", !zh);
    $("#prompt-tab-zh").setAttribute("aria-selected", String(zh));
    $("#prompt-tab-en").setAttribute("aria-selected", String(!zh));
    renderPrompt();
  }

  function buildSimulation() {
    const steps = ["start"];
    data.analystOrder.filter((id) => state.analysts.has(id)).forEach((id) => {
      steps.push(id);
      const tool = data.toolNodeByAnalyst[id];
      if (tool) steps.push(tool, id);
    });
    for (let round = 0; round < state.depth; round += 1) steps.push("bull", "bear");
    steps.push("research-manager", "trader");
    for (let round = 0; round < state.depth; round += 1) steps.push("aggressive", "conservative", "neutral");
    steps.push("portfolio-manager", "end");
    state.simulation = steps;
    $("#step-counter").textContent = `${Math.max(0, state.step + 1)} / ${steps.length}`;
  }

  function applySimulationClasses() {
    if (!cy) return;
    cy.nodes().removeClass("completed active-step");
    state.simulation.forEach((id, index) => {
      const target = cy.$id(id);
      if (index < state.step) target.addClass("completed");
      if (index === state.step) target.addClass("active-step");
    });
  }

  function stepSimulation() {
    if (!state.simulation.length) buildSimulation();
    if (state.step >= state.simulation.length - 1) resetSimulation();
    state.step += 1;
    const id = state.simulation[state.step];
    applySimulationClasses();
    selectNode(id);
    $("#step-counter").textContent = `${state.step + 1} / ${state.simulation.length}`;
    $("#simulation-status").textContent = `${state.step + 1}. ${byId[id].label} · ${byId[id].route}`;
    const node = cy.$id(id);
    if (node.length) cy.animate({ center: { eles: node }, duration: 260 });
    if (state.step === state.simulation.length - 1) stopSimulation();
  }

  function runSimulation() {
    if (state.timer) {
      stopSimulation();
      return;
    }
    $("#run-simulation").innerHTML = "<span aria-hidden='true'>Ⅱ</span>暂停";
    stepSimulation();
    state.timer = window.setInterval(stepSimulation, 850);
  }

  function stopSimulation() {
    if (state.timer) window.clearInterval(state.timer);
    state.timer = null;
    $("#run-simulation").innerHTML = "<span aria-hidden='true'>▶</span>运行";
  }

  function resetSimulation() {
    stopSimulation();
    state.step = -1;
    buildSimulation();
    applySimulationClasses();
    $("#step-counter").textContent = `0 / ${state.simulation.length}`;
    $("#simulation-status").textContent = "等待运行";
  }

  function updateDepth(depth) {
    state.depth = depth;
    $$("#depth-controls button").forEach((button) => button.classList.toggle("active", Number(button.dataset.depth) === depth));
    $("#round-summary").textContent = `${depth} + ${depth} 轮`;
    $("#research-turns").textContent = `${depth * 2} 次`;
    $("#risk-turns").textContent = `${depth * 3} 次`;
    resetSimulation();
    updateLoopLabels();
  }

  function updateLoopLabels() {
    if (!cy) return;
    ["bull-manager", "bear-manager"].forEach((id) => cy.$id(id).data("label", `达到 ${state.depth * 2} 次`));
    ["aggressive-pm", "conservative-pm", "neutral-pm"].forEach((id) => cy.$id(id).data("label", `达到 ${state.depth * 3} 次`));
  }

  function updateAnalysts(changed) {
    const checked = $$("#analyst-controls input:checked");
    if (!checked.length) {
      changed.checked = true;
      return;
    }
    state.analysts = new Set(checked.map((input) => input.value));
    $("#analyst-count").textContent = `${state.analysts.size} / 4`;
    resetSimulation();
    createGraph(true);
    updateLoopLabels();
  }

  function updateGraphStatus() {
    $("#graph-status").textContent = `${cy.nodes().length} 个节点 · ${cy.edges().length} 条连线`;
  }

  function renderStateSchema() {
    const root = $("#state-schema-content");
    data.stateFields.forEach((group) => {
      const section = document.createElement("div");
      section.className = "state-group";
      const title = document.createElement("strong");
      title.textContent = group.group;
      const list = document.createElement("div");
      list.className = "token-list";
      group.fields.forEach((field) => {
        const chip = document.createElement("span");
        chip.textContent = field;
        list.appendChild(chip);
      });
      section.append(title, list);
      root.appendChild(section);
    });
  }

  function bindControls() {
    $("#source-version").textContent = data.version;
    $("#zoom-in").addEventListener("click", () => cy.zoom({ level: Math.min(cy.zoom() * 1.2, 2.2), renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }));
    $("#zoom-out").addEventListener("click", () => cy.zoom({ level: Math.max(cy.zoom() / 1.2, 0.28), renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }));
    $("#fit-graph").addEventListener("click", () => cy.animate({ fit: { eles: cy.elements(), padding: 38 }, duration: 320 }));
    $$("#analyst-controls input").forEach((input) => input.addEventListener("change", () => updateAnalysts(input)));
    $$("#depth-controls button").forEach((button) => button.addEventListener("click", () => updateDepth(Number(button.dataset.depth))));
    $("#run-simulation").addEventListener("click", runSimulation);
    $("#step-simulation").addEventListener("click", stepSimulation);
    $("#reset-simulation").addEventListener("click", resetSimulation);
    $("#prompt-tab-zh").addEventListener("click", () => setPromptLanguage("zh"));
    $("#prompt-tab-en").addEventListener("click", () => setPromptLanguage("en"));
    window.addEventListener("resize", () => cy.resize());
  }

  renderStateSchema();
  createGraph();
  buildSimulation();
  bindControls();
  updateLoopLabels();
  selectNode("start");

  globalThis.WorkflowExplorer = Object.freeze({
    get graph() { return cy; },
    get state() { return { ...state, analysts: [...state.analysts], simulation: [...state.simulation] }; },
    selectNode,
    stepSimulation,
    resetSimulation,
  });
})();
