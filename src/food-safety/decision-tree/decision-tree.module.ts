import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DecisionTreeController } from './decision-tree.controller';
import { DecisionTreeService } from './decision-tree.service';
import { DecisionTreeSchema } from './schemas/decision-tree.schema';
import { DecisionSchema } from './schemas/decision.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DecisionTree', schema: DecisionTreeSchema },
      { name: 'Decision', schema: DecisionSchema },
    ]),
  ],
  controllers: [DecisionTreeController],
  providers: [DecisionTreeService],
  exports: [DecisionTreeService],
})
export class DecisionTreeModule {}
