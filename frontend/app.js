const form = document.getElementById("analyzeForm");
const repoInput = document.getElementById("repoUrl");
const submitButton = document.getElementById("submitButton");
const statusBanner = document.getElementById("statusBanner");
const statusText = document.getElementById("statusText");
const errorMessage = document.getElementById("errorMessage");
const emptyState = document.getElementById("emptyState");
const resultsSection = document.getElementById("resultsSection");
const summaryGrid = document.getElementById("summaryGrid");
const filesGrid = document.getElementById("filesGrid");
const filesMeta = document.getElementById("filesMeta");
const graphMeta = document.getElementById("graphMeta");
const graphCanvas = document.getElementById("graphCanvas");

const svgNamespace = "http://www.w3.org/2000/svg";
const graphSourceColors = [
    "#7dd3fc",
    "#86efac",
    "#f9a8d4",
    "#fcd34d",
    "#c4b5fd",
    "#fdba74"
];

document.querySelectorAll(".sample-link").forEach((button) => {
    button.addEventListener("click", () => {
        repoInput.value = button.dataset.url || "";
        repoInput.focus();
    });
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const repoUrl = repoInput.value.trim();

    if (!repoUrl) {
        showError("Enter a GitHub repository URL before running the analysis.");
        return;
    }

    setLoadingState(true);
    clearError();
    setStatus("Running analysis. This can take a moment while the backend clones and scans the repo.", "loading");

    try {
        const response = await fetch("/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ repo_url: repoUrl })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.detail || "The backend returned an error while analyzing this repository.");
        }

        renderResults(payload, repoUrl);
        setStatus("Analysis complete. Explore the summary, dependency map, and file insights below.", "success");
    } catch (error) {
        showError(error.message || "Something went wrong while contacting the backend.");
    } finally {
        setLoadingState(false);
    }
});

function setLoadingState(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "Analyzing..." : "Analyze Repo";
}

function setStatus(message, state = "idle") {
    statusText.textContent = message;
    statusBanner.classList.remove("is-loading", "is-error");

    if (state === "loading") {
        statusBanner.classList.add("is-loading");
    }

    if (state === "error") {
        statusBanner.classList.add("is-error");
    }
}

function showError(message) {
    errorMessage.hidden = false;
    errorMessage.textContent = message;
    setStatus("Analysis failed. Review the error and try another repository.", "error");
}

function clearError() {
    errorMessage.hidden = true;
    errorMessage.textContent = "";
}

function renderResults(data, repoUrl) {
    emptyState.hidden = true;
    resultsSection.hidden = false;

    const files = Array.isArray(data.files) ? data.files : [];
    const graph = data.dependency_graph || { nodes: [], edges: [] };
    const graphNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const graphEdges = Array.isArray(graph.edges) ? graph.edges : [];

    renderSummary([
        {
            label: "Repository",
            value: extractRepoName(repoUrl),
            detail: data.repo_path || "Cloned path not returned."
        },
        {
            label: "Python files found",
            value: String(data.total_python_files ?? 0),
            detail: "Scanned by the backend before selecting files for explanation."
        },
        {
            label: "Files analyzed",
            value: String(files.length),
            detail: "Each file card includes structure metadata plus an AI explanation."
        },
        {
            label: "Graph connections",
            value: String(graphEdges.length),
            detail: `${graphNodes.length} nodes in the current dependency view.`
        }
    ]);

    filesMeta.textContent = files.length
        ? `${files.length} file${files.length === 1 ? "" : "s"} returned by the API`
        : "No Python files were returned for rendering.";

    graphMeta.textContent = graphNodes.length
        ? `${graphNodes.length} nodes • ${graphEdges.length} edges`
        : "No dependency graph data returned";

    renderFiles(files);
    renderGraph(graph, files);
}

function renderSummary(items) {
    summaryGrid.replaceChildren();

    items.forEach((item) => {
        const card = document.createElement("article");
        card.className = "summary-card";

        const label = document.createElement("h3");
        label.textContent = item.label;

        const value = document.createElement("p");
        value.className = "summary-value";
        value.textContent = item.value;

        const detail = document.createElement("p");
        detail.className = "summary-detail";
        detail.textContent = item.detail;

        card.append(label, value, detail);
        summaryGrid.appendChild(card);
    });
}

