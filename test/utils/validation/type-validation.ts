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
 * Asserts that an API response matches the expected type structure
 * Throws an error if validation fails
 */
export function assertApiResponse<T>(
  response: unknown,
  validator: TypeValidator<T>,
  path = ""
): asserts response is T {
  validateApiResponse(response, validator, { path, throwOnError: true });
}

/**
 * Helper function to validate and assert API response types
 */
export function expectApiResponse<T>(
  response: unknown,
  validator: TypeValidator<T>,
  path = ""
): void {
  const isValid = validateApiResponse(response, validator, { path });
  expect(isValid, `API Response validation failed at ${path}`).toBe(true);
}

export type { TypeValidator, ValidationError };

