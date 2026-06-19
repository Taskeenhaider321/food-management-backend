import { PartialType } from '@nestjs/swagger';
import { CreateWorkRequestDto } from './create-work-request.dto';

export class UpdateWorkRequestDto extends PartialType(CreateWorkRequestDto) {}
