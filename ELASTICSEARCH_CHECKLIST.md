# Elasticsearch Implementation Checklist

## Quick Implementation Steps

### ☐ Infrastructure Setup

- [ ] Add Elasticsearch service to `docker-compose.yml`
- [ ] Add Kibana service to `docker-compose.yml` (for monitoring/debugging)
- [ ] Add volume for Elasticsearch data persistence
- [ ] Install npm package: `@elastic/elasticsearch`
- [ ] Add environment variable `ELASTICSEARCH_NODE` to `.env`

### ☐ Configuration

- [ ] Create `src/config/elasticsearch.config.ts`
- [ ] Load elasticsearch config in `app.module.ts`

### ☐ Core Service

- [ ] Create `src/services/elasticsearch.service.ts` with methods:
  - [ ] `onModuleInit()` - Initialize connection and create index
  - [ ] `indexRawText()` - Index single document
  - [ ] `updateRawText()` - Update indexed document
  - [ ] `deleteRawText()` - Delete from index
  - [ ] `searchRawText()` - Search with filters
  - [ ] `bulkIndexRawTexts()` - Bulk operations
  - [ ] `suggestRawTextNames()` - Autocomplete

### ☐ DTOs

- [ ] Create `src/dto/search.dto.ts`:
  - [ ] `SearchRawTextDto` (query params)
  - [ ] `SearchResultDto` (response)

### ☐ Controller

- [ ] Create `src/controllers/search.controller.ts`:
  - [ ] `GET /search/rawtexts` - Search endpoint
  - [ ] `GET /search/suggest` - Autocomplete endpoint

### ☐ Integration

- [ ] Update `src/controllers/text.controller.ts`:
  - [ ] Add Elasticsearch indexing in `createText()`
  - [ ] Add Elasticsearch update in `editText()`
  - [ ] Add Elasticsearch deletion in `deleteText()`
  - [ ] Add indexing in `uploadPDF()`
  - [ ] Add indexing in `uploadCSV()`

- [ ] Update `src/app.module.ts`:
  - [ ] Add `ElasticsearchService` to providers
  - [ ] Add `ElasticsearchService` to exports
  - [ ] Add `SearchController` to controllers

### ☐ Migration

- [ ] Create `src/scripts/elasticsearch-migrate.ts`
- [ ] Add migration script to `package.json` scripts
- [ ] Run migration to index existing data

### ☐ Testing

- [ ] Start docker-compose services
- [ ] Verify Elasticsearch health: `curl http://localhost:9200`
- [ ] Run migration script
- [ ] Test search endpoint with various queries
- [ ] Verify results in Kibana: `http://localhost:5601`

## Files to Create (NEW)

1. `backend/src/config/elasticsearch.config.ts`
2. `backend/src/services/elasticsearch.service.ts`
3. `backend/src/dto/search.dto.ts`
4. `backend/src/controllers/search.controller.ts`
5. `backend/src/scripts/elasticsearch-migrate.ts`

## Files to Modify (EXISTING)

1. `backend/docker-compose.yml` - Add Elasticsearch & Kibana services
2. `backend/package.json` - Add Elasticsearch dependency
3. `backend/.env` - Add ELASTICSEARCH_NODE variable
4. `backend/src/app.module.ts` - Register new service and controller
5. `backend/src/controllers/text.controller.ts` - Add ES indexing calls

## Index Mapping Template

```json
{
  "mappings": {
    "properties": {
      "project_id": { "type": "keyword" },
      "name": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      },
      "text": {
        "type": "text",
        "analyzer": "standard"
      },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}
```

## Test Commands

```bash
# Search all texts
GET http://localhost:5000/search/rawtexts?query=machine learning

# Search within specific project
GET http://localhost:5000/search/rawtexts?query=AI&project_id=proj123

# With pagination
GET http://localhost:5000/search/rawtexts?query=test&from=0&size=10

# Autocomplete suggestions
GET http://localhost:5000/search/suggest?q=doc&project_id=proj123

# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# View index mappings
curl http://localhost:9200/rawtext/_mapping

# Count documents in index
curl http://localhost:9200/rawtext/_count
```

## Key Implementation Notes

1. **Firestore = Source of Truth**: Always write to Firestore first, then index to Elasticsearch
2. **Async Indexing**: Don't block HTTP responses waiting for indexing
3. **Error Handling**: Elasticsearch failures shouldn't break the app
4. **Bulk Operations**: Use bulk API for migrating existing data
5. **Pagination**: Always implement pagination for search results
6. **Highlights**: Return text snippets showing where matches occur
7. **Security**: Validate queries and filter by user's projects