function renderFiles(files) {
    filesGrid.replaceChildren();

    if (!files.length) {
        const emptyCard = document.createElement("article");
        emptyCard.className = "file-card";

        const title = document.createElement("h3");
        title.textContent = "No Python files found";

        const copy = document.createElement("p");
        copy.className = "empty-copy";
        copy.textContent = "The backend completed successfully, but there were no Python files to display.";

        emptyCard.append(title, copy);
        filesGrid.appendChild(emptyCard);
        return;
    }

    files.forEach((file) => {
        const card = document.createElement("article");
        card.className = "file-card";

        const header = document.createElement("div");
        header.className = "file-card-header";

        const titleWrap = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = basename(file.file || "Unnamed file");

        const path = document.createElement("p");
        path.className = "file-path";
        path.textContent = file.file || "Path unavailable";

        titleWrap.append(title, path);

        const metrics = document.createElement("div");
        metrics.className = "file-metrics";
        [
            `${(file.functions || []).length} functions`,
            `${(file.async_functions || []).length} async`,
            `${(file.classes || []).length} classes`
        ].forEach((metric) => {
            const chip = document.createElement("span");
            chip.className = "metric-chip";
            chip.textContent = metric;
            metrics.appendChild(chip);
        });

        header.append(titleWrap, metrics);

        const explanation = document.createElement("p");
        explanation.className = "file-explanation";
        explanation.textContent = file.explanation || "No AI explanation was returned for this file.";

        const sections = [
            {
                title: "Functions",
                items: file.functions || []
            },
            {
                title: "Async functions",
                items: file.async_functions || []
            },
            {
                title: "Classes",
                items: (file.classes || []).map((item) =>
                    item.inherits && item.inherits.length
                        ? `${item.name} extends ${item.inherits.join(", ")}`
                        : item.name
                )
            },
            {
                title: "Routes",
                items: (file.routes || []).map(
                    (route) => `${String(route.method || "get").toUpperCase()} ${route.path || "/"} -> ${route.function || "handler"}`
                ),
                routeStyle: true
            },
            {
                title: "Imports",
                items: file.imports || []
            },
            {
                title: "Dependencies",
                items: file.dependencies || []
            }
        ];

        card.append(header, explanation);
        sections.forEach((section) => {
            card.appendChild(buildTagSection(section.title, section.items, section.routeStyle));
        });

        filesGrid.appendChild(card);
    });
}

function buildTagSection(title, items, routeStyle = false) {
    const section = document.createElement("section");
    section.className = "tag-section";

    const heading = document.createElement("h4");
    heading.className = "tag-section-title";
    heading.textContent = title;

    section.appendChild(heading);

    if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "tag-empty";
        empty.textContent = "Nothing detected.";
        section.appendChild(empty);
        return section;
    }

    const list = document.createElement("div");
    list.className = "tag-list";

    items.forEach((item) => {
        const tag = document.createElement("span");
        tag.className = routeStyle ? "tag route-tag" : "tag";
        tag.textContent = String(item);
        list.appendChild(tag);
    });

    section.appendChild(list);
    return section;
}

