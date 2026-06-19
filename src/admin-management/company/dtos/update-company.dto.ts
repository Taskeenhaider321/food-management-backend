import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';

/** Partial company fields only — admin user uses the create flow. */
export class UpdateCompanyDto extends PartialType(
  OmitType(CreateCompanyDto, ['admin'] as const),
) {}
