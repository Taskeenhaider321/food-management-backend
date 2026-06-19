import { ConductHaccp } from '../schemas/conduct-haccp.schema';
import { assignHaccpDocumentId } from '../../common/assign-document-id';

export class ConductHaccpHooks {
  static async generateDocumentId(this: ConductHaccp) {
    await assignHaccpDocumentId(this);
  }
}
