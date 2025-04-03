import { expect } from "vitest";

/**
 * Type validation error details
 */
interface ValidationError {
  path: string[];
  expected: string;
  received: string;
  value: unknown;
}

/**
 * Base type validator interface
 */
interface TypeValidator<T> {
  validate(value: unknown): value is T;
  getErrors(): ValidationError[];
}

/**
 * Creates a type validator for primitive types
 */
function createPrimitiveValidator<T>(
  type: "string" | "number" | "boolean" | "bigint",
  additionalChecks?: (value: T) => boolean
): TypeValidator<T> {
  const errors: ValidationError[] = [];

  return {
    validate(value: unknown): value is T {
      errors.length = 0;

      if (typeof value !== type) {
        errors.push({
          path: [],
          expected: type,
          received: typeof value,
          value
        });
        return false;
      }

      if (additionalChecks && !additionalChecks(value as T)) {
        errors.push({
          path: [],
          expected: `${type} with additional constraints`,
          received: typeof value,
          value
        });
        return false;
      }

      return true;
    },
    getErrors: () => errors
  };
}

/**
 * Creates a type validator for arrays
 */
function createArrayValidator<T>(itemValidator: TypeValidator<T>): TypeValidator<T[]> {
  const errors: ValidationError[] = [];

  return {
    validate(value: unknown): value is T[] {
      errors.length = 0;

      if (!Array.isArray(value)) {
        errors.push({
          path: [],
          expected: "array",
          received: typeof value,
          value
        });
        return false;
      }

      let isValid = true;
      value.forEach((item, index) => {
        if (!itemValidator.validate(item)) {
          isValid = false;
          errors.push(
            ...itemValidator.getErrors().map((error: ValidationError) => ({
              ...error,
              path: [`[${index}]`, ...error.path]
            }))
          );
        }
      });

      return isValid;
    },
    getErrors: () => errors
  };
}

/**
 * Creates a type validator for objects
 */
function createObjectValidator<T extends Record<string, unknown>>(
  schema: { [K in keyof T]: TypeValidator<T[K]> }
): TypeValidator<T> {
  const errors: ValidationError[] = [];

  return {
    validate(value: unknown): value is T {
      errors.length = 0;

      if (typeof value !== "object" || value === null) {
        errors.push({
          path: [],
          expected: "object",
          received: typeof value,
          value
        });
        return false;
      }

      let isValid = true;
      for (const [key, validator] of Object.entries(schema)) {
        if (!(key in value)) {
          errors.push({
            path: [key],
            expected: "defined",
            received: "undefined",
            value: undefined
          });
          isValid = false;
          continue;
        }

        const propertyValue = (value as any)[key];
        if (!validator.validate(propertyValue)) {
          isValid = false;
          errors.push(
            ...validator.getErrors().map((error: ValidationError) => ({
              ...error,
              path: [key, ...error.path]
            }))
          );
        }
      }

      return isValid;
    },
    getErrors: () => errors
  };
}

/**
 * Common validators for API responses
 */
export const validators = {
  string: createPrimitiveValidator<string>("string"),
  number: createPrimitiveValidator<number>("number"),
  safeInteger: createPrimitiveValidator<number>("number", Number.isSafeInteger),
  boolean: createPrimitiveValidator<boolean>("boolean"),
  bigint: createPrimitiveValidator<bigint>("bigint"),
  isoDate: createPrimitiveValidator<string>("string", (value) => !isNaN(Date.parse(value))),
  url: createPrimitiveValidator<string>("string", (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }),
  array: <T>(itemValidator: TypeValidator<T>) => createArrayValidator(itemValidator),
  object: <T extends Record<string, unknown>>(schema: { [K in keyof T]: TypeValidator<T[K]> }) =>
    createObjectValidator<T>(schema)
};

/**
 * Validates API response structure and provides detailed error messages
 */
export function validateApiResponse<T>(
  response: unknown,
  validator: TypeValidator<T>,
  options: {
    path?: string;
    throwOnError?: boolean;
  } = {}
): response is T {
  const { path = "", throwOnError = false } = options;

  const isValid = validator.validate(response);

  if (!isValid && throwOnError) {
    const errors = validator.getErrors();
    const errorMessages = errors.map(error =>
      `${path}${error.path.join(".")}: Expected ${error.expected}, received ${error.received}`
    );
    throw new Error(`API Response validation failed:\n${errorMessages.join("\n")}`);
  }

  return isValid;
}

/**
 * Validates response structure and adds test assertions
 */
export function assertApiResponse<T>(
  response: unknown,
  validator: TypeValidator<T>,
  path = ""
): asserts response is T {
  const isValid = validator.validate(response);

  if (!isValid) {
    const errors = validator.getErrors();
    errors.forEach(error => {
      const fullPath = `${path}${error.path.join(".")}`;
      expect(
        typeof error.value,
        `${fullPath} should be ${error.expected}, received ${error.received}`
      ).toBe(error.expected);
    });
  }
}

/**
 * Common response validators
 */
export const responseValidators = {
  pagination: <T>(itemValidator: TypeValidator<T>) => validators.object({
    items: validators.array(itemValidator),
    total: validators.safeInteger,
    page: validators.safeInteger,
    pageSize: validators.safeInteger,
    hasMore: validators.boolean
  }),

  error: validators.object({
    error: validators.string
  }),

  success: validators.object({
    success: validators.boolean,
    message: validators.string
  }),

  healthCheck: validators.object({
    status: validators.string,
    timestamp: validators.isoDate,
    version: validators.string,
    database: validators.boolean,
    storage: validators.boolean
  }),

  userProfile: validators.object({
    id: validators.string,
    username: validators.string,
    email: validators.string,
    isAdmin: validators.boolean,
    avatarUrl: validators.string,
    createdAt: validators.isoDate,
    updatedAt: validators.isoDate
  }),

  urlGroup: validators.object({
    id: validators.string,
    name: validators.string,
    description: validators.string,
    icon: validators.string,
    urls: validators.array(validators.object({
      id: validators.string,
      url: validators.url,
      urlMobile: validators.url
    }))
  })
};

/**
 * Example usage:
 *
 * ```typescript
 * // Validate a paginated response
 * const validator = responseValidators.pagination(responseValidators.userProfile);
 * const response = await fetch("/api/users");
 * const data = await response.json();
 *
 * if (!validateApiResponse(data, validator)) {
 *   console.error("Invalid response structure:", validator.getErrors());
 *   return;
 * }
 *
 * // Use with assertions in tests
 * test("API returns valid user list", async () => {
 *   const response = await fetch("/api/users");
 *   const data = await response.json();
 *   assertApiResponse(data, validator, "users response");
 * });
 * ```
 */
