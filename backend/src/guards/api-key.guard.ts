import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../services/apikey.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    const validApiKey = await this.apiKeyService.validateApiKey(apiKey);

    if (!validApiKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Attach the API key data to the request for potential use in controllers
    request.apiKey = validApiKey;
    
    return true;
  }

  private extractApiKey(request: any): string | undefined {
    // Check Authorization header (Bearer token style)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Check X-API-Key header
    if (request.headers['x-api-key']) {
      return request.headers['x-api-key'];
    }
    
    // Check query parameter
    if (request.query.api_key) {
      return request.query.api_key;
    }
    
    return undefined;
  }
}
