# PiCareer 知识库导入包

本目录把《PiCareer 产品说明书与技术架构》按章节与二级标题切分，标注产品版本、来源文档、证据等级与 PDF 页码范围，并提供校验、SQLite FTS5 导入与命令行检索。目标是让支持 Agent 回答“哪一章、哪个版本、依据是什么”，而不是把整本 PDF 当成一个检索片段。

## 内容

| 文件 | 说明 |
|---|---|
| `manifest.json` | 文档版本、产品版本、PDF SHA-256、页数、片段统计 |
| `chapters.jsonl` | 按章节切分的片段，30 条 |
| `sections.jsonl` | 按二级标题细分的片段，128 条 |
| `schema.json` | 片段字段定义 |
| `build.mjs` | 从 `build/src/*.html` 与最终 PDF 重新生成片段 |
| `validate.mjs` | 校验 ID、版本、来源、页码、正文摘要与 PDF 同步 |
| `build-index.mjs` | 导入 SQLite 并建立 FTS5 trigram 索引 |
| `query.mjs` | 命令行检索 |
| `picareer-knowledge.sqlite` | 生成的知识索引（运行后产生） |

当前基线：产品 `0.1.15`，文档 `1.1`，PDF 44 页，PDF SHA-256 见 `manifest.json`。

## 片段字段

- `id`：稳定 ID，如 `pc-0.1.15-p1c1`；section 追加 `-s01`。
- `doc_id`：固定 `picareer-manual-tech`。
- `kind`：`chapter` 或 `section`。
- `chapter_no` / `title` / `section_title` / `part`：展示与过滤。
- `version`：适用产品版本，当前为 `0.1.15`。
- `source_docs`：该章依据的项目文档、代码或本次验收记录。
- `evidence_level`：`A` 本次复现／源码核对，`B` 项目验收记录，`C` 产品说明与设计约定。
- `page_start` / `page_end`：在最终 PDF 中的页码，便于人工回查。
- `tags` / `case_ids`：检索标签与关联故障案例。
- `content` / `content_sha256`：清理后的正文与摘要。

## 使用

```powershell
cd E:\Agent_learn\Project\PiCareer-Support

# 1. 重新生成片段（PDF 或章节源文件变化后）
node knowledge/build.mjs

# 2. 校验：ID 唯一、版本与来源非空、页码有效、摘要匹配、PDF 哈希同步
node knowledge/validate.mjs

# 3. 导入 SQLite 与 FTS5
node knowledge/build-index.mjs

# 4. 检索
node knowledge/query.mjs "严格匹配 岗位证据"
node knowledge/query.mjs "OAuth 1455 代理"
```

## 导入约定

1. 回答或生成工单时，检索结果必须带 `id`、`version`、`page_start` 与 `source_docs`；不要只复述正文。
2. 先按 `version` 过滤，再按 `kind` 选择：需要完整上下文用 chapter，需要精确命中用 section。
3. `evidence_level` 为 `C` 的内容只能作为产品说明，不应单独作为故障结论；故障结论优先使用 `A`/`B`。
4. 产品升级时新增版本片段并更新 `manifest.json` 的 `product_version` 与 PDF 哈希；旧版本片段保留，不静默覆盖。
5. 不把真实用户聊天、简历、密钥、数据库或含个人信息的截图放入本目录。

## 备注

- 片段正文由 HTML 清理得到，保留标题、列表、表格文字与图注；不包含页眉页脚、隐藏的页码标记或图片二进制。
- `chapters.jsonl` 与 `sections.jsonl` 有内容重叠（section 是 chapter 的细分），检索时按 `kind` 去重或加权，不要直接拼接两套结果。
- `content_sha256` 用于检测正文变化；改变正文后必须重新生成，不要手改 JSONL。
