// ---------------------------------------------------------------------------
// Shared node helpers — used at build time (Node.js) and at runtime.
// Pure functions: data in, HTML string out.
//
// Node shape: { name, file: { wikipedia?, aliases? } | null, children?: [] }
// ---------------------------------------------------------------------------
// A single child that itself has children warrants a toggle
function hasToggleableChildren(children) {
  if (children.length > 1) return true;
  return children.length === 1 && (children[0].children || []).length > 0;
}

// Build a node's inner HTML (wiki link, aliases, photo link). formatText
// maps over name + aliases (identity for static, highlightMatch for search).
function buildNodeContent(node, formatText) {
  const fmt = formatText || ((s) => s);
  const photoLink = node.hasPhoto
    ? ` <span class="plant-photo-link" data-href="${photoHref(node)}" title="View photos of ${node.name}">&#128444;&#65039;</span>`
    : "";
  let content = "";
  if (node.file) {
    const aliases = node.file.aliases;
    const aliasText = aliases && aliases.length
      ? ` <span class="aliases">(${aliases.map((a) => fmt(a)).join(", ")})</span>`
      : "";
    if (node.file.wikipedia) {
      content = `<a class="plant-wiki-link" href="${node.file.wikipedia}" target="_blank">${fmt(node.name)}</a>${aliasText}`;
    } else {
      content = fmt(node.name) + aliasText;
    }
  } else {
    content = `<span class="muted">${fmt(node.name)}</span>`;
  }
  return content + photoLink;
}

