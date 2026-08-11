import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProcessesService } from './processes.service';

describe('ProcessesService.getProcessDetail — tenant via parent process', () => {
  const companyA = '507f1f77bcf86cd799439011';
  const companyB = '507f1f77bcf86cd799439012';
  const detailId = '807f1f77bcf86cd7994390aa';
  const nestedDetailId = '807f1f77bcf86cd7994390bb';

  let service: ProcessesService;
  let processDetailModel: any;
  let processesModel: any;
  let departmentModel: any;

  beforeEach(() => {
    processDetailModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
    };
    processesModel = {
      findOne: jest.fn(),
    };
    departmentModel = {
      findById: jest.fn(),
    };

    service = new ProcessesService(
      processesModel,
      processDetailModel,
      departmentModel,
      {} as any,
    );
  });

  it('allows Company A when parent process belongs to Company A', async () => {
    processDetailModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: detailId, Name: 'Step' }),
      }),
    });
    processesModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'proc1',
            UserDepartment: { companyId: companyA },
          }),
        }),
      }),
    });

    await expect(
      service.getProcessDetail(detailId, {
        roleType: 'company-admin',
        companyId: companyA,
        _id: 'u1',
      }),
    ).resolves.toMatchObject({ status: true });
  });

  it('denies Company A when parent process belongs to Company B', async () => {
    processDetailModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: detailId, Name: 'Step' }),
      }),
    });
    processesModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'proc1',
            UserDepartment: { companyId: companyB },
          }),
        }),
      }),
    });

    await expect(
      service.getProcessDetail(detailId, {
        roleType: 'company-admin',
        companyId: companyA,
        _id: 'u1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('walks nested subProcess parent to find owning process', async () => {
    processDetailModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ _id: nestedDetailId, Name: 'Nested' }),
      }),
    });

    // First lookup: nested detail not directly on Processes
    processesModel.findOne
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      })
      // Second lookup: after walking to parent detail id
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              _id: 'proc1',
              UserDepartment: { companyId: companyA },
            }),
          }),
        }),
      });

    processDetailModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: detailId }),
      }),
    });

    await expect(
      service.getProcessDetail(nestedDetailId, {
        roleType: 'company-admin',
        companyId: companyA,
        _id: 'u1',
      }),
    ).resolves.toMatchObject({ status: true });
  });

  it('denies when no parent process can be resolved', async () => {
    processDetailModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: detailId, Name: 'Orphan' }),
      }),
    });
    processesModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });
    processDetailModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      service.getProcessDetail(detailId, {
        roleType: 'company-admin',
        companyId: companyA,
        _id: 'u1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns NotFound when detail missing', async () => {
    processDetailModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      service.getProcessDetail(detailId, {
        roleType: 'company-admin',
        companyId: companyA,
        _id: 'u1',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
