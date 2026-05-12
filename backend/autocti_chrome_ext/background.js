//backend\autocti_chrome_ext\background.js (service worker)
const BACKEND_URL = "http://localhost:8000";
const IGNORE_URLS = [
  "chrome://",
  "chrome-extension://",
  "about:blank",
  "edge://",
  "brave://"
];

let lastThreat = null;

/* ==========================
   🔒 Redirect to Warning Page
=========================== */
function redirectToWarning(tabId, threat) {
  console.log("🔥 Redirect threat:", threat);

  const page = chrome.runtime.getURL("block_page/dist/index.html");

  const threatType =
    threat.type ||
    threat.threat_type ||
    threat.label ||
    threat.predicted_class ||
    "unknown";

  const severity =
    threat.severity ||
    threat.threat_severity ||
    "medium";

  const confidence =
    threat.confidence ||
    threat.model_confidence ||
    threat.probability ||
    0;

  const threatUrl =
    threat.url ||
    threat.original_url ||
    "unknown";

  const finalUrl =
    `${page}?type=${encodeURIComponent(threatType)}` +
    `&severity=${encodeURIComponent(severity)}` +
    `&confidence=${encodeURIComponent(confidence)}` +
    `&url=${encodeURIComponent(threatUrl)}`;

  console.log("🚨 Redirecting to:", finalUrl);

  chrome.tabs.update(tabId, { url: finalUrl }, () => {
    console.log("✅ Tab update called for tabId:", tabId);
  });
}


