(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  const contentsDialog = document.querySelector("#toc-dialog");
  const openContentsButton = document.querySelector("[data-open-toc]");
  const closeContentsButton = document.querySelector("[data-close-toc]");
  const searchDialog = document.querySelector("#search-dialog");
  const openSearchButtons = [...document.querySelectorAll("[data-open-search]")];
  const closeSearchButton = document.querySelector("[data-close-search]");
  const searchInput = document.querySelector("#handbook-search");
  const searchStatus = document.querySelector("#search-status");
  const searchResults = document.querySelector("[data-search-results]");
  const navigationLinks = [...document.querySelectorAll(".sidebar-nav a, .toc-dialog nav a")];
  const readingSections = [
    ...document.querySelectorAll(".cover, .foreword, #contents, .chapter, #appendix-citations, #term-index"),
  ];
  let progressFrame = 0;
  let lastSearchTrigger = null;

  function dialogIsOpen(dialog) {
    return Boolean(dialog?.open || dialog?.hasAttribute("open"));
  }

  function openDialog(dialog) {
    if (!dialog || dialogIsOpen(dialog)) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (!dialog || !dialogIsOpen(dialog)) return;
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  function focusHashTarget(link) {
    const href = link?.getAttribute("href");
    if (!href?.startsWith("#")) return;

    window.setTimeout(() => {
      const target = document.getElementById(href.slice(1));
      target?.setAttribute("tabindex", "-1");
      target?.focus({ preventScroll: true });
    }, 0);
  }

  openContentsButton?.addEventListener("click", () => openDialog(contentsDialog));
  closeContentsButton?.addEventListener("click", () => {
    closeDialog(contentsDialog);
    openContentsButton?.focus();
  });

  contentsDialog?.addEventListener("click", (event) => {
    if (event.target === contentsDialog) closeDialog(contentsDialog);
  });

  contentsDialog?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeDialog(contentsDialog);
      focusHashTarget(link);
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
  }

  function requestProgressUpdate() {
    if (!progressFrame) progressFrame = window.requestAnimationFrame(updateProgress);
  }

  window.addEventListener("scroll", requestProgressUpdate, { passive: true });
  window.addEventListener("resize", requestProgressUpdate, { passive: true });
  updateProgress();

  function sectionTargetId(section) {
    return section.matches(".chapter")
      ? section.querySelector(".chapter-header[id]")?.id
      : section.id;
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const targetId = sectionTargetId(visible.target);
      navigationLinks.forEach((link) => {
        if (targetId && link.getAttribute("href") === `#${targetId}`) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }, {
      rootMargin: "-18% 0px -76% 0px",
      threshold: 0,
    });
    readingSections.forEach((section) => observer.observe(section));
  }

  const normalize = (value) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const searchableSections = [...document.querySelectorAll(".source-section")].map((section, order) => {
    const heading = section.querySelector("h3")?.innerText.replace(/\s+/g, " ").trim() ?? "Untitled section";
    const chapter = section.closest(".chapter");
    const chapterTitle = chapter?.querySelector(".chapter-header h2")?.innerText.replace(/\s+/g, " ").trim() ?? "Handbook";
    const chapterNumber = chapter?.dataset.chapter?.padStart(2, "0") ?? "";
    const supportingHeadings = [...section.querySelectorAll("h4, h5, h6")]
      .map((subheading) => subheading.innerText.replace(/\s+/g, " ").trim())
      .join(" ");
    const body = [...section.querySelectorAll("p, li, th, td, dt, dd, h4, h5, h6, pre, svg title, svg desc")]
      .map((element) => element.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ");
    return {
      id: section.id,
      order,
      heading,
      chapterTitle,
      chapterNumber,
      body,
      normalizedHeading: normalize(heading),
      normalizedSupportingHeadings: normalize(supportingHeadings),
      normalizedChapter: normalize(chapterTitle),
      normalizedBody: normalize(body),
    };
  });

  function excerptFor(item, terms) {
    const firstMatch = terms
      .map((term) => item.normalizedBody.indexOf(term))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)[0] ?? 0;
    const start = Math.max(0, firstMatch - 72);
    const end = Math.min(item.body.length, start + 190);
    return `${start > 0 ? "…" : ""}${item.body.slice(start, end).trim()}${end < item.body.length ? "…" : ""}`;
  }

  function renderSearchResults(query) {
    if (!searchResults || !searchStatus) return;
    searchResults.replaceChildren();
    const normalizedQuery = normalize(query);
    if (normalizedQuery.length < 2) {
      searchStatus.textContent = `Search all ${searchableSections.length} sections.`;
      return;
    }

    const terms = normalizedQuery.split(" ").filter(Boolean);
    const matches = searchableSections
      .map((item) => {
        const haystack = `${item.normalizedHeading} ${item.normalizedSupportingHeadings} ${item.normalizedChapter} ${item.normalizedBody}`;
        if (!terms.every((term) => haystack.includes(term))) return null;
        let score = item.normalizedHeading.includes(normalizedQuery) ? 40 : 0;
        score += item.normalizedSupportingHeadings.includes(normalizedQuery) ? 30 : 0;
        score += item.normalizedChapter.includes(normalizedQuery) ? 20 : 0;
        score += terms.reduce((total, term) => (
          total
          + (item.normalizedHeading.includes(term) ? 8 : 0)
          + (item.normalizedSupportingHeadings.includes(term) ? 6 : 0)
          + (item.normalizedChapter.includes(term) ? 4 : 0)
          + (item.normalizedBody.includes(term) ? 1 : 0)
          + Math.min(10, item.normalizedBody.split(term).length - 1)
        ), 0);
        return { item, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.item.order - b.item.order);

    const visibleMatches = matches.slice(0, 8);
    if (!matches.length) {
      searchStatus.textContent = `No sections found for “${query.trim()}”. Try a broader term.`;
      return;
    }

    searchStatus.textContent = matches.length > visibleMatches.length
      ? `${matches.length} sections found. Showing the first ${visibleMatches.length}.`
      : `${matches.length} ${matches.length === 1 ? "section" : "sections"} found.`;

    visibleMatches.forEach(({ item }) => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      const meta = document.createElement("span");
      const title = document.createElement("strong");
      const excerpt = document.createElement("span");

      link.href = `#${item.id}`;
      meta.className = "search-result-meta";
      meta.textContent = `Chapter ${item.chapterNumber} · ${item.chapterTitle}`;
      title.textContent = item.heading;
      excerpt.className = "search-result-excerpt";
      excerpt.textContent = excerptFor(item, terms);
      link.append(meta, title, excerpt);
      link.addEventListener("click", () => {
        closeDialog(searchDialog);
        focusHashTarget(link);
      });
      listItem.append(link);
      searchResults.append(listItem);
    });
  }

  function openSearch(trigger = null) {
    lastSearchTrigger = trigger;
    openDialog(searchDialog);
    window.requestAnimationFrame(() => {
      searchInput?.focus();
      searchInput?.select();
    });
  }

  openSearchButtons.forEach((button) => {
    button.addEventListener("click", () => openSearch(button));
  });

  closeSearchButton?.addEventListener("click", () => closeDialog(searchDialog));
  searchDialog?.addEventListener("click", (event) => {
    if (event.target === searchDialog) closeDialog(searchDialog);
  });
  searchDialog?.addEventListener("close", () => lastSearchTrigger?.focus());
  searchInput?.addEventListener("input", () => renderSearchResults(searchInput.value));

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLElement
      && (target.matches("input, textarea, select") || target.isContentEditable);
    if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping) {
      event.preventDefault();
      openSearch(openSearchButtons.find((button) => button.offsetParent !== null) ?? openSearchButtons[0]);
    }
  });

  const releaseWindow = document.querySelector("[data-release-window]");
  const releaseCountdown = releaseWindow?.querySelector("[data-release-countdown]");
  const releaseStatus = releaseWindow?.querySelector("[data-release-status]");
  const releaseAt = new Date(releaseWindow?.dataset.releaseAt ?? "");

  if (releaseWindow && releaseCountdown && releaseStatus && !Number.isNaN(releaseAt.getTime())) {
    const countdownParts = {
      days: releaseCountdown.querySelector("[data-countdown-days]"),
      hours: releaseCountdown.querySelector("[data-countdown-hours]"),
      minutes: releaseCountdown.querySelector("[data-countdown-minutes]"),
      seconds: releaseCountdown.querySelector("[data-countdown-seconds]"),
    };
    const pad = (value) => String(value).padStart(2, "0");
    let countdownInterval = 0;

    function updateReleaseCountdown() {
      const remaining = releaseAt.getTime() - Date.now();
      if (remaining <= 0) {
        releaseWindow.classList.add("is-review-open");
        releaseCountdown.hidden = true;
        releaseStatus.textContent = "Review window open";
        if (countdownInterval) window.clearInterval(countdownInterval);
        return false;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86_400);
      const hours = Math.floor((totalSeconds % 86_400) / 3_600);
      const minutes = Math.floor((totalSeconds % 3_600) / 60);
      const seconds = totalSeconds % 60;
      countdownParts.days.textContent = pad(days);
      countdownParts.hours.textContent = pad(hours);
      countdownParts.minutes.textContent = pad(minutes);
      countdownParts.seconds.textContent = pad(seconds);
      releaseWindow.classList.remove("is-review-open");
      releaseCountdown.hidden = false;
      releaseStatus.textContent = "Next version review in";
      return true;
    }

    function startReleaseCountdown() {
      if (countdownInterval) window.clearInterval(countdownInterval);
      countdownInterval = 0;
      if (updateReleaseCountdown()) {
        countdownInterval = window.setInterval(updateReleaseCountdown, 1000);
      }
    }

    startReleaseCountdown();
    window.addEventListener("pagehide", () => {
      if (countdownInterval) window.clearInterval(countdownInterval);
      countdownInterval = 0;
    });
    window.addEventListener("pageshow", startReleaseCountdown);
  }
})();
