import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = join(import.meta.dirname, "picareer-knowledge.sqlite");
if (!existsSync(dbPath)) {
  console.error("Index not found. Run: node knowledge/build-index.mjs");
  process.exit(1);
}
const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error('Usage: node knowledge/query.mjs "严格匹配 岗位证据"');
  process.exit(1);
}
const db = new DatabaseSync(dbPath, { readOnly: true });
const mode = db.prepare("SELECT value FROM meta WHERE key='index_mode'").get()?.value ?? "fts5-trigram";
const terms = query.split(/\s+/).filter(Boolean);
const hasShort = terms.some((t) => [...t].length < 3);
let rows = [];
if (mode === "fts5-trigram" && !hasShort) {
  const fts = terms.map((t) => `"${t.replaceAll('"', '""')}"`).join(" AND ");
  try {
    rows = db.prepare(`
      SELECT c.id, c.title, c.section_title, c.version, c.evidence_level, c.page_start, c.page_end,
             snippet(chunks_fts, 3, '…', '…', '…', 14) AS snip
      FROM chunks_fts JOIN chunks c ON c.id = chunks_fts.id
      WHERE chunks_fts MATCH ?
      ORDER BY (CASE WHEN c.part LIKE '附录%' THEN 2 WHEN c.kind = 'chapter' THEN 1 ELSE 0 END), rank
      LIMIT 8
    `).all(fts);
  } catch {
    rows = [];
  }
}
if (!rows.length) {
  const where = terms.map(() => "(content LIKE ? OR title LIKE ? OR tags LIKE ?)").join(" AND ");
  const params = terms.flatMap((t) => {
    const like = `%${t.replaceAll("%", "\\%")}%`;
    return [like, like, like];
  });
  rows = db.prepare(`
    SELECT id, title, section_title, version, evidence_level, page_start, page_end,
           substr(content, 1, 220) AS snip
    FROM chunks WHERE ${where}
    ORDER BY (CASE WHEN part LIKE '附录%' THEN 2 WHEN kind = 'chapter' THEN 1 ELSE 0 END), page_start
    LIMIT 8
  `).all(...params);
}
if (!rows.length) {
  console.log("No results.");
} else {
  for (const r of rows) {
    console.log(`\n[${r.id}] ${r.title}${r.section_title ? " / " + r.section_title : ""}`);
    console.log(`  version=${r.version} evidence=${r.evidence_level} pages=${r.page_start}-${r.page_end}`);
    console.log(`  ${String(r.snip).replace(/\s+/g, " ").slice(0, 280)}`);
  }
}
db.close();
