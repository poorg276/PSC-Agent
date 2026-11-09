import { readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dir = import.meta.dirname;
const dbPath = join(dir, "picareer-knowledge.sqlite");
if (existsSync(dbPath)) rmSync(dbPath);

const readJsonl = (name) => readFileSync(join(dir, name), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const chapters = readJsonl("chapters.jsonl");
const sections = readJsonl("sections.jsonl");

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode=DELETE;
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE chunks (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    chapter_no TEXT NOT NULL,
    title TEXT NOT NULL,
    section_title TEXT,
    part TEXT NOT NULL,
    version TEXT NOT NULL,
    source_docs TEXT NOT NULL,
    evidence_level TEXT NOT NULL,
    page_start INTEGER NOT NULL,
    page_end INTEGER NOT NULL,
    tags TEXT NOT NULL,
    case_ids TEXT NOT NULL,
    content TEXT NOT NULL,
    content_sha256 TEXT NOT NULL
  );
  CREATE INDEX idx_chunks_version ON chunks(version);
  CREATE INDEX idx_chunks_kind ON chunks(kind);
  CREATE INDEX idx_chunks_chapter ON chunks(chapter_no);
`);

let ftsMode = "fts5-trigram";
try {
  db.exec("CREATE VIRTUAL TABLE chunks_fts USING fts5(id UNINDEXED, title, tags, content, tokenize='trigram')");
} catch (e) {
  ftsMode = "like-fallback";
  db.exec("CREATE TABLE chunks_fts (id TEXT PRIMARY KEY, title TEXT, tags TEXT, content TEXT)");
}

const insert = db.prepare(`INSERT INTO chunks VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insertFts = db.prepare(`INSERT INTO chunks_fts (id,title,tags,content) VALUES (?,?,?,?)`);
db.exec("BEGIN IMMEDIATE");
try {
  for (const row of [...chapters, ...sections]) {
    insert.run(
      row.id, row.kind, row.chapter_no, row.title, row.section_title ?? null, row.part,
      row.version, JSON.stringify(row.source_docs), row.evidence_level,
      row.page_start, row.page_end, JSON.stringify(row.tags ?? []), JSON.stringify(row.case_ids ?? []),
      row.content, row.content_sha256,
    );
    insertFts.run(row.id, row.title, (row.tags ?? []).join(" "), row.content);
  }
  const meta = db.prepare("INSERT INTO meta VALUES (?,?)");
  meta.run("manifest", JSON.stringify(manifest));
  meta.run("index_mode", ftsMode);
  meta.run("built_at", new Date().toISOString());
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.close();
console.log(`indexed ${chapters.length + sections.length} chunks into ${dbPath}`);
console.log(`mode=${ftsMode}`);
