import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const srcDir = join(root, "build", "src");
const pdfPath = join(root, "PiCareer-产品说明书与技术架构-v0.1.15.pdf");
const outDir = join(root, "knowledge");
const DOC_ID = "picareer-manual-tech";
const VERSION = "0.1.15";
const DOC_VERSION = "1.1";
const files = ["front.html", "part1.html", "part2.html", "part3.html", "appendix.html", "appendix-ef.html"];
const body = files.map((f) => readFileSync(join(srcDir, f), "utf8")).join("\n");

const sourceMap = {
  p1c1: ["README.md", "docs/ARCHITECTURE.md"],
  p1c2: ["README.md", "docs/ACCEPTANCE.md"],
  p1c3: ["README.md", "docs/AUTHORIZATION-0.1.2.md", "docs/AUTHORIZATION-0.1.3.md"],
  p1c4: ["README.md", "docs/DASHBOARD-0.1.10.md", "docs/DASHBOARD-0.1.12.md"],
  p1c5: ["README.md", "docs/AGENT-0.1.4.md", "docs/AGENT-0.1.5.md", "docs/AGENT-0.1.6.md"],
  p1c6: ["README.md", "docs/RESUME-0.1.11.md", "docs/RESUME-0.1.13.md", "docs/RESUME-0.1.15.md"],
  p1c7: ["README.md", "docs/JOBS-0.1.7.md", "docs/JOBS-0.1.8.md", "docs/JOBS-0.1.14.md"],
  p1c8: ["README.md", "docs/CODING-0.1.9.md", "docs/RESUME-0.1.15.md"],
  p1c9: ["README.md", "src/core/store.ts", "docs/MAINTENANCE.md"],
  p1c10: ["README.md", "src/desktop/main.ts"],
  p2c1: ["docs/ARCHITECTURE.md", "package.json"],
  p2c2: ["docs/ARCHITECTURE.md", "src/desktop/main.ts", "src/desktop/worker.ts"],
  p2c3: ["docs/ARCHITECTURE.md", "src/desktop/main.ts", "src/desktop/public-web.ts"],
  p2c4: ["docs/ARCHITECTURE.md", "src/core/service.ts", "src/core/pi.ts"],
  p2c5: ["src/core/store.ts", "docs/ARCHITECTURE.md"],
  p2c6: ["src/core/pi.ts", "resources/pi-source.json"],
  p2c7: ["src/core/public-web.ts", "src/core/search.ts", "src/desktop/public-web.ts"],
  p2c8: ["src/core/jobs.ts", "src/core/resume.ts", "src/core/resume-material-worker.ts"],
  p2c9: ["scripts/build.mjs", "scripts/prepare-sdk.mjs", "docs/MAINTENANCE.md"],
  p3c1: ["docs/ACCEPTANCE.md"],
  p3c2: ["docs/AUTHORIZATION-0.1.2.md", "docs/AUTHORIZATION-0.1.3.md"],
  p3c3: ["docs/AGENT-0.1.4.md", "docs/AGENT-0.1.5.md", "docs/AGENT-0.1.6.md"],
  p3c4: ["docs/JOBS-0.1.7.md", "docs/JOBS-0.1.14.md", "docs/DASHBOARD-0.1.12.md"],
  p3c5: ["docs/RESUME-0.1.15.md", "docs/CODING-0.1.9.md"],
  p3c6: ["docs/ACCEPTANCE.md", "docs/MAINTENANCE.md"],
  p4c1: ["README.md", "docs/ACCEPTANCE.md"],
  p4c2: ["README.md"],
  p4c3: ["README.md", "docs/ARCHITECTURE.md"],
  p4c4: ["PiCareer-产品说明书与技术架构-v0.1.15.pdf", "本次核查记录"],
  p4c5: ["PiCareer-产品说明书与技术架构-v0.1.15.pdf", "本次真实模型验收（2026-11-09）"],
  p4c6: ["knowledge/README.md", "knowledge/manifest.json"],
};

