// ---------------------------------------------------------------------------
// PayoffLab pricing engine — numerical foundations.
//
// PROPRIETARY SERVER-SIDE MODULE. This file (and everything under engine/)
// is imported only by the `pricing-engine` Supabase Edge Function. It must
// never be imported from any client file, so Vite can never bundle it.
//
// Dependency-free TypeScript (no Deno / Node APIs) so the same sources run
// in the Deno edge runtime and under `node --experimental-strip-types` for
// the correctness test-suite in engine/tests/.
// ---------------------------------------------------------------------------

export const SQRT_2PI = Math.sqrt(2 * Math.PI);

/** Standard normal probability density. */
export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/**
 * Standard normal CDF — Graeme West's double-precision algorithm
 * ("Better approximations to cumulative normal functions", Wilmott 2005).
 * Absolute error below 1e-15 across the real line.
 */
export function normCdf(x: number): number {
  const z = Math.abs(x);
  let c: number;
  if (z > 37) {
    c = 0;
  } else {
    const e = Math.exp((-z * z) / 2);
    if (z < 7.07106781186547) {
      const n =
        ((((((3.52624965998911e-2 * z + 0.700383064443688) * z + 6.37396220353165) * z + 33.912866078383) * z +
          112.079291497871) *
          z +
          221.213596169931) *
          z +
          220.206867912376) *
        e;
      const d =
        (((((((8.83883476483184e-2 * z + 1.75566716318264) * z + 16.064177579207) * z + 86.7807322029461) * z +
          296.564248779674) *
          z +
          637.333633378831) *
          z +
          793.826512519948) *
          z +
          440.413735824752);
      c = n / d;
    } else {
      const b = z + 0.65;
      c = e / (SQRT_2PI * (z + 1 / (z + 2 / (z + 3 / (z + 4 / b)))));
    }
  }
  return x <= 0 ? c : 1 - c;
}

/**
 * Inverse standard normal CDF — Acklam's rational approximation refined with
 * one Halley step against normCdf, giving near machine precision.
 */
export function normInv(p: number): number {
  if (!(p > 0 && p < 1)) {
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;
    return NaN;
  }
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let x: number;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pl) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // One Halley refinement step.
  const e = normCdf(x) - p;
  const u = e * SQRT_2PI * Math.exp((x * x) / 2);
  x = x - u / (1 + (x * u) / 2);
  return x;
}

// --- Gauss–Legendre abscissae/weights used by the Genz bivariate normal ---
const GL6_W = [0.1713244923791705, 0.3607615730481384, 0.4679139345726904];
const GL6_X = [0.9324695142031522, 0.6612093864662647, 0.238619186083197];
const GL12_W = [0.04717533638651177, 0.1069393259953183, 0.1600783285433464, 0.2031674267230659, 0.2334925365383547, 0.2491470458134029];
const GL12_X = [0.9815606342467191, 0.904117256370475, 0.769902674194305, 0.5873179542866171, 0.3678314989981802, 0.1252334085114692];
const GL20_W = [0.01761400713915212, 0.04060142980038694, 0.06267204833410906, 0.08327674157670475, 0.1019301198172404, 0.1181945319615184, 0.1316886384491766, 0.1420961093183821, 0.1491729864726037, 0.1527533871307259];
const GL20_X = [0.9931285991850949, 0.9639719272779138, 0.9122344282513259, 0.8391169718222188, 0.7463319064601508, 0.636053680726515, 0.5108670019508271, 0.3737060887154196, 0.2277858511416451, 0.07652652113349733];

/**
 * Genz (2004) algorithm: upper-tail bivariate normal probability
 * P(X > dh, Y > dk) for standard normals with correlation r.
 */
