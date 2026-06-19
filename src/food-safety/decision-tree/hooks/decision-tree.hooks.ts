import { DecisionTree } from '../schemas/decision-tree.schema';
import { assignHaccpDocumentId } from '../../common/assign-document-id';

export class DecisionTreeHooks {
  static async generateDocumentId(this: DecisionTree) {
    await assignHaccpDocumentId(this);
  }
}
