import { Product } from '../schemas/product.schema';
import { assignHaccpDocumentId } from '../../common/assign-document-id';

export class ProductHooks {
  static async generateDocumentId(this: Product) {
    await assignHaccpDocumentId(this);
  }
}
