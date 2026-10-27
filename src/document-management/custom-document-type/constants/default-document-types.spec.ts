import { DEFAULT_DOCUMENT_TYPES_BY_SCOPE } from './default-document-types';
import { DOCUMENT_TYPE_SCOPE_KEYS } from '../scope-keys';

describe('DEFAULT_DOCUMENT_TYPES_BY_SCOPE', () => {
  const docs =
    DEFAULT_DOCUMENT_TYPES_BY_SCOPE[
      DOCUMENT_TYPE_SCOPE_KEYS.DOCUMENT_MANAGEMENT_DOCUMENTS
    ];
  const forms =
    DEFAULT_DOCUMENT_TYPES_BY_SCOPE[
      DOCUMENT_TYPE_SCOPE_KEYS.DOCUMENT_MANAGEMENT_FORMS
    ];

  it('seeds exactly the nine requested document types', () => {
    expect(docs.map((d) => d.title)).toEqual([
      'Manual',
      'Procedure',
      'SOP',
      'Work Instructions',
      'Records',
      'Risk Assessment',
      'Finished Product Specifications',
      'Raw Material Specifications',
      'Job Description',
    ]);
  });

  it('seeds Forms as the default form type', () => {
    expect(forms.map((d) => d.title)).toEqual(['Forms']);
  });

  it('does not include excluded plan/diagram types', () => {
    const allTitles = [...docs, ...forms].map((d) => d.title);
    expect(allTitles).not.toContain('Flow Diagram');
    expect(allTitles).not.toContain('Quality Culture Plan');
    expect(allTitles).not.toContain('Product Defense Plan');
  });

  it('only defines document-management scopes (isolation by scope key)', () => {
    expect(Object.keys(DEFAULT_DOCUMENT_TYPES_BY_SCOPE).sort()).toEqual(
      [
        DOCUMENT_TYPE_SCOPE_KEYS.DOCUMENT_MANAGEMENT_DOCUMENTS,
        DOCUMENT_TYPE_SCOPE_KEYS.DOCUMENT_MANAGEMENT_FORMS,
      ].sort(),
    );
  });
});
