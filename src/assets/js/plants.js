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
    const photoLink = node.hasPhoto
      ? ` <span class="plant-photo-link" data-href="${photoHref(node)}" title="View photos of ${node.name}">&#128444;&#65039;</span>`
      : "";
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
    content += photoLink;

    // List item — toggle affordance only when subtree has meaningful depth
    if (hasMultipleChildren) {
      html += `${indent}<li class="has-children">${toggleHandle(false)}${content}</li>\n`;
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

// photoHref — link directly to the single matching photo page when exactly one
// photo exists for a taxon; otherwise fall back to the query-scoped search.
function photoHref(node) {
  if (node.photoSlug) return `/photos/${node.photoSlug}/`;
  return `/photos/?q=${encodeURIComponent(node.name)}`;
}

// ---------------------------------------------------------------------------
// toggleNode — collapse / expand handler (event-delegated, see bindToggle)
// ---------------------------------------------------------------------------
// toggleHandle — isolated, keyboard-accessible affordance (▼/▶) so only the
// marker collapses/expands the node instead of the whole list entry.
function toggleHandle(collapsed = false) {
  return `<span class="toggle" role="button" tabindex="0" aria-expanded="${!collapsed}" aria-label="Toggle subtree"></span>`;
}

function toggleNode(toggle) {
  if (!toggle) return;
  const li = toggle.closest("li");
  if (!li) return;

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
    toggle.setAttribute("aria-expanded", String(collapsed));
  }
}

// bindToggle — delegated click + keyboard handling on the plant tree. Lives on
// a stable ancestor so it survives the search re-render of #plant-tree's
// innerHTML. De-inlines the handler (no onclick attributes in markup).
function bindToggle() {
  if (typeof document === "undefined") return;
  const list = document.querySelector(".plant-list");
  if (!list) return;

  list.addEventListener("click", (e) => {
    const toggle = e.target.closest(".toggle");
    if (!toggle || !list.contains(toggle)) return;
    toggleNode(toggle);
  });

  list.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
    const toggle = e.target.closest(".toggle");
    if (!toggle || !list.contains(toggle)) return;
    e.preventDefault();
    toggleNode(toggle);
  });
}

bindToggle();

// ---------------------------------------------------------------------------
// collapseAll / expandAll — collapse or expand every toggleable node at once
// ---------------------------------------------------------------------------
function collapseAll() {
  const treeEl = document.getElementById("plant-tree");
  if (!treeEl) return;
  treeEl.querySelectorAll("li.has-children").forEach((li) => {
    li.classList.add("collapsed");
    let el = li.nextElementSibling;
    while (el) {
      if (el.tagName === "LI") break;
      if (el.tagName === "UL") el.classList.add("collapsed");
      el = el.nextElementSibling;
    }
  });
}

function expandAll() {
  const treeEl = document.getElementById("plant-tree");
  if (!treeEl) return;
  treeEl.querySelectorAll("li.has-children").forEach((li) => li.classList.remove("collapsed"));
  treeEl.querySelectorAll("ul").forEach((ul) => ul.classList.remove("collapsed"));
}

