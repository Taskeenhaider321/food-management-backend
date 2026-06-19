import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkRequestController } from './work-request.controller';
import { WorkRequestService } from './work-request.service';
import { WorkRequest, WorkRequestSchema } from './schemas/work-request.schema';
import { Machinery, MachinerySchema } from '../machinery/schemas/machinery.schema';
import { Equipment, EquipmentSchema } from '../equipment/schemas/equipment.schema';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkRequest.name, schema: WorkRequestSchema },
      { name: Machinery.name, schema: MachinerySchema },
      { name: Equipment.name, schema: EquipmentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [WorkRequestController],
  providers: [WorkRequestService],
})
export class WorkRequestModule {}
