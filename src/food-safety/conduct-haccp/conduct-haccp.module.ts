import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConductHaccpController } from './conduct-haccp.controller';
import { ConductHaccpService } from './conduct-haccp.service';
import { ConductHaccpSchema } from './schemas/conduct-haccp.schema';
import { HazardSchema } from './schemas/hazard.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ConductHaccp', schema: ConductHaccpSchema },
      { name: 'Hazard', schema: HazardSchema },
    ]),
  ],
  controllers: [ConductHaccpController],
  providers: [ConductHaccpService],
  exports: [ConductHaccpService],
})
export class ConductHaccpModule {}
