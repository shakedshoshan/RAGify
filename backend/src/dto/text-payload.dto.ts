import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class TextPayloadDto {
  @IsString()
  @IsNotEmpty()
  project_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}

export class EditTextDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  text?: string;
}
