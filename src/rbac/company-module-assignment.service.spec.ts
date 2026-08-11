import { BadRequestException } from '@nestjs/common';
import { CompanyModuleAssignmentService } from './company-module-assignment.service';

describe('CompanyModuleAssignmentService — permission ceiling', () => {
  let service: CompanyModuleAssignmentService;

  beforeEach(() => {
    service = Object.create(
      CompanyModuleAssignmentService.prototype,
    ) as CompanyModuleAssignmentService;
  });

  describe('assertPermissionsWithinCeiling', () => {
    it('allows permissions within ceiling', () => {
      const ceiling = new Set([
        'EP_GET_EMPLOYEES',
        'EP_POST_EMPLOYEES_ADDEMPLOYEE',
      ]);
      expect(() =>
        service.assertPermissionsWithinCeiling(['EP_GET_EMPLOYEES'], ceiling),
      ).not.toThrow();
    });

    it('rejects permissions exceeding ceiling', () => {
      const ceiling = new Set([
        'EP_GET_EMPLOYEES',
        'EP_POST_EMPLOYEES_ADDEMPLOYEE',
      ]);
      expect(() =>
        service.assertPermissionsWithinCeiling(
          ['EP_GET_EMPLOYEES', 'EP_DELETE_EMPLOYEES_DELETEEMPLOYEE_ID'],
          ceiling,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects when create+view granted but delete requested', () => {
      const ceiling = new Set([
        'EP_GET_EMPLOYEES',
        'EP_POST_EMPLOYEES_ADDEMPLOYEE',
      ]);
      expect(() =>
        service.assertPermissionsWithinCeiling(
          [
            'EP_GET_EMPLOYEES',
            'EP_POST_EMPLOYEES_ADDEMPLOYEE',
            'EP_DELETE_EMPLOYEES_DELETEEMPLOYEE_ID',
          ],
          ceiling,
        ),
      ).toThrow(/Permissions exceed company ceiling/);
    });
  });
});
