import { Processes } from '../schemas/processes.schema';
import { assignHaccpDocumentId } from '../../common/assign-document-id';

export class ProcessesHooks {
  static async generateDocumentId(this: Processes) {
    await assignHaccpDocumentId(this);
  }
}
