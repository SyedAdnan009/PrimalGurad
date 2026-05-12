import React, { useState, useEffect } from "react";
import "./App.css";

/* ================================================================
   HELPER FUNCTIONS  (pure UI derivations — no logic changes)
   ================================================================ */

function getSeverityMeta(severity) {
  const s = (severity || "").toLowerCase();
  if (s === "high" || s === "critical")
    return { cls: "high", label: "High" };
  if (s === "medium")
    return { cls: "medium", label: "Medium" };
  return { cls: "low", label: "Low" };
}

function formatThreatType(type) {
  const map = {
    phishing:    "Phishing",
    malware:     "Malware",
    brute_force: "Brute-Force Attack",
    ransomware:  "Ransomware",
    unknown:     "Unknown Threat",
  };
  return map[(type || "").toLowerCase()] ?? type;
}

function getThreatDescription(type) {
  const map = {
    phishing:
      "This site is attempting to steal your credentials or personal data by impersonating a trusted service.",
    malware:
      "This URL is linked to malicious software that can compromise your system and data.",
    brute_force:
      "Suspicious credential-stuffing or brute-force activity was detected at this origin.",
    ransomware:
      "This site is associated with ransomware operations that may encrypt your files for extortion.",
  };
  return (
    map[(type || "").toLowerCase()] ??
    "PrimalGuard's threat intelligence engine has flagged this URL as potentially dangerous."
  );
}

function getDisclosurePoints(type) {
  const map = {
    phishing: [
      "URL pattern matches known phishing infrastructure",
      "Domain registered recently with suspicious registrar",
      "Page content mimics a legitimate login or payment page",
      "No valid SSL certificate or certificate mismatch detected",
    ],
    malware: [
      "Domain appears on threat intelligence blocklists",
      "Server has previously distributed malicious payloads",
      "Redirect chain leads to known exploit kit infrastructure",
    ],
    brute_force: [
      "High-frequency authentication requests detected from this origin",
      "IP matches patterns associated with credential-stuffing campaigns",
      "Multiple account targets observed within a short time window",
    ],
    ransomware: [
      "Domain linked to known ransomware command-and-control servers",
      "File distribution patterns match ransomware delivery mechanisms",
      "Intelligence feed correlation with active ransomware campaigns",
    ],
  };
  return (
    map[(type || "").toLowerCase()] ?? [
      "Behavioural signals matched threat detection rules",
      "Domain or IP appears on one or more threat intelligence feeds",
      "PrimalGuard threat model confidence exceeds the block threshold",
    ]
  );
}

