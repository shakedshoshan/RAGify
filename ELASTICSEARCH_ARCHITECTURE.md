# Elasticsearch Integration Architecture

## Current Architecture (Before Elasticsearch)

```
┌─────────────────────────────────────────────────────────────────┐
│                         RAGify Backend                          │
│                          (NestJS API)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌───────────┐      ┌───────────┐    ┌───────────┐
    │ Firestore │      │ Pinecone  │    │   Redis   │
    │           │      │  (Vector  │    │ (Cache)   │
    │  - projects       │   Store)  │    │           │
    │  - rawText│      │           │    │           │
    │  - chunks │      │           │    │           │
    └───────────┘      └───────────┘    └───────────┘
```

**Problem**: No full-text search on rawText content. Users can only retrieve by project_id or document ID.

---

## Proposed Architecture (With Elasticsearch)

```
┌─────────────────────────────────────────────────────────────────┐
│                         RAGify Backend                          │
│                          (NestJS API)                           │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────────────────────┐   │
│  │  Text Controller │  │  Search Controller (NEW)         │   │
│  │  - Create       │  │  - GET /search/rawtexts          │   │
│  │  - Update       │  │  - GET /search/suggest           │   │
│  │  - Delete       │  │                                   │   │
│  └────────┬────────┘  └──────────────┬───────────────────┘   │
│           │                           │                        │
│  ┌────────▼────────────┐   ┌─────────▼──────────┐           │
│  │ Firestore Service   │   │ Elasticsearch Service (NEW)  │   │
│  └─────────────────────┘   └────────────────────────────┘   │
└────────────┬────────────────────────────┬────────────────────┘
             │                            │
             │                            │
    ┌────────▼─────────┐         ┌───────▼──────────┐
    │                  │         │                   │
    │   Firestore      │◄────────┤  Elasticsearch   │
    │                  │ (Sync)  │                   │
    │  - projects      │         │  Index: rawtext  │
    │  - rawText       │         │                   │
    │  - chunks        │         │  - Full-text     │
    │                  │         │    search        │
    │ (Source of Truth)│         │  - Fuzzy match   │
    │                  │         │  - Suggestions   │
    └──────────────────┘         └──────────────────┘
```

---

## Data Flow Diagrams

### 1. Creating a New RawText Document

```
User Request
    │
    ▼
POST /text
    │
    ▼
┌────────────────────┐
│ Text Controller    │
│  createText()      │
└─────────┬──────────┘
          │
          ├──────────────────────────────┐
          │                              │
          ▼                              ▼
┌─────────────────┐          ┌──────────────────────┐
│ Firestore       │          │ Elasticsearch        │
│ Service         │          │ Service              │
│                 │          │                      │
│ addDocument()   │          │ indexRawText()       │
│   ↓             │          │   ↓                  │
│ Save to         │          │ Index to             │
│ rawText         │          │ 'rawtext' index      │
│ collection      │          │                      │
└─────────────────┘          └──────────────────────┘
          │                              │
          └──────────────┬───────────────┘
                         ▼
                  Return Success
                  with Document ID
```

### 2. Searching RawText Documents

```
User Request
    │
    ▼
GET /search/rawtexts?query=AI&project_id=123
    │
    ▼
┌────────────────────┐
│ Search Controller  │
│  searchRawTexts()  │
└─────────┬──────────┘
          │
          ▼
┌─────────────────────────┐
│ Elasticsearch Service   │
│                         │
│ searchRawText()         │
│   ↓                     │
│ Build Query:            │
│   - Match query: "AI"   │
│   - Filter: project_id  │
│   - Highlight matches   │
│   - Pagination          │
│   ↓                     │
│ Execute Search          │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────┐
│ Elasticsearch   │
│                 │
│ Search Index    │
│ Return Ranked   │
│ Results with    │
│ Highlights      │
└─────────┬───────┘
          │
          ▼
    Format & Return
    Search Results
```