/* ==========================
   📡 Send data to backend
=========================== */
async function postToBackend(payload, tabId) {
  console.log(`🌐 [DEBUG] Fetching API at URL: ${BACKEND_URL}/api/ingest/log`);
  console.log(`📦 [DEBUG] Request Payload:`, payload);
  try {
    const resp = await fetch(`${BACKEND_URL}/api/ingest/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`❌ [DEBUG] Fetch Error! Status: ${resp.status} ${resp.statusText}`);
      console.error(`❌ [DEBUG] Details:`, errorText);
      return null;
    }

    const data = await resp.json();
    console.log("📨 Backend response:", data);
    console.log("🔎 Detected threats:", data.detected?.length || 0);

    if (data && data.detected && data.detected.length > 0) {
      lastThreat = data.detected[0];
      const type = lastThreat.type?.toLowerCase() || "unknown";
      const confidence = parseFloat(lastThreat.confidence || 0);
      const severity = (lastThreat.severity || "low").toLowerCase();

      console.log(`📊 Threat Analysis - Type: ${type}, Confidence: ${confidence}, Severity: ${severity}`);

      if (severity === "high" || severity === "medium") {
        console.log("🚨 THREAT DETECTED - BLOCKING:", type, confidence, severity);
        console.log("📍 tabId:", tabId);
        console.log("🔗 Threat URL:", lastThreat.url);

        addDNRBlockRule(lastThreat.url, lastThreat);

        if (tabId !== null && tabId !== undefined) {
          console.log("🎯 Attempting redirect to warning page with tabId:", tabId);
          redirectToWarning(tabId, lastThreat);
        } else {
          console.log("⚠️ No tabId available for redirect");
        }
      } else {
        console.log("🟢 Safe or low-confidence detection:", type, confidence, severity);
      }
    } else {
      console.log("✅ No threats detected - URL is safe");
    }

    return data;
  } catch (err) {
    console.error("❌ Error posting to backend:", err);
    return null;
  }
}

/* ==========================
   📍 Monitor Link Clicks via webNavigation
=========================== */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const url = details.url;
  const tabId = details.tabId;

  if (url.includes("chrome-extension://") || url.includes("chrome://") ||
      url.includes("about:") || url.includes("data:")) {
    return;
  }

  console.log("🔗 [LINK DETECTED] User navigating to:", url);
  console.log("📌 Tab ID:", tabId);

  const payload = {
    type: "link_click",
    url: url,
    timestamp: new Date().toISOString()
  };

  await postToBackend(payload, tabId);
});


/* ==========================
   📁 Monitor Downloads (Malware)
=========================== */
chrome.downloads?.onCreated?.addListener(downloadItem => {
  const payload = {
    type: "download",
    url: downloadItem.url,
    filename: downloadItem.filename,
    fileSize: downloadItem.fileSize || null,
    danger: downloadItem.danger || null,
    timestamp: new Date().toISOString()
  };
  postToBackend(payload, null);
});

chrome.downloads?.onDeterminingFilename?.addListener((downloadItem, suggest) => {
  const payload = {
    type: "download",
    url: downloadItem.url,
    filename: downloadItem.filename,
    fileSize: downloadItem.fileSize || null,
    danger: downloadItem.danger || null,
    timestamp: new Date().toISOString()
  };

  console.log(`🌐 [DEBUG] Fetching API at URL: ${BACKEND_URL}/api/ingest/log (Download check)`);
  fetch(`${BACKEND_URL}/api/ingest/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(resp => resp.json())
    .then(data => {
      if (data && data.detected && data.detected.length > 0) {
        const threat = data.detected[0];
        const type = threat.type?.toLowerCase() || "unknown";
        const confidence = parseFloat(threat.confidence || 0);
        const severity = String(threat.severity || "low").toLowerCase();

        if (severity === "high" || severity === "medium") {
          console.log("🚫 BLOCKING DOWNLOAD:", downloadItem.url);
          suggest({ cancel: true });
          lastThreat = threat;
          return;
        }
      }
      suggest();
    })
    .catch(err => {
      console.error("Error checking download:", err);
      suggest();
    });
});

chrome.downloads?.onChanged?.addListener(delta => {
  if (delta.state && delta.state.current === "complete") {
    chrome.downloads.search({ id: delta.id }, items => {
      if (!items || !items[0]) return;
      const i = items[0];
      const filePath = i.filename;

      fetch(`${BACKEND_URL}/scan-download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath })
      })
      .then(resp => resp.json())
      .then(data => {
        console.log("🛡️ Download Scan Result:", data);
      })
      .catch(err => {
        console.error("⚠️ Failed to trigger scan-download (backend may be down):", err);
      });

      const payload = {
        type: "download_complete",
        url: i.url,
        filename: filePath,
        fileSize: i.fileSize || null,
        mime: i.mime || null,
        timestamp: new Date().toISOString()
      };
      postToBackend(payload, null);
    });
  }
});

/* ==========================
   💬 Handle Messages
=========================== */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.type) {
    sendResponse({ status: "ignored" });
    return false;
  }

  if (msg.type === "link_click") {
    console.log("📎 Link clicked from content script:", msg.url);
    postToBackend(
      { type: "link_click", url: msg.url, source: "browser-click", timestamp: new Date().toISOString() },
      sender?.tab?.id || null
    );
    sendResponse({ status: "ok" });
    return true;
  }

  if (msg.type === "get_last_threat") {
    sendResponse({ threat: lastThreat });
    return true;
  }

  if (msg.type === "brute_force_test") {
    postToBackend(
      {
        type: "brute_force",
        ip_address: msg.ip_address,
        failed_attempts: msg.failed_attempts,
        successful_attempts: msg.successful_attempts,
        time_window: msg.time_window,
        timestamp: new Date().toISOString()
      },
      sender?.tab?.id || null
    );
    sendResponse({ status: "ok" });
    return true;
  }

  if (msg.type === "report_fp") {
    const fpPayload = {
      url: lastThreat?.url || "unknown",
      type: lastThreat?.type || "unknown",
      confidence: parseFloat(lastThreat?.confidence || 0),
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    fetch(`${BACKEND_URL}/report-false-positive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fpPayload)
    }).then(res => res.json())
      .then(data => console.log("✅ Report FP success:", data))
      .catch(err => console.error("❌ Report FP error:", err));

    sendResponse({ status: "ok" });
    return true;
  }

  sendResponse({ status: "unknown_type" });
  return false;
});

/* ==========================
   🛡️ DNR Block Rule
=========================== */
function addDNRBlockRule(threatUrl, threat) {
  if (!threatUrl) return;

  const page = chrome.runtime.getURL("block_page/dist/index.html");
  const threatType = encodeURIComponent(threat?.type || threat?.threat_type || "unknown");
  const severity = encodeURIComponent(threat?.severity || "high");
  const confidence = encodeURIComponent(threat?.confidence || 0);
  const blockedUrl = encodeURIComponent(threatUrl);

  const redirectTarget = `${page}?type=${threatType}&severity=${severity}&confidence=${confidence}&url=${blockedUrl}`;

  chrome.declarativeNetRequest.updateDynamicRules(
    {
      removeRuleIds: [9001],
      addRules: [{
        id: 9001,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { url: redirectTarget }
        },
        condition: {
          urlFilter: threatUrl,
          resourceTypes: ["main_frame"]
        }
      }]
    },
    () => console.log("🔥 DNR REDIRECT rule added for:", threatUrl)
  );
}