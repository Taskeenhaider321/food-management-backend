import { Types } from 'mongoose';
import { DerivedModuleService } from './company-rbac.service';

describe('DerivedModuleService — create implies view', () => {
  let service: DerivedModuleService;
  let masterModuleModel: any;
  let masterPermissionModel: any;
  let derivedModuleModel: any;

  const moduleId = '507f1f77bcf86cd799439011';
  const createId = '607f1f77bcf86cd7994390aa';
  const viewId = '607f1f77bcf86cd7994390bb';
  const deleteId = '607f1f77bcf86cd7994390cc';

  beforeEach(() => {
    masterModuleModel = {
      findOne: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(moduleId),
        isActive: true,
      }),
    };

    masterPermissionModel = {
      find: jest.fn(),
    };

    derivedModuleModel = jest.fn().mockImplementation((doc) => ({
      ...doc,
      save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    }));

    service = new DerivedModuleService(
      masterModuleModel,
      masterPermissionModel,
      derivedModuleModel,
    );

    jest
      .spyOn(service as any, 'populateDerivedModule')
      .mockResolvedValue({ _id: 'dm1' });
  });

  it('auto-adds view permission ids when only create is selected', async () => {
    // First find: validate/expand selected create perm
    masterPermissionModel.find
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(createId),
              resource: 'employee',
              action: 'create',
            },
          ]),
        }),
      })
      // Second find: view perms for that resource
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: new Types.ObjectId(viewId), action: 'view' },
            { _id: new Types.ObjectId(createId), action: 'create' },
          ]),
        }),
      })
      // Third find: validate expanded set
      .mockResolvedValueOnce([
        { _id: new Types.ObjectId(createId) },
        { _id: new Types.ObjectId(viewId) },
      ]);

    await service.create({
      masterModuleId: moduleId,
      selectedPermissionIds: [createId],
    });

    expect(derivedModuleModel).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedPermissionIds: expect.arrayContaining([
          expect.any(Types.ObjectId),
          expect.any(Types.ObjectId),
        ]),
      }),
    );

    const savedArg = derivedModuleModel.mock.calls[0][0];
    const ids = savedArg.selectedPermissionIds.map((id: Types.ObjectId) =>
      String(id),
    );
    expect(ids).toEqual(expect.arrayContaining([createId, viewId]));
    expect(ids).not.toContain(deleteId);
  });
});