const tagsMap = {
  p1c1: ["概览", "模块", "版本", "边界"],
  p1c2: ["安装", "启动", "数据目录", "升级"],
  p1c3: ["模型", "API", "OAuth", "Tavily", "代理"],
  p1c4: ["工作台", "资讯", "招聘入口", "知识点"],
  p1c5: ["Agent", "工具", "审批", "Skills", "删除"],
  p1c6: ["简历", "材料", "事实核验", "版本"],
  p1c7: ["岗位", "严格匹配", "证据", "手动录入"],
  p1c8: ["面试", "Hot100", "知识背诵"],
  p1c9: ["数据", "备份", "恢复", "SQLite"],
  p1c10: ["安全", "隐私", "FAQ"],
  p2c1: ["技术栈", "版本"],
  p2c2: ["进程", "IPC", "数据流"],
  p2c3: ["Electron", "CSP", "safeStorage", "代理"],
  p2c4: ["React", "界面", "Markdown"],
  p2c5: ["Service", "SQLite", "数据模型"],
  p2c6: ["Pi SDK", "Agent", "工具", "会话"],
  p2c7: ["网络", "搜索", "SSRF", "代理"],
  p2c8: ["岗位管线", "简历管线", "证据"],
  p2c9: ["构建", "测试", "发布"],
  p3c1: ["案例", "方法", "证据等级"],
  p3c2: ["授权", "启动", "数据库版本"],
  p3c3: ["聊天", "删除", "产物"],
  p3c4: ["岗位", "官网", "资讯"],
  p3c5: ["简历", "刷题", "模型"],
  p3c6: ["支持", "分诊", "索引"],
  p4c1: ["版本", "时间线"],
  p4c2: ["术语"],
  p4c3: ["资料", "代码"],
  p4c4: ["核查", "复现"],
  p4c5: ["真实模型", "验收", "延迟"],
  p4c6: ["知识库", "切分", "导入"],
};

const evidenceMap = {
  p1c1: "C", p1c2: "B", p1c3: "B", p1c4: "B", p1c5: "B", p1c6: "B", p1c7: "B", p1c8: "B", p1c9: "B", p1c10: "C",
  p2c1: "B", p2c2: "B", p2c3: "B", p2c4: "B", p2c5: "B", p2c6: "B", p2c7: "B", p2c8: "B", p2c9: "B",
  p3c1: "B", p3c2: "A", p3c3: "B", p3c4: "B", p3c5: "A", p3c6: "B",
  p4c1: "B", p4c2: "C", p4c3: "C", p4c4: "A", p4c5: "A", p4c6: "C",
};

function decode(s) {
  return s
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function htmlToText(html) {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<span class="pm">[\s\S]*?<\/span>/g, "");
  s = s.replace(/<div class="chapter-head">[\s\S]*?<div class="no">[\s\S]*?<\/div>\s*<\/div>/g, "");
  s = s.replace(/<img[^>]*>/gi, "");
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n## ${t}\n`);
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n### ${t}\n`);
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<t[dh][^>]*>/gi, " | ");
  s = s.replace(/<\/(p|li|h1|h2|h3|tr|div|blockquote|pre)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decode(s);
  return s
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/^\| \| /gm, "| ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const sectionRe = /<section class="chapter[^"]*" id="([^"]+)" data-num="([^"]+)" data-title="([^"]+)" data-part="([^"]+)" data-pm="([^"]+)">([\s\S]*?)<\/section>/g;
const chapters = [];
for (const m of body.matchAll(sectionRe)) {
  const id = m[1];
  const inner = m[6];
  const km = inner.match(/<div class="kicker">([\s\S]*?)<\/div>/);
  const kicker = km ? htmlToText(km[1]) : m[3];
  const text = htmlToText(inner);
  chapters.push({
    id,
    chapter_no: m[2],
    title: m[3],
    part: m[4],
    kicker,
    text,
  });
}

const pdfjs = await import(pathToFileURL("E:/Agent_learn/Project/pi_agent/PiCareer/node_modules/pdfjs-dist/legacy/build/pdf.mjs").href);
const pdfData = new Uint8Array(readFileSync(pdfPath));
const pdfSha = createHash("sha256").update(pdfData).digest("hex");
const pdf = await pdfjs.getDocument({ data: pdfData, useSystemFonts: true }).promise;
const pageMap = new Map();
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const text = content.items.map((x) => x.str ?? "").join("").replace(/\s+/g, "");
  const ascii = text.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  for (const c of chapters) {
    const k = c.kicker.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (k && ascii.includes(k) && !pageMap.has(c.id)) pageMap.set(c.id, i);
  }
}

