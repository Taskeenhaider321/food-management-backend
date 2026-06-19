import { PartialType } from '@nestjs/swagger';
import { CreatePersonalRequisitionDto } from './create-personal-requisition.dto';

export class UpdatePersonalRequisitionDto extends PartialType(CreatePersonalRequisitionDto) {}
