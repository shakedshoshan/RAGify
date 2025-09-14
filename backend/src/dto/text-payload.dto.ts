import { IsNotEmpty, IsString } from 'class-validator';

export class TextPayloadDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  text: string;
}
