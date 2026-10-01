(() => {
  const initialize = () => {
    const gallery = document.querySelector(".gallery-shell");
    const reader = document.querySelector(".handbook-reader");
    const card = gallery?.querySelector(".handbook-card-link");
    if (!gallery || !reader || !card) return;
    const bookPath = new URL(card.href).pathname;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reading = document.body.classList.contains("handbooks-reader");
    let opening = false;
    let motion = [];
    let departure;
    let flyingCover;
    const clearMotion = () => {
      motion.forEach((animation) => animation.cancel());
      motion = [];
      departure?.remove();
      flyingCover?.remove();
      reader.inert = false;
      reader.classList.remove("is-opening");
      opening = false;
    };
    const show = (book, push = false) => {
      reader.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
      clearMotion();
      reading = book;
      document.body.classList.toggle("handbooks-gallery", !book);
      document.body.classList.toggle("handbooks-reader", book);
      document.title = book ? "Production AI Engineering · Michael Long" : "Handbooks · Michael Long";
      document.querySelector('link[rel="canonical"]').href = `https://handbooks.mikelong.ai${book ? bookPath : "/"}`;
      if (push) history.pushState(null, "", book ? bookPath : "/");
      window.scrollTo({ top: 0, behavior: "instant" });
      window.dispatchEvent(new Event("scroll"));
    };
    const ordinaryClick = (event, link) => event.button === 0
      && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
      && !link.target && !event.defaultPrevented;

    card.addEventListener("click", (event) => {
      if (!ordinaryClick(event, card)) return;
      event.preventDefault();
      if (opening) return;
      const cover = card.querySelector(".handbook-cover");
      if (reducedMotion.matches || !cover?.animate) {
        show(true, true);
        reader.querySelector("#main-content").focus({ preventScroll: true });
        return;
      }
      const bounds = cover.getBoundingClientRect();
      const galleryBounds = gallery.getBoundingClientRect();
      const oldGallery = gallery.cloneNode(true);
      oldGallery.querySelector(".handbook-card").style.visibility = "hidden";
      oldGallery.className = "handbook-departure";
      oldGallery.setAttribute("aria-hidden", "true");
      oldGallery.inert = true;
      Object.assign(oldGallery.style, {
        left: `${galleryBounds.left}px`, top: `${galleryBounds.top}px`,
        width: `${galleryBounds.width}px`,
      });
      const page = cover.cloneNode(true);
      page.className = "handbook-opening-cover";
      page.setAttribute("aria-hidden", "true");
      Object.assign(page.style, {
        left: `${bounds.left}px`, top: `${bounds.top}px`,
        width: `${bounds.width}px`, height: `${bounds.height}px`,
      });
      show(true, true);
      opening = true;
      reader.inert = true;
      reader.classList.add("is-opening");
      departure = oldGallery;
      flyingCover = page;
      document.body.append(departure, flyingCover);
      const target = reader.querySelector(".cover").getBoundingClientRect();
      const scale = Math.min(1.45, target.width / bounds.width, innerHeight * 0.88 / bounds.height);
      const x = target.left + target.width * 0.08 - bounds.left;
      const y = target.top + (innerHeight - target.top - bounds.height * scale) / 2 - bounds.top;
      const easing = "cubic-bezier(0.4, 0, 0.2, 1)";
      // Both views already exist. A single compositor timeline opens the cover
      // over the reader; there is no document load or animation handoff here.
      motion = [
        departure.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: 180, fill: "forwards" }),
        reader.animate([
          { opacity: 0, transform: "translateX(16px)" },
          { opacity: 0, transform: "translateX(16px)", offset: 0.12 },
          { opacity: 1, transform: "translateX(0)", offset: 0.8 },
          { opacity: 1, transform: "translateX(0)" },
        ], { duration: 560, easing, fill: "forwards" }),
        flyingCover.animate([
          { transform: "perspective(1600px) translate3d(0, 0, 0) scale(1) rotateY(0deg)", opacity: 1 },
          { transform: `perspective(1600px) translate3d(${x}px, ${y}px, 0) scale(${scale}) rotateY(-105deg)`, opacity: 1 },
        ], { duration: 560, easing, fill: "forwards" }),
      ];
      Promise.all(motion.map((animation) => animation.finished)).then(() => {
        if (!opening) return;
        clearMotion();
        if (reading) reader.querySelector("#main-content").focus({ preventScroll: true });
      }).catch(() => { /* Returning during the opening cancels its decorations. */ });
    });
    reader.querySelectorAll(".handbooks-return, .handbooks-return-mobile").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (!ordinaryClick(event, link)) return;
        event.preventDefault();
        show(false, true);
        card.focus({ preventScroll: true });
      });
    });
    window.addEventListener("popstate", () => {
      const nextReading = location.pathname === bookPath;
      if (nextReading !== reading) show(nextReading);
    });
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) clearMotion();
    });
    // The reader initializes once, so returning never duplicates its listeners.
    // Keep its search shortcut inactive while the gallery is on screen.
    document.addEventListener("keydown", (event) => {
      if (!reading && event.key === "/") event.stopImmediatePropagation();
    }, { capture: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