### 3. Updating a RawText Document

```
User Request
    │
    ▼
PUT /text/:id
    │
    ▼
┌────────────────────┐
│ Text Controller    │
│  editText()        │
└─────────┬──────────┘
          │
          ├──────────────────────────────┐
          │                              │
          ▼                              ▼
┌─────────────────┐          ┌──────────────────────┐
│ Firestore       │          │ Elasticsearch        │
│ Service         │          │ Service              │
│                 │          │                      │
│ updateDocument()│          │ updateRawText()      │
│   ↓             │          │   ↓                  │
│ Update in       │          │ Update in            │
│ Firestore       │          │ 'rawtext' index      │
└─────────────────┘          └──────────────────────┘
          │                              │
          └──────────────┬───────────────┘
                         ▼
                  Return Success
```

### 4. Deleting a RawText Document

```
User Request
    │
    ▼
DELETE /text/:id
    │
    ▼
┌────────────────────┐
│ Text Controller    │
│  deleteText()      │
└─────────┬──────────┘
          │
          ├──────────────────────────────┐
          │                              │
          ▼                              ▼
┌─────────────────┐          ┌──────────────────────┐
│ Firestore       │          │ Elasticsearch        │
│ Service         │          │ Service              │
│                 │          │                      │
│ deleteDocument()│          │ deleteRawText()      │
│   ↓             │          │   ↓                  │
│ Delete from     │          │ Delete from          │
│ Firestore       │          │ 'rawtext' index      │
└─────────────────┘          └──────────────────────┘
          │                              │
          └──────────────┬───────────────┘
                         ▼
                  Return Success
```

### 5. Migrating Existing Data

```
npm run elastic:migrate
    │
    ▼
┌────────────────────────┐
│ Migration Script       │
│ elasticsearch-migrate  │
└─────────┬──────────────┘
          │
          ▼
┌─────────────────┐
│ Firestore       │
│ Service         │
│                 │
│ Get all rawText │
│ documents       │
└─────────┬───────┘
          │
          ▼
    All Documents
          │
          ▼
┌─────────────────────────┐
│ Elasticsearch Service   │
│                         │
│ bulkIndexRawTexts()     │
│   ↓                     │
│ Batch documents         │
│ (e.g., 100 at a time)   │
│   ↓                     │
│ Bulk index to ES        │
└─────────┬───────────────┘
          │
          ▼
    Log Progress
    & Completion
```

---

## Component Responsibilities

### Firestore Service
- **Role**: Source of truth for all data
- **Operations**: CRUD operations on rawText collection
- **No changes**: Existing functionality remains the same

### Elasticsearch Service (NEW)
- **Role**: Search layer for full-text search
- **Responsibilities**:
  - Maintain synchronized index of rawText documents
  - Execute search queries with filters and ranking
  - Provide autocomplete/suggestions
  - Handle bulk indexing operations
- **Operations**:
  - Index: Add documents to search index
  - Update: Modify indexed documents
  - Delete: Remove from index
  - Search: Full-text search with filters
  - Bulk: Batch operations for efficiency

### Text Controller
- **Modified**: Add Elasticsearch indexing calls after Firestore operations
- **Dual writes**: Every write goes to both Firestore AND Elasticsearch
- **Error handling**: ES failures don't block operations (log and continue)

### Search Controller (NEW)
- **Purpose**: Dedicated search endpoints
- **Endpoints**:
  - `/search/rawtexts`: Full-text search with filters
  - `/search/suggest`: Autocomplete for document names

---

## Search Query Examples

### Example 1: Simple Text Search
```json
Query: GET /search/rawtexts?query=machine learning

Elasticsearch Query:
{
  "query": {
    "multi_match": {
      "query": "machine learning",
      "fields": ["name^2", "text"]
    }
  }
}
```

