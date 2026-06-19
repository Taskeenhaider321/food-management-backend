import { plainToInstance, Transform } from 'class-transformer';

/**
 * Parses a JSON-string field (as received in multipart/form-data bodies)
 * into an instance of the given DTO class so nested validation works.
 * Plain objects (regular JSON requests) are converted as-is.
 */
export function TransformJsonTo(cls: new () => object): PropertyDecorator {
  return Transform(({ value }) => {
    let raw = value;
    if (typeof value === 'string') {
      try {
        raw = JSON.parse(value);
      } catch {
        return value;
      }
    }
    return raw && typeof raw === 'object' ? plainToInstance(cls, raw) : raw;
  });
}

/** Parses JSON-string arrays (multipart) while passing real arrays through. */
export function TransformJsonArray(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : value;
      } catch {
        return value;
      }
    }
    return value;
  });
}

/** Converts "true"/"false" strings (multipart) into booleans. */
export function TransformBoolean(): PropertyDecorator {
  return Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });
}
