(() => {
  "use strict";

  const root = document.documentElement;
  const dialog = document.querySelector("#toc-dialog");
  const openButton = document.querySelector("[data-open-toc]");
  const closeButton = document.querySelector("[data-close-toc]");
  const progressStatus = document.querySelector("#progress-status");
  const chapterSections = [...document.querySelectorAll(".chapter")];
  const navigationLinks = [...document.querySelectorAll(".sidebar-nav a")];
  let progressFrame = 0;
  let lastReportedProgress = -1;

  function openContents() {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeContents() {
    if (!dialog) return;
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
    openButton?.focus();
  }

  openButton?.addEventListener("click", openContents);
  closeButton?.addEventListener("click", closeContents);

  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) closeContents();
  });

  dialog?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (dialog.open) dialog.close();
    });
  });

  document.querySelectorAll("[data-print]").forEach((button) => {
    button.addEventListener("click", () => window.print());
  });

  function updateProgress() {
    progressFrame = 0;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100));
    root.style.setProperty("--reading-progress", progress.toFixed(2));
    const rounded = Math.round(progress / 5) * 5;
    if (rounded !== lastReportedProgress && progressStatus) {
      progressStatus.value = `Reading progress: ${rounded}%`;
      lastReportedProgress = rounded;
    }
  }

  function requestProgressUpdate() {
    if (!progressFrame) progressFrame = window.requestAnimationFrame(updateProgress);
  }

  window.addEventListener("scroll", requestProgressUpdate, { passive: true });
  window.addEventListener("resize", requestProgressUpdate, { passive: true });
  updateProgress();

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navigationLinks.forEach((link) => {
        if (link.getAttribute("href") === `#${visible.target.id}`) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }, {
      rootMargin: "-18% 0px -67% 0px",
      threshold: [0, 0.05, 0.2],
    });
    chapterSections.forEach((chapter) => observer.observe(chapter));
  }
})();