### Example 2: Project-Filtered Search
```json
Query: GET /search/rawtexts?query=AI&project_id=proj123

Elasticsearch Query:
{
  "query": {
    "bool": {
      "must": {
        "multi_match": {
          "query": "AI",
          "fields": ["name^2", "text"]
        }
      },
      "filter": {
        "term": { "project_id": "proj123" }
      }
    }
  }
}
```

### Example 3: Fuzzy Search (Typo Tolerance)
```json
Query: GET /search/rawtexts?query=machne lerning

Elasticsearch Query:
{
  "query": {
    "multi_match": {
      "query": "machne lerning",
      "fields": ["name^2", "text"],
      "fuzziness": "AUTO"
    }
  }
}
```

### Example 4: Autocomplete Suggestions
```json
Query: GET /search/suggest?q=doc&project_id=proj123

Elasticsearch Query:
{
  "suggest": {
    "name-suggest": {
      "prefix": "doc",
      "completion": {
        "field": "name.suggest",
        "size": 5,
        "contexts": {
          "project_id": ["proj123"]
        }
      }
    }
  }
}
```

---

## Benefits of This Architecture

1. **Non-Intrusive**: Firestore remains the source of truth
2. **Backwards Compatible**: Existing endpoints continue to work
3. **Enhanced Search**: Full-text search, fuzzy matching, ranking
4. **Performance**: Elasticsearch optimized for search operations
5. **Scalability**: Can handle large text corpora efficiently
6. **User Experience**: Fast, relevant search results with highlights
7. **Fallback**: If ES fails, app still works (Firestore queries)

---

## Sync Strategy

### Write Path (Dual Write)
```
User Action → Firestore (Primary) → Elasticsearch (Secondary)
```
- Firestore writes are synchronous and blocking
- Elasticsearch writes are synchronous but failures are caught and logged
- If ES write fails, operation still succeeds (Firestore is source of truth)

### Read Path (ES for Search, Firestore for Details)
```
Search Query → Elasticsearch (Returns IDs + Highlights)
Document Details → Firestore (Full document data)
```
- Search uses Elasticsearch for speed and relevance
- Can optionally fetch full document from Firestore if needed
- Cache frequent searches in Redis

### Consistency Model
- **Eventually Consistent**: ES index may briefly lag behind Firestore
- **Self-Healing**: Migration script can re-index to fix inconsistencies
- **Monitoring**: Track sync success/failure rates

---

## Docker Services Layout

```
┌────────────────────────────────────────────────────┐
│              Docker Network: ragify-network        │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  Zookeeper   │  │    Kafka     │              │
│  │  :2181       │  │  :9092       │              │
│  └──────────────┘  └──────────────┘              │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  Kafka UI    │  │    Redis     │              │
│  │  :8080       │  │  :6379       │              │
│  └──────────────┘  └──────────────┘              │
│                                                    │
│  ┌───────────────────────────────┐                │
│  │  Elasticsearch (NEW)          │                │
│  │  :9200 (API)                  │                │
│  │  :9300 (Node comm)            │                │
│  └───────────────────────────────┘                │
│                                                    │
│  ┌───────────────────────────────┐                │
│  │  Kibana (NEW)                 │                │
│  │  :5601 (Web UI)               │                │
│  └───────────────────────────────┘                │
│                                                    │
│  ┌───────────────────────────────┐                │
│  │  RAGify Backend               │                │
│  │  :5000                        │                │
│  └───────────────────────────────┘                │
│                                                    │
└────────────────────────────────────────────────────┘

External Services (Cloud):
- Firestore (Google Cloud)
- Pinecone (Vector DB)
- OpenAI API
```

---

## Summary

This architecture adds Elasticsearch as a **search layer** while maintaining Firestore as the **source of truth**. All write operations dual-write to both systems, and search operations leverage Elasticsearch's powerful full-text search capabilities. The implementation is clean, maintainable, and follows NestJS best practices.

