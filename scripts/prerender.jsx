import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import App from "../src/App.jsx";
import { seoLandingPages } from "../src/config/seoPages.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const distDir = path.join(projectRoot, "dist");
const distIndexPath = path.join(distDir, "index.html");
const siteOrigin = "https://xn--80ajchdgcktejxc.xn--p1ai";

function buildFaqSchema(page) {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (page.faqItems || []).map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      }))
    },
    null,
    2
  );
}

function renderPageMarkup(page) {
  return renderToStaticMarkup(React.createElement(App, { initialRouteOverride: { page: "landing", shareToken: null, seoPageKey: page.key } }));
}

function replaceMeta(html, page) {
  const canonical = `${siteOrigin}${page.path}`;

  return html
    .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${page.description}" />`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/, `<meta property="og:title" content="${page.title}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/, `<meta property="og:description" content="${page.description}" />`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${page.title}" />`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${page.description}" />`)
    .replace(
      /<script id="seo-page-faq-schema" type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<script id="seo-page-faq-schema" type="application/ld+json">\n${buildFaqSchema(page)}\n    </script>`
    );
}

async function writePageHtml(templateHtml, page) {
  const appMarkup = renderPageMarkup(page);

  if (!appMarkup) {
    throw new Error(`Prerender produced empty HTML for "${page.path}".`);
  }

  const withMarkup = templateHtml.replace('<div id="root"></div>', `<div id="root">${appMarkup}</div>`);
  if (withMarkup === templateHtml) {
    throw new Error(`Unable to inject prerendered markup for "${page.path}".`);
  }

  const finalHtml = replaceMeta(withMarkup, page);

  if (page.path === "/") {
    await fs.writeFile(distIndexPath, finalHtml, "utf8");
    return;
  }

  const targetDir = path.join(distDir, page.path.replace(/^\//, ""));
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "index.html"), finalHtml, "utf8");
}

async function prerenderPages() {
  const templateHtml = await fs.readFile(distIndexPath, "utf8");

  for (const page of seoLandingPages) {
    await writePageHtml(templateHtml, page);
  }
}

prerenderPages().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
