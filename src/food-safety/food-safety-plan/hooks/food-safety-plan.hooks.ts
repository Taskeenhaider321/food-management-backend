import { FoodSafety } from '../schemas/food-safety-plan.schema';
import { assignHaccpDocumentId } from '../../common/assign-document-id';

export class FoodSafetyHooks {
  static async generateDocumentId(this: FoodSafety) {
    await assignHaccpDocumentId(this);
  }
}
