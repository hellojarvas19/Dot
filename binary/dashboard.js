const DEFAULT_SETTINGS = {
    binList: ["3743551236"],
    binMode: !0,
    cardDetails: [],
    extensionEnabled: !0,
    hittedSites: [],
    sendSiteToGroup: !1,
    botToken: "",
    telegramId: "",
    isVerified: !1,
    telegramUsername: "",
    telegramName: "",
    telegramPhotoUrl: "",
    useCustomBilling: !1,
    userName: "",
    userEmail: "",
    userAddress: "",
    userCity: "",
    userZip: "",
    customCountry: "US",
    proxyEnabled: !1,
    proxyList: [],
    // New feature toggles
    multiGatewayEnabled: !0,
    hideStripeAgent: !1,
    skipStripeZipValidation: !1,
    playHitSound: !0,
    // Telegram group settings (configurable instead of hardcoded)
    groupBotToken: "",
    groupChatId: ""
};

let state = { settings: { ...DEFAULT_SETTINGS }, otpDatabase: {}, logs: [] };
let cachedIp = "Checking...";

// --- 1. INJECT STYLES (Fixed Merging + Compact Mode) ---
const injectLogStyles = () => {
    if (document.getElementById("binary-log-styles")) return;
    const style = document.createElement("style");
    style.id = "binary-log-styles";
    style.textContent = `
    /* CONTAINER FIX */
    #consoleOutput {
        background: rgba(5, 5, 7, 0.95) !important;
        padding: 15px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important; /* Strict Gap */
        border: 1px solid rgba(255,255,255,0.08) !important;
        box-shadow: inset 0 0 30px rgba(0,0,0,0.8);
        overflow-y: auto !important;
    }

    /* BASE CARD STYLE */
    .log-card-design {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 12px;
        position: relative;
        flex-shrink: 0; /* Prevent shrinking/merging */
        transition: all 0.2s ease;
        animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
    }

    .log-card-design:hover {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255,255,255,0.1);
    }

    /* === TYPE 1: COMPACT ROW (For Declines/Errors) === */
    .log-card-design.compact {
        padding: 8px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-left: 3px solid #ef4444; /* Red Border */
        height: 45px;
    }
    
    .compact-left { display: flex; align-items: center; gap: 10px; overflow: hidden; }
    .compact-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

    .compact-time { font-family: monospace; font-size: 10px; color: #64748b; }
    
    .compact-msg { 
        font-size: 11px; color: #cbd5e1; font-weight: 500; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;
    }
    .compact-msg i { margin-right: 6px; color: #ef4444; }

    .compact-card {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px; color: #94a3b8; background: rgba(0,0,0,0.3);
        padding: 2px 6px; border-radius: 4px;
    }

    /* === TYPE 2: FULL CARD (For Success/Hits) === */
    .log-card-design.full {
        border-left: 3px solid #10b981; /* Green Border */
        background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
    }

    .log-header-row {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 10px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #64748b;
    }

    .log-badges { display: flex; gap: 8px; }
    
    .log-pill {
        background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 6px;
    }
    
    .log-pill.status.success { color: #10b981; border-color: rgba(16, 185, 129, 0.2); }

    .log-cc-container {
        display: flex; align-items: center; gap: 12px;
        background: rgba(0, 0, 0, 0.25); padding: 10px;
        border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.03);
        margin-bottom: 8px;
    }

    .cc-icon { font-size: 24px; color: #10b981; }
    .cc-details { display: flex; flex-direction: column; gap: 2px; }
    .cc-number { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #fff; letter-spacing: 1px; font-weight: 600; }
    .cc-extra { display: flex; gap: 10px; font-size: 10px; color: #94a3b8; }
    .cc-cvv { color: var(--primary); }

    .log-footer-msg {
        display: flex; align-items: center; gap: 8px; font-size: 11px; color: #10b981; font-weight: 600;
    }
  `;
    document.head.appendChild(style);
};

