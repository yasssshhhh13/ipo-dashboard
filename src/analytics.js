/**
 * Google Analytics 4 helpers for Calm Capital.
 * Loads only when VITE_GA_MEASUREMENT_ID is set (e.g. in Vercel or .env.local).
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

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
  const pagePath = path || window.location.pathname + window.location.search;
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_title: title || document.title,
    page_location: window.location.origin + pagePath,
  });
}

export function trackEvent(name, params = {}) {
  if (!MEASUREMENT_ID || typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

export function trackTabView(tabId, tabLabel) {
  if (!tabId) return;
  const path = `/tab/${tabId}`;
  const title = tabLabel ? `${tabLabel} | Calm Capital` : `Calm Capital — ${tabId}`;
  trackPageView(path, title);
  trackEvent("tab_view", {
    tab_id: tabId,
    tab_name: tabLabel || tabId,
  });
}

export function isAnalyticsEnabled() {
  return Boolean(MEASUREMENT_ID);
}
