import { PartialType } from '@nestjs/swagger';
import { CreatePreventiveMaintenanceDto } from './create-preventive-maintenance.dto';

export class UpdatePreventiveMaintenanceDto extends PartialType(CreatePreventiveMaintenanceDto) {}