for (let i = 0; i < chapters.length; i++) {
  const c = chapters[i];
  c.page_start = pageMap.get(c.id) ?? 1;
}
for (let i = 0; i < chapters.length; i++) {
  const c = chapters[i];
  const next = chapters[i + 1]?.page_start;
  c.page_end = next ? Math.max(c.page_start, next - 1) : pdf.numPages;
}

function splitSections(chapter) {
  const text = chapter.text;
  const marks = [...text.matchAll(/^##\s+(.+)$/gm)];
  if (!marks.length) return [{ title: chapter.title, content: text }];
  const out = [];
  const intro = text.slice(0, marks[0].index).trim();
  if (intro) out.push({ title: "导言", content: intro });
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index;
    const end = marks[i + 1]?.index ?? text.length;
    const content = text.slice(start, end).trim();
    if (content) out.push({ title: marks[i][1].trim(), content });
  }
  return out;
}

const chaptersOut = [];
const sectionsOut = [];
for (const c of chapters) {
  const base = {
    doc_id: DOC_ID,
    chapter_no: c.chapter_no,
    title: c.title,
    part: c.part,
    version: VERSION,
    source_docs: sourceMap[c.id] ?? ["README.md"],
    evidence_level: evidenceMap[c.id] ?? "C",
    page_start: c.page_start,
    page_end: c.page_end,
    tags: tagsMap[c.id] ?? [],
    case_ids: c.id.startsWith("p3c") ? [...c.text.matchAll(/\bC\d{2}\b/g)].map((x) => x[0]).filter((v, i, a) => a.indexOf(v) === i) : [],
    content: c.text,
    content_sha256: createHash("sha256").update(c.text).digest("hex"),
  };
  base.id = `pc-${VERSION}-${c.id}`;
  base.kind = "chapter";
  chaptersOut.push(base);
  const parts = splitSections(c);
  parts.forEach((s, i) => {
    sectionsOut.push({
      ...base,
      id: `pc-${VERSION}-${c.id}-s${String(i + 1).padStart(2, "0")}`,
      kind: "section",
      section_title: s.title,
      content: s.content,
      content_sha256: createHash("sha256").update(s.content).digest("hex"),
    });
  });
}

const manifest = {
  doc_id: DOC_ID,
  doc_title: "PiCareer 产品说明书与技术架构",
  doc_version: DOC_VERSION,
  product_version: VERSION,
  pdf_file: "PiCareer-产品说明书与技术架构-v0.1.15.pdf",
  pdf_sha256: pdfSha,
  pdf_pages: pdf.numPages,
  generated_at: new Date().toISOString(),
  chapter_count: chaptersOut.length,
  section_count: sectionsOut.length,
  chunk_schema: "schema.json",
  source_note: "由 build/src 的章节源文件切分；页码由最终 PDF 的章节 kicker 映射。",
};

const schema = {
  type: "object",
  required: ["id", "doc_id", "kind", "chapter_no", "title", "version", "source_docs", "evidence_level", "page_start", "page_end", "content", "content_sha256"],
  properties: {
    id: { type: "string", description: "Stable chunk id" },
    doc_id: { type: "string" },
    kind: { enum: ["chapter", "section"] },
    chapter_no: { type: "string" },
    title: { type: "string" },
    section_title: { type: "string" },
    part: { type: "string" },
    version: { type: "string" },
    source_docs: { type: "array", items: { type: "string" } },
    evidence_level: { enum: ["A", "B", "C"] },
    page_start: { type: "integer" },
    page_end: { type: "integer" },
    tags: { type: "array", items: { type: "string" } },
    case_ids: { type: "array", items: { type: "string" } },
    content: { type: "string" },
    content_sha256: { type: "string" },
  },
};

const writeJsonl = (name, rows) => writeFileSync(join(outDir, name), rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
writeJsonl("chapters.jsonl", chaptersOut);
writeJsonl("sections.jsonl", sectionsOut);
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
writeFileSync(join(outDir, "schema.json"), JSON.stringify(schema, null, 2), "utf8");
console.log(manifest);
console.log("chapter ids", chaptersOut.map((c) => `${c.id}@${c.page_start}-${c.page_end}`).join(" "));
console.log("sections", sectionsOut.length);
