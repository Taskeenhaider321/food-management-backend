import { IsString, IsOptional, IsArray } from 'class-validator';

export class ProcessDetailDto {
  @IsString()
  Name: string;

  @IsOptional()
  @IsString()
  ProcessNum?: string;

  @IsString()
  Description: string;

  @IsOptional()
  @IsArray()
  subProcesses?: ProcessDetailDto[];
}
