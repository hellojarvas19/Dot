!function() {
    // Use separate flag so injected.js (card bypass) can still run
    if (window.BINARY_INTERCEPTOR_LOADED) return;
    window.BINARY_INTERCEPTOR_LOADED = !0;

    console.log("[Binary] Auth Logger Active");

    // The specific URL keywords to watch for
    const authTargets = [
        "/v1/3ds2/authenticate",
        "/authenticate",
        "/v1/3ds2/challenge"
    ];

    // Helper: check URL and Log
    function checkAndLog(url) {
        if (url && typeof url === "string" && authTargets.some(t => url.includes(t))) {
            console.log("%c[Binary] 🔔 Stripe Auth Detected!", "background: #ff0; color: #000; font-size: 14px; font-weight: bold;");
            console.log("URL:", url);
        }
    }

    // 1. Monitor Fetch Requests
    const originalFetch = window.fetch;
    window.fetch = function() {
        const url = arguments[0];
        checkAndLog(url);
        return originalFetch.apply(this, arguments);
    };

    // 2. Monitor XHR Requests
    const xhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        checkAndLog(url);
        return xhrOpen.apply(this, arguments);
    };

}();