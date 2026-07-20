/**
 * Local preference keys written by Calm Capital.
 * None of these are passwords/emails — they are device-local UI prefs —
 * but users can wipe them via "Clear my local data".
 */
export const LOCAL_DATA_KEYS = [
  "calmcapital-notifications",
  "calmcapital-notif-seen-realtime",
  "ipo-watchlist",
  "calmcapital-subscriptions-filter",
  "calmcapital-financials-filter",
  "calmcapital-documents-filter",
  "calmcapital-tab",
  "calmcapital-theme",
  "ipo-live-data-url",
];

/** Remove all Calm Capital keys from localStorage. Returns count removed. */
export function clearLocalUserData() {
  if (typeof localStorage === "undefined") return 0;
  let removed = 0;
  for (const key of LOCAL_DATA_KEYS) {
    if (localStorage.getItem(key) != null) {
      localStorage.removeItem(key);
      removed += 1;
    }
  }
  return removed;
}
