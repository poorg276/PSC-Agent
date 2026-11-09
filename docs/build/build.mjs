import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = import.meta.dirname;
const src = join(root, "src");
const outDir = resolve(root, "..");
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const partLabels = new Map([
  ["第一部分 · 产品使用说明书", "PART I · 产品使用说明书"],
  ["第二部分 · 技术栈与架构", "PART II · 技术栈与架构"],
  ["第三部分 · 故障案例与支持手册", "PART III · 故障案例与支持手册"],
  ["附录", "APPENDIX · 附录与核查记录"],
]);

function read(name) {
  return readFileSync(join(src, name), "utf8");
}

let body = [read("front.html"), read("part1.html"), read("part2.html"), read("part3.html"), read("appendix.html"), read("appendix-ef.html")].join("\n");

body = body.replace(/<section class="chapter[^>]*>([\s\S]*?)<\/section>/g, (full, inner) => {
  const h2 = inner.indexOf("<h2>");
  if (h2 < 0) return full;
  const close = inner.indexOf("</h2>", h2);
  if (close < 0) return full;
  const cut = close + 5;
  const openEnd = full.indexOf(">") + 1;
  const openTag = full.slice(0, openEnd);
  return `${openTag}<div class="chapter-opening">${inner.slice(0, cut)}</div>${inner.slice(cut)}</section>`;
});

const sectionRe = /<section class="chapter[^"]*" id="([^"]+)" data-num="([^"]+)" data-title="([^"]+)" data-part="([^"]+)" data-pm="([^"]+)">/g;
const sections = [];
for (const m of body.matchAll(sectionRe)) {
  const section = { id: m[1], num: m[2], title: m[3], part: m[4], pm: m[5].replace(/[\[\]]/g, "") };
  const start = body.indexOf(`id="${section.id}"`);
  const end = body.indexOf("</section>", start);
  const block = body.slice(start, end);
  const km = block.match(/<div class="kicker">([\s\S]*?)<\/div>/);
  section.kicker = km ? km[1] : section.title;
  sections.push(section);
}
if (!sections.length) throw new Error("No sections found");

function tocHtml() {
  let html = '<nav class="toc">';
  let last = "";
  for (const s of sections) {
    if (s.part !== last) {
      html += `<div class="toc-part">${partLabels.get(s.part) ?? s.part}</div>`;
      last = s.part;
    }
    html += `<a class="toc-row" href="#${s.id}"><span class="toc-num">${s.num}</span><span class="toc-title">${s.title}</span><span class="toc-page-no" data-pm="${s.pm}">—</span></a>`;
  }
  html += "</nav>";
  return html;
}

function documentHtml(pages = new Map()) {
  let toc = tocHtml();
  toc = toc.replace(/<span class="toc-page-no" data-pm="([^"]+)">—<\/span>/g, (all, pm) => {
    const page = pages.get(pm);
    return `<span class="toc-page-no" data-pm="${pm}">${page ?? "—"}</span>`;
  });
  const html = body.replace("<!--TOC-->", toc);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>PiCareer 产品说明书与技术架构</title><link rel="stylesheet" href="doc.css"></head><body>${html}</body></html>`;
}

function render(html, outPdf) {
  writeFileSync(join(src, "doc.html"), html, "utf8");
  if (existsSync(outPdf)) execFileSync("powershell", ["-NoProfile", "-Command", `Remove-Item -LiteralPath '${outPdf.replaceAll("'", "''")}' -Force`]);
  const url = pathToFileURL(join(src, "doc.html")).href;
  execFileSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=12000",
    `--print-to-pdf=${outPdf}`,
    "--no-pdf-header-footer",
    url,
  ], { stdio: "pipe", timeout: 120000 });
}

async function extract(pdfPath) {
  const pdfjs = await import(pathToFileURL("E:/Agent_learn/Project/pi_agent/PiCareer/node_modules/pdfjs-dist/legacy/build/pdf.mjs").href);
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const map = new Map();
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((x) => x.str ?? "").join("").replace(/\s+/g, "");
    pages.push(text);
    const ascii = text.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    for (const s of sections) {
      const k = String(s.kicker ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (k && ascii.includes(k) && !map.has(s.pm)) map.set(s.pm, i);
    }
  }
  const viewport = (await (await doc.getPage(1)).getViewport({ scale: 1 }));
  return { pages: doc.numPages, map, width: Math.round(viewport.width), height: Math.round(viewport.height), textPages: pages };
}

const work = join(root, "work");
mkdirSync(work, { recursive: true });
let pages = new Map();
let lastKey = "";
let finalPdf = "";
for (let pass = 1; pass <= 3; pass++) {
  const pdf = join(work, `pass${pass}.pdf`);
  render(documentHtml(pages), pdf);
  const info = await extract(pdf);
  const key = sections.map((s) => `${s.pm}:${info.map.get(s.pm) ?? "-"}`).join("|");
  console.log(`pass ${pass}: ${info.pages} pages, ${info.width}x${info.height}, markers ${info.map.size}/${sections.length}`);
  const missing = sections.filter((s) => !info.map.has(s.pm));
  if (missing.length) console.warn("missing markers:", missing.map((s) => s.pm).join(", "));
  if (key === lastKey && pass > 1) {
    finalPdf = pdf;
    break;
  }
  lastKey = key;
  pages = info.map;
  finalPdf = pdf;
}

if (!finalPdf) throw new Error("render failed");
const finalInfo = await extract(finalPdf);
const target = join(outDir, "PiCareer-产品说明书与技术架构-v0.1.15.pdf");
copyFileSync(finalPdf, target);
console.log(`final: ${target}`);
console.log(`pages: ${finalInfo.pages}; size: ${finalInfo.width}x${finalInfo.height}`);
console.log("toc pages:", sections.map((s) => `${s.num}=${finalInfo.map.get(s.pm) ?? "?"}`).join(" "));
