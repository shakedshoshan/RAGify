import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchRawTextDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  project_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  from?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number = 10;

  @IsOptional()
  @IsIn(['relevance', 'createdAt', 'updatedAt', 'name'])
  sort?: 'relevance' | 'createdAt' | 'updatedAt' | 'name' = 'relevance';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
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
  took: number;
}

