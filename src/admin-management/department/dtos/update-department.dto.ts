import { PartialType } from '@nestjs/swagger';
import { DepartmentItemDto } from './create-department.dto';

/** Partial fields for PATCH /departments (body: { id, ...fields }) */
export class UpdateDepartmentDto extends PartialType(DepartmentItemDto) {}
