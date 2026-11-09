import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dir = import.meta.dirname;
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const readJsonl = (name) => readFileSync(join(dir, name), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const chapters = readJsonl("chapters.jsonl");
const sections = readJsonl("sections.jsonl");
const errors = [];
const warn = [];

const required = ["id", "doc_id", "kind", "chapter_no", "title", "version", "source_docs", "evidence_level", "page_start", "page_end", "content", "content_sha256"];
const ids = new Set();
const chapterIds = new Set(chapters.map((c) => c.id));

function checkRow(row, label) {
  for (const key of required) {
    if (row[key] === undefined || row[key] === null || row[key] === "") errors.push(`${label} ${row.id ?? "?"} missing ${key}`);
  }
  if (ids.has(row.id)) errors.push(`duplicate id ${row.id}`);
  ids.add(row.id);
  if (!/^pc-0\.1\.15-p\d+c\d+(?:-s\d{2})?$/.test(row.id)) errors.push(`${label} ${row.id} bad id format`);
  if (row.version !== manifest.product_version) errors.push(`${label} ${row.id} version ${row.version}`);
  if (!Array.isArray(row.source_docs) || !row.source_docs.length) errors.push(`${label} ${row.id} source_docs empty`);
  if (!["A", "B", "C"].includes(row.evidence_level)) errors.push(`${label} ${row.id} evidence_level`);
  if (!Number.isInteger(row.page_start) || !Number.isInteger(row.page_end)) errors.push(`${label} ${row.id} page not integer`);
  if (row.page_start < 1 || row.page_end < row.page_start || row.page_end > manifest.pdf_pages) errors.push(`${label} ${row.id} page range ${row.page_start}-${row.page_end}`);
  if (typeof row.content !== "string" || row.content.length < 40) errors.push(`${label} ${row.id} content too short`);
  const sha = createHash("sha256").update(row.content).digest("hex");
  if (sha !== row.content_sha256) errors.push(`${label} ${row.id} content_sha256 mismatch`);
  if (label === "chapter" && !row.content) errors.push(`chapter ${row.id} no content`);
  if (label === "section") {
    const cid = row.id.replace(/-s\d{2}$/, "");
    if (!chapterIds.has(cid)) errors.push(`section ${row.id} missing chapter ${cid}`);
    if (!row.section_title) errors.push(`section ${row.id} missing section_title`);
  }
}

chapters.forEach((r) => checkRow(r, "chapter"));
sections.forEach((r) => checkRow(r, "section"));

if (chapters.length !== manifest.chapter_count) errors.push(`chapter count ${chapters.length} != manifest ${manifest.chapter_count}`);
if (sections.length !== manifest.section_count) errors.push(`section count ${sections.length} != manifest ${manifest.section_count}`);

for (const c of chapters) {
  const own = sections.filter((s) => s.id.startsWith(c.id + "-s"));
  if (!own.length) errors.push(`chapter ${c.id} has no sections`);
}

const pdfPath = join(root, manifest.pdf_file);
if (!existsSync(pdfPath)) errors.push(`PDF missing: ${pdfPath}`);
else {
  const pdf = readFileSync(pdfPath);
  const sha = createHash("sha256").update(pdf).digest("hex");
  if (sha !== manifest.pdf_sha256) errors.push(`PDF sha mismatch: ${sha} != ${manifest.pdf_sha256}`);
}

const versions = new Set(chapters.map((c) => c.version));
if (versions.size !== 1) warn.push(`multiple versions: ${[...versions].join(",")}`);

console.log(`chapters=${chapters.length} sections=${sections.length} pages=${manifest.pdf_pages} version=${manifest.product_version}`);
console.log(`pdf_sha256=${manifest.pdf_sha256}`);
if (warn.length) console.log("warnings:", warn);
if (errors.length) {
  console.error(`FAILED with ${errors.length} error(s):`);
  for (const e of errors.slice(0, 50)) console.error(" -", e);
  process.exit(1);
}
console.log("OK: knowledge package is internally consistent and matches the PDF.");
