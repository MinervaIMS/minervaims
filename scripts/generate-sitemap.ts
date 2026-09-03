import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://minervaims.org";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "weekly", priority: "0.8" },
  { path: "/people/members", changefreq: "weekly", priority: "0.8" },
  { path: "/people/alumni", changefreq: "weekly", priority: "0.8" },
  { path: "/events", changefreq: "weekly", priority: "0.8" },
  { path: "/join", changefreq: "weekly", priority: "0.9" },
  { path: "/apply", changefreq: "weekly", priority: "0.8" },
  { path: "/archive", changefreq: "weekly", priority: "0.7" },
  { path: "/readings", changefreq: "weekly", priority: "0.7" },
  { path: "/contacts", changefreq: "monthly", priority: "0.7" },
  { path: "/partnerships", changefreq: "monthly", priority: "0.7" },
  { path: "/lab", changefreq: "monthly", priority: "0.6" },

  // Divisions
  { path: "/divisions/equity", changefreq: "monthly", priority: "0.7" },
  { path: "/divisions/investment", changefreq: "monthly", priority: "0.7" },
  { path: "/divisions/macro", changefreq: "monthly", priority: "0.7" },
  { path: "/divisions/portfolio", changefreq: "monthly", priority: "0.7" },
  { path: "/divisions/quant", changefreq: "monthly", priority: "0.7" },

  // Funds
  { path: "/funds/long-short", changefreq: "monthly", priority: "0.7" },
  { path: "/funds/multi-asset", changefreq: "monthly", priority: "0.7" },
  { path: "/funds/dps", changefreq: "monthly", priority: "0.6" },
  { path: "/funds/pir", changefreq: "monthly", priority: "0.6" },

  // Legal / utility pages
  { path: "/sitemap", changefreq: "monthly", priority: "0.3" },
  { path: "/statute", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/cookie-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-of-use", changefreq: "yearly", priority: "0.3" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
];

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
