import { TypeValidator, validators } from "../type-validation";

/**
 * Common API response validators for reuse across tests
 */

/**
 * Validator for standard error responses
 * { error: string }
 */
export const errorResponseValidator: TypeValidator<{ error: string }> = validators.object({
  error: validators.string,
});

/**
 * Validator for simple success responses
 * { success: boolean }
 */
export const successResponseValidator: TypeValidator<{ success: boolean }> = validators.object({
  success: validators.boolean,
});

/**
 * Validator for message-based success responses
 * { message: string }
 */
export const messageResponseValidator: TypeValidator<{ message: string }> = validators.object({
  message: validators.string,
});

/**
 * Validator for standard rollback responses from backup operations
 * { message: string, rollbackFile: string }
 */
export const rollbackResponseValidator: TypeValidator<{ message: string; rollbackFile: string }> =
  validators.object({
    message: validators.string,
    rollbackFile: validators.string,
  });

/**
 * Creates a paginated response validator
 *
 * @param itemValidator Validator for individual items in the data array
 * @returns Validator for paginated responses
 */
export function createPaginatedValidator<T>(
  itemValidator: TypeValidator<T>
): TypeValidator<{
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {
  return validators.object({
    data: validators.array(itemValidator),
    pagination: validators.object({
      page: validators.safeInteger,
      pageSize: validators.safeInteger,
      total: validators.safeInteger,
      totalPages: validators.safeInteger,
    }),
  });
}

// Helper function to create a null validator
const createNullValidator = (): TypeValidator<null> => {
  const errors: Array<{ path: string[]; expected: string; received: string; value: unknown }> = [];

  return {
    validate(value: unknown): value is null {
      errors.length = 0;

      if (value !== null) {
        errors.push({
          path: [],
          expected: "null",
          received: typeof value,
          value,
        });
        return false;
      }

      return true;
    },
    getErrors: () => errors,
  };
};

// Helper function to create a union validator
function createUnionValidator<T, U>(
  validator1: TypeValidator<T>,
  validator2: TypeValidator<U>
): TypeValidator<T | U> {
  const errors: Array<{ path: string[]; expected: string; received: string; value: unknown }> = [];

  return {
    validate(value: unknown): value is T | U {
      errors.length = 0;

      if (validator1.validate(value)) {
        return true;
      }

      if (validator2.validate(value)) {
        return true;
      }

      errors.push({
        path: [],
        expected: "one of the union types",
        received: typeof value,
        value,
      });

      return false;
    },
    getErrors: () => errors,
  };
}

// Add null validator
const nullValidator = createNullValidator();

/**
 * Creates a validator for standard user objects
 * Can be used as base validator with extended user data
 *
 * @param additionalFields Optional additional fields to validate
 * @returns Validator for user objects
 */
export function createUserValidator(
  additionalFields: Record<string, TypeValidator<any>> = {}
): TypeValidator<{
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  avatarUrl: string | null;
}> {
  return validators.object({
    id: validators.string,
    username: validators.string,
    isAdmin: validators.boolean,
    createdAt: validators.isoDate,
    updatedAt: validators.isoDate,
    lastLoginAt: createUnionValidator(validators.isoDate, nullValidator),
    avatarUrl: createUnionValidator(validators.string, nullValidator),
    ...additionalFields,
  });
}

/**
 * Create a validator for URL objects
 *
 * @param additionalFields Optional additional fields to validate
 * @returns Validator for URL objects
 */
export function createUrlValidator(
  additionalFields: Record<string, TypeValidator<any>> = {}
): TypeValidator<{
  id: string;
  title: string;
  url: string;
  displayOrder: number;
}> {
  return validators.object({
    id: validators.string,
    title: validators.string,
    url: validators.url,
    displayOrder: validators.number,
    ...additionalFields,
  });
}

/**
 * Create a validator for URL group objects
 *
 * @param includeUrls Whether to include the urls array in validation
 * @param additionalFields Optional additional fields to validate
 * @returns Validator for URL group objects
 */
export function createUrlGroupValidator(
  includeUrls: boolean = true,
  additionalFields: Record<string, TypeValidator<any>> = {}
): TypeValidator<{
  id: string;
  name: string;
  urls?: {
    id: string;
    title: string;
    url: string;
    displayOrder: number;
  }[];
}> {
  const baseFields = {
    id: validators.string,
    name: validators.string,
    ...additionalFields,
  };

  if (includeUrls) {
    return validators.object({
      ...baseFields,
      urls: validators.array(createUrlValidator()),
    });
  }

  return validators.object(baseFields);
}

/**
 * Missing or malformed data validation helpers
 * These can be used to explicitly test for validation failures
 */
export const invalidDataValidators = {
  /**
   * Validator for missing required field errors
   */
  missingRequiredField: validators.object({
    error: validators.string,
    missingFields: validators.array(validators.string),
  }),

  /**
   * Validator for invalid data type errors
   */
  invalidDataType: validators.object({
    error: validators.string,
    invalidFields: validators.array(
      validators.object({
        field: validators.string,
        expectedType: validators.string,
      })
    ),
  }),
};
