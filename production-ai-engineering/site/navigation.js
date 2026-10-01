(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const arrivalKey = "handbook-opening";
  const rememberArrival = (value) => {
    try {
      if (value) sessionStorage.setItem(arrivalKey, value);
      else sessionStorage.removeItem(arrivalKey);
    } catch { /* Navigation still works when browser storage is unavailable. */ }
  };

  const revealArrival = (event) => {
    let arrival;
    try { arrival = sessionStorage.getItem(arrivalKey); } catch { return; }
    rememberArrival(null);
    if (arrival !== location.pathname || reducedMotion.matches || event?.viewTransition) return;
    document.querySelector(".book-shell")?.animate([
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  };
  if ("onpagereveal" in window) window.addEventListener("pagereveal", revealArrival);
  else document.addEventListener("DOMContentLoaded", () => revealArrival());

  const card = document.querySelector(".handbook-card-link");
  const cover = card?.querySelector(".handbook-cover");
  if (!card || !cover?.animate) return;
  let opening = false;
  const reset = () => {
    opening = false;
    cover.getAnimations().forEach((animation) => animation.cancel());
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
    const lift = cover.animate([
      { transform: getComputedStyle(cover).transform },
      { transform: "translateY(-8px) scale(1.025)", boxShadow: "0 20px 44px -22px rgb(0 0 0 / 26%)" },
    ], { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
    const navigate = () => location.assign(card.href);
    lift.finished.then(navigate, navigate);
  });
})();
