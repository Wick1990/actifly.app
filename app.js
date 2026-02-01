/* =========================================================
   ActiFly Website – app.js (CLEAN)
   - language switcher (path-based, cookie only)
   - screenshot lightbox (a11y safe)
   - drag-to-scroll screenshot rail
========================================================= */

(function () {
  "use strict";

  /* ===========================
     Language Switcher
  ============================ */

  const SUPPORTED = ["en", "de", "fr", "lb", "nl", "es", "it", "pt"];
  const FALLBACK = "en";
  const COOKIE_NAME = "actifly_lang";
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

  function getPathParts() {
    return location.pathname.split("/").filter(Boolean);
  }

  function getCurrentLang() {
    const parts = getPathParts();
    const first = (parts[0] || "").toLowerCase();
    return SUPPORTED.includes(first) ? first : FALLBACK;
  }

  function setLangCookie(lang) {
    document.cookie =
      `${COOKIE_NAME}=${encodeURIComponent(lang)}; ` +
      `path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }

  function switchLang(toLang) {
    if (!SUPPORTED.includes(toLang)) return;

    const parts = getPathParts();
    const currentLang = getCurrentLang();

    if (parts.length && parts[0] === currentLang) {
      parts[0] = toLang;
    } else {
      parts.unshift(toLang);
    }

    setLangCookie(toLang);

    const target =
      "/" + parts.join("/") + (location.pathname.endsWith("/") ? "/" : "");

    location.href = target + location.search + location.hash;
  }

  function initLangButtons() {
    const current = getCurrentLang();

    document.querySelectorAll("button[data-lang]").forEach((btn) => {
      const lang = btn.getAttribute("data-lang");
      if (!lang) return;

      btn.classList.toggle("active", lang === current);
      btn.setAttribute("aria-pressed", lang === current ? "true" : "false");

      btn.addEventListener("click", () => switchLang(lang));
    });
  }

  /* ===========================
     Screenshot Lightbox
  ============================ */

  function initLightbox() {
    const overlayId = "actifly-lb";
    if (document.getElementById(overlayId)) return;

    const overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.className = "lbOverlay";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="lbModal" role="dialog" aria-modal="true">
        <div class="lbTop">
          <div class="lbTitle">Preview</div>
          <button class="lbClose" type="button">Close ✕</button>
        </div>
        <div class="lbBody">
          <img alt="Screenshot preview" />
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const img = overlay.querySelector("img");
    const closeBtn = overlay.querySelector(".lbClose");

    function open(src) {
      img.src = src;
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }

    function close() {
      overlay.classList.remove("open");
      img.src = "";
      document.body.style.overflow = "";
    }

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    document.addEventListener("click", (e) => {
      const el = e.target.closest?.("[data-lightbox]");
      if (!el) return;
      const src = el.getAttribute("data-src");
      if (src) open(src);
    });
  }

  /* ===========================
     Drag-to-scroll (screenshots)
  ============================ */

  function initShotRails() {
    document.querySelectorAll(".shotRail").forEach((rail) => {
      let isDown = false;
      let startX = 0;
      let startScroll = 0;

      rail.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        isDown = true;
        rail.setPointerCapture(e.pointerId);
        startX = e.clientX;
        startScroll = rail.scrollLeft;
        rail.style.cursor = "grabbing";
      });

      rail.addEventListener("pointermove", (e) => {
        if (!isDown) return;
        rail.scrollLeft = startScroll - (e.clientX - startX);
      });

      const end = () => {
        isDown = false;
        rail.style.cursor = "";
      };

      rail.addEventListener("pointerup", end);
      rail.addEventListener("pointerleave", end);
      rail.addEventListener("pointercancel", end);
    });
  }

  /* ===========================
     Boot
  ============================ */

  function boot() {
    initLangButtons();
    initLightbox();
    initShotRails();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
