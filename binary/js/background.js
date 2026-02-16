chrome.runtime.onInstalled.addListener((()=>{chrome.tabs.create({url:chrome.runtime.getURL("dashboard.html")})})),chrome.action.onClicked.addListener((()=>{chrome.tabs.create({url:chrome.runtime.getURL("dashboard.html")})})),chrome.runtime.onMessage.addListener(((e,t,o)=>{if(e)if("getIpAndRisk"===e.action){(async()=>{try{const r=await fetch("https://api.ipify.org?format=json"),d=await r.json();const ip=d.ip||"—";let riskScore=0,riskLabel="Low",riskClass="risk-low";try{const r2=await fetch("https://ip-api.com/json/?fields=proxy,hosting,country"),d2=await r2.json();if(d2.proxy)riskScore+=40;if(d2.hosting)riskScore+=35;riskScore=Math.min(100,riskScore);if(riskScore<=30){riskLabel="Low";riskClass="risk-low"}else if(riskScore<=60){riskLabel="Medium";riskClass="risk-medium"}else{riskLabel="High";riskClass="risk-high"}}catch(err){}o({ip,riskScore,riskLabel,riskClass})}catch(err){o({ip:"—",riskScore:0,riskLabel:"?",riskClass:"risk-low"})}})();return!0}if("log"!==e.action)if("show_notification"!==e.type&&"show_notification"!==e.action){if("capture_and_send"===e.action){const s=t.tab.id,a=t.tab.windowId;return chrome.tabs.update(s,{active:!0},(()=>{setTimeout((()=>{chrome.tabs.captureVisibleTab(a,{format:"png"},(t=>{if(chrome.runtime.lastError||!t)return void o({status:"error",message:chrome.runtime.lastError?.message});const s=`Success_Payment_${e.card||"Unknown"}_${Date.now()}.png`;chrome.downloads.download({url:t,filename:s,saveAs:!1}),o({status:"success",screenshotUrl:t})}))}),800)})),!0}}else chrome.notifications.create({type:"basic",iconUrl:"icons/icon64.png",title:e.title||"BinaryOS Alert",message:e.message||"Notification received."});else{const t={time:(new Date).toISOString(),data:e.data};chrome.storage.local.get(["consoleLogs"],(e=>{const o=e.consoleLogs||[];o.length>100&&o.shift(),o.push(t),chrome.storage.local.set({consoleLogs:o})}))}}));const HCAPTCHA_FILTER={urls:["*://*.hcaptcha.com/*checksiteconfig*"]};chrome.webRequest.onCompleted.addListener((e=>{200===e.statusCode&&e.tabId>=0&&chrome.tabs.sendMessage(e.tabId,{type:"HCAPTCHA_TRIGGER_NOW",url:e.url}).catch((()=>{}))}),HCAPTCHA_FILTER);

function parseProxyLine(raw) {
  raw = (raw || "").trim();
  if (!raw) return null;
  let type = "http", rest = raw;
  if (/^socks5:\/\//i.test(raw)) { type = "socks5"; rest = raw.replace(/^socks5:\/\//i, ""); }
  else if (/^socks4:\/\//i.test(raw)) { type = "socks4"; rest = raw.replace(/^socks4:\/\//i, ""); }
  else if (/^https:\/\//i.test(raw)) { type = "https"; rest = raw.replace(/^https:\/\//i, ""); }
  else if (/^http:\/\//i.test(raw)) { type = "http"; rest = raw.replace(/^http:\/\//i, ""); }
  const parts = rest.split(":");
  if (parts.length < 2) return null;
  const host = parts[0], port = parseInt(parts[1], 10) || 8080;
  let user = "", pass = "";
  if (parts.length >= 4) { user = parts[2]; pass = parts.slice(3).join(":"); }
  else if (parts.length === 3) user = parts[2];
  const scheme = type === "socks5" ? "socks5" : type === "socks4" ? "socks4" : type === "https" ? "https" : "http";
  return { type, scheme, host, port, user, pass };
}

function applyProxy() {
  chrome.storage.sync.get(["proxyEnabled","proxyType","proxyHost","proxyPort","proxyUser","proxyPass"], (stSync) => {
    chrome.storage.local.get(["proxyList"], (stLocal) => {
      if (!chrome.proxy || !chrome.proxy.settings) return;
      if (!stSync.proxyEnabled) {
        chrome.proxy.settings.set({ value: { mode: "direct" }, scope: "regular" });
        chrome.storage.local.remove(["currentProxy"]);
        return;
      }
      let picked = null;
      const list = Array.isArray(stLocal.proxyList) ? stLocal.proxyList.filter(Boolean) : [];
      if (list.length > 0) {
        const line = list[Math.floor(Math.random() * list.length)];
        picked = parseProxyLine(line);
      }
      if (!picked && stSync.proxyHost && stSync.proxyPort) {
        picked = {
          scheme: (stSync.proxyType || "http").toLowerCase().replace("socks5","socks5").replace("socks4","socks4").replace("https","https") || "http",
          host: stSync.proxyHost,
          port: parseInt(stSync.proxyPort, 10) || 8080,
          user: stSync.proxyUser || "",
          pass: stSync.proxyPass || ""
        };
      }
      if (!picked || !picked.host) {
        chrome.proxy.settings.set({ value: { mode: "direct" }, scope: "regular" });
        chrome.storage.local.remove(["currentProxy"]);
        return;
      }
      const scheme = picked.scheme === "socks5" ? "socks5" : picked.scheme === "socks4" ? "socks4" : picked.scheme === "https" ? "https" : "http";
      chrome.proxy.settings.set({
        value: {
          mode: "fixed_servers",
          rules: { singleProxy: { host: picked.host, port: picked.port, scheme } }
        },
        scope: "regular"
      });
      chrome.storage.local.set({ currentProxy: { user: picked.user, pass: picked.pass } });
    });
  });
}

function initProxy() {
  applyProxy();
}
initProxy();
setTimeout(initProxy, 500);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && ["proxyEnabled","proxyType","proxyHost","proxyPort","proxyUser","proxyPass"].some(k => changes[k])) applyProxy();
  if (area === "local" && changes.proxyList) applyProxy();
});

chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (!details.isProxy) return callback();
    chrome.storage.local.get(["currentProxy"], (st) => {
      if (st.currentProxy && st.currentProxy.user && st.currentProxy.pass) {
        callback({ authCredentials: { username: st.currentProxy.user, password: st.currentProxy.pass } });
      } else {
        callback();
      }
    });
    return true;
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);