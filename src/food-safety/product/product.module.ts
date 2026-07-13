import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductSchema } from './schemas/product.schema';
import { UserSchema } from '../../admin-management/users/schemas/user.schema';
import { DepartmentSchema } from '../../admin-management/department/schemas/department.schema';
import {
  Company,
  CompanySchema,
} from '../../admin-management/company/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Product', schema: ProductSchema },
      { name: 'Department', schema: DepartmentSchema },
      { name: 'User', schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
