import { Injectable } from '@nestjs/common';
import { FirestoreService } from './firestore.service';
import { CreateApiKeyDto, ApiKeyResponseDto, ApiKeyWithSecretDto, UpdateApiKeyDto } from '../dto/apikey.dto';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  private readonly collectionName = 'apikey';

  constructor(private readonly firestoreService: FirestoreService) {}

  /**
   * Generate a secure API key using industry standards
   * Format: rk_[prefix]_[random_string]
   * @returns Object containing the full API key and prefix
   */
  private generateApiKey(): { fullKey: string; prefix: string } {
    // Generate a random prefix (4 characters)
    const prefix = crypto.randomBytes(2).toString('hex');
    
    // Generate the main key part (32 characters)
    const mainKey = crypto.randomBytes(16).toString('hex');
    
    // Combine with "rk_" prefix (RAGify Key)
    const fullKey = `rk_${prefix}_${mainKey}`;
    
    return {
      fullKey,
      prefix: `rk_${prefix}`
    };
  }

  /**
   * Hash the API key for secure storage
   * @param apiKey The API key to hash
   * @returns The hashed key
   */
  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Create a new API key for a user
   * @param createApiKeyDto The API key creation data
   * @returns The created API key with secret (only returned once)
   */
  async createApiKey(createApiKeyDto: CreateApiKeyDto): Promise<ApiKeyWithSecretDto> {
    const { fullKey, prefix } = this.generateApiKey();
    const hashedKey = this.hashApiKey(fullKey);

    // Check if this exact key already exists (very unlikely but good practice)
    const existingKey = await this.findByHashedKey(hashedKey);
    if (existingKey) {
      // If somehow we generated a duplicate, try again
      return this.createApiKey(createApiKeyDto);
    }

    const apiKeyData = {
      user_id: createApiKeyDto.user_id,
      name: createApiKeyDto.name || 'Default API Key',
      description: createApiKeyDto.description || '',
      key_prefix: prefix,
      hashed_key: hashedKey,
      is_active: createApiKeyDto.is_active !== false, // Default to true
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: null, // No expiration by default
    };

    const docRef = await this.firestoreService.addDocument(this.collectionName, apiKeyData);

    return {
      id: docRef.id,
      user_id: apiKeyData.user_id,
      name: apiKeyData.name,
      description: apiKeyData.description,
      key_prefix: apiKeyData.key_prefix,
      is_active: apiKeyData.is_active,
      created_at: apiKeyData.created_at,
      updated_at: apiKeyData.updated_at,
      expires_at: apiKeyData.expires_at || undefined,
      api_key: fullKey, // Only returned when creating
    };
  }

  /**
   * Get all API keys for a user
   * @param userId The user ID
   * @returns Array of API keys (without secrets)
   */
  async getApiKeysByUserId(userId: string): Promise<ApiKeyResponseDto[]> {
    const apiKeys = await this.firestoreService.queryDocuments(this.collectionName, {
      user_id: userId,
    });

    return apiKeys.map(key => this.mapToResponseDto(key));
  }

  /**
   * Get a specific API key by ID
   * @param keyId The API key ID
   * @returns The API key (without secret)
   */
  async getApiKeyById(keyId: string): Promise<ApiKeyResponseDto | null> {
    const apiKey = await this.firestoreService.getDocument(this.collectionName, keyId);
    
    if (!apiKey) {
      return null;
    }

    return this.mapToResponseDto(apiKey);
  }

  /**
   * Update an API key
   * @param keyId The API key ID
   * @param updateData The update data
   * @returns The updated API key
   */
  async updateApiKey(keyId: string, updateData: UpdateApiKeyDto): Promise<ApiKeyResponseDto | null> {
    const existingKey = await this.firestoreService.getDocument(this.collectionName, keyId);
    
    if (!existingKey) {
      return null;
    }

    const updatePayload = {
      ...updateData,
      updated_at: new Date(),
    };

    await this.firestoreService.updateDocument(this.collectionName, keyId, updatePayload);
    
    return this.getApiKeyById(keyId);
  }

  /**
   * Revoke (deactivate) an API key
   * @param keyId The API key ID
   * @returns True if successful
   */
  async revokeApiKey(keyId: string): Promise<boolean> {
    const result = await this.updateApiKey(keyId, { is_active: false });
    return result !== null;
  }

  /**
   * Delete an API key permanently
   * @param keyId The API key ID
   * @returns True if successful
   */
  async deleteApiKey(keyId: string): Promise<boolean> {
    return this.firestoreService.deleteDocument(this.collectionName, keyId);
  }

  /**
   * Validate an API key
   * @param apiKey The API key to validate
   * @returns The API key data if valid, null if invalid
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyResponseDto | null> {
    if (!apiKey || !apiKey.startsWith('rk_')) {
      return null;
    }

    const hashedKey = this.hashApiKey(apiKey);
    const apiKeyData = await this.findByHashedKey(hashedKey);

    if (!apiKeyData || !apiKeyData.is_active) {
      return null;
    }

    // Check expiration if set
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return null;
    }

    return this.mapToResponseDto(apiKeyData);
  }

  /**
   * Find API key by hashed key
   * @param hashedKey The hashed API key
   * @returns The API key data or null
   */
  private async findByHashedKey(hashedKey: string): Promise<any> {
    const apiKeys = await this.firestoreService.queryDocuments(this.collectionName, {
      hashed_key: hashedKey,
    });

    return apiKeys.length > 0 ? apiKeys[0] : null;
  }

  /**
   * Map database document to response DTO
   * @param doc The database document
   * @returns The response DTO
   */
  private mapToResponseDto(doc: any): ApiKeyResponseDto {
    return {
      id: doc.id,
      user_id: doc.user_id,
      name: doc.name,
      description: doc.description,
      key_prefix: doc.key_prefix,
      is_active: doc.is_active,
      created_at: doc.created_at?.toDate ? doc.created_at.toDate() : doc.created_at,
      updated_at: doc.updated_at?.toDate ? doc.updated_at.toDate() : doc.updated_at,
      expires_at: doc.expires_at?.toDate ? doc.expires_at.toDate() : doc.expires_at,
    };
  }
}
