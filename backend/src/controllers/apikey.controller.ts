import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiKeyService } from '../services/apikey.service';
import { CreateApiKeyDto, ApiKeyResponseDto, ApiKeyWithSecretDto, UpdateApiKeyDto, RevokeApiKeyDto } from '../dto/apikey.dto';

@Controller('apikey')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Create a new API key for a user
   * @param createApiKeyDto The API key creation data
   * @returns The created API key with secret
   */
  @Post()
  async createApiKey(@Body() createApiKeyDto: CreateApiKeyDto) {
    try {
      const apiKey = await this.apiKeyService.createApiKey(createApiKeyDto);
      
      return {
        success: true,
        message: 'API key created successfully',
        data: apiKey,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create API key',
        error: error.message,
      };
    }
  }

  /**
   * Get all API keys for a user
   * @param userId The user ID
   * @returns Array of API keys (without secrets)
   */
  @Get('user/:user_id')
  async getApiKeysByUserId(@Param('user_id') userId: string) {
    try {
      const apiKeys = await this.apiKeyService.getApiKeysByUserId(userId);
      
      return {
        success: true,
        data: apiKeys,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get API keys',
        error: error.message,
      };
    }
  }

  /**
   * Get a specific API key by ID
   * @param keyId The API key ID
   * @returns The API key (without secret)
   */
  @Get(':key_id')
  async getApiKeyById(@Param('key_id') keyId: string) {
    try {
      const apiKey = await this.apiKeyService.getApiKeyById(keyId);
      
      if (!apiKey) {
        return {
          success: false,
          message: 'API key not found',
        };
      }
      
      return {
        success: true,
        data: apiKey,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get API key',
        error: error.message,
      };
    }
  }

  /**
   * Update an API key
   * @param keyId The API key ID
   * @param updateData The update data
   * @returns The updated API key
   */
  @Put(':key_id')
  async updateApiKey(
    @Param('key_id') keyId: string,
    @Body() updateData: UpdateApiKeyDto
  ) {
    try {
      const apiKey = await this.apiKeyService.updateApiKey(keyId, updateData);
      
      if (!apiKey) {
        return {
          success: false,
          message: 'API key not found',
        };
      }
      
      return {
        success: true,
        message: 'API key updated successfully',
        data: apiKey,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update API key',
        error: error.message,
      };
    }
  }

  /**
   * Revoke (deactivate) an API key
   * @param keyId The API key ID
   * @returns Success message
   */
  @Put(':key_id/revoke')
  async revokeApiKey(@Param('key_id') keyId: string) {
    try {
      const success = await this.apiKeyService.revokeApiKey(keyId);
      
      if (!success) {
        return {
          success: false,
          message: 'API key not found',
        };
      }
      
      return {
        success: true,
        message: 'API key revoked successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to revoke API key',
        error: error.message,
      };
    }
  }

  /**
   * Delete an API key permanently
   * @param keyId The API key ID
   * @returns Success message
   */
  @Delete(':key_id')
  async deleteApiKey(@Param('key_id') keyId: string) {
    try {
      const success = await this.apiKeyService.deleteApiKey(keyId);
      
      if (!success) {
        return {
          success: false,
          message: 'API key not found',
        };
      }
      
      return {
        success: true,
        message: 'API key deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete API key',
        error: error.message,
      };
    }
  }

}
