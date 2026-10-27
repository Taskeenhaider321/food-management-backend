import { CustomDocumentTypeService } from './custom-document-type.service';
import { DOCUMENT_TYPE_SCOPE_KEYS } from './scope-keys';

describe('CustomDocumentTypeService.ensureDefaults', () => {
  function buildService(
    existing: {
      title: string;
      documentNumber: number;
      isActive?: boolean;
    }[],
  ) {
    const created: any[] = [];
    const model = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(existing),
          }),
        }),
      }),
      create: jest.fn().mockImplementation(async (doc) => {
        created.push(doc);
        return doc;
      }),
    };
    const service = new CustomDocumentTypeService(model as any);
    return { service, model, created };
  }

  const companyId = '507f1f77bcf86cd799439011';
  const scope = DOCUMENT_TYPE_SCOPE_KEYS.DOCUMENT_MANAGEMENT_DOCUMENTS;

  it('inserts missing defaults once (idempotent on second call)', async () => {
    const { service, created } = buildService([]);
    await service.ensureDefaults(companyId, scope);
    expect(created).toHaveLength(9);
    expect(created.every((row) => row.isDefault === true)).toBe(true);
    expect(created.every((row) => row.scopeKey === scope)).toBe(true);
    expect(created.every((row) => String(row.companyId) === companyId)).toBe(
      true,
    );

    const second = buildService(
      created.map((c) => ({
        title: c.title,
        documentNumber: c.documentNumber,
      })),
    );
    await second.service.ensureDefaults(companyId, scope);
    expect(second.created).toHaveLength(0);
  });

  it('preserves custom types and only adds missing default titles', async () => {
    const { service, created } = buildService([
      { title: 'Manual', documentNumber: 1 },
      { title: 'Custom SOP Variant', documentNumber: 3 },
    ]);
    await service.ensureDefaults(companyId, scope);
    expect(created.map((c) => c.title)).not.toContain('Manual');
    expect(created.map((c) => c.title)).toContain('Procedure');
    expect(created.map((c) => c.title)).toContain('SOP');
    expect(created.some((c) => c.documentNumber === 3)).toBe(false);
  });

  it('does not seed document defaults into the forms scope', async () => {
    const { service, created } = buildService([]);
    await service.ensureDefaults(
      companyId,
      DOCUMENT_TYPE_SCOPE_KEYS.DOCUMENT_MANAGEMENT_FORMS,
    );
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe('Forms');
  });

  it('does not re-seed soft-deleted default titles (isActive=false)', async () => {
    const { service, model, created } = buildService([
      { title: 'Manual', documentNumber: 1, isActive: false },
      { title: 'Procedure', documentNumber: 2, isActive: true },
    ]);
    await service.ensureDefaults(companyId, scope);

    // Query must not filter out inactive rows (product: soft-delete sticks).
    expect(model.find).toHaveBeenCalledWith({
      companyId: expect.anything(),
      scopeKey: scope,
    });
    expect(created.map((c) => c.title)).not.toContain('Manual');
    expect(created.map((c) => c.title)).not.toContain('Procedure');
    expect(created.map((c) => c.title)).toContain('SOP');
  });
});
