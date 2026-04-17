import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { indexableSeoLandingPages, seoSite } from "../src/config/seoPages.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const publicDir = path.join(projectRoot, "public");
const sitemapPath = path.join(publicDir, "sitemap.xml");
const robotsPath = path.join(publicDir, "robots.txt");
const seoPagesRuntimePath = path.join(publicDir, "seo-pages.js");

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildSitemapXml() {
  const urls = indexableSeoLandingPages
    .map((page) => {
      const isReferencePage = page.path === "/faq" || page.path === "/privacy-policy" || page.path === "/terms";
      const changefreq = page.path === "/" ? "weekly" : isReferencePage ? "monthly" : "weekly";
      const priority = page.path === "/" ? "1.0" : isReferencePage ? "0.5" : "0.9";

      return [
        "  <url>",
        `    <loc>${escapeXml(page.path === "/" ? `${seoSite.origin}/` : `${seoSite.origin}${page.path}/`)}</loc>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>"
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildRobotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /dashboard",
    "Disallow: /wishlist",
    "Disallow: /wishlists/",
    "Disallow: /shared/",
    "Disallow: /auth/yandex/callback",
    "",
    `Sitemap: ${seoSite.origin}/sitemap.xml`,
    ""
  ].join("\n");
}

function buildRuntimeSeoScript() {
  const pages = Object.fromEntries(indexableSeoLandingPages.map((page) => [page.path, { title: page.title, description: page.description }]));
  const homePage = indexableSeoLandingPages.find((page) => page.path === "/") || indexableSeoLandingPages[0] || {
    title: "Список желаний",
    description: ""
  };
  const payload = {
    origin: seoSite.origin,
    defaultPage: {
      title: homePage.title,
      description: homePage.description
    },
    defaults: {
      socialImagePath: seoSite.defaultSocialImagePath,
      socialImageAlt: seoSite.defaultSocialImageAlt
    },
    pages
  };

  return `window.__WISHLIST_SEO__ = ${JSON.stringify(payload, null, 2)};\n`;
}

async function syncSeoAssets() {
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(sitemapPath, buildSitemapXml(), "utf8");
  await fs.writeFile(robotsPath, buildRobotsTxt(), "utf8");
  await fs.writeFile(seoPagesRuntimePath, buildRuntimeSeoScript(), "utf8");
}

syncSeoAssets().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
