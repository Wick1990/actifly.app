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
    initBeta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
    /* ===========================
     Beta signup + live stats
  ============================ */

  function initBeta() {
    const form = document.getElementById("betaForm");
    const msg = document.getElementById("betaMsg");
    if (!form || !msg) return;

    const quotas = { android: 34, ios: 33, google: 33, total: 100 };

    // Set max labels
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
    setText("betaAndroidMax", quotas.android);
    setText("betaiOSMax", quotas.ios);
    setText("betaGoogleMax", quotas.google);
    setText("betaTotalMax", quotas.total);

    const setBar = (barId, value, max) => {
      const el = document.getElementById(barId);
      if (!el) return;
      const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
      el.style.width = pct.toFixed(1) + "%";
    };

    async function refreshStats() {
      try {
        const r = await fetch("/api/beta-stats", { cache: "no-store" });
        const data = await r.json();
        if (!data?.ok) return;

        const c = data.counts || {};
        setText("betaAndroid", c.android ?? 0);
        setText("betaiOS", c.ios ?? 0);
        setText("betaGoogle", c.google ?? 0);
        setText("betaTotal", c.total ?? 0);

        setBar("betaAndroidBar", c.android ?? 0, quotas.android);
        setBar("betaiOSBar", c.ios ?? 0, quotas.ios);
        setBar("betaGoogleBar", c.google ?? 0, quotas.google);
        setBar("betaTotalBar", c.total ?? 0, quotas.total);
      } catch {
        // silently ignore
      }
    }

    function setMsg(text, ok) {
      msg.textContent = text;
      msg.className = "formMsg " + (ok ? "ok" : "err");
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fd = new FormData(form);
      const email = String(fd.get("email") || "").trim();
      const category = String(fd.get("category") || "").trim();

      if (!email || !category) {
        setMsg("Please enter an email and select a category.", false);
        return;
      }

      setMsg("Submitting…", true);

      try {
        const res = await fetch("/api/beta-signup", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setMsg("You’re on the list. We’ll email you when the beta starts.", true);
          form.reset();
          await refreshStats();
          return;
        }

        if (res.status === 409 && data?.full) {
          setMsg("Beta list is full — thanks! Please email support@actifly.app and we’ll keep you posted.", false);
          await refreshStats();
          return;
        }

        setMsg(data?.error || "Something went wrong. Please try again.", false);
      } catch {
        setMsg("Network error. Please try again.", false);
      }
    });

    // initial load + periodic refresh (optional)
    refreshStats();
    setInterval(refreshStats, 30_000);
  }

})();