// --- 2. IP CHECKER ---
const updateIp = async () => {
    try {
        const req = await fetch('https://api64.ipify.org?format=json');
        const json = await req.json();
        cachedIp = json.ip;
    } catch (e) {
        cachedIp = "Unknown";
    }
};
setInterval(updateIp, 60000);
updateIp();

// --- 3. CORE LOGIC ---
const elements = {
    // ... (Keep existing references)
    navItems: document.querySelectorAll(".nav-item"),
    sections: document.querySelectorAll(".section"),
    binList: document.getElementById("binList"),
    binCount: document.getElementById("binCount"),
    binModeToggle: document.getElementById("binModeToggle"),
    binInputsArea: document.getElementById("binInputsArea"),
    modeBadge: document.getElementById("modeBadge"),
    modeDesc: document.getElementById("modeDesc"),
    extensionToggle: document.getElementById("extensionToggle"),
    cardDetails: document.getElementById("cardDetails"),
    telegramLoginView: document.getElementById("telegram-login-view"),
    telegramProfileView: document.getElementById("telegram-profile-view"),
    telegramId: document.getElementById("telegramId"),
    otpCode: document.getElementById("otpCode"),
    sendOtpBtn: document.getElementById("sendOtpBtn"),
    verifyOtpBtn: document.getElementById("verifyOtpBtn"),
    unlinkBtn: document.getElementById("unlinkBtn"),
    tgAvatar: document.getElementById("tg-avatar"),
    tgName: document.getElementById("tg-name"),
    tgUsername: document.getElementById("tg-username"),
    botToken: document.getElementById("botToken"),
    groupBotToken: document.getElementById("groupBotToken"),
    groupChatId: document.getElementById("groupChatId"),
    clearBtn: document.getElementById("clearBtn"),
    clearLogsBtn: document.getElementById("clearLogsBtn"),
    consoleOutput: document.getElementById("consoleOutput"),
    useCustomBilling: document.getElementById("useCustomBilling"),
    userName: document.getElementById("userName"),
    userEmail: document.getElementById("userEmail"),
    userAddress: document.getElementById("userAddress"),
    userCity: document.getElementById("userCity"),
    userZip: document.getElementById("userZip"),
    customCountry: document.getElementById("customCountry"),
    sendSiteToggle: document.getElementById("sendSiteToggle"),
    hittedSitesList: document.getElementById("hittedSitesList"),
    clearHitsBtn: document.getElementById("clearHitsBtn"),
    cleanCardsBtn: document.getElementById("cleanCardsBtn"),
    proxyToggle: document.getElementById("proxyToggle"),
    proxyList: document.getElementById("proxyList"),
    proxyCount: document.getElementById("proxyCount"),
    activeTitleEl: document.getElementById("active-title"),
    // New toggle elements
    multiGatewayToggle: document.getElementById("multiGatewayToggle"),
    hideStripeAgentToggle: document.getElementById("hideStripeAgentToggle"),
    skipStripeZipToggle: document.getElementById("skipStripeZipToggle"),
    playHitSoundToggle: document.getElementById("playHitSoundToggle")
};

const sectionTitles = { telegram: "Dashboard", settings: "Settings", cards: "Cards", userDetails: "Billing", console: "Logs", hittedSites: "Hits" };

const showToast = (e, t = "success") => {
    let s = document.querySelector(".toast-container");
    if (!s) { s = document.createElement("div"); s.className = "toast-container"; document.body.appendChild(s) }
    const n = document.createElement("div");
    n.className = `toast ${t}`, n.innerHTML = `<i class="fas ${{success:"fa-check-circle",error:"fa-exclamation-triangle",info:"fa-info-circle"}[t]}"></i> <span>${String(e)}</span>`, s.appendChild(n), requestAnimationFrame((() => n.classList.add("show"))), setTimeout((() => { n.classList.remove("show"); setTimeout((() => n.remove()), 400) }), 4e3)
};