// upgradeSearchLinks / updateUrl / bindSearchInput come from search-utils.js
// (loaded first; see templates/plants.js for the load order).

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

  // Upgrade the static tree's search links (works even if the fetch fails).
  upgradeSearchLinks(document);
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
    const toggle = hasChildren ? toggleHandle(startCollapsed) : "";

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
    const photoLink = node.hasPhoto
      ? ` <span class="plant-photo-link" data-href="${photoHref(node)}" title="View photos of ${node.name}">&#128444;&#65039;</span>`
      : "";
    content += photoLink;

    return `<li${cls}>${toggle}${content}</li>\n`;
  }

  // Render the pruned search-result tree (merged ancestor chains)
  // During search the tree is visually inverted via CSS column-reverse
  // (deepest matches at top). To keep alphabetical order top-to-bottom
  // visually, we sort DOM descending so the flex reversal yields ascending.
  function sortKey(name) {
    // Sort by epithet for species/hybrids (e.g. "Magnolia × soulangeana"
    // → "soulangeana") so hybrids collate sensibly; fall back to full name.
    const k = name
      .toLowerCase()
      .replace(/^[a-z]+\s+×?\s*/i, "")
      .trim();
    return k || name.toLowerCase();
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function hasWholeWord(text, q) {
    if (!text || !q) return false;
    return new RegExp(`\\b${escapeRegExp(q)}\\b`, "i").test(text);
  }

  function hasPrefixWord(text, q) {
    if (!text || !q) return false;
    // token starts with q (e.g. roseus → rose, rosemary → rose)
    const tokens = text.toLowerCase().split(/[^a-z0-9]+/);
    const lq = q.toLowerCase();
    return tokens.some((t) => t.startsWith(lq) && t !== lq);
  }

  // Broad relevance tiers:
  //  4 - name token exactly equals query (Rosa → rose? no, but Rosa → rosa)
  //  3 - alias string exactly equals query (Rosa alias "rose" == "rose")
  //  2 - alias token exactly equals query (Gypsy's rose)
  //  1 - name/alias token starts with query (roseus, rosemary)
  //  0 - substring inside token (Petroselinum, squarrose)
  // -1 - not a match (ancestor)
  function nodeQuality(node, q) {
    const lq = q.toLowerCase();
    // 4: name token exact
    if (hasWholeWord(node.name, q)) return 4;
    // 3: alias exact string
    if (node.file?.aliases?.some((a) => a.toLowerCase() === lq)) return 3;
    // 2: alias token exact
    if (node.file?.aliases?.some((a) => hasWholeWord(a, q))) return 2;
    // 1: prefix
    if (hasPrefixWord(node.name, q)) return 1;
    if (node.file?.aliases?.some((a) => hasPrefixWord(a, q))) return 1;
    if (nodeMatches(node, q)) return 0;
    return -1;
  }

  const MAX_QUALITY = 4;

  // Best quality in subtree (for sorting ancestor branches by their best
  // descendant). Memoized per render to avoid repeated recursion.
  function bestQuality(node, q, matchSet, ancestorSet, memo) {
    if (memo.has(node)) return memo.get(node);
    let best = nodeQuality(node, q);
    if (best < MAX_QUALITY && (ancestorSet.has(node) || matchSet.has(node))) {
      for (const child of node.children || []) {
        if (!matchSet.has(child) && !ancestorSet.has(child)) continue;
        best = Math.max(best, bestQuality(child, q, matchSet, ancestorSet, memo));
        if (best === MAX_QUALITY) break;
      }
    }
    memo.set(node, best);
    return best;
  }

  function renderPrunedTree(nodes, matchSet, ancestorSet, q) {
    let html = "";
    const memo = new Map();

    // Descending in DOM → ascending/desired visual after column-reverse.
    // Primary: whole-word matches (2) surface first visually => low first in DOM.
    // Secondary: alphabetical descending in DOM → ascending visually.
    const sortedNodes = [...nodes].sort((a, b) => {
      const qa = bestQuality(a, q, matchSet, ancestorSet, memo);
      const qb = bestQuality(b, q, matchSet, ancestorSet, memo);
      if (qa !== qb) return qa - qb;
      return sortKey(b.name).localeCompare(sortKey(a.name));
    });

    for (const node of sortedNodes) {
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
        const relevantChildren = children
          .filter((c) => matchSet.has(c) || ancestorSet.has(c))
          .sort((a, b) => {
            const qa = bestQuality(a, q, matchSet, ancestorSet, memo);
            const qb = bestQuality(b, q, matchSet, ancestorSet, memo);
            if (qa !== qb) return qa - qb;
            return sortKey(b.name).localeCompare(sortKey(a.name));
          });
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
    upgradeSearchLinks(treeEl);
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

      // Restore query from URL, debounce input, handle popstate (search-utils.js)
      bindSearchInput(searchInput, performSearch);

      searchInput.removeAttribute("disabled");
      searchInput.setAttribute("placeholder", "🔍 Search\u2026");
    })
    .catch(() => {
      // Fetch failed — static tree unchanged, search stays disabled
    });

  // Perform search and render results
  // Uses the pruned (merged) tree so shared matching ancestors are deduped
  // per level — only one Magnolia / Magnoliaceae / Magnoliales node no matter
  // how many leaf matches descend from it. Combined with the
  // [data-search-active] column-reverse CSS, the pruned chain is visually
  // inverted so lowest-level matches (e.g. Magnolia acuminata) appear at the
  // top and the shared matching chain appears once below.
  function performSearch(query) {
    if (!query.trim()) {
      renderTree(generatePlantList(plantData.taxonomy, 0), false);
    } else {
      const result = runSearch(query);
      if (!result) {
        renderTree(`<div class="muted">No results.</div>`, true);
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
  }
}());

// ---------------------------------------------------------------------------
// UMD guard — allows templates/plants.js to require() this file at build time
// ---------------------------------------------------------------------------
if (typeof module !== "undefined") {
  module.exports = { generatePlantList };
}
