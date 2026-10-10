import { IsIn, IsMongoId, IsOptional, IsString } from 'class-validator';

export class VerifyResponseDto {
  @IsMongoId()
  resultId: string;

  @IsString()
  verifiedBy: string;

  /** Approve → Verified, Disapprove → Rejected. Defaults to Verified. */
  @IsOptional()
  @IsIn(['Verified', 'Rejected'])
  decision?: 'Verified' | 'Rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}