// --- FIXED LOGGING FUNCTION ---
const addLog = (htmlContent) => {
    if (!elements.consoleOutput) return;
    
    // Create a strict container div
    const wrapper = document.createElement("div");
    wrapper.innerHTML = htmlContent;
    
    // Get the first child (the actual card)
    const logElement = wrapper.firstElementChild;
    
    if (logElement) {
        elements.consoleOutput.prepend(logElement);
        state.logs.unshift(logElement.outerHTML);
        if (state.logs.length > 50) state.logs.pop();
        
        chrome.storage.local.set({ dashboardLogs: state.logs });
    }
};

const luhnCheck = e => {
    let t = 0, s = 1;
    for (let n = e.length - 1; n >= 0; n--) {
        let i = 0; i = Number(e.charAt(n)) * s, i > 9 && (t += 1, i -= 10), t += i, s = 1 == s ? 2 : 1
    }
    return t % 10 == 0
};

const isNotExpired = (e, t) => {
    const s = new Date, n = s.getFullYear(), i = s.getMonth() + 1;
    let a = parseInt(t); a < 100 && (a += 2e3); const o = parseInt(e);
    return !(a < n || a === n && o < i)
};

const cleanCardList = () => {
    const e = elements.cardDetails.value;
    if (!e.trim()) return showToast("List is empty", "info");
    const t = e.split("\n"), s = new Set;
    let n = 0, i = 0, a = 0, o = 0; const l = [];
    t.forEach((e => {
        const t = e.trim(); if (!t) return; if (!t.includes("|")) return void n++;
        const r = t.split("|"); if (r.length < 4) return void n++;
        const d = r[0].replace(/\D/g, ""); let c = r[1].replace(/\D/g, ""), m = r[2].replace(/\D/g, ""); const g = r[3].replace(/\D/g, "");
        if (!d || d.length < 13 || d.length > 19 || !luhnCheck(d)) return void n++;
        if (1 === c.length && (c = "0" + c), 2 === m.length && (m = "20" + m), !isNotExpired(c, m)) return void i++;
        if (g.length < 3 || g.length > 4) return void n++;
        const u = `${d}|${c}|${m}|${g}`; s.has(u) ? a++ : (t !== u && o++, s.add(u), l.push(u))
    })), elements.cardDetails.value = l.join("\n"), saveSettings(!0);
    if (n + i + a > 0 || o > 0) {
        let e = "List Cleaned:"; o > 0 && (e += `\n✨ Fixed Formatting: ${o}`), n > 0 && (e += `\n❌ Invalid/Bad Format: ${n}`), i > 0 && (e += `\n📅 Expired: ${i}`), a > 0 && (e += `\n♻️ Duplicates: ${a}`), showToast(e, "success")
    } else showToast("List is perfect! ✅", "info")
};

const updateModeUI = e => {
    elements.modeBadge && (e ? (elements.modeBadge.textContent = "BIN MODE", elements.modeBadge.style.background = "var(--primary)", elements.modeDesc.textContent = "A random BIN from list per card.", elements.binInputsArea.style.opacity = "1", elements.binInputsArea.style.pointerEvents = "auto") : (elements.modeBadge.textContent = "LIST MODE", elements.modeBadge.style.background = "#8b5cf6", elements.modeDesc.textContent = "Using Card Database", elements.binInputsArea.style.opacity = "0.3", elements.binInputsArea.style.pointerEvents = "none"))
};

const updateProxyCount = () => {
    const el = elements.proxyList, det = elements.proxyCount;
    if (!el || !det) return;
    const n = (el.value.split("\n").map((e => e.trim())).filter(Boolean).length);
    det.textContent = n + " proxy" + (n !== 1 ? "ies" : "");
};

const updateBinCount = () => {
    const el = elements.binList, det = elements.binCount;
    if (!el || !det) return;
    const n = (el.value.split("\n").map((e => e.trim())).filter(Boolean).length);
    det.textContent = n + " BIN" + (n !== 1 ? "s" : "");
};

