import { HaccpTeamDocument } from '../schemas/haccp-team.schema';
import { assignHaccpDocumentId } from '../../common/assign-document-id';

export class HaccpTeamHooks {
  static async generateDocumentId(this: HaccpTeamDocument) {
    await assignHaccpDocumentId(this);
  }
}
