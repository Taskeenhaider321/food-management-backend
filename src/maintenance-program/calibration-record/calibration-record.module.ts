import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalibrationRecordController } from './calibration-record.controller';
import { CalibrationRecordService } from './calibration-record.service';
import { CalibrationRecord, CalibrationRecordSchema } from './schemas/calibration-record.schema';
import { Equipment, EquipmentSchema } from '../equipment/schemas/equipment.schema';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';
import { Company, CompanySchema } from '../../admin-management/company/schemas/company.schema';



@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CalibrationRecord.name, schema: CalibrationRecordSchema },
      { name: Equipment.name, schema: EquipmentSchema },
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [CalibrationRecordController],
  providers: [CalibrationRecordService],
})
export class CalibrationRecordModule {}