const loadSettings = () => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (e => {
        chrome.storage.local.get(["cardDetails", "hittedSites", "dashboardLogs", "proxyList"], (t => {
            const s = { ...e, ...t };
            state.settings = s;
            // Populate UI Fields
            if(elements.binList) elements.binList.value = Array.isArray(s.binList) ? s.binList.join("\n") : "";
            if(elements.proxyList) elements.proxyList.value = Array.isArray(s.proxyList) ? s.proxyList.join("\n") : "";
            if(elements.cardDetails) elements.cardDetails.value = (s.cardDetails || []).join("\n");
            
            elements.extensionToggle.checked = s.extensionEnabled;
            elements.binModeToggle.checked = s.binMode;
            updateModeUI(s.binMode);
            updateBinCount(); updateProxyCount();
            
            // Populate Input Fields
            elements.telegramId.value = s.telegramId || "";
            elements.botToken.value = s.botToken || "";
            if(elements.groupBotToken) elements.groupBotToken.value = s.groupBotToken || "";
            if(elements.groupChatId) elements.groupChatId.value = s.groupChatId || "";
            elements.userName.value = s.userName || "";
            elements.userEmail.value = s.userEmail || "";
            elements.userAddress.value = s.userAddress || "";
            elements.userCity.value = s.userCity || "";
            elements.userZip.value = s.userZip || "";
            // New toggles
            if (elements.multiGatewayToggle) elements.multiGatewayToggle.checked = !!s.multiGatewayEnabled;
            if (elements.hideStripeAgentToggle) elements.hideStripeAgentToggle.checked = !!s.hideStripeAgent;
            if (elements.skipStripeZipToggle) elements.skipStripeZipToggle.checked = !!s.skipStripeZipValidation;
            if (elements.playHitSoundToggle) elements.playHitSoundToggle.checked = s.playHitSound !== false;
            
            // Render Logs & Hits
            state.logs = t.dashboardLogs || [];
            if(elements.consoleOutput) elements.consoleOutput.innerHTML = state.logs.join("");
            renderHittedSites(s.hittedSites);
            
            // Load OTP database
            chrome.storage.local.get(["otpDatabase"], (local) => {
                state.otpDatabase = local.otpDatabase || {};
            });
            
            // Telegram UI
            const uiFunc = (v) => {
                const els = document.querySelectorAll(".verification-required");
                if(v) {
                    els.forEach(x => x.style.display = "none");
                    elements.telegramLoginView.style.display = "none";
                    elements.telegramProfileView.style.display = "flex";
                    elements.tgName.textContent = s.telegramName || "User";
                    elements.tgUsername.textContent = "@" + (s.telegramUsername || "unknown");
                    if(s.telegramPhotoUrl) {
                        elements.tgAvatar.src = s.telegramPhotoUrl;
                    } else {
                        const name = encodeURIComponent(s.telegramName || "User");
                        elements.tgAvatar.src = `https://ui-avatars.com/api/?name=${name}&background=3B82F6&color=fff&bold=true`;
                    }
                } else {
                    els.forEach(x => x.style.display = "block");
                    elements.telegramLoginView.style.display = "block";
                    elements.telegramProfileView.style.display = "none";
                }
            };
            uiFunc(s.isVerified);
        }))
    }))
};

