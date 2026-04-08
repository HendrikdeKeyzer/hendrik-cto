/**
 * staticData.js — Static JSON data layer for GitHub Pages production build.
 *
 * In production (GitHub Pages), we cannot call HA or ENTSO-E directly because:
 *   1. No server-side proxy available (static hosting)
 *   2. VITE_* tokens would be exposed in the bundle
 *
 * Solution: a GitHub Actions cron job (every 15 min) fetches data server-side
 * using repository secrets, then commits the result to public/data.json.
 * The frontend reads that static file.
 *
 * In development: this module is not used; components call the real APIs.
 */

import { useEffect, useState } from 'react';

// Path is relative to the deployed base — Vite injects the base at build time.
const DATA_URL = `${import.meta.env.BASE_URL}data.json`;

// Cache the in-flight fetch so concurrent components share one request.
let _pendingFetch = null;
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

async function loadData() {
  const now = Date.now();
  if (_cache && now - _cacheTs < CACHE_TTL_MS) return _cache;
  if (_pendingFetch) return _pendingFetch;

  _pendingFetch = fetch(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`data.json: HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      _cache = data;
      _cacheTs = Date.now();
      _pendingFetch = null;
      return data;
    })
    .catch((err) => {
      _pendingFetch = null;
      throw err;
    });

  return _pendingFetch;
}

/**
 * React hook — fetches static data.json and returns { status, data, error }.
 * Refreshes every 15 minutes to pick up new cron commits.
 */
export function useStaticData() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await loadData();
        if (!cancelled) setState({ status: 'ok', data });
      } catch (err) {
        if (!cancelled) setState({ status: 'error', error: err.message });
      }
    }

    load();
    // Re-fetch every 15 minutes — matches the cron cadence.
    const timer = setInterval(() => {
      _cache = null; // bust cache
      load();
    }, 15 * 60_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return state;
}

/**
 * True when running as a production build (GitHub Pages).
 * Components use this to switch between live API calls and static JSON.
 */
export const IS_PROD = import.meta.env.PROD;
