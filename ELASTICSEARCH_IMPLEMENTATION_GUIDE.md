# Elasticsearch Implementation Guide for RAGify Backend

## Project Overview

**RAGify Backend** is a NestJS-based RAG (Retrieval-Augmented Generation) API that processes documents, creates embeddings, and enables AI-powered querying. The system currently uses:
- **Firestore**: Document storage (projects, rawText, textChunks, embeddings)
- **Pinecone**: Vector database for embeddings
- **Kafka**: Message queue for async processing
- **Redis**: Caching layer
- **OpenAI**: Embeddings and generation

## Current Architecture

### Raw Text Storage Structure
The `rawText` collection in Firestore stores uploaded documents with the following schema:
```typescript
{
  id: string,              // Firestore auto-generated ID
  project_id: string,      // Reference to parent project
  name: string,            // Document name (filename or user-defined)
  text: string,            // The actual text content
  createdAt: Timestamp,    // Firestore server timestamp
  updatedAt: Timestamp     // Firestore server timestamp
}
```

### Current Implementation Files
1. **Controllers**:
   - `src/controllers/text.controller.ts` - Handles text CRUD operations
   - `src/controllers/project.controller.ts` - Project management

2. **Services**:
   - `src/services/firestore.service.ts` - Firestore database operations
   - `src/services/project.service.ts` - Project business logic with caching
   - `src/services/cache.service.ts` - Redis caching layer

3. **DTOs**:
   - `src/dto/text-payload.dto.ts` - TextPayloadDto (project_id, name, text)
   - `src/dto/project.dto.ts` - Project-related DTOs

4. **Module**:
   - `src/app.module.ts` - Main application module

### Current Text Operations
1. **Create**: POST `/text` - Creates new rawText document in Firestore
2. **Edit**: PUT `/text/:id` - Updates name and/or text
3. **Delete**: DELETE `/text/:id` - Removes document
4. **Upload PDF**: POST `/text/upload-pdf` - Extracts text from PDF
5. **Upload CSV**: POST `/text/upload-csv` - Parses CSV to JSON string
6. **Query by Project**: `firestoreService.getRawTextsByProjectId(projectId)` - Returns all texts for a project

### Current Limitations
- **No full-text search**: Users can only retrieve texts by project_id or document ID
- **No search within content**: Cannot search by keywords, phrases, or text content
- **Limited filtering**: No ability to filter by partial name matches
- **No ranking**: Results are not ranked by relevance

## Goal: Implement Elasticsearch

Add Elasticsearch to enable **full-text search** on rawText documents, making it easy for users to:
- Search text content by keywords or phrases
- Search by document name (fuzzy matching)
- Filter by project_id
- Get ranked results by relevance
- Perform autocomplete/suggestions

## Implementation Steps

### Step 1: Add Elasticsearch to Docker Compose

**File**: `backend/docker-compose.yml`

Add Elasticsearch and Kibana services to the existing docker-compose configuration:

```yaml
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: ragify-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - ragify-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: ragify-kibana
    depends_on:
      - elasticsearch
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - ragify-network

volumes:
  elasticsearch-data:
    driver: local
```

### Step 2: Install Elasticsearch Client

**File**: `backend/package.json`

Add the official Elasticsearch Node.js client:
```bash
npm install @elastic/elasticsearch
```

Also install types:
```bash
npm install --save-dev @types/elasticsearch
```

### Step 3: Create Elasticsearch Configuration

**File**: `backend/src/config/elasticsearch.config.ts` (NEW FILE)

```typescript
export default () => ({
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    maxRetries: 5,
    requestTimeout: 60000,
    sniffOnStart: false,
  },
});
```

Add environment variables to `.env`:
```env
ELASTICSEARCH_NODE=http://localhost:9200
```

Update docker-compose.yml backend service environment:
```yaml
- ELASTICSEARCH_NODE=http://elasticsearch:9200
```

### Step 4: Create Elasticsearch Service

**File**: `backend/src/services/elasticsearch.service.ts` (NEW FILE)

This service should handle:
1. **Index Creation**: Create `rawtext` index with proper mappings
2. **Document Indexing**: Index rawText documents when created/updated
3. **Document Deletion**: Remove from index when deleted
4. **Search Operations**: Full-text search with filters
5. **Bulk Operations**: Bulk indexing for existing documents

**Key Methods to Implement**:
```typescript
class ElasticsearchService {
  // Initialize connection and create index if not exists
  async onModuleInit(): Promise<void>
  
  // Index a single rawText document
  async indexRawText(id: string, document: RawTextDocument): Promise<void>
  
  // Update indexed document
  async updateRawText(id: string, document: Partial<RawTextDocument>): Promise<void>
  
  // Delete document from index
  async deleteRawText(id: string): Promise<void>
  
  // Search rawText documents
  async searchRawText(query: SearchQuery): Promise<SearchResult>
  
  // Bulk index multiple documents (for migrating existing data)
  async bulkIndexRawTexts(documents: Array<{id: string, doc: RawTextDocument}>): Promise<void>
  
  // Get suggestions/autocomplete
  async suggestRawTextNames(prefix: string, projectId?: string): Promise<string[]>
}
```

**Index Mapping** for `rawtext` index:
```typescript
{
  mappings: {
    properties: {
      project_id: { type: 'keyword' },
      name: { 
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
          suggest: { type: 'completion' }
        }
      },
      text: { 
        type: 'text',
        analyzer: 'standard'
      },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' }
    }
  }
}
```

### Step 5: Create Search DTO

**File**: `backend/src/dto/search.dto.ts` (NEW FILE)

```typescript
export class SearchRawTextDto {
  query?: string;           // Search query (searches in name and text)
  project_id?: string;      // Filter by project
  from?: number;            // Pagination offset (default: 0)
  size?: number;            // Results per page (default: 10)
  sort?: 'relevance' | 'createdAt' | 'updatedAt' | 'name';
  order?: 'asc' | 'desc';
}

export class SearchResultDto {
  total: number;
  hits: Array<{
    id: string;
    score: number;
    document: {
      project_id: string;
      name: string;
      text: string;
      createdAt: any;
      updatedAt: any;
    };
    highlights?: {
      name?: string[];
      text?: string[];
    };
  }>;
  took: number;  // Time taken in ms
}
```

### Step 6: Create Search Controller

**File**: `backend/src/controllers/search.controller.ts` (NEW FILE)

Add endpoints for searching:
```typescript
@Controller('search')
export class SearchController {
  // Search rawText documents
  @Get('rawtexts')
  async searchRawTexts(@Query() searchDto: SearchRawTextDto): Promise<SearchResultDto>
  
  // Get name suggestions
  @Get('suggest')
  async suggestNames(@Query('q') query: string, @Query('project_id') projectId?: string): Promise<string[]>
}
```

### Step 7: Update Text Controller

**File**: `backend/src/controllers/text.controller.ts` (MODIFY)

Integrate Elasticsearch into existing operations:

1. **In `createText()` method**: After saving to Firestore, index to Elasticsearch
```typescript
// After: const docRef = await this.firestoreService.addDocument('rawText', textPayloadDto);
await this.elasticsearchService.indexRawText(docRef.id, textPayloadDto);
```

2. **In `editText()` method**: After updating Firestore, update Elasticsearch
```typescript
// After: await this.firestoreService.updateDocument('rawText', id, updateData);
await this.elasticsearchService.updateRawText(id, updateData);
```

3. **In `deleteText()` method**: After deleting from Firestore, delete from Elasticsearch
```typescript
// After: await this.firestoreService.deleteDocument('rawText', id);
await this.elasticsearchService.deleteRawText(id);
```

4. **In `uploadPDF()` and `uploadCSV()` methods**: Index after saving

### Step 8: Update App Module

**File**: `backend/src/app.module.ts` (MODIFY)

1. Import elasticsearch config:
```typescript
import elasticsearchConfig from './config/elasticsearch.config';
```

2. Add to ConfigModule.forRoot load array:
```typescript
load: [firebaseConfig, pineconeConfig, elasticsearchConfig]
```

3. Add ElasticsearchService to providers and exports:
```typescript
providers: [
  // ... existing providers
  ElasticsearchService,
],
exports: [
  // ... existing exports
  ElasticsearchService,
]
```

4. Add SearchController to controllers array

### Step 9: Create Migration Script

**File**: `backend/src/scripts/elasticsearch-migrate.ts` (NEW FILE)

Create a script to index all existing rawText documents from Firestore to Elasticsearch:

```typescript
// Script to migrate existing rawText documents to Elasticsearch
async function migrateRawTexts() {
  // 1. Get all rawText documents from Firestore
  // 2. Bulk index them to Elasticsearch
  // 3. Log progress and any errors
}
```

Add script to package.json:
```json
"scripts": {
  "elastic:migrate": "ts-node src/scripts/elasticsearch-migrate.ts"
}
```

### Step 10: Update Project Service (Optional Enhancement)

**File**: `backend/src/services/project.service.ts` (MODIFY)

In the `getProjectById()` method, you could optionally add a search parameter to filter rawText documents:

```typescript
async getProjectById(
  id: string, 
  searchQuery?: string
): Promise<ProjectWithRawTextDto | null> {
  // If searchQuery is provided, use Elasticsearch instead of Firestore
  if (searchQuery) {
    const searchResults = await this.elasticsearchService.searchRawText({
      query: searchQuery,
      project_id: id
    });
    // Map search results to rawTextDocuments
  }
  // ... existing logic
}
```

## Best Practices to Follow

### 1. Error Handling
- Wrap all Elasticsearch operations in try-catch blocks
- If Elasticsearch is down, log error but don't break the app
- Consider fallback to Firestore queries if Elasticsearch fails

### 2. Consistency
- Keep Firestore as the source of truth
- Elasticsearch is a search layer, not primary storage
- If sync fails, have a mechanism to re-index

### 3. Indexing Strategy
- Index asynchronously to avoid blocking HTTP responses
- Consider using Kafka to queue indexing operations
- Batch updates when possible

### 4. Search Features
- Implement highlighting to show matching text snippets
- Support fuzzy matching for typos
- Add filters for date ranges
- Support sorting by relevance, date, name

### 5. Performance
- Use pagination for large result sets
- Set reasonable size limits (default 10, max 100)
- Cache frequent searches in Redis
- Use Elasticsearch's scroll API for large datasets

### 6. Security
- Validate and sanitize search queries
- Prevent injection attacks
- Respect project ownership (users should only search their projects)

## Testing the Implementation

### 1. Start Services
```bash
cd backend
docker-compose up -d
```

### 2. Verify Elasticsearch
```bash
curl http://localhost:9200
```

### 3. Run Migration Script
```bash
npm run elastic:migrate
```

### 4. Test Search Endpoint
```bash
# Search all texts
GET http://localhost:5000/search/rawtexts?query=test

# Search within project
GET http://localhost:5000/search/rawtexts?query=test&project_id=abc123

# Pagination
GET http://localhost:5000/search/rawtexts?query=test&from=10&size=20
```

### 5. Verify in Kibana
Open http://localhost:5601 and explore the `rawtext` index

## Summary

This implementation adds Elasticsearch as a search layer on top of your existing Firestore storage for rawText documents. The key points are:

1. **Non-intrusive**: Firestore remains the source of truth
2. **Parallel operations**: Index to both Firestore and Elasticsearch
3. **New search capabilities**: Full-text search, fuzzy matching, suggestions
4. **Backwards compatible**: Existing endpoints continue to work
5. **New endpoints**: `/search/rawtexts` for searching, `/search/suggest` for autocomplete

The implementation should be straightforward, following NestJS best practices and integrating seamlessly with your existing architecture.

