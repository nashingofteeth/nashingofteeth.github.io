(function () {
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
}());