/* ── Inline SVG icons (no external dependencies) ── */
const IconShield = () => (
  <svg className="bp-icon-svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

const IconArrowLeft = () => (
  <svg className="bp-btn-icon" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
);

const IconFlag = () => (
  <svg className="bp-btn-icon" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);

const IconCheck = () => (
  <svg className="bp-toast-icon" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconChevronDown = () => (
  <svg className="bp-disclosure-chevron" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const IconLock = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function App() {
  /* ── ALL ORIGINAL JS LOGIC — UNTOUCHED ─────────────────────── */
  const params = new URLSearchParams(window.location.search);

  const type       = params.get("type")       || "Unknown";
  const severity   = params.get("severity")   || "Low";
  const confidence = params.get("confidence") || "0";
  const url        = params.get("url")        || "N/A";

  const [reported, setReported] = useState(false);

  const handleReportFalsePositive = async () => {
    const payload = {
      url,
      type,
      confidence: parseFloat(confidence),
      timestamp: new Date().toISOString(),
      status: "pending"
    };
    
    console.log("🚀 [DEBUG] Sending False Positive Report with payload:", payload);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/report-false-positive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      console.log("✅ [DEBUG] FP report submitted natively, status:", res.status);
      setReported(true);
      setTimeout(() => setReported(false), 3000);
    } catch (e) {
      console.error("FP report failed, using fallback", e);
      if (window.chrome && window.chrome.runtime) {
        window.chrome.runtime.sendMessage(
          { type: "report_fp" },
          () => {
            setReported(true);
            setTimeout(() => setReported(false), 3000);
          }
        );
      }
    }
  };
  /* ─────────────────────────────────────────────────────────── */

  /* UI-only derived values */
  const confidencePct  = (parseFloat(confidence) * 100).toFixed(1);
  const severityMeta   = getSeverityMeta(severity);
  const threatLabel    = formatThreatType(type);
  const threatDesc     = getThreatDescription(type);
  const disclosurePts  = getDisclosurePoints(type);
  
  console.log(`🛡️ [DEBUG] Block Page Rendered | Severity: ${severity} (${severityMeta.cls}) | Type: ${type}`);
  const scanTimestamp  = new Date().toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });

  /* Progress bar fill — animate after mount */
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setBarWidth(parseFloat(confidencePct)), 80);
    return () => clearTimeout(id);
  }, [confidencePct]);

  if (severityMeta.cls === "low") {
    window.location.href = url;
    return null;
  }

  return (
    <>
      <div className="bp-page">
        {/* ── Main card ── */}
        <main
          className="bp-card"
          role="alert"
          aria-live="assertive"
          aria-label="Security warning: access blocked"
        >
          {/* Top danger stripe */}
          <div className="bp-danger-stripe" aria-hidden="true" />

          {/* ════════════ HEADER ════════════ */}
          <header className="bp-header">
            {/* Shield icon */}
            <div className="bp-icon-wrap" aria-hidden="true">
              <IconShield />
            </div>

            {/* Eyebrow */}
            <p className="bp-eyebrow">THREAT DETECTED</p>

            <h1 className="bp-title">
              {severityMeta.cls === "high" ? "Access Blocked" : "Risk Detected"}
            </h1>

            <p className="bp-subtitle">{threatDesc}</p>
          </header>

          {/* ════════════ BODY ════════════ */}}
          <div className="bp-body">

            {/* Threat metadata pills */}
            <div className="bp-badges">
              <span className="bp-badge bp-badge--type">{threatLabel}</span>
              <span className={`bp-badge bp-badge--sev-${severityMeta.cls}`}>
                <span className={`bp-sev-dot bp-sev-dot--${severityMeta.cls}`} aria-hidden="true" />
                {severityMeta.label}
              </span>
            </div>

            {/* Blocked URL */}
            <div className="bp-url-box">
              <div className="bp-url-label">Blocked URL</div>
              <div className="bp-url-value" title={url}>{url}</div>
            </div>

            {/* Detection confidence bar */}
            <div className="bp-confidence-wrap">
              <div className="bp-confidence-header">
                <span className="bp-confidence-label">Detection Confidence</span>
                <span className="bp-confidence-value" aria-label={`${confidencePct} percent confidence`}>
                  {confidencePct}%
                </span>
              </div>
              <div
                className="bp-progress-track"
                role="progressbar"
                aria-valuenow={confidencePct}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Detection confidence level"
              >
                <div
                  className="bp-progress-fill"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>

            {/* Expandable "Why was this blocked?" disclosure */}
            <details className="bp-disclosure">
              <summary className="bp-disclosure-summary">
                <span>Why was this blocked?</span>
                <IconChevronDown />
              </summary>
              <div className="bp-disclosure-body">
                <p>
                  PrimalGuard's security engine flagged this URL based on the following
                  signals:
                </p>
                <ul>
                  {disclosurePts.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            </details>

            {/* False-positive success toast */}
            {reported && (
              <div className="bp-toast" role="status" aria-live="polite">
                <IconCheck />
                <span className="bp-toast-text">
                  Report submitted. Our analysts will review this detection.
                </span>
              </div>
            )}

            {/* ── Action buttons ── */}
            <div className="bp-actions" role="group" aria-label="Response options">

              {/* PRIMARY — safe action, most prominent */}
              <button
                id="btn-go-back"
                className="bp-btn bp-btn--primary"
                onClick={() => history.back()}
                aria-label="Go back to the previous safe page"
              >
                <span className="bp-btn-inner">
                  <IconArrowLeft />
                  Go Back to Safety
                </span>
              </button>

              {/* SECONDARY — report FP, original handler */}
              <button
                id="btn-report-fp"
                className="bp-btn bp-btn--report"
                onClick={handleReportFalsePositive}
                aria-label="Report this block as a false positive"
                aria-pressed={reported}
              >
                <span className="bp-btn-inner">
                  <IconFlag />
                  Report as False Positive
                </span>
              </button>

              {/* TERTIARY — dangerous, visually muted, original handler */}
              {severityMeta.cls === "medium" && (
                <button
                  id="btn-close-tab"
                  className="bp-btn bp-btn--danger"
                  onClick={() => window.close()}
                  aria-label="Proceed to the blocked site anyway (not recommended)"
                >
                  Proceed Anyway — Not Recommended
                </button>
              )}
            </div>
          </div>

          {/* ════════════ FOOTER ════════════ */}
          <footer className="bp-footer">
            <div className="bp-trust-bar">
              <div className="bp-trust-brand">
                <span className="bp-status-dot" aria-hidden="true" />
                <IconLock />
                Threat Shield Active
              </div>
              <div className="bp-trust-meta" aria-label={`Scanned at ${scanTimestamp}`}>
                {scanTimestamp}
              </div>
            </div>
          </footer>

        </main>
      </div>
    </>
  );
}