function renderGraph(graph, files) {
    graphCanvas.replaceChildren();

    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    if (!nodes.length) {
        renderGraphEmptyState();
        return;
    }

    const fileIds = files.map((file) => basename(file.file || ""));
    const fileColorMap = new Map(
        fileIds.map((id, index) => [id, graphSourceColors[index % graphSourceColors.length]])
    );
    const dependencyIds = nodes
        .map((node) => node.id)
        .filter((id) => !fileIds.includes(id));

    const filePositions = spreadVertically(fileIds, 190, 110, 350);
    const dependencyPositions = spreadVertically(
        dependencyIds.length ? dependencyIds : nodes.map((node) => node.id),
        dependencyIds.length ? 700 : 450,
        110,
        350
    );

    drawSvgText(125, 46, "FILES", "graph-label");
    drawSvgText(dependencyIds.length ? 612 : 368, 46, "DEPENDENCIES", "graph-label");

    edges.forEach((edge) => {
        const start = filePositions.get(edge.source) || dependencyPositions.get(edge.source);
        const end = dependencyPositions.get(edge.target) || filePositions.get(edge.target);
        const sourceColor = fileColorMap.get(edge.source) || "#d9e0ea";

        if (!start || !end) {
            return;
        }

        const curve = createSvg("path", {
            d: `M ${start.x} ${start.y} C ${start.x + 130} ${start.y}, ${end.x - 130} ${end.y}, ${end.x} ${end.y}`,
            class: "graph-edge",
            stroke: hexToRgba(sourceColor, 0.58)
        });

        graphCanvas.appendChild(curve);
    });

    fileIds.forEach((id, index) => {
        const position = filePositions.get(id);
        if (position) {
            drawNode(position.x, position.y, id, true, index, fileColorMap.get(id));
        }
    });

    const nodesToRender = dependencyIds.length ? dependencyIds : nodes.map((node) => node.id);
    nodesToRender.forEach((id, index) => {
        const position = dependencyPositions.get(id);
        if (position) {
            drawNode(position.x, position.y, id, false, index + fileIds.length);
        }
    });
}

function renderGraphEmptyState() {
    const frame = createSvg("rect", {
        x: 24,
        y: 24,
        width: 852,
        height: 392,
        rx: 24,
        fill: "rgba(255, 255, 255, 0.03)",
        stroke: "rgba(255, 255, 255, 0.08)"
    });

    const title = createSvg("text", {
        x: 450,
        y: 205,
        "text-anchor": "middle",
        fill: "#eef2f7",
        "font-size": "22",
        "font-family": "Space Grotesk, sans-serif",
        "font-weight": "600"
    });
    title.textContent = "No dependency graph available yet";

    const caption = createSvg("text", {
        x: 450,
        y: 238,
        "text-anchor": "middle",
        fill: "#aab3c2",
        "font-size": "15",
        "font-family": "Space Grotesk, sans-serif"
    });
    caption.textContent = "Run a repository analysis to populate this view.";

    graphCanvas.append(frame, title, caption);
}

function drawNode(x, y, label, isPrimary, index, nodeColor = null) {
    const group = createSvg("g", {
        class: "graph-node",
        transform: `translate(${x}, ${y})`
    });
    group.style.animationDelay = `${Math.min(index * 55, 320)}ms`;

    const rect = createSvg("rect", {
        x: -88,
        y: -24,
        width: 176,
        height: 48,
        rx: 16,
        fill: isPrimary && nodeColor ? hexToRgba(nodeColor, 0.16) : "rgba(255, 255, 255, 0.05)",
        stroke: isPrimary && nodeColor ? hexToRgba(nodeColor, 0.42) : "rgba(255, 255, 255, 0.12)"
    });

    const text = createSvg("text", {
        x: 0,
        y: 5,
        "text-anchor": "middle",
        fill: isPrimary && nodeColor ? nodeColor : "#d9e0ea"
    });
    text.textContent = truncate(label, 22);

    group.append(rect, text);
    graphCanvas.appendChild(group);
}

function drawSvgText(x, y, value, className) {
    const text = createSvg("text", {
        x,
        y,
        class: className
    });
    text.textContent = value;
    graphCanvas.appendChild(text);
}

function spreadVertically(ids, x, top, bottom) {
    const positions = new Map();

    if (!ids.length) {
        return positions;
    }

    if (ids.length === 1) {
        positions.set(ids[0], { x, y: (top + bottom) / 2 });
        return positions;
    }

    const step = (bottom - top) / (ids.length - 1);
    ids.forEach((id, index) => {
        positions.set(id, { x, y: top + (step * index) });
    });

    return positions;
}

function createSvg(tagName, attributes) {
    const element = document.createElementNS(svgNamespace, tagName);
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
    return element;
}

function basename(value) {
    const parts = String(value).split("/");
    return parts[parts.length - 1] || value;
}

function extractRepoName(repoUrl) {
    const trimmed = repoUrl.replace(/\/+$/, "");
    const parts = trimmed.split("/");
    return parts[parts.length - 1] || repoUrl;
}

function truncate(value, maxLength) {
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, maxLength - 1)}…`;
}

function hexToRgba(hex, alpha) {
    const normalized = hex.replace("#", "");
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
