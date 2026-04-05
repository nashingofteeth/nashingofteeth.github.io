// ---------------------------------------------------------------------------
// generatePlantList — shared renderer used at build time (Node.js) and at
// runtime by the search feature. Pure function: data in, HTML string out.
//
// Node shape: { name, file: { wikipedia?, aliases? } | null, children?: [] }
// ---------------------------------------------------------------------------
function generatePlantList(taxonomy, level = 0) {
  let html = "";
  const indent = "  ".repeat(level);

  for (const node of taxonomy) {
    const children = node.children || [];
    let hasMultipleChildren = children.length > 1;

    // A single child that itself has children warrants a toggle
    if (children.length === 1 && (children[0].children || []).length > 0) {
      hasMultipleChildren = true;
    }

    // Build node label
    let content = "";
    if (node.file) {
      const aliases = node.file.aliases;
      const aliasText = aliases && aliases.length
        ? ` <span class="aliases">(${aliases.join(", ")})</span>`
        : "";
      if (node.file.wikipedia) {
        content = `<a href="${node.file.wikipedia}" target="_blank">${node.name}</a>${aliasText}`;
      } else {
        content = node.name + aliasText;
      }
    } else {
      content = `<span class="muted">${node.name}</span>`;
    }

    // List item — toggle affordance only when subtree has meaningful depth
    if (hasMultipleChildren) {
      html += `${indent}<li class="has-children" onclick="toggleNode(this, event)">${content}</li>\n`;
    } else {
      html += `${indent}<li>${content}</li>\n`;
    }

    // Recurse into children (leaf species + taxonomy sub-nodes in one UL)
    if (children.length > 0) {
      html += `${indent}<ul>\n`;
      html += generatePlantList(children, level + 1);
      html += `${indent}</ul>\n`;
    }
  }

  return html;
}

// ---------------------------------------------------------------------------
// toggleNode — collapse / expand handler (onclick, degrades without JS)
// ---------------------------------------------------------------------------
function toggleNode(li, event) {
  if (event && event.target.tagName === "A") return;

  const childUls = [];
  let el = li.nextElementSibling;
  while (el) {
    if (el.tagName === "LI") break;
    if (el.tagName === "UL") childUls.push(el);
    el = el.nextElementSibling;
  }

  if (childUls.length > 0) {
    const collapsed = li.classList.contains("collapsed");
    childUls.forEach((ul) => ul.classList.toggle("collapsed", !collapsed));
    li.classList.toggle("collapsed", !collapsed);
  }
}