const saveSettings = (e = !1) => {
    const pl = elements.proxyList ? elements.proxyList.value.split("\n").map(e => e.trim()).filter(Boolean) : [];
    const bl = elements.binList ? elements.binList.value.split("\n").map(e => e.trim()).filter(Boolean) : [];
    const t = {
        binList: bl,
        extensionEnabled: elements.extensionToggle.checked,
        binMode: elements.binModeToggle.checked,
        useCustomBilling: elements.useCustomBilling.checked,
        userName: elements.userName.value.trim(),
        userEmail: elements.userEmail.value.trim(),
        userAddress: elements.userAddress.value.trim(),
        userCity: elements.userCity.value.trim(),
        userZip: elements.userZip.value.trim(),
        customCountry: elements.customCountry.value,
        sendSiteToGroup: !!elements.sendSiteToggle && elements.sendSiteToggle.checked,
        telegramId: state.settings.telegramId,
        isVerified: state.settings.isVerified,
        telegramName: state.settings.telegramName,
        telegramUsername: state.settings.telegramUsername,
        telegramPhotoUrl: state.settings.telegramPhotoUrl,
        botToken: elements.botToken.value.trim(),
        groupBotToken: elements.groupBotToken ? elements.groupBotToken.value.trim() : "",
        groupChatId: elements.groupChatId ? elements.groupChatId.value.trim() : "",
        proxyEnabled: !!elements.proxyToggle && elements.proxyToggle.checked,
        // New toggles
        multiGatewayEnabled: !!elements.multiGatewayToggle && elements.multiGatewayToggle.checked,
        hideStripeAgent: !!elements.hideStripeAgentToggle && elements.hideStripeAgentToggle.checked,
        skipStripeZipValidation: !!elements.skipStripeZipToggle && elements.skipStripeZipToggle.checked,
        playHitSound: !!elements.playHitSoundToggle && elements.playHitSoundToggle.checked
    };
    const s = {
        cardDetails: elements.cardDetails.value.split("\n").filter(e => e.trim()),
        hittedSites: state.settings.hittedSites,
        proxyList: pl
    };
    chrome.storage.sync.set(t, () => {
        chrome.storage.local.set(s, () => {
            state.settings = { ...t, ...s };
            if(e) showToast("Settings Saved", "success");
            chrome.tabs.query({}, tabs => tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { action: "updateSettings", settings: state.settings }).catch(()=>{})));
        })
    })
};

