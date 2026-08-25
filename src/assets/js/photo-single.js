(function () {
  // When the page is reached via a grid/photos search query (?q=...), scope the
  // prev/next nav to the matching photo set instead of the full chronological
  // order. Requires /photos/photo-data.json and the shared filterByQuery from
  // photos.js (loaded before this file). Without a query, or without JS/data,
  // the static chronological nav stays untouched.

  function scopedNavFromQuery(query, currentSlug, photos) {
    if (!query.trim()) return null;
    const matches = window.filterByQuery
      ? window.filterByQuery(photos, query)
      : null;
    if (!matches || !matches.length) return null;

    const idx = matches.findIndex((m) => m.slug === currentSlug);
    if (idx === -1) return null; // current photo not in set — leave chrono nav

    const scoped = {
      prev: idx > 0 ? matches[idx - 1] : null,
      next: idx < matches.length - 1 ? matches[idx + 1] : null,
      count: matches.length,
    };
    return scoped;
  }

  function renderNavLink(type, slug, query) {
    const isPrev = type === "prev";
    const label = isPrev
      ? `<span class="up-arrow">&larr;</span>PREV`
      : `NEXT<span class="up-arrow up-arrow--right">&rarr;</span>`;
    const cls = isPrev ? "photo-nav-prev" : "photo-nav-next";
    if (slug) {
      const href = `/photos/${slug}/?q=${encodeURIComponent(query.trim())}`;
      const rel = isPrev ? "prev" : "next";
      const title = isPrev ? "Previous (K)" : "Next (J)";
      return `<a href="${href}" class="${cls}" rel="${rel}" title="${title}">${label}</a>`;
    }
    return `<span class="${cls} disabled" aria-hidden="true">${label}</span>`;
  }

  function applyScopedNav(scoped, query) {
    const nav = document.querySelector(".photo-nav");
    if (!nav) return;

    if (scoped.count <= 1) {
      // Only one photo matches — hide the whole nav.
      nav.style.display = "none";
      return;
    }

    const prevEl = nav.querySelector(".photo-nav-prev");
    const nextEl = nav.querySelector(".photo-nav-next");

    const nextPrevHtml = renderNavLink("prev", scoped.prev ? scoped.prev.slug : null, query);
    const nextNextHtml = renderNavLink("next", scoped.next ? scoped.next.slug : null, query);

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
      const next = document.querySelector(".photo-nav-next[href]");
      if (next) {
        window.location.href = next.getAttribute("href");
      }
    } else if (key === "k") {
      const prev = document.querySelector(".photo-nav-prev[href]");
      if (prev) {
        window.location.href = prev.getAttribute("href");
      }
    }
  });

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") || "";
  if (!query.trim()) return;

  const currentSlug = window.location.pathname
    .split("/")
    .filter(Boolean)
    .pop() || "";

  fetch("/photos/photo-data.json")
    .then((res) => {
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    })
    .then((data) => {
      const photos = Array.isArray(data.photos) ? data.photos : data;
      const scoped = scopedNavFromQuery(query, currentSlug, photos);
      if (scoped) {
        applyScopedNav(scoped, query);
      }
    })
    .catch(() => {
      // Data unavailable — leave static chronological nav.
    });
}());