function bvnu(dh: number, dk: number, r: number): number {
  if (!isFinite(dh) || !isFinite(dk)) {
    if (dh === Infinity || dk === Infinity) return 0;
    if (dh === -Infinity) return normCdf(-dk);
    if (dk === -Infinity) return normCdf(-dh);
  }
  const twopi = 2 * Math.PI;
  let h = dh;
  let k = dk;
  let hk = h * k;
  let bvn = 0;
  let w: number[];
  let x: number[];
  const ar = Math.abs(r);
  if (ar < 0.3) {
    w = GL6_W; x = GL6_X;
  } else if (ar < 0.75) {
    w = GL12_W; x = GL12_X;
  } else {
    w = GL20_W; x = GL20_X;
  }
  if (ar < 0.925) {
    if (ar > 0) {
      const hs = (h * h + k * k) / 2;
      const asr = Math.asin(r);
      for (let i = 0; i < w.length; i++) {
        for (const is of [-1, 1]) {
          const sn = Math.sin((asr * (is * x[i] + 1)) / 2);
          bvn += w[i] * Math.exp((sn * hk - hs) / (1 - sn * sn));
        }
      }
      bvn = (bvn * asr) / (2 * twopi);
    }
    bvn += normCdf(-h) * normCdf(-k);
  } else {
    if (r < 0) {
      k = -k;
      hk = -hk;
    }
    if (ar < 1) {
      const as0 = (1 - r) * (1 + r);
      let a = Math.sqrt(as0);
      const bs = (h - k) * (h - k);
      const c = (4 - hk) / 8;
      const d = (12 - hk) / 16;
      let asr = -(bs / as0 + hk) / 2;
      if (asr > -100) {
        bvn = a * Math.exp(asr) * (1 - (c * (bs - as0) * (1 - (d * bs) / 5)) / 3 + (c * d * as0 * as0) / 5);
      }
      if (-hk < 100) {
        const b = Math.sqrt(bs);
        const sp = SQRT_2PI * normCdf(-b / a);
        bvn -= Math.exp(-hk / 2) * sp * b * (1 - (c * bs * (1 - (d * bs) / 5)) / 3);
      }
      a = a / 2;
      for (let i = 0; i < w.length; i++) {
        for (const is of [-1, 1]) {
          const xs = Math.pow(a * (is * x[i] + 1), 2);
          const rs = Math.sqrt(1 - xs);
          asr = -(bs / xs + hk) / 2;
          if (asr > -100) {
            const sp = 1 + c * xs * (1 + d * xs);
            const ep = Math.exp((-hk * (1 - rs)) / (2 * (1 + rs))) / rs;
            bvn += a * w[i] * Math.exp(asr) * (ep - sp);
          }
        }
      }
      bvn = -bvn / twopi;
    }
    if (r > 0) {
      bvn += normCdf(-Math.max(h, k));
    } else {
      bvn = -bvn;
      if (k > h) bvn += normCdf(k) - normCdf(h);
    }
  }
  return Math.max(0, Math.min(1, bvn));
}

/**
 * Bivariate standard normal CDF M(a, b; rho) = P(X <= a, Y <= b).
 * Accuracy ~1e-14 (Genz 2004).
 */
export function bivNormCdf(a: number, b: number, rho: number): number {
  const r = Math.max(-1, Math.min(1, rho));
  if (r === 1) return normCdf(Math.min(a, b));
  if (r === -1) return Math.max(0, normCdf(a) + normCdf(b) - 1);
  return bvnu(-a, -b, r);
}

// ---------------------------------------------------------------------------
// Deterministic pseudo-random numbers (sfc32) + inverse-transform normals.
// Seeded so Monte Carlo results are reproducible and common-random-number
// finite differences are smooth.
// ---------------------------------------------------------------------------

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number) {
    // splitmix32-style scramble of the seed into four sfc32 state words.
    let s = seed >>> 0;
    const next = () => {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
      z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
      return (z ^ (z >>> 15)) >>> 0;
    };
    this.a = next();
    this.b = next();
    this.c = next();
    this.d = next();
    for (let i = 0; i < 12; i++) this.next();
  }

  /** Uniform in (0, 1), never exactly 0 or 1. */
  next(): number {
    this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    const u = ((t >>> 0) + 0.5) / 4294967296;
    return u;
  }

  /** Standard normal via inverse transform (pairs cleanly with antithetics). */
  normal(): number {
    return normInv(this.next());
  }
}

/** Machine-safe clamp helper. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
