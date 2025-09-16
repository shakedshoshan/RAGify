import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class ProjectDto {
  @IsOptional()
  @IsNumber()
  project_id?: number;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}


export class ProjectIdDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