const renderHittedSites = e => {
    if (!elements.hittedSitesList) return;
    if (e && e.length > 0) {
        elements.hittedSitesList.innerHTML = e.map((e, t) => `
        <div class="log-card-design full" style="margin-bottom: 8px;">
            <div class="log-header-row">
                <span class="log-pill"><i class="far fa-clock"></i> ${e.date.split(",")[0]}</span>
                <span class="log-pill status success">HIT 🎯</span>
            </div>
            <div style="font-weight:bold; color:#fff; font-size:14px; margin-bottom:4px;">${e.name||"Unknown"}</div>
            <div style="font-size:11px; color:#94a3b8; font-family:monospace;">${e.url}</div>
            <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                <span class="log-pill" style="background:rgba(255,255,255,0.1)">BIN: ${e.bin}</span>
                <button class="delete-hit-btn" data-index="${t}" style="background:transparent; border:none; color:#fca5a5; cursor:pointer;">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>`).join("");
        
        document.querySelectorAll(".delete-hit-btn").forEach(btn => {
            btn.addEventListener("click", (evt) => {
                const idx = parseInt(evt.currentTarget.dataset.index);
                if (confirm("Remove this hit?")) {
                    const hits = state.settings.hittedSites || [];
                    hits.splice(idx, 1);
                    chrome.storage.sync.set({ hittedSites: hits }, () => {
                        state.settings.hittedSites = hits;
                        renderHittedSites(hits);
                        showToast("Hit removed", "success");
                    });
                }
            });
        });
    } else {
        elements.hittedSitesList.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">No hits yet...</div>';
    }
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    injectLogStyles();
    loadSettings();

    // Menu Nav
    elements.navItems.forEach(e => {
        e.addEventListener("click", () => {
            elements.navItems.forEach(i => i.classList.remove("active"));
            e.classList.add("active");
            elements.sections.forEach(s => {
                s.classList.remove("active");
                if(s.id === `${e.dataset.section}-section`) s.classList.add("active");
            });
            if(elements.activeTitleEl) elements.activeTitleEl.textContent = sectionTitles[e.dataset.section] || "Dashboard";
        });
    });

    // Buttons
    if(elements.cleanCardsBtn) elements.cleanCardsBtn.addEventListener("click", cleanCardList);
    if(elements.clearLogsBtn) elements.clearLogsBtn.addEventListener("click", () => {
        elements.consoleOutput.innerHTML = "";
        state.logs = [];
        chrome.storage.local.set({ dashboardLogs: [] });
    });

    // Event Listeners for inputs
    [
        elements.binModeToggle,
        elements.extensionToggle,
        elements.proxyToggle,
        elements.useCustomBilling,
        elements.sendSiteToggle,
        elements.multiGatewayToggle,
        elements.hideStripeAgentToggle,
        elements.skipStripeZipToggle,
        elements.playHitSoundToggle
    ].forEach(el => {
        if(el) el.addEventListener("change", () => saveSettings(true));
    });
    [elements.binList, elements.proxyList, elements.cardDetails, elements.botToken, elements.groupBotToken, elements.groupChatId].forEach(el => {
        if(el) el.addEventListener("blur", () => saveSettings(true));
    });

    // Telegram OTP handlers
    if(elements.sendOtpBtn) {
        elements.sendOtpBtn.addEventListener("click", async () => {
            const telegramId = elements.telegramId.value.trim();
            const botToken = elements.botToken.value.trim();
            
            if(!telegramId || !botToken) {
                showToast("Please enter Telegram ID and Bot Token first", "error");
                return;
            }
            
            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
            
            // Store OTP temporarily
            state.otpDatabase[telegramId] = { code: otp, expiresAt };
            chrome.storage.local.set({ otpDatabase: state.otpDatabase });
            
            // Send OTP via Telegram
            try {
                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: telegramId,
                        text: `🔐 *Binary Autohitter Verification*\n\nYour OTP code is: \`${otp}\`\n\nThis code expires in 10 minutes.`,
                        parse_mode: "Markdown"
                    })
                });
                
                const data = await response.json();
                if(data.ok) {
                    showToast("OTP sent! Check your Telegram.", "success");
                    elements.otpCode.focus();
                } else {
                    showToast(`Failed to send OTP: ${data.description || "Invalid bot token or user ID"}`, "error");
                }
            } catch(err) {
                showToast("Error sending OTP. Check your bot token.", "error");
            }
        });
    }
    
    if(elements.verifyOtpBtn) {
        elements.verifyOtpBtn.addEventListener("click", async () => {
            const telegramId = elements.telegramId.value.trim();
            const botToken = elements.botToken.value.trim();
            const otpCode = elements.otpCode.value.trim();
            
            if(!telegramId || !botToken || !otpCode) {
                showToast("Please fill all fields", "error");
                return;
            }
            
            // Verify OTP
            const stored = state.otpDatabase[telegramId];
            if(!stored) {
                showToast("No OTP found. Please send a new one.", "error");
                return;
            }
            
            if(Date.now() > stored.expiresAt) {
                showToast("OTP expired. Please send a new one.", "error");
                delete state.otpDatabase[telegramId];
                chrome.storage.local.set({ otpDatabase: state.otpDatabase });
                return;
            }
            
            if(otpCode !== stored.code) {
                showToast("Invalid OTP code", "error");
                return;
            }
            
            // OTP verified - fetch user info and mark as verified
            try {
                const response = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ chat_id: telegramId })
                });
                
                const data = await response.json();
                if(data.ok && data.result) {
                    const user = data.result;
                    const updates = {
                        telegramId: telegramId,
                        botToken: botToken,
                        isVerified: true,
                        telegramName: user.first_name || user.title || "User",
                        telegramUsername: user.username || "",
                        telegramPhotoUrl: user.photo?.small_file_id ? 
                            `https://api.telegram.org/bot${botToken}/getFile?file_id=${user.photo.small_file_id}` : ""
                    };
                    
                    chrome.storage.sync.set(updates, () => {
                        state.settings = { ...state.settings, ...updates };
                        delete state.otpDatabase[telegramId];
                        chrome.storage.local.set({ otpDatabase: state.otpDatabase });
                        showToast("Verification successful! ✅", "success");
                        loadSettings(); // Refresh UI
                    });
                } else {
                    showToast("Could not fetch user info. Verification may still work.", "warning");
                    chrome.storage.sync.set({
                        telegramId: telegramId,
                        botToken: botToken,
                        isVerified: true
                    }, () => {
                        state.settings.isVerified = true;
                        loadSettings();
                    });
                }
            } catch(err) {
                // Fallback: just mark as verified
                chrome.storage.sync.set({
                    telegramId: telegramId,
                    botToken: botToken,
                    isVerified: true
                }, () => {
                    state.settings.isVerified = true;
                    delete state.otpDatabase[telegramId];
                    chrome.storage.local.set({ otpDatabase: state.otpDatabase });
                    showToast("Verified! (Could not fetch profile)", "success");
                    loadSettings();
                });
            }
        });
    }
    
    if(elements.unlinkBtn) {
        elements.unlinkBtn.addEventListener("click", () => {
            if(confirm("Unlink Telegram account? You'll need to verify again.")) {
                chrome.storage.sync.set({
                    telegramId: "",
                    botToken: "",
                    isVerified: false,
                    telegramName: "",
                    telegramUsername: "",
                    telegramPhotoUrl: ""
                }, () => {
                    state.settings.isVerified = false;
                    showToast("Account unlinked", "info");
                    loadSettings();
                });
            }
        });
    }

    // Message Listener (THE LOGGING CORE)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!request) return;

        if (request.action === "logResponse") {
            const { card, response } = request.data;
            const isSuccess = response.type === 'success';
            const time = new Date().toLocaleTimeString("en-US", { hour12: false });
            
            let html = "";

            if (isSuccess) {
                // BIG CARD FOR SUCCESS
                html = `
                <div class="log-card-design full">
                    <div class="log-header-row">
                        <div class="log-badges">
                            <span class="log-pill"><i class="far fa-clock"></i> ${time}</span>
                            <span class="log-pill"><i class="fas fa-network-wired"></i> ${cachedIp}</span>
                        </div>
                        <span class="log-pill status success">APPROVED</span>
                    </div>
                    <div class="log-cc-container">
                        <div class="cc-icon"><i class="fab fa-cc-visa"></i></div>
                        <div class="cc-details">
                            <div class="cc-number">${card?.cardNumber || "Unknown"}</div>
                            <div class="cc-extra">
                                <span>EXP: ${card?.expirationDate || "??"}</span>
                                <span class="cc-cvv">CVV: ${card?.cvv || "???"}</span>
                            </div>
                        </div>
                    </div>
                    <div class="log-footer-msg">
                        <i class="fas fa-check-circle"></i>
                        <span>${response.message || "Payment Successful"}</span>
                    </div>
                </div>`;
            } else {
                // COMPACT ROW FOR ERRORS/DECLINES
                html = `
                <div class="log-card-design compact">
                    <div class="compact-left">
                        <span class="compact-time">${time}</span>
                        <div class="compact-msg">
                            <i class="fas fa-times-circle"></i>
                            ${response.message || "Declined"}
                        </div>
                    </div>
                    <div class="compact-right">
                        <span class="compact-card">${card?.cardNumber || "????"}</span>
                        <span class="log-pill ip" style="font-size:9px">${cachedIp}</span>
                    </div>
                </div>`;
            }
            
            addLog(html);
        }

        if (request.action === "updateHittedSites") {
            state.settings.hittedSites = request.hittedSites;
            renderHittedSites(request.hittedSites);
            // Log Hit in Console too
            addLog(`<div class="log-card-design full"><div class="log-footer-msg"><i class="fas fa-bullseye"></i><span>New Hit Saved!</span></div></div>`);
        }
    });
});