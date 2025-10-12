/**
 * Elasticsearch Service
 * 
 * This service manages all interactions with Elasticsearch for the RAGify application.
 * It provides full-text search capabilities on rawText documents stored in Firestore.
 * 
 * Architecture Pattern: Dual-Write
 * - Firestore = Source of Truth (all data persists here)
 * - Elasticsearch = Search Layer (optimized for full-text search)
 * - All write operations go to BOTH systems
 * 
 * Key Features:
 * - Full-text search with fuzzy matching
 * - Project-based filtering
 * - Relevance-ranked results with highlighting
 * - Autocomplete suggestions
 * - Bulk operations for migration
 * 
 * Error Handling:
 * - All operations are wrapped in try-catch
 * - Elasticsearch failures don't break the application
 * - Failures are logged but the app continues to work
 * 
 * Index Structure:
 * - Index name: 'rawtext'
 * - Fields: project_id, name, text, createdAt, updatedAt
 * - Mappings support text search, keyword filtering, and autocomplete
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { SearchRawTextDto, SearchResultDto } from '../dto/search.dto';

/**
 * Interface defining the structure of a rawText document
 * This matches the Firestore rawText collection schema
 */
interface RawTextDocument {
  project_id: string;  // Project identifier for filtering
  name: string;        // Document name/filename
  text: string;        // The actual document content
  createdAt?: any;     // Creation timestamp
  updatedAt?: any;     // Last update timestamp
}

/**
 * ElasticsearchService Class
 * 
 * Implements OnModuleInit to initialize the index when the NestJS module starts
 * Injectable decorator makes this service available for dependency injection
 */
@Injectable()
export class ElasticsearchService implements OnModuleInit {
  // Logger instance for this service (provides nice formatted console output)
  private readonly logger = new Logger(ElasticsearchService.name);
  
  // Elasticsearch client instance (handles all communication with ES)
  private client: Client;
  
  // Index name - centralized constant to avoid typos
  // For Elastic Cloud, the index name should match what's in the cloud console
  private readonly indexName: string = 'search-ragify';

  /**
   * Constructor - Initializes the Elasticsearch client
   * 
   * @param configService - NestJS ConfigService for accessing environment variables
   * 
   * For Elasticsearch Serverless:
   * - Uses Cloud ID for connection
   * - Requires API Key authentication
   * - Enables SSL and compression
   * 
   * For local development:
   * - Uses direct URL connection
   * - No authentication required
   */
  constructor(private configService: ConfigService) {
    // Get all ES config from the config service
    const esConfig = this.configService.get('elasticsearch');
    
    // Log configuration for debugging (without sensitive data)
    const isServerless = !!process.env.ELASTICSEARCH_CLOUD_ID;
    const hasApiKey = !!process.env.ELASTICSEARCH_API_KEY;
    
    this.logger.log(`Elasticsearch mode: ${isServerless ? 'Serverless' : 'Local'}`);
    this.logger.log(`API Key configured: ${hasApiKey}`);
    
    if (isServerless && !hasApiKey) {
      this.logger.error('❌ Elasticsearch Serverless requires API Key authentication');
      this.logger.error('Please set ELASTICSEARCH_API_KEY environment variable');
    }
    
    // Initialize client with complete config
    this.client = new Client(esConfig);
    
    // Set index name - for serverless, this must match your project setup
    this.indexName = process.env.ELASTICSEARCH_INDEX_NAME || 'search-ragify';
    
    this.logger.log(`Elasticsearch configured with index: ${this.indexName}`);
  }

  /**
   * Lifecycle Hook - Called when NestJS module initializes
   * 
   * This ensures the Elasticsearch index is created before the application starts
   * serving requests. If Elasticsearch is down, the app will still start but
   * search functionality won't work until ES is available.
   */
  async onModuleInit() {
    try {
      await this.createIndexIfNotExists();
      this.logger.log('✅ Elasticsearch service initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Elasticsearch service:', error.message);
      // Note: We don't throw here - app can still work without Elasticsearch
    }
  }

  /**
   * Creates the Elasticsearch index if it doesn't exist
   * 
   * Index Mappings Explained:
   * - project_id (keyword): Exact match filtering, not analyzed
   * - name (text): Full-text search with multiple sub-fields:
   *   - keyword: For exact matching and sorting
   *   - suggest: For autocomplete functionality
   * - text (text): Main content field, analyzed for full-text search
   * - createdAt/updatedAt (date): For date-based sorting and filtering
   * 
   * The 'standard' analyzer tokenizes text and lowercases it, making search
   * case-insensitive and word-boundary aware.
   * 
   * Note: For Elasticsearch Serverless, you may need to create the index 
   * through the Elastic Cloud console if automatic creation fails.
   */
  private async createIndexIfNotExists() {
    try {
      this.logger.log(`Checking if index exists: ${this.indexName}`);
      
      // Check if index already exists (prevents errors on restart)
      const indexExists = await this.client.indices.exists({ index: this.indexName });
      
      if (!indexExists) {
        this.logger.log(`Creating index: ${this.indexName}`);
        
        // Create the index with mappings
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                // Keyword type: exact matching, filtering, no analysis
                project_id: { type: 'keyword' },
                
                // Multi-field mapping for name
                name: {
                  type: 'text',              // Analyzed text for search
                  fields: {
                    keyword: { type: 'keyword' },     // Exact match sub-field
                    suggest: { type: 'completion' },  // Autocomplete sub-field
                  },
                },
                
                // Full-text searchable field with standard analyzer
                text: {
                  type: 'text',
                  analyzer: 'standard',  // Tokenizes, lowercases, removes stop words
                },
                
                // Date fields for temporal sorting/filtering
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
              },
            },
          },
        });
        this.logger.log(`✅ Created Elasticsearch index: ${this.indexName}`);
      } else {
        this.logger.log(`✅ Elasticsearch index already exists: ${this.indexName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create/check index: ${this.indexName}`);
      this.logger.error(`Error: ${error.message}`);
      
      // Handle specific serverless authentication errors
      if (error.message.includes('security_exception')) {
        this.logger.error('🔒 Authentication failed - Check your API key');
        this.logger.error('For Serverless: Ensure ELASTICSEARCH_API_KEY is set correctly');
        this.logger.error('API Key format should be base64-encoded string');
      } else if (error.message.includes('forbidden')) {
        this.logger.error('🚫 Permission denied - API key may lack required permissions');
        this.logger.error('Required permissions: manage_index, write, read');
      } else if (error.message.includes('resource_already_exists_exception')) {
        this.logger.warn('Index already exists (race condition), continuing...');
        return; // This is actually OK
      }
      
      // Don't throw for serverless - the index might need to be created manually
      const isServerless = !!process.env.ELASTICSEARCH_CLOUD_ID;
      if (isServerless) {
        this.logger.warn('⚠️ For Serverless, you may need to create the index manually');
        this.logger.warn('Check your Elastic Cloud console for index management');
      } else {
        throw error;
      }
    }
  }

  /**
   * Index a single rawText document to Elasticsearch
   * 
   * Called when:
   * - User creates a new text document
   * - User uploads a PDF or CSV
   * 
   * @param id - The Firestore document ID (used as Elasticsearch document ID)
   * @param document - The document data to index
   * 
   * Note: This operation is called AFTER writing to Firestore (dual-write pattern)
   * If this fails, the document still exists in Firestore (source of truth)
   */
  async indexRawText(id: string, document: RawTextDocument): Promise<void> {
    try {
      this.logger.debug(`Indexing document ${id} to index ${this.indexName}`);
      
      await this.client.index({
        index: this.indexName,
        id, // Same ID as Firestore for consistency
        document: {
          project_id: document.project_id,
          name: document.name,
          text: document.text,
          // Ensure timestamps are always present
          createdAt: document.createdAt || new Date().toISOString(),
          updatedAt: document.updatedAt || new Date().toISOString(),
        },
      });
      this.logger.log(`✅ Indexed document: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to index document ${id}: ${error.message}`);
      
      // Handle specific serverless errors
      if (error.message.includes('security_exception')) {
        this.logger.error('🔒 Authentication failed during indexing');
        this.logger.error('Check ELASTICSEARCH_API_KEY is valid and has write permissions');
      } else if (error.message.includes('index_not_found_exception')) {
        this.logger.error(`📋 Index ${this.indexName} not found`);
        this.logger.error('For Serverless: Create the index in Elastic Cloud console first');
      } else if (error.message.includes('forbidden')) {
        this.logger.error('🚫 API key lacks write permissions for this index');
      }
      
      throw error;
    }
  }

  /**
   * Update an existing document in Elasticsearch
   * 
   * Called when:
   * - User edits document name or text
   * 
   * @param id - The document ID
   * @param document - Partial document with fields to update
   * 
   * Note: Uses Elasticsearch's update API which performs a partial update
   * (only updates provided fields, leaves others unchanged)
   */
  async updateRawText(id: string, document: Partial<RawTextDocument>): Promise<void> {
    try {
      await this.client.update({
        index: this.indexName,
        id,
        doc: {
          ...document,
          updatedAt: new Date().toISOString(), // Always update timestamp
        },
      });
      this.logger.log(`✅ Updated document: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to update document ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a document from Elasticsearch
   * 
   * Called when:
   * - User deletes a text document
   * 
   * @param id - The document ID to delete
   * 
   * Error Handling:
   * - If document doesn't exist (404), we log a warning and continue
   * - This handles cases where Firestore delete succeeded but ES index failed previously
   */
  async deleteRawText(id: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id,
      });
      this.logger.log(`✅ Deleted document: ${id}`);
    } catch (error) {
      // Handle "not found" gracefully - document might have never been indexed
      if (error.meta?.statusCode === 404) {
        this.logger.warn(`Document ${id} not found in Elasticsearch, skipping deletion`);
        return;
      }
      this.logger.error(`Failed to delete document ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform full-text search on rawText documents
   * 
   * This is the main search method that powers the search functionality.
   * It supports:
   * - Full-text search with fuzzy matching (typo tolerance)
   * - Project-based filtering
   * - Pagination
   * - Multiple sort options
   * - Result highlighting
   * 
   * Query Structure:
   * Uses Elasticsearch's bool query with 'must' and 'filter' clauses:
   * - must: Affects relevance score (search query)
   * - filter: Doesn't affect score (project_id filter)
   * 
   * @param searchDto - Search parameters from user request
   * @returns SearchResultDto with ranked, highlighted results
   * 
   * Example:
   * searchRawText({ query: 'machine learning', project_id: '123', from: 0, size: 10 })
   */
  async searchRawText(searchDto: SearchRawTextDto): Promise<SearchResultDto> {
    try {
      // Destructure search parameters with defaults
      const { query, project_id, from = 0, size = 10, sort = 'relevance', order = 'desc' } = searchDto;

      // Arrays to build the bool query
      const mustClauses: any[] = [];    // Clauses that affect score
      const filterClauses: any[] = [];  // Clauses that don't affect score

      // ==========================================
      // Build Search Query
      // ==========================================
      if (query) {
        // Multi-match query searches across multiple fields
        mustClauses.push({
          multi_match: {
            query,
            fields: ['name^2', 'text'], // name^2 = name field has 2x weight
            fuzziness: 'AUTO',           // Handles typos (1-2 character edits)
          },
        });
      } else {
        // No search query = return all documents (respecting filters)
        mustClauses.push({ match_all: {} });
      }

      // ==========================================
      // Add Project Filter
      // ==========================================
      // Term query for exact match on keyword field (not analyzed)
      if (project_id) {
        filterClauses.push({
          term: { project_id }, // Exact match filter
        });
      }

      // ==========================================
      // Build Sort Configuration
      // ==========================================
      const sortArray: any[] = [];
      if (sort === 'relevance') {
        // Sort by relevance score (higher score = better match)
        sortArray.push({ _score: { order } });
      } else {
        // Sort by field (name, createdAt, updatedAt)
        sortArray.push({ [sort]: { order } });
      }

      // ==========================================
      // Construct Complete Search Body
      // ==========================================
      const searchBody: any = {
        query: {
          bool: {
            must: mustClauses,      // Must match (affects relevance)
            filter: filterClauses,  // Must match (doesn't affect relevance)
          },
        },
        from,  // Pagination offset (0-based)
        size,  // Number of results to return
        sort: sortArray,
      };

      // ==========================================
      // Add Highlighting (Shows Where Matches Occur)
      // ==========================================
      // Only add highlighting if there's a search query
      if (query) {
        searchBody.highlight = {
          fields: {
            name: {
              pre_tags: ['<em>'],   // Wrap matches in <em> tags
              post_tags: ['</em>'],
            },
            text: {
              pre_tags: ['<em>'],
              post_tags: ['</em>'],
              fragment_size: 150,        // Max characters per fragment
              number_of_fragments: 3,    // Return up to 3 matching snippets
            },
          },
        };
      }

      // ==========================================
      // Execute Search
      // ==========================================
      const result = await this.client.search({
        index: this.indexName,
        body: searchBody,
      });

      // ==========================================
      // Transform Results to DTO Format
      // ==========================================
      const hits = result.hits.hits.map((hit: any) => ({
        id: hit._id,              // Document ID
        score: hit._score,        // Relevance score
        document: hit._source,    // The actual document data
        highlights: hit.highlight, // Highlighted snippets (if any)
      }));

      return {
        // Total can be an object or number depending on ES version
        total: typeof result.hits.total === 'object' ? result.hits.total.value : (result.hits.total || 0),
        hits,
        took: result.took || 0, // Query execution time in milliseconds
      };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk index multiple documents to Elasticsearch
   * 
   * This method is used by the migration script to efficiently index
   * large numbers of documents. It's much faster than indexing one at a time.
   * 
   * @param documents - Array of documents with their IDs
   * 
   * Bulk API Format:
   * The bulk API requires alternating action/document pairs:
   * [action, document, action, document, ...]
   * 
   * Example:
   * [
   *   { index: { _index: 'rawtext', _id: '1' } },
   *   { project_id: '123', name: 'Doc 1', text: '...' },
   *   { index: { _index: 'rawtext', _id: '2' } },
   *   { project_id: '123', name: 'Doc 2', text: '...' }
   * ]
   * 
   * refresh: true makes documents immediately searchable (slower but good for migration)
   */
  async bulkIndexRawTexts(documents: Array<{ id: string; doc: RawTextDocument }>): Promise<void> {
    try {
      this.logger.log(`Bulk indexing ${documents.length} documents to index: ${this.indexName}`);
      
      // Transform documents into bulk API format
      // flatMap flattens the array of [action, document] pairs
      const operations = documents.flatMap(({ id, doc }) => [
        { index: { _index: this.indexName, _id: id } }, // Action
        {                                                 // Document
          project_id: doc.project_id,
          name: doc.name,
          text: doc.text,
          createdAt: doc.createdAt || new Date().toISOString(),
          updatedAt: doc.updatedAt || new Date().toISOString(),
        },
      ]);

      // Execute bulk operation
      const bulkResponse = await this.client.bulk({
        refresh: true, // Make documents searchable immediately
        operations,
      });

      // Check for partial failures
      // Bulk operations can partially succeed - some docs may fail while others succeed
      if (bulkResponse.errors) {
        const erroredDocuments: any[] = [];
        // Iterate through response items to identify failed documents
        bulkResponse.items.forEach((action: any, i: number) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              status: action[operation].status,
              error: action[operation].error,
              operation: operations[i * 2],     // The action that failed
              document: operations[i * 2 + 1],  // The document data
            });
          }
        });
        this.logger.error(`Bulk indexing had errors: ${JSON.stringify(erroredDocuments)}`);
      }

      this.logger.log(`✅ Bulk indexed ${documents.length} documents`);
    } catch (error) {
      this.logger.error(`Bulk indexing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get autocomplete suggestions for document names
   * 
   * Uses Elasticsearch's completion suggester for fast, prefix-based
   * autocomplete functionality.
   * 
   * @param prefix - The text prefix to autocomplete (e.g., "doc")
   * @param projectId - Optional project ID to filter suggestions
   * @returns Array of suggested document names
   * 
   * Example:
   * suggestRawTextNames('doc', '123')
   * Returns: ['document.pdf', 'documentation.txt', 'docs-readme.md']
   * 
   * Note: This uses the 'name.suggest' field which is a completion type
   * specifically optimized for autocomplete (faster than normal search)
   */
  async suggestRawTextNames(prefix: string, projectId?: string): Promise<string[]> {
    try {
      // Build suggestion query
      const suggestBody: any = {
        suggest: {
          'name-suggest': {
            prefix,  // What the user has typed so far
            completion: {
              field: 'name.suggest',     // Use the completion field
              size: 5,                   // Return up to 5 suggestions
              skip_duplicates: true,     // Don't repeat suggestions
            },
          },
        },
      };

      // Optionally filter suggestions by project
      // Note: This would require context mapping in the index (not currently implemented)
      if (projectId) {
        suggestBody.suggest['name-suggest'].completion.contexts = {
          project_id: [projectId],
        };
      }

      // Execute suggestion query
      const result = await this.client.search({
        index: this.indexName,
        body: suggestBody,
      });

      // Extract suggestion text from response
      const suggestions = result.suggest?.['name-suggest']?.[0]?.options || [];
      // Type assertion needed due to ES client's complex suggest types
      return Array.isArray(suggestions) ? suggestions.map((option: any) => option.text) : [];
    } catch (error) {
      this.logger.error(`Suggestions failed: ${error.message}`);
      throw error;
    }
  }
}

