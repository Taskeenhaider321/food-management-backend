import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreventiveMaintenanceController } from './preventive-maintenance.controller';
import { PreventiveMaintenanceService } from './preventive-maintenance.service';
import { PreventiveMaintenance, PreventiveMaintenanceSchema } from './schemas/preventive-maintenance.schema';
import { Machinery, MachinerySchema } from '../machinery/schemas/machinery.schema';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PreventiveMaintenance.name, schema: PreventiveMaintenanceSchema },
      { name: Machinery.name, schema: MachinerySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PreventiveMaintenanceController],
  providers: [PreventiveMaintenanceService],
})
export class PreventiveMaintenanceModule {}
