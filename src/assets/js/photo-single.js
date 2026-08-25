(function () {
  // Promote search-placeholder <span data-href> to real links. Search links are
  // baked as spans so they don't appear (or navigate) when JS is disabled.
  function upgradeSearchLinks(container) {
    const root = container || document;
    root.querySelectorAll("span[data-href]").forEach((el) => {
      const a = document.createElement("a");
      a.href = el.getAttribute("data-href");
      if (el.hasAttribute("title")) {
        a.setAttribute("title", el.getAttribute("title"));
      }
      a.className = el.className;
      a.innerHTML = el.innerHTML;
      el.replaceWith(a);
    });
  }

  upgradeSearchLinks(document);

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") || "";
  const currentSlug = window.location.pathname
    .split("/")
    .filter(Boolean)
    .pop() || "";

  // Honor an active query in the header "PHOTOS" link so returning to the grid
  // keeps the same filtered set the user came from.
  function scopeHeaderPhotosLink() {
    if (!query.trim()) return;
    const link = document.querySelector('header a[href="/photos"]');
    if (link) {
      link.href = `/photos/?q=${encodeURIComponent(query.trim())}`;
    }
  }
  scopeHeaderPhotosLink();

  // Query-scoped prev/next slugs, computed from /photos/photo-data.json once a
  // query is present. J/K and the visible nav both use this so keyboard
  // navigation stays within the filtered set (not the chronological fallback).
  let scopedNav = null; // { prev: slug|null, next: slug|null }
  // True once a query-scoped set has been applied (even a single match, where
  // scopedNav is null). When true, J/K never falls back to chronological nav.
  let scopedActive = false;
  // False while a query's filtered set is still being resolved, so the static
  // chronological nav is neither shown nor used by J/K during that window.
  let navReady = !query.trim();

  function scopedHref(type) {
    if (!scopedNav) return null;
    const slug = type === "prev" ? scopedNav.prev : scopedNav.next;
    return slug
      ? `/photos/${slug}/?q=${encodeURIComponent(query.trim())}`
      : null;
  }

  // Resolve a nav href for J/K: query-scoped links when a filter is active,
  // otherwise the static chronological anchors once ready (no query, current
  // photo not in the set, or the fetch failed). During a query's pending
  // resolution the nav is hidden and J/K no-ops.
  function navHref(type) {
    if (scopedActive) {
      return scopedHref(type);
    }
    if (!navReady) return null;
    const sel = type === "prev" ? ".photo-nav-prev[href]" : ".photo-nav-next[href]";
    const el = document.querySelector(sel);
    return el ? el.getAttribute("href") : null;
  }

  // When the page is reached via a grid/photos search query (?q=...), scope the
  // prev/next nav to the matching photo set instead of the full chronological
  // order. Without a query, or without JS/data, the static chronological nav
  // stays untouched.
  function scopedNavFromQuery(queryStr, current, photos) {
    if (!queryStr.trim()) return null;
    const matches = window.filterByQuery
      ? window.filterByQuery(photos, queryStr)
      : null;
    if (!matches || !matches.length) return null;

    const idx = matches.findIndex((m) => m.slug === current);
    if (idx === -1) return null; // current photo not in set — leave chrono nav

    return {
      prev: idx > 0 ? matches[idx - 1] : null,
      next: idx < matches.length - 1 ? matches[idx + 1] : null,
      count: matches.length,
    };
  }

  function renderNavLink(type, slug, queryStr) {
    const isPrev = type === "prev";
    const label = isPrev
      ? `<span class="up-arrow">&larr;</span>PREV`
      : `NEXT<span class="up-arrow up-arrow--right">&rarr;</span>`;
    const cls = isPrev ? "photo-nav-prev" : "photo-nav-next";
    if (slug) {
      const href = `/photos/${slug}/?q=${encodeURIComponent(queryStr.trim())}`;
      const rel = isPrev ? "prev" : "next";
      const title = isPrev ? "Previous (K)" : "Next (J)";
      return `<a href="${href}" class="${cls}" rel="${rel}" title="${title}">${label}</a>`;
    }
    return `<span class="${cls} disabled" aria-hidden="true">${label}</span>`;
  }

  function applyScopedNav(scoped, queryStr) {
    const nav = document.querySelector(".photo-nav");
    if (!nav) return;

    scopedActive = true;

    if (scoped.count <= 1) {
      // Only one photo matches — hide the whole nav.
      nav.style.display = "none";
      scopedNav = null;
      return;
    }

    scopedNav = {
      prev: scoped.prev ? scoped.prev.slug : null,
      next: scoped.next ? scoped.next.slug : null,
    };

    const prevEl = nav.querySelector(".photo-nav-prev");
    const nextEl = nav.querySelector(".photo-nav-next");

    const nextPrevHtml = renderNavLink("prev", scopedNav.prev, queryStr);
    const nextNextHtml = renderNavLink("next", scopedNav.next, queryStr);

    if (prevEl) {
      const tmp = document.createElement("div");
      tmp.innerHTML = nextPrevHtml;
      prevEl.replaceWith(tmp.firstElementChild);
    }
    if (nextEl) {
      const tmp = document.createElement("div");
      tmp.innerHTML = nextNextHtml;
      nextEl.replaceWith(tmp.firstElementChild);
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const target = e.target;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      return;
    }

    const key = (e.key || String.fromCharCode(e.keyCode || 0)).toLowerCase();

    if (key === "j") {
      const href = navHref("next");
      if (href) {
        window.location.href = href;
      }
    } else if (key === "k") {
      const href = navHref("prev");
      if (href) {
        window.location.href = href;
      }
    } else if (key === "escape") {
      // Esc returns to the grid: to the same filtered set when a query is
      // active, otherwise one step back in history.
      if (query.trim()) {
        window.location.href = `/photos/?q=${encodeURIComponent(query.trim())}`;
      } else {
        window.history.back();
      }
    }
  });

  if (!query.trim()) return;

  // Hide the static chronological nav while the filtered set is computed so it
  // doesn't flash before being replaced by the query-scoped nav.
  const nav = document.querySelector(".photo-nav");
  if (nav) nav.style.visibility = "hidden";

  const finish = () => {
    navReady = true;
    if (nav) nav.style.visibility = "";
  };

  fetch("/photos/photo-data.json")
    .then((res) => {
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    })
    .then((data) => {
      const photos = Array.isArray(data.photos) ? data.photos : data;
      const scoped = scopedNavFromQuery(query, currentSlug, photos);
      finish();
      if (scoped) {
        applyScopedNav(scoped, query);
      }
      // else: reveal the chronological nav; scopedNav stays null so J/K uses it.
    })
    .catch(() => {
      // Data unavailable — reveal the static chronological nav.
      finish();
    });
}());