// ---------------------------------------------------------------------------
// generatePlantList — shared renderer used at build time (Node.js) and at
// runtime by the search feature. Pure function: data in, HTML string out.
// ---------------------------------------------------------------------------
function generatePlantList(taxonomy, level = 0) {
  let html = "";
  const indent = "  ".repeat(level);

  for (const node of taxonomy) {
    const children = node.children || [];
    const hasMultipleChildren = hasToggleableChildren(children);

    // Build node label
    const content = buildNodeContent(node);

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

// Sibling ULs may sit on either side of the LI: static tree and
// generatePlantList() emit LI-then-UL, while search rendering emits
// UL-then-LI so DOM order matches visual order (deepest matches on top).
function siblingUls(li) {
  const uls = [];
  const scan = (start, next) => {
    let el = start;
    while (el) {
      if (el.tagName === "LI") break;
      if (el.tagName === "UL") uls.push(el);
      el = next(el);
    }
  };
  scan(li.nextElementSibling, (el) => el.nextElementSibling);
  scan(li.previousElementSibling, (el) => el.previousElementSibling);
  return uls;
}

function setCollapsed(li, uls, collapsed) {
  uls.forEach((ul) => ul.classList.toggle("collapsed", collapsed));
  li.classList.toggle("collapsed", collapsed);
}

function toggleNode(toggle) {
  if (!toggle) return;
  const li = toggle.closest("li");
  if (!li) return;

  const childUls = siblingUls(li);

  if (childUls.length > 0) {
    const collapsed = li.classList.contains("collapsed");
    setCollapsed(li, childUls, !collapsed);
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
    setCollapsed(li, siblingUls(li), true);
  });
}

function expandAll() {
  const treeEl = document.getElementById("plant-tree");
  if (!treeEl) return;
  treeEl.querySelectorAll("li.has-children").forEach((li) => li.classList.remove("collapsed"));
  treeEl.querySelectorAll("ul").forEach((ul) => ul.classList.remove("collapsed"));
}

// upgradeSearchLinks / updateUrl / bindSearchInput / bindSlashToFocus /
// bindEscapeToClear come from search-utils.js (loaded first; see
// templates/plants.js for the load order).
// onKey + guards come from keybind-utils.js (loaded first).

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

  function buildIndex(nodes) {
    // Single shared path with push/pop instead of per-level array spreads.
    const path = [];
    const walk = (list) => {
      for (const node of list) {
        searchIndex.push({ node, ancestors: [...path] });
        if (node.children?.length) {
          path.push(node);
          walk(node.children);
          path.pop();
        }
      }
    };
    walk(nodes);
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
    const content = buildNodeContent(node, (s) => highlightMatch(s, q));

    return `<li${cls}>${toggle}${content}</li>\n`;
  }

  // Render the pruned search-result tree (merged ancestor chains).
  // DOM order IS visual order: children are emitted before their parent so
  // deepest matches appear at the top with shared ancestors below. Sorted
  // ascending (best relevance first, then A-Z) — no CSS reversal involved.
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
    // q arrives pre-lowercased (performSearch normalizes once).
    // 4: name token exact
    if (hasWholeWord(node.name, q)) return 4;
    // 3: alias exact string
    if (node.file?.aliases?.some((a) => a.toLowerCase() === q)) return 3;
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

  // Compare by best subtree quality (desc) then sort key (asc).
  // qualityOf/keyOf are cached per render so sorting never recompiles
  // regexes or re-lowercases inside the comparator.
  function compareNodes(a, b, qualityOf, keyOf) {
    const qa = qualityOf(a);
    const qb = qualityOf(b);
    if (qa !== qb) return qb - qa;
    return keyOf(a).localeCompare(keyOf(b));
  }

  function renderPrunedTree(nodes, matchSet, ancestorSet, q, memo, sortKeys) {
    let html = "";
    // Hoisted across recursion (previously reset per level, defeating the
    // memo): bestQuality results and sort keys computed once per node.
    memo = memo || new Map();
    sortKeys = sortKeys || new Map();
    const keyOf = (node) => {
      let k = sortKeys.get(node);
      if (k === undefined) {
        k = sortKey(node.name);
        sortKeys.set(node, k);
      }
      return k;
    };
    const qualityOf = (node) => bestQuality(node, q, matchSet, ancestorSet, memo);

    // DOM order = visual order. Primary: best relevance first.
    // Secondary: alphabetical ascending.
    const sortedNodes = [...nodes].sort((a, b) => compareNodes(a, b, qualityOf, keyOf));

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

        const label = nodeLabelHtml(node, "search-match", q, hasSubContent, shouldCollapse);

        if (hasSubContent) {
          const inner = shouldCollapse
            // Collapsed: full subtree for exploration (sorted A-Z);
            // open: only matching content
            ? renderFullSubtreeAsc(children, 0)
            : renderPrunedTree(children, matchSet, ancestorSet, q, memo, sortKeys);
          // Children before parent so deepest matches sit on top.
          html += `<ul${shouldCollapse ? ' class="collapsed"' : ""}>\n${inner}</ul>\n${label}`;
        } else {
          html += label;
        }
      } else {
        // Ancestor node: show only the children that lead toward matches
        const relevantChildren = children
          .filter((c) => matchSet.has(c) || ancestorSet.has(c))
          .sort((a, b) => compareNodes(a, b, qualityOf, keyOf));
        const hasChildren = relevantChildren.length > 0;

        const label = nodeLabelHtml(node, "", "", hasChildren, false);

        if (hasChildren) {
          const inner = renderPrunedTree(relevantChildren, matchSet, ancestorSet, q, memo, sortKeys);
          // Children before parent so deepest matches sit on top.
          html += `<ul>\n${inner}</ul>\n${label}`;
        } else {
          html += label;
        }
      }
    }

    return html;
  }

  // Full-subtree renderer for the collapsed-for-exploration branch of search.
  // Same node markup as generatePlantList() but sorted A-Z by sortKey and
  // emitted children-before-parent so DOM order matches the rest of search.
  function renderFullSubtreeAsc(taxonomy, level = 0) {
    let html = "";
    const indent = "  ".repeat(level);
    // Decorated sort: keys computed once, not per comparison.
    const sorted = taxonomy
      .map((node) => ({ node, key: sortKey(node.name) }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((e) => e.node);

    for (const node of sorted) {
      const children = node.children || [];
      const hasMultipleChildren = hasToggleableChildren(children);
      const content = buildNodeContent(node);

      const label = hasMultipleChildren
        ? `${indent}<li class="has-children">${toggleHandle(false)}${content}</li>\n`
        : `${indent}<li>${content}</li>\n`;

      if (children.length > 0) {
        const inner = renderFullSubtreeAsc(children, level + 1);
        html += `${indent}<ul>\n${inner}${indent}</ul>\n${label}`;
      } else {
        html += label;
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
    updatePhotoHint();
    refreshDigitNav();
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
      searchInput.setAttribute("title", "Search —\n/ focus · Esc clear · Enter open first");
    })
    .catch(() => {
      // Fetch failed — static tree unchanged, search stays disabled
    });

  // -----------------------------------------------------------------------
  // Keybinds via onKey() (keybind-utils.js, loaded first)
  // -----------------------------------------------------------------------
  // "/" focuses search + Esc clears it (shared search-utils.js binders).
  bindSlashToFocus(searchInput);

  // "1"–"9" opens the nth top-visible wikipedia link (taxa only — photo
  // links and toggles never bind). Viewport refresh happens on scroll/resize
  // plus the MutationObserver below (collapse/expand) and renderTree (search).
  const refreshDigitNav = bindDigitNav(() =>
    Array.from(document.querySelectorAll("#plant-tree a.plant-wiki-link[href]")),
  );

  // Enter → open first visible match (applies pending query first)
  // p → open first visible match's photo link (same tab)
  function visibleMatchesInVisualOrder() {
    const treeEl = document.getElementById("plant-tree");
    if (!treeEl) return [];
    // DOM order is visual order (search emits children before parents).
    // Filter out matches hidden inside collapsed subtrees.
    return Array.from(treeEl.querySelectorAll("li.search-match")).filter(
      (li) => !li.closest("ul.collapsed"),
    );
  }

  // p hint — mark the photo link that `p` would open (first visible match
  // with a photo) with a " (p)" title suffix, mirroring photos.js number
  // hints. Only applies during search; static tree keeps plain titles.
  function updatePhotoHint() {
    const treeEl = document.getElementById("plant-tree");
    if (!treeEl) return;
    if (!treeEl.closest(".plant-list")?.hasAttribute("data-search-active")) return;
    let firstPhoto = null;
    for (const match of visibleMatchesInVisualOrder()) {
      const photoLink = match.querySelector("a.plant-photo-link[href]");
      if (photoLink) {
        firstPhoto = photoLink;
        break;
      }
    }
    treeEl.querySelectorAll("a.plant-photo-link[href]").forEach((a) => {
      const current = a.getAttribute("title") || "";
      const base = current.replace(/\s\(p\)$/, "");
      if (a === firstPhoto) {
        a.setAttribute("title", base ? `${base} (p)` : "Open photo (p)");
      } else if (current !== base) {
        a.setAttribute("title", base);
      }
    });
  }

  // Keep the hints in sync when collapse/expand toggles change visibility
  // without a re-render (toggle clicks, keyboard, collapseAll/expandAll).
  // Filtered to class changes so title updates don't re-trigger.
  if (typeof MutationObserver !== "undefined") {
    const hintTreeEl = document.getElementById("plant-tree");
    if (hintTreeEl) {
      const observer = new MutationObserver(() => {
        updatePhotoHint();
        refreshDigitNav();
      });
      observer.observe(hintTreeEl, { attributes: true, subtree: true, attributeFilter: ["class"] });
    }
  }

  // Enter → open first visible match (applies pending query first).
  // allowInEditable because the handler explicitly manages the focused-input
  // case below (other text-editing fields are still ignored).
  onKey(
    "enter",
    (e) => {
      if (e.target && e.target.closest && e.target.closest(".toggle")) return;
      const q = searchInput.value.trim();
      if (!q) return;
      if (e.target && e.target !== searchInput && isEditableTarget(e.target)) return;
      performSearch(searchInput.value);
      const first = visibleMatchesInVisualOrder()[0];
      const link = first && first.querySelector("a[href]");
      if (link) {
        e.preventDefault();
        window.location.href = link.getAttribute("href");
      }
    },
    { allowInEditable: true },
  );

  // p → open first visible match's photo (applies pending query first).
  // Only fires outside the search input / editable targets so typing "p"
  // never navigates away (central onKey guard). Skips matches without a photo.
  onKey("p", (e) => {
    if (e.target && e.target.closest && e.target.closest(".toggle")) return;
    if (document.activeElement === searchInput) return;
    const q = searchInput.value.trim();
    if (!q) return;
    performSearch(searchInput.value);
    const matches = visibleMatchesInVisualOrder();
    for (const match of matches) {
      const photoLink = match.querySelector("a.plant-photo-link[href]");
      if (photoLink) {
        e.preventDefault();
        window.location.href = photoLink.getAttribute("href");
        return;
      }
    }
  });

  // Esc clears search — keep focus if it was on the input.
  // Shared binder also preventDefaults so the global up-nav skips this press.
  bindEscapeToClear(searchInput, performSearch);

  // Perform search and render results
  // Uses the pruned (merged) tree so shared matching ancestors are deduped
  // per level — only one Magnolia / Magnoliaceae / Magnoliales node no matter
  // how many leaf matches descend from it. Children are emitted before their
  // parent so lowest-level matches (e.g. Magnolia acuminata) appear at the
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
