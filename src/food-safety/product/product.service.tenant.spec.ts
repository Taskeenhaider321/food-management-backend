import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductService } from './product.service';

describe('ProductService — tenant isolation (OWN not required)', () => {
  const companyA = '507f1f77bcf86cd799439011';
  const companyB = '507f1f77bcf86cd799439012';
  const deptA = new Types.ObjectId('607f1f77bcf86cd7994390aa');
  const deptB = new Types.ObjectId('607f1f77bcf86cd7994390bb');
  const productBId = '707f1f77bcf86cd7994390bb';
  const userA = '807f1f77bcf86cd799439011';

  const actorA = { roleType: 'company-user', companyId: companyA, _id: userA };
  const actorAdminA = { roleType: 'company-admin', companyId: companyA };

  let productModel: any;
  let departmentModel: any;
  let service: ProductService;

  beforeEach(() => {
    productModel = {
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
      deleteMany: jest.fn(),
      find: jest.fn(),
    };
    departmentModel = {
      findById: jest.fn(),
      find: jest.fn(),
    };
    service = new ProductService(
      productModel,
      departmentModel,
      {} as any,
      {} as any,
    );
  });

  function chainPopulate(result: any) {
    const chain: any = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(result),
    };
    return chain;
  }

  it('forbids Company A getProduct on Company B product', async () => {
    productModel.findById.mockReturnValue(
      chainPopulate({
        _id: productBId,
        UserDepartment: deptB,
        Status: 'In Review',
        createdByUserId: userA,
      }),
    );
    departmentModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ companyId: companyB }),
      }),
    });

    await expect(service.getProduct(productBId, actorA)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('forbids Company A deleteProduct on Company B product', async () => {
    productModel.findById.mockResolvedValue({
      _id: productBId,
      UserDepartment: deptB,
      Status: 'In Review',
      createdByUserId: userA,
    });
    departmentModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ companyId: companyB }),
      }),
    });

    await expect(service.deleteProduct(productBId, actorA)).rejects.toThrow(
      ForbiddenException,
    );
    expect(productModel.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('deleteAllProducts scopes to company A departments only', async () => {
    departmentModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: deptA }]),
      }),
    });
    productModel.deleteMany.mockResolvedValue({ deletedCount: 2 });

    const result = await service.deleteAllProducts(actorAdminA);

    expect(productModel.deleteMany).toHaveBeenCalledWith({
      UserDepartment: { $in: [deptA] },
    });
    expect(result.status).toBe(true);
  });

  it('company-admin may access same-company product without OWN filter', async () => {
    productModel.findById.mockReturnValue(
      chainPopulate({
        _id: 'own-or-colleague',
        UserDepartment: deptA,
        Status: 'Approved',
        CreatedBy: 'SomeoneElse',
        createdByUserId: '807f1f77bcf86cd799439099',
      }),
    );
    departmentModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ companyId: companyA }),
      }),
    });

    const result = await service.getProduct('own-or-colleague', actorAdminA);
    expect(result.status).toBe(true);
    expect(result.data.CreatedBy).toBe('SomeoneElse');
  });

  it('company-user list filter includes createdByUserId', async () => {
    departmentModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ companyId: companyA }),
      }),
    });
    productModel.find.mockReturnValue(chainPopulate([]));

    await service.getAllProducts(String(deptA), actorA);

    expect(productModel.find).toHaveBeenCalledWith({
      UserDepartment: String(deptA),
      createdByUserId: new Types.ObjectId(userA),
    });
  });
});
