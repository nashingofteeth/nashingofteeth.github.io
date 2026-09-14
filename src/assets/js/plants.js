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
      content = `<a class="plant-wiki-link" href="${node.file.wikipedia}">${fmt(node.name)}</a>${aliasText}`;
    } else {
      content = fmt(node.name) + aliasText;
    }
  } else {
    content = `<span class="muted">${fmt(node.name)}</span>`;
  }
  return content + photoLink;
}

// Stable per-node identity for toggle persistence: ancestral path with each
// segment encodeURIComponent-encoded and joined on "/" (names may contain
// "/" but never a literal "%2F" collision that matters for equality).
function nodePath(parentPath, name) {
  const seg = encodeURIComponent(String(name));
  return parentPath ? `${parentPath}/${seg}` : seg;
}

function escAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// generatePlantList — shared renderer used at build time (Node.js) and at
// runtime by the search feature. Pure function: data in, HTML string out.
// Always bakes the default (expanded); user overrides are applied afterward
// by applyCollapsedFromStorage, the single place where stored state meets
// baked DOM. parentPath threads toggle identity for data-path.
// ---------------------------------------------------------------------------
function generatePlantList(taxonomy, level = 0, parentPath = "") {
  let html = "";
  const indent = "  ".repeat(level);

  for (const node of taxonomy) {
    const children = node.children || [];
    const hasMultipleChildren = hasToggleableChildren(children);

    // Build node label
    const content = buildNodeContent(node);

    // List item — toggle affordance only when subtree has meaningful depth.
    // data-taxon carries the bare node name for the s/c keybinds (aliases
    // and photo icons live in child spans, so li.textContent would be wrong).
    if (hasMultipleChildren) {
      const path = nodePath(parentPath, node.name);
      html += `${indent}<li class="has-children" data-path="${escAttr(path)}" data-baked="false" data-taxon="${escAttr(node.name)}">${toggleHandle(false)}${content}</li>\n`;
    } else {
      html += `${indent}<li data-taxon="${escAttr(node.name)}">${content}</li>\n`;
    }

    // Recurse into children (leaf species + taxonomy sub-nodes in one UL)
    if (children.length > 0) {
      html += `${indent}<ul>\n`;
      html += generatePlantList(children, level + 1, nodePath(parentPath, node.name));
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

// A node's child UL sits on one side of its LI, depending on layout:
// static tree and generatePlantList() emit LI-then-UL, while search
// rendering emits UL-then-LI so DOM order matches visual order (deepest
// matches on top). Only the owning side is collected — scanning both would
// also grab the neighboring sibling's child UL, so collapsing one taxon
// would hide the previous sibling's children without touching its toggle.
function siblingUls(li) {
  const uls = [];
  const searchActive = typeof document !== "undefined" &&
    !!document.querySelector(".plant-list[data-search-active]");
  let el = searchActive ? li.previousElementSibling : li.nextElementSibling;
  const next = searchActive
    ? (node) => node.previousElementSibling
    : (node) => node.nextElementSibling;
  while (el) {
    if (el.tagName === "LI") break;
    if (el.tagName === "UL") uls.push(el);
    el = next(el);
  }
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
    persistToggle(li);
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
  treeEl.querySelectorAll("li.has-children[data-path]").forEach((li) => {
    savedOverrides.set(li.getAttribute("data-path"), true);
  });
  saveOverrides(savedOverrides);
}

function expandAll() {
  const treeEl = document.getElementById("plant-tree");
  if (!treeEl) return;
  treeEl.querySelectorAll("li.has-children").forEach((li) => li.classList.remove("collapsed"));
  treeEl.querySelectorAll("ul").forEach((ul) => ul.classList.remove("collapsed"));
  treeEl.querySelectorAll("li.has-children[data-path]").forEach((li) => {
    savedOverrides.set(li.getAttribute("data-path"), false);
  });
  saveOverrides(savedOverrides);
}

// ---------------------------------------------------------------------------
// Toggle persistence — explicit user toggles survive reload / back-forward
// for the tab session via sessionStorage, in the static view and inside
// search views alike: each entry records collapsed (true) or expanded
// (false) against whatever the renderer baked, so re-renders replay intent
// instead of defaults. The stored map belongs to the current query:
// whenever the query is created, cleared, or changed, it is wiped and
// collapsing starts fresh. Paths with no matching node are silently dropped
// on apply. All storage access is best-effort (private mode falls back to
// in-memory only); sessGet/sessSet/sessDel come from keybind-utils.js
// (loaded first; see templates/plants.js).
// ---------------------------------------------------------------------------
const PLANTS_COLLAPSED_KEY = "plants:collapsed:/plants/";

let savedOverrides = loadOverrides();

function loadOverrides() {
  try {
    if (typeof sessGet !== "function") return new Map();
    const raw = sessGet(PLANTS_COLLAPSED_KEY);
    if (!raw) return new Map();
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      // Legacy collapsed-path array → explicit collapsed overrides.
      return new Map(
        data.filter((s) => typeof s === "string").map((p) => [p, true]),
      );
    }
    const o = data && data.overrides;
    if (!o || typeof o !== "object") return new Map();
    return new Map(
      Object.entries(o).filter(
        ([p, v]) => typeof p === "string" && typeof v === "boolean",
      ),
    );
  } catch (_err) {
    return new Map();
  }
}

function saveOverrides(map) {
  try {
    if (typeof sessSet !== "function" || typeof sessDel !== "function") return;
    if (!map || map.size === 0) {
      sessDel(PLANTS_COLLAPSED_KEY);
      return;
    }
    sessSet(PLANTS_COLLAPSED_KEY, JSON.stringify({ overrides: Object.fromEntries(map) }));
  } catch (_err) {
    // ignore — persistence is best-effort
  }
}

function clearCollapsedStorage() {
  savedOverrides.clear();
  try {
    if (typeof sessDel === "function") sessDel(PLANTS_COLLAPSED_KEY);
  } catch (_err) {
    // ignore — persistence is best-effort
  }
}

function persistToggle(li) {
  if (typeof document === "undefined") return;
  const path = li && li.getAttribute && li.getAttribute("data-path");
  if (!path) return;
  const collapsed = li.classList.contains("collapsed");
  const baked = li.getAttribute("data-baked") === "true";
  // Store only deviations from the baked default; toggling back to it
  // removes the entry, so the map stays minimal.
  if (collapsed === baked) {
    savedOverrides.delete(path);
  } else {
    savedOverrides.set(path, collapsed);
  }
  saveOverrides(savedOverrides);
}

// Enforce stored overrides on the current tree, in any view. Nodes without
// an entry keep their baked state (static default expanded, search
// relevance collapse), so this never flattens defaults — it only replays
// explicit user toggles. Prunes entries with no matching node.
function applyCollapsedFromStorage() {
  if (typeof document === "undefined") return;
  const treeEl = document.getElementById("plant-tree");
  if (!treeEl) return;
  const present = new Set();
  treeEl.querySelectorAll("li.has-children[data-path]").forEach((li) => {
    const path = li.getAttribute("data-path");
    present.add(path);
    if (savedOverrides.has(path)) {
      const collapsed = savedOverrides.get(path);
      setCollapsed(li, siblingUls(li), collapsed);
      for (const child of li.children) {
        if (child.classList && child.classList.contains("toggle")) {
          child.setAttribute("aria-expanded", String(!collapsed));
        }
      }
    }
  });
  let pruned = false;
  for (const p of savedOverrides.keys()) {
    if (!present.has(p)) {
      savedOverrides.delete(p);
      pruned = true;
    }
  }
  if (pruned) saveOverrides(savedOverrides);
}

applyCollapsedFromStorage();

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
  // Query the stored collapse set belongs to. A created, cleared, or changed
  // query wipes it and collapsing starts fresh; re-performing the same query
  // (Enter, popstate) keeps it. Initialized from the URL so a reload with
  // ?q= preserves that query's collapses instead of wiping them on restore.
  let lastQuery = "";
  try {
    lastQuery = queryFromUrl().toLowerCase().trim();
  } catch (_err) {
    lastQuery = "";
  }
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

  // Render a single node's <li> with optional toggle + highlight. path is
  // the node's ancestral identity (see nodePath); emitted as data-path on
  // toggleable labels for collapse persistence, alongside data-baked (the
  // relevance default persistToggle compares against).
  function nodeLabelHtml(node, extraClass, q, hasChildren, startCollapsed, path = null) {
    const classes = [
      extraClass,
      hasChildren && "has-children",
      startCollapsed && "collapsed",
    ].filter(Boolean);
    const cls = classes.length ? ` class="${classes.join(" ")}"` : "";
    const dataAttrs = path
      ? ` data-path="${escAttr(path)}" data-baked="${!!startCollapsed}" data-taxon="${escAttr(node.name)}"`
      : ` data-taxon="${escAttr(node.name)}"`;
    const toggle = hasChildren ? toggleHandle(startCollapsed) : "";
    const content = buildNodeContent(node, (s) => highlightMatch(s, q));

    return `<li${cls}${dataAttrs}>${toggle}${content}</li>\n`;
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

  function renderPrunedTree(nodes, matchSet, ancestorSet, q, memo, sortKeys, parentPath = "") {
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
        const path = nodePath(parentPath, node.name);

        const label = nodeLabelHtml(node, "search-match", q, hasSubContent, shouldCollapse, path);

        if (hasSubContent) {
          const inner = shouldCollapse
            // Collapsed: full subtree for exploration (sorted A-Z);
            // open: only matching content
            ? renderFullSubtreeAsc(children, 0, path)
            : renderPrunedTree(children, matchSet, ancestorSet, q, memo, sortKeys, path);
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
        const path = nodePath(parentPath, node.name);

        const label = nodeLabelHtml(node, "", "", hasChildren, false, path);

        if (hasChildren) {
          const inner = renderPrunedTree(relevantChildren, matchSet, ancestorSet, q, memo, sortKeys, path);
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
  // Toggleable descendants start collapsed: expanding the match reveals one
  // level at a time instead of the whole subtree at once.
  function renderFullSubtreeAsc(taxonomy, level = 0, parentPath = "") {
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
      const path = nodePath(parentPath, node.name);

      const label = hasMultipleChildren
        ? `${indent}<li class="has-children collapsed" data-path="${escAttr(path)}" data-baked="true" data-taxon="${escAttr(node.name)}">${toggleHandle(true)}${content}</li>\n`
        : `${indent}<li data-taxon="${escAttr(node.name)}">${content}</li>\n`;

      if (children.length > 0) {
        const inner = renderFullSubtreeAsc(children, level + 1, path);
        html += `${indent}<ul${hasMultipleChildren ? ' class="collapsed"' : ""}>\n${inner}${indent}</ul>\n${label}`;
      } else {
        html += label;
      }
    }

    return html;
  }

  // Swap tree contents and toggle the search-active attribute, then replay
  // explicit user toggles over the baked defaults (static expanded, search
  // relevance collapse).
  function renderTree(html, isSearch) {
    const treeEl = document.getElementById("plant-tree");
    if (!treeEl) return;
    treeEl.innerHTML = html;
    upgradeSearchLinks(treeEl);
    treeEl.closest(".plant-list")?.toggleAttribute("data-search-active", isSearch);
    applyCollapsedFromStorage();
    refreshPhotoHints();
    refreshDigitNav();
    refreshTaxaHints();
    refreshTaxaHints();
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
      // Keybind hints in the title only on keyboard devices. Trailing "(/)"
      // group badges the focus key in the ? overlay (keybinds.js).
      searchInput.setAttribute(
        "title",
        KEYBINDS_ENABLED
          ? "Search — clear (Esc) · apply + blur (Enter) · focus (/)"
          : "Search",
      );
    })
    .catch(() => {
      // Fetch failed — static tree unchanged, search stays disabled
    });

  // -----------------------------------------------------------------------
  // Keybinds via onKey() (keybind-utils.js, loaded first)
  // -----------------------------------------------------------------------
  // "/" focuses search + Esc clears it (shared search-utils.js binders).
  bindSlashToFocus(searchInput);

  // Chord state for the nth-photo / nth-taxa / nth-toggle binds. Sticky, not
  // timed: a tap arms the chord until the same key is tapped again (another
  // leader — p/s/c/t — switches), so the revealed number hints stay up and
  // digits keep addressing the chord across uses. held tracks a physically-
  // held key for the simultaneous encoding; Shift never arms, keeping
  // Shift+digit free. p additionally carries timer, the one-shot exact-match
  // fallthrough scheduled on arm — cancelled by a digit press, disarm, or
  // blur. Declared up here so the digit-nav reservation below can read it.
  // Mutated by the raw trackers further below.
  const chords = {
    p: { held: false, armed: false, timer: 0 },
    s: { held: false, armed: false },
    c: { held: false, armed: false },
    t: { held: false, armed: false },
  };

  function chordActive(keyOrChord) {
    const ch = typeof keyOrChord === "string"
      ? chords[keyOrChord]
      : keyOrChord;
    return Boolean(ch && (ch.held || ch.armed));
  }

  function chordForKey(key) {
    return chords[key] || null;
  }

  function anyChordActive() {
    return chordActive("p") || chordActive("s") || chordActive("c") ||
      chordActive("t");
  }

  // Hint-bar copy (rendered by the ? overlay's floating bar). The bar only
  // appears on pages that declare chord leaders — plants.js sets
  // body[data-hint-bar] below; other pages never do, so they get no bar.
  const HINT_BAR_DEFAULT =
    "chords — t toggle · s search · c copy · p photo: press letter + 1-9 · same letter disarms";
  const CHORD_INFO = {
    p: "p armed — photo nth · press p again to disarm",
    t: "t armed — toggle nth taxon · press t again to disarm",
    s: "s armed — search nth taxon · press s again to disarm",
    c: "c armed — copy nth taxon · press c again to disarm",
  };

  function setHintBar(text) {
    if (typeof document === "undefined" || !document.body || !document.body.dataset) {
      return;
    }
    document.body.dataset.hintBar = text;
  }

  function armChord(key, chord) {
    for (const otherKey of Object.keys(chords)) {
      const other = chords[otherKey];
      if (other !== chord && other.armed) {
        disarmChord(other);
      }
    }
    chord.armed = true;
    document.body.dataset.chord = key;
    setHintBar(CHORD_INFO[key]);
    refreshTaxaHints();
  }

  function disarmChord(chord) {
    chord.armed = false;
    if (chord === chords.p && chords.p.timer) {
      clearTimeout(chords.p.timer);
      chords.p.timer = 0;
    }
    for (const seq of Object.values(chordSeqs)) {
      seq.cancel();
    }
    if (document.body.dataset && document.body.dataset.chord) {
      delete document.body.dataset.chord;
    }
    setHintBar(HINT_BAR_DEFAULT);
    refreshTaxaHints();
  }

  // One digit-sequence accumulator per nth consumer (see digitSequence):
  // short lists resolve single digits immediately, longer lists wait for a
  // possible second digit. Defined up here so arm/disarm can cancel them.
  // Declared as a table so arm/disarm, blur, and the digit factory below
  // share one loop instead of four named copies.
  const chordSeqs = {
    t: digitSequence({
      getCount: () => currentToggles().length,
      onDone: (buffer) => {
        const li = currentToggles()[Number(buffer) - 1];
        const toggle = li && li.querySelector(".toggle");
        if (toggle) {
          toggleNode(toggle);
          refreshTaxaHints();
        }
      },
    }),
    p: digitSequence({
      getCount: () => currentPhotoLinks().length,
      onDone: (buffer) => {
        const link = currentPhotoLinks()[Number(buffer) - 1];
        if (link) {
          window.location.href = link.getAttribute("href");
        }
      },
    }),
    s: digitSequence({
      getCount: () => currentTaxa().length,
      onDone: (buffer) => {
        const li = currentTaxa()[Number(buffer) - 1];
        const name = taxaNameFromLi(li);
        if (li && name) {
          searchForTaxa(name);
        }
      },
    }),
    c: digitSequence({
      getCount: () => currentTaxa().length,
      onDone: (buffer) => {
        const li = currentTaxa()[Number(buffer) - 1];
        const name = taxaNameFromLi(li);
        if (li && name) {
          copyTaxaName(name);
        }
      },
    }),
  };

  // "1"–"9" opens the nth top-visible wikipedia link (taxa only — photo
  // links and toggles never bind). Suppressed while a p/s/c/t chord is
  // active so the digit never double-fires digit-nav plus a chord nav.
  // Viewport refresh happens on scroll/resize plus the MutationObserver
  // below (collapse/expand) and renderTree (search).
  const refreshDigitNav = bindDigitNav(
    () =>
      Array.from(document.querySelectorAll("#plant-tree a.plant-wiki-link[href]")),
    {
      ignoreWhen: () => anyChordActive(),
    },
  );

  // p chords open the nth visible photo link (same tab): hold p and tap
  // 1–9, or tap p to arm then 1–9 (sticky until p is tapped again or another
  // leader switches). Enter only applies the filter + blurs (digits pick the
  // photo); see below.

  // Photo hints — mark every fully-visible photo link with " (Pn)"
  // title suffixes, mirroring the digit-nav "(n)" and toggle hints: numbers
  // track the links the chords act on, so type multi-digit sequences for
  // double-digit candidates. Every photo link in the tree (matches and
  // ancestors, query or no query) in DOM order, which equals visual order in
  // both the static tree and search renders; links inside collapsed subtrees
  // never contribute. Skipped on touch devices — never advertise dead keys.
  function currentPhotoLinks() {
    const treeEl = document.getElementById("plant-tree");
    if (!treeEl) {
      return [];
    }
    const top = [];
    for (const link of treeEl.querySelectorAll("a.plant-photo-link[href]")) {
      if (link.closest("ul.collapsed")) {
        continue;
      }
      if (isFullyInViewport(link)) {
        top.push(link);
      }
    }
    return top;
  }

  const photoHintTracker = createHintTracker();

  function refreshPhotoHints() {
    if (!KEYBINDS_ENABLED) {
      return;
    }
    const treeEl = document.getElementById("plant-tree");
    if (!treeEl) {
      return;
    }
    const next = currentPhotoLinks();
    photoHintTracker.setHints(next, (link, i) => {
      const current = link.getAttribute("title") || "";
      const base = current.replace(/\s\(P\d+\)$/, "") || "Open photo";
      return `${base} (P${i + 1})`;
    });
    notifyHintsChanged();
  }

  // Taxa helpers for the s/c binds below. Names come from the baked
  // data-taxon (never li.textContent, which includes aliases and the photo
  // icon); the DOM walk is a fallback for markup predating the bake.
  function taxaNameFromLi(li) {
    if (!li) {
      return "";
    }
    const baked = li.getAttribute && li.getAttribute("data-taxon");
    if (baked) {
      return baked;
    }
    const named = li.querySelector("a.plant-wiki-link, span.muted");
    if (named && named.textContent.trim()) {
      return named.textContent.trim();
    }
    const clone = li.cloneNode(true);
    clone.querySelectorAll(".aliases,.plant-photo-link,.toggle").forEach((el) => el.remove());
    return clone.textContent.trim();
  }

  function currentTaxa() {
    const treeEl = document.getElementById("plant-tree");
    if (!treeEl) {
      return [];
    }
    const top = [];
    for (const li of treeEl.querySelectorAll("li")) {
      if (li.closest("ul.collapsed")) {
        continue;
      }
      if (isFullyInViewport(li)) {
        top.push(li);
      }
    }
    return top;
  }

  // t-chord candidates: only toggleable taxa, fully in viewport.
  // Numbering is independent of currentTaxa — a row can be t1 while being
  // s3/c3 — so the shared hint group carries per-chord indices.
  function currentToggles() {
    const treeEl = document.getElementById("plant-tree");
    if (!treeEl) {
      return [];
    }
    const top = [];
    for (const li of treeEl.querySelectorAll("li")) {
      if (!li.querySelector(".toggle")) {
        continue;
      }
      if (li.closest("ul.collapsed")) {
        continue;
      }
      if (isFullyInViewport(li)) {
        top.push(li);
      }
    }
    return top;
  }

  function searchForTaxa(name) {
    if (!name) {
      return;
    }
    searchInput.value = name;
    updateUrl(name);
    performSearch(name);
    searchInput.blur();
  }

  async function copyTaxaName(name) {
    if (!name) {
      return false;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(name);
        return true;
      }
      throw new Error("clipboard unavailable");
    } catch (_err) {
      try {
        const ta = document.createElement("textarea");
        ta.value = name;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (_fallbackErr) {
        return false;
      }
    }
  }

  // Taxa hints — mark visible taxa on the li itself, so taxa without links
  // badge too and digit titles on the inner wiki link are never clobbered.
  // Per-chord indices: s/c address every visible taxon (currentTaxa), t only
  // toggleable ones (currentToggles), so a toggleable row can be t1 while
  // being s2/c2 — group titles carry each chord's own number. Progressive:
  // with no chord armed the group is tooltip discovery only (the ? overlay
  // hides li badges); an armed chord (body[data-chord]) flips titles to just
  // "(N)" in that chord's numbering, revealed left of each candidate.
  // Skipped on touch devices.
  const taxaHintTracker = createHintTracker();

  function stripTaxaHintGroup(title) {
    return title
      .replace(/\s\(t\d+\/s\d+\/c\d+\)$/, "")
      .replace(/\s\(t\d+\/s\d+\)$/, "")
      .replace(/\s\(s\d+\/c\d+\)$/, "")
      .replace(/\s\(t\d+\)$/, "")
      .replace(/\s\(\d+\)$/, "");
  }

  function refreshTaxaHints() {
    if (!KEYBINDS_ENABLED) {
      return;
    }
    const treeEl = document.getElementById("plant-tree");
    if (!treeEl) {
      return;
    }
    const chord = document.body &&
      document.body.dataset &&
      document.body.dataset.chord;
    // Mode key includes the chord: s and t number different candidate sets,
    // so an s→t switch must rewrite titles even though both are "num".
    // p arms the photo chord — taxa keep group tooltips (p has no taxa
    // targets, and the overlay hides li badges for it anyway).
    const mode = chord && chord !== "p" ? `num:${chord}` : "group";
    const taxa = currentTaxa();
    const toggles = currentToggles();
    const sIndexOf = new Map(taxa.map((li, i) => [li, i + 1]));
    const tIndexOf = new Map(toggles.map((li, i) => [li, i + 1]));
    // Union in visual order (taxa first; toggleable rows beyond the s/c
    // top-9 still get their t hint).
    const seen = new Set(taxa);
    const next = taxa.concat(toggles.filter((li) => !seen.has(li)));
    taxaHintTracker.setHints(next, (li) => {
      const current = li.getAttribute("title") || "";
      const base = stripTaxaHintGroup(current) || taxaNameFromLi(li);
      let group;
      if (mode !== "group") {
        const n = chord === "t" ? tIndexOf.get(li) : sIndexOf.get(li);
        group = n ? `(${n})` : null;
      } else {
        const parts = [];
        if (tIndexOf.has(li)) {
          parts.push(`t${tIndexOf.get(li)}`);
        }
        if (sIndexOf.has(li)) {
          parts.push(`s${sIndexOf.get(li)}`, `c${sIndexOf.get(li)}`);
        }
        group = parts.length ? `(${parts.join("/")})` : null;
      }
      if (group) {
        return `${base} ${group}`;
      }
      return current || null;
    }, mode);
    notifyHintsChanged();
  }

  // -----------------------------------------------------------------------
  // Expand/collapse all: +/= expands every subtree, -/_ collapses.
  // Control buttons get "(+)" / "(-)" hint badges.
  // -----------------------------------------------------------------------

  // Control-button hints, applied once (the buttons are never re-rendered).
  // Skipped on touch devices — never advertise dead keys.
  function applyControlHints() {
    if (!KEYBINDS_ENABLED) {
      return;
    }
    const controls = document.querySelector(".plant-controls");
    if (!controls) {
      return;
    }
    for (const [fn, key] of [["collapseAll", "-"], ["expandAll", "+"]]) {
      const btn = controls.querySelector(`button[onclick="${fn}()"]`);
      if (btn && !btn.getAttribute("title")) {
        btn.setAttribute("title", `${(btn.textContent || "").trim()} (${key})`);
      }
    }
  }

  // +/= expands every subtree, -/_ collapses. Bare =/- aliases included;
  // the overlay badges only the + (single display label, less clutter).
  onKey(["+", "="], (e) => {
    e.preventDefault();
    expandAll();
    refreshTaxaHints();
  });

  onKey(["-", "_"], (e) => {
    e.preventDefault();
    collapseAll();
    refreshTaxaHints();
  });

  // Chord + digits acts on the nth fully-visible candidate — t toggles the
  // nth taxon's subtree, p opens the nth photo, s searches the nth taxon, c
  // copies the nth taxon name. Type multi-digit sequences for double-digit
  // candidates. Plain digits stay with digit-nav; Shift+digit is ignored
  // everywhere (no page binds it), so a shifted press never lands here. Only
  // fires outside the search input / editable targets so typing never
  // navigates away (central onKey guard + the explicit checks below).
  function bindChordDigits(key) {
    onKey(
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      (e, digit) => {
        if (e.shiftKey) {
          return;
        }
        if (!chordActive(key)) {
          return;
        }
        if (e.target && e.target.closest && e.target.closest(".toggle")) {
          return;
        }
        if (document.activeElement === searchInput) {
          return;
        }
        // A p-chord digit press cancels the pending exact-match fallthrough —
        // the user addressed a number, not a bare p.
        if (key === "p" && chords.p.timer) {
          clearTimeout(chords.p.timer);
          chords.p.timer = 0;
        }
        e.preventDefault();
        chordSeqs[key].feed(digit);
      },
    );
  }
  bindChordDigits("t");
  bindChordDigits("p");
  bindChordDigits("s");
  bindChordDigits("c");

  if (KEYBINDS_ENABLED) {
    let treeHintsRaf = false;
    const scheduleTreeHints = () => {
      if (treeHintsRaf) {
        return;
      }
      treeHintsRaf = true;
      const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
      raf(() => {
        treeHintsRaf = false;
        refreshTaxaHints();
        refreshPhotoHints();
      });
    };
    document.addEventListener("scroll", scheduleTreeHints, { passive: true });
    window.addEventListener("resize", scheduleTreeHints);
  }
  if (KEYBINDS_ENABLED) {
    setHintBar(HINT_BAR_DEFAULT);
  }
  applyControlHints();
  refreshTaxaHints();
  refreshPhotoHints();

  // Keep the hints in sync when collapse/expand toggles change visibility
  // without a re-render (toggle clicks, keyboard, collapseAll/expandAll).
  // Filtered to class changes so title updates don't re-trigger. Skipped
  // entirely on touch devices — both jobs are keybind hints.
  if (KEYBINDS_ENABLED && typeof MutationObserver !== "undefined") {
    const hintTreeEl = document.getElementById("plant-tree");
    if (hintTreeEl) {
      const observer = new MutationObserver(() => {
        refreshPhotoHints();
        refreshDigitNav();
        refreshTaxaHints();
      });
      observer.observe(hintTreeEl, { attributes: true, subtree: true, attributeFilter: ["class"] });
    }
  }

  // Enter applies the filter, then drops focus so digits navigate (shared
  // binder — identical to the photos grid behavior).
  bindEnterToApplyBlur(searchInput, performSearch);

  // Plain p (no digit within the arm window) opens the exact-match taxon's
  // photo: the visible search match whose name equals the query, falling
  // back to the first visible photo link (the old p behavior). No-op without
  // a query, while typing, or with a toggle focused.
  function exactPhotoNav() {
    if (document.activeElement === searchInput) {
      return;
    }
    if (document.activeElement && document.activeElement.closest &&
      document.activeElement.closest(".toggle")) {
      return;
    }
    const norm = searchInput.value.toLowerCase().trim();
    if (!norm) {
      return;
    }
    const treeEl = document.getElementById("plant-tree");
    if (!treeEl) {
      return;
    }
    let fallback = null;
    for (const li of treeEl.querySelectorAll("li.search-match")) {
      if (li.closest("ul.collapsed")) {
        continue;
      }
      const link = li.querySelector("a.plant-photo-link[href]");
      if (!link) {
        continue;
      }
      if (!fallback) {
        fallback = link;
      }
      const name = (
        li.querySelector("a.plant-wiki-link, span.muted")?.textContent || ""
      ).trim().toLowerCase();
      if (name === norm) {
        window.location.href = link.getAttribute("href");
        return;
      }
    }
    if (fallback) {
      window.location.href = fallback.getAttribute("href");
    }
  }

  // p/s/c/t chord trackers for the nth-photo/nth-taxa/nth-toggle binds
  // above (registered via bindChordDigits). Raw listeners so all encodings
  // are seen; the digit handlers still honor the central onKey guards. All
  // four leaders are sticky: tap arms until the same key is tapped again,
  // another leader switches, and arming p additionally schedules the
  // exact-match fallthrough (cancelled by digit, disarm, switch, or blur).
  // Shift never arms, keeping Shift+digit free. Arming sets body[data-chord]
  // so the ? overlay reveals that chord's progressive hints.
  if (KEYBINDS_ENABLED) {
    document.addEventListener("keydown", (e) => {
      if (e.repeat || e.shiftKey || hasModifier(e)) {
        return;
      }
      const key = normalizeKey(e);
      const chord = chordForKey(key);
      if (!chord || isEditableTarget(e.target)) {
        return;
      }
      if (document.activeElement === searchInput) {
        return;
      }
      chord.held = true;
      if (chord.armed) {
        disarmChord(chord);
        return;
      }
      // Single photo candidate: bare p opens it immediately instead of
      // arming the chord (there is nothing a digit could disambiguate).
      if (key === "p" && !(e.target && e.target.closest && e.target.closest(".toggle")) && document.activeElement !== searchInput) {
        const photos = currentPhotoLinks();
        if (photos.length === 1) {
          const href = photos[0].getAttribute("href");
          if (href) {
            window.location.href = href;
            return;
          }
        }
      }
      armChord(key, chord);
      if (chord === chords.p) {
        chords.p.timer = setTimeout(() => {
          chords.p.timer = 0;
          exactPhotoNav();
        }, 800);
      }
    });
    document.addEventListener("keyup", (e) => {
      const chord = chordForKey(normalizeKey(e));
      if (chord) {
        chord.held = false;
      }
    });
    window.addEventListener("blur", () => {
      for (const chord of Object.values(chords)) {
        chord.held = false;
      }
      if (chords.p.timer) {
        clearTimeout(chords.p.timer);
        chords.p.timer = 0;
      }
      for (const seq of Object.values(chordSeqs)) {
        seq.cancel();
      }
    });
  }

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
    const norm = query.toLowerCase().trim();
    if (norm !== lastQuery) {
      lastQuery = norm;
      clearCollapsedStorage();
    }
    if (!query.trim()) {
      renderTree(generatePlantList(plantData.taxonomy), false);
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
// (generatePlantList) and Node harnesses to exercise the toggle helpers.
// ---------------------------------------------------------------------------
if (typeof module !== "undefined") {
  module.exports = {
    generatePlantList,
    siblingUls,
    setCollapsed,
    toggleNode,
    persistToggle,
    applyCollapsedFromStorage,
  };
}
