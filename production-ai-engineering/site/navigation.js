(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const arrivalKey = "handbook-opening";
  const rememberArrival = (value) => {
    try {
      if (value) sessionStorage.setItem(arrivalKey, value);
      else sessionStorage.removeItem(arrivalKey);
    } catch { /* Navigation still works when browser storage is unavailable. */ }
  };

  const revealArrival = () => {
    let arrival;
    try { arrival = sessionStorage.getItem(arrivalKey); } catch { /* No saved arrival. */ }
    rememberArrival(null);
    if (arrival !== location.pathname || reducedMotion.matches) return;
    document.querySelector(".book-shell")?.animate?.([
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  };
  revealArrival();

  const card = document.querySelector(".handbook-card-link");
  const cover = card?.querySelector(".handbook-cover");
  if (!card || !cover?.animate) return;
  let opening = false;
  let openingAnimations = [];
  const reset = () => {
    opening = false;
    openingAnimations.forEach((animation) => animation.cancel());
    openingAnimations = [];
    cover.style.position = "";
    cover.style.zIndex = "";
    rememberArrival(null);
  };
  window.addEventListener("pageshow", reset);
  card.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || card.target || event.defaultPrevented || reducedMotion.matches) return;
    event.preventDefault();
    if (opening) return;
    opening = true;
    rememberArrival(new URL(card.href).pathname);
    const bounds = cover.getBoundingClientRect();
    const scale = Math.max(1, Math.min(1.6, innerWidth * 0.96 / bounds.width, innerHeight * 0.88 / bounds.height));
    const x = innerWidth / 2 - (bounds.left + bounds.width / 2);
    const y = innerHeight / 2 - (bounds.top + bounds.height / 2);
    const destination = `translate(${x}px, ${y}px) scale(${scale})`;
    cover.style.position = "relative";
    cover.style.zIndex = "2";
    document.querySelectorAll(".gallery-intro, .gallery-footer").forEach((element) => {
      openingAnimations.push(element.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: 240, fill: "forwards" }));
    });
    const lift = cover.animate([
      { transform: getComputedStyle(cover).transform, opacity: 1 },
      { transform: destination, opacity: 1, boxShadow: "0 20px 44px -22px rgb(0 0 0 / 26%)", offset: 0.7 },
      { transform: destination, opacity: 0 },
    ], { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
    openingAnimations.push(lift);
    const navigate = () => { if (opening) location.assign(card.href); };
    lift.finished.then(navigate, navigate);
  });
})();
