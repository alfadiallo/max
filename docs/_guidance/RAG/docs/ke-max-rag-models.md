## RAG AI Model Stack (2025-11-10)

Max RAG currently relies on the following AI models and providers:

- **OpenAI `text-embedding-3-small`** – Embedding model used by the ingestion worker to vectorize each chunked segment before storage in `content_segments`.
- **Anthropic Claude (auto-selected among `claude-3-5-sonnet`, `claude-3-opus`, `claude-3-haiku`)** – Segment enrichment model that scores persona relevance, classifies content type, and extracts entities/relationships.
- **GPT-5 Codex (Cursor agent)** – Coding assistant used for automation tasks in this workspace.

> Last updated: 2025-11-10.


