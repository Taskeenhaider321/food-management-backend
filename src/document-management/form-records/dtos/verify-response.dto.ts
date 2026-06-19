import { IsMongoId, IsString } from 'class-validator';

export class VerifyResponseDto {
  @IsMongoId()
  resultId: string;

  @IsString()
  verifiedBy: string;
}
