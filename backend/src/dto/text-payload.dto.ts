import { IsNotEmpty, IsString } from 'class-validator';

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
