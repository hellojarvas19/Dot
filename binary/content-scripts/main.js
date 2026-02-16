// Main-world script that runs on all pages at document_start.
// It injects the universal multi-gateway CVC modifier into the page
// and respects the user's multi-gateway setting.

(function () {
  if (window.BINARY_MAIN_LOADED) return;
  window.BINARY_MAIN_LOADED = true;

  let settings = {
    multiGatewayEnabled: true,
  };

  function loadSettings() {
    try {
      chrome.storage.sync.get(
        {
          multiGatewayEnabled: true,
        },
        (res) => {
          settings.multiGatewayEnabled = !!res.multiGatewayEnabled;
          maybeInject();
        },
      );
    } catch (_) {
      // Fallback: still inject with default
      maybeInject();
    }
  }

  function injectScriptOnce(src) {
    if (document.documentElement.querySelector(`script[data-binary-src="${src}"]`)) {
      return;
    }
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL(src);
    s.dataset.binarySrc = src;
    (document.documentElement || document.head || document.body).appendChild(s);
    s.onload = () => {
      s.remove();
    };
  }

  function maybeInject() {
    if (!settings.multiGatewayEnabled) return;
    injectScriptOnce("js/multi-gateway-injected.js");
  }

  // React to settings changes from the dashboard
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (!msg || msg.action !== "updateSettings" || !msg.settings) return;
      const s = msg.settings;
      const prev = !!settings.multiGatewayEnabled;
      settings.multiGatewayEnabled =
        typeof s.multiGatewayEnabled === "boolean" ? s.multiGatewayEnabled : prev;
      if (settings.multiGatewayEnabled && !prev) {
        maybeInject();
      }
    });
  } catch (_) {
    // ignore if not available
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSettings);
  } else {
    loadSettings();
  }
})();

