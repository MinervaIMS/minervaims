// PayoffLab — encoded share URLs (§13). Serialises the FULL dashboard state
// (inputs only — never any pricing code, so sharing is safe) to a compact
// URL-safe string: JSON → deflate (CompressionStream) → base64url. This is
// the only persistence mechanism; there are no account-saved portfolios.

import type { LabState } from "./types";
import { initialLabState } from "./types";

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  void writer.write(bytes.slice().buffer as ArrayBuffer);
  void writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export async function encodeState(state: LabState): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(state));
  if (typeof CompressionStream !== "undefined") {
    const deflated = await pipe(json, new CompressionStream("deflate-raw"));
    return "z" + bytesToBase64Url(deflated);
  }
  return "j" + bytesToBase64Url(json);
}

export async function decodeState(encoded: string): Promise<LabState | null> {
  try {
    const kind = encoded[0];
    const bytes = base64UrlToBytes(encoded.slice(1));
    let json: string;
    if (kind === "z") {
      const inflated = await pipe(bytes, new DecompressionStream("deflate-raw"));
      json = new TextDecoder().decode(inflated);
    } else if (kind === "j") {
      json = new TextDecoder().decode(bytes);
    } else {
      return null;
    }
    const parsed = JSON.parse(json) as LabState;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.charts) || parsed.charts.length === 0) return null;
    // Merge over a fresh state so missing fields fall back to safe defaults.
    const base = initialLabState();
    return { ...base, ...parsed, charts: parsed.charts.slice(0, 4) };
  } catch {
    return null;
  }
}

export async function shareUrlFor(state: LabState): Promise<string> {
  const s = await encodeState(state);
  const url = new URL(window.location.href);
  url.search = `?s=${s}`;
  url.hash = "";
  return url.toString();
}