// ---------------------------------------------------------------------------
// Search — progressive enhancement. Activates only when:
//   1. Running in a browser (document exists)
//   2. #plant-search input is in the DOM
//   3. /plants/plant-data.json fetches successfully
// On any failure the static tree and toggleNode remain untouched.
// ---------------------------------------------------------------------------
(function () {
  if (typeof document === "undefined") return;
  const searchInput = document.getElementById("plant-search");
  if (!searchInput) return;

  let plantData = null;
  // Flat index: every node paired with its ancestor chain
  const searchIndex = [];

  function buildIndex(nodes, ancestors = []) {
    for (const node of nodes) {
      searchIndex.push({ node, ancestors });
      if (node.children?.length) {
        buildIndex(node.children, [...ancestors, node]);
      }
    }
  }

  function matches(value, q) {
    return value.toLowerCase().includes(q);
  }

  // Check node.name and node.file.aliases
  function nodeMatches(node, q) {
    if (matches(node.name, q)) return true;
    if (node.file?.aliases) {
      for (const alias of node.file.aliases) {
        if (matches(alias, q)) return true;
      }
    }
    return false;
  }

  // Wrap each occurrence of q in <mark>, preserving original casing
  function highlightMatch(text, q) {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      text.slice(0, idx) +
      `<mark>${text.slice(idx, idx + q.length)}</mark>` +
      highlightMatch(text.slice(idx + q.length), q)
    );
  }

  // Single-pass search using Sets — O(1) membership, automatic dedup
  function runSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) return null;

    const matchSet = new Set();
    const ancestorSet = new Set();

    for (const { node, ancestors } of searchIndex) {
      if (nodeMatches(node, q)) {
        matchSet.add(node);
        ancestors.forEach((a) => ancestorSet.add(a));
      }
    }

    return matchSet.size ? { matchSet, ancestorSet } : null;
  }

  // Render a single node's <li> with optional toggle + highlight
  function nodeLabelHtml(node, extraClass, q, hasChildren, startCollapsed) {
    const classes = [
      extraClass,
      hasChildren && "has-children",
      startCollapsed && "collapsed",
    ].filter(Boolean);
    const cls = classes.length ? ` class="${classes.join(" ")}"` : "";
    const onclick = hasChildren ? ` onclick="toggleNode(this, event)"` : "";

    const aliases = node.file?.aliases;
    const aliasText = aliases?.length
      ? ` <span class="aliases">(${aliases.map((a) => highlightMatch(a, q)).join(", ")})</span>`
      : "";
    const displayName = highlightMatch(node.name, q);

    let content;
    if (node.file?.wikipedia) {
      content = `<a href="${node.file.wikipedia}" target="_blank">${displayName}</a>${aliasText}`;
    } else if (node.file) {
      content = displayName + aliasText;
    } else {
      content = `<span class="muted">${displayName}</span>`;
    }

    return `<li${cls}${onclick}>${content}</li>\n`;
  }

  // Render the pruned search-result tree (merged ancestor chains)
  function renderPrunedTree(nodes, matchSet, ancestorSet, q) {
    let html = "";

    for (const node of nodes) {
      const isMatch = matchSet.has(node);
      const isAncestor = ancestorSet.has(node);

      if (!isMatch && !isAncestor) continue;

      const children = node.children || [];

      if (isMatch) {
        // Expand when direct children are also results, otherwise collapse for exploration
        const hasMatchingChildren = children.some(
          (c) => matchSet.has(c) || ancestorSet.has(c),
        );
        const hasSubContent = children.length > 0;
        const shouldCollapse = hasSubContent && !hasMatchingChildren;

        html += nodeLabelHtml(node, "search-match", q, hasSubContent, shouldCollapse);

        if (hasSubContent) {
          html += `<ul${shouldCollapse ? ' class="collapsed"' : ""}>\n`;
          // Collapsed: full subtree for exploration; open: only matching content
          html += shouldCollapse
            ? generatePlantList(children, 0)
            : renderPrunedTree(children, matchSet, ancestorSet, q);
          html += "</ul>\n";
        }
      } else {
        // Ancestor node: show only the children that lead toward matches
        const relevantChildren = children.filter(
          (c) => matchSet.has(c) || ancestorSet.has(c),
        );
        const hasChildren = relevantChildren.length > 0;

        html += nodeLabelHtml(node, "", "", hasChildren, false);

        if (hasChildren) {
          html += "<ul>\n";
          html += renderPrunedTree(relevantChildren, matchSet, ancestorSet, q);
          html += "</ul>\n";
        }
      }
    }

    return html;
  }

  // Swap tree contents and toggle the search-active attribute
  function renderTree(html, isSearch) {
    const treeEl = document.getElementById("plant-tree");
    if (!treeEl) return;
    treeEl.innerHTML = html;
    treeEl.closest(".plant-list")?.toggleAttribute("data-search-active", isSearch);
  }

  // Fetch JSON, build index, wire up the search input
  fetch("/plants/plant-data.json")
    .then((res) => {
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    })
    .then((data) => {
      plantData = data;
      buildIndex(plantData.taxonomy);

      let debounceTimer = null;

      searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const query = searchInput.value;
          if (!query.trim()) {
            renderTree(generatePlantList(plantData.taxonomy, 0), false);
          } else {
            const result = runSearch(query);
            if (!result) {
              renderTree(`<li class="muted">No results.</li>`, true);
            } else {
              renderTree(
                renderPrunedTree(
                  plantData.taxonomy,
                  result.matchSet,
                  result.ancestorSet,
                  query.toLowerCase().trim(),
                ),
                true,
              );
            }
          }
        }, 250);
      });

      searchInput.removeAttribute("disabled");
      searchInput.setAttribute("placeholder", "Search by name or alias\u2026");
    })
    .catch(() => {
      // Fetch failed — static tree unchanged, search stays disabled
    });
}());

// ---------------------------------------------------------------------------
// UMD guard — allows templates/plants.js to require() this file at build time
// ---------------------------------------------------------------------------
if (typeof module !== "undefined") {
  module.exports = { generatePlantList };
}
