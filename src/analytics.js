/**
 * Google Analytics 4 helpers for Calm Capital.
 * Loads only when VITE_GA_MEASUREMENT_ID is set (e.g. in Vercel or .env.local).
 *
 * Privacy: we send only navigation metadata (path + tab id/label).
 * No emails, names, search queries, watchlists, or chat text are sent.
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/** Keep only pathname — drop query/hash that could carry user-entered text. */
function sanitizeAnalyticsPath(path) {
  if (!path || typeof path !== "string") return "/";
  try {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      const u = new URL(path);
      return u.pathname || "/";
    }
  } catch { /* fall through */ }
  const noHash = path.split("#")[0] || "/";
  const noQuery = noHash.split("?")[0] || "/";
  return noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
}

export function initAnalytics() {
  if (!MEASUREMENT_ID || typeof document === "undefined") return;
  if (window.__calmGaInitialized) return;
  window.__calmGaInitialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    send_page_view: false, // SPA: we send page_view manually on tab changes
    anonymize_ip: true,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function trackPageView(path, title) {
  if (!MEASUREMENT_ID || typeof window === "undefined" || typeof window.gtag !== "function") return;
  const pagePath = sanitizeAnalyticsPath(path || window.location.pathname);
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_title: typeof title === "string" ? title.slice(0, 150) : document.title,
    // Origin only — never include query strings or user-typed search.
    page_location: `${window.location.origin}${pagePath}`,
  });
}

export function trackEvent(name, params = {}) {
  if (!MEASUREMENT_ID || typeof window === "undefined" || typeof window.gtag !== "function") return;
  // Allowlist event params — never forward arbitrary objects that might hold PII.
  const safe = {};
  if (typeof params.tab_id === "string") safe.tab_id = params.tab_id.slice(0, 64);
  if (typeof params.tab_name === "string") safe.tab_name = params.tab_name.slice(0, 64);
  window.gtag("event", name, safe);
}

export function trackTabView(tabId, tabLabel, path, title) {
  if (!tabId) return;
  const pagePath = sanitizeAnalyticsPath(path || TAB_PATH_FALLBACK[tabId] || `/tab/${tabId}`);
  const pageTitle = title || (tabLabel ? `${tabLabel} | Calm Capital` : `Calm Capital — ${tabId}`);
  trackPageView(pagePath, pageTitle);
  trackEvent("tab_view", {
    tab_id: tabId,
    tab_name: tabLabel || tabId,
  });
}

const TAB_PATH_FALLBACK = {
  overview: "/",
  open: "/open",
  upcoming: "/upcoming",
  closed: "/closed",
  listed: "/listed",
  gmp: "/gmp",
  subscriptions: "/subscriptions",
  allotment: "/allotment",
  financials: "/financials",
  docs: "/docs",
  calculator: "/calculator",
  watchlist: "/watchlist",
  demat: "/demat",
};

export function isAnalyticsEnabled() {
  return Boolean(MEASUREMENT_ID);
}
