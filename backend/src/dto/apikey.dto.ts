import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  user_id: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ApiKeyResponseDto {
  id: string;
  user_id: string;
  name?: string;
  description?: string;
  key_prefix: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
}

export class ApiKeyWithSecretDto extends ApiKeyResponseDto {
  api_key: string; // Only returned when creating a new key
}

export class RevokeApiKeyDto {
  @IsString()
  api_key_id: string;
}

export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
