# Testing Framework Documentation

## Overview
This directory contains comprehensive documentation for the Control Center testing framework, including standards, patterns, and best practices for test implementation and maintenance.

## Test Directory Structure

We follow a clean, organized structure for all tests:

```
test/
├── e2e/                      # End-to-end tests with Playwright
│   ├── helpers/              # E2E test helpers
│   ├── journeys/             # User journey tests
│   └── test-assets/          # Test assets for E2E tests
├── fixtures/                 # Test fixtures and factories
│   └── data/                 # Static test data
├── helpers/                  # Common test helpers
│   ├── file/                 # File system helpers
│   └── validators/           # Validation utilities
├── integration/              # Integration tests
├── mocks/                    # Mock implementations
│   ├── factories/            # Factory functions
│   └── services/             # Service mocks
└── setup/                    # Test setup and configuration
```

This structure enables:
- Clear separation between test types
- Easy discovery of helpers and utilities
- Consistent patterns across test implementations
- Proper isolation between test concerns
- Simple maintenance and extension

## API Test Review Improvements (April 2025)

We've completed a thorough review and improvement of our API test suite with the following key enhancements:

1. **Standardized Error Handling**:
   - Consistent try/catch/finally patterns
   - Structured error logging with context
   - Mock state capture during failures
   - Type-safe error assertions

2. **Performance Monitoring**:
   - Tiered timing approach (suite, test, operation levels)
   - Standard threshold enforcement
   - Performance metrics in error context
   - Response time validation

3. **Test Data Management**:
   - Clear API vs service layer patterns
   - Type-safe factory functions
   - Fixture-based test data
   - Proper date formatting for API responses

4. **Test Coverage**:
   - 100% route coverage for admin, user and system routes
   - 100% HTTP method coverage
   - Comprehensive edge case testing
   - Type-safe response validation

5. **Dedicated Test Database**:
   - Separate SQLite database for integration tests
   - Automated initialization and teardown
   - Transaction-based test isolation
   - Test-specific data factories

See the updated documentation for more details:
- [API Test Coverage](./api-test-coverage.md) - Updated coverage metrics
- [Error Handling Patterns](./error-handling-patterns.md) - Improved API test error handling
- [Test Data Management](./test-data-management.md) - Enhanced factory pattern examples
- [Performance Testing Standards](./performance-testing-standards.md) - API test performance monitoring
- [Test Database Standards](./test-database-standards.md) - New dedicated test database

## Testing Standards and Best Practices

### Framework-Specific Standards
- [Vitest and React Testing Library Standards](./vitest-react-testing-lib-testing-standards.md)
- [Playwright E2E Testing Standards](./playwright-e2e-standards.md)
- [Prisma Testing Standards](./prisma-testing-standards.md)
- [Performance Testing Standards](./performance-testing-standards.md)
- [Test Database Standards](./test-database-standards.md)

### Core Testing Guidelines
- [Error Handling Patterns](./error-handling-patterns.md)
- [Test Data Management](./test-data-management.md)
- [Test Debugging Standards](./test-debugging-standards.md)
- [API Test Coverage](./api-test-coverage.md)

### Test Organization
```typescript
// Standard test file structure
describe('ComponentName or FeatureName', () => {
  // Performance monitoring setup
  const testTimer = measureTestTime('Test Suite');

  beforeAll(async () => {
    const setupTimer = measureTestTime('Suite Setup');
    try {
      // Suite-wide setup
    } finally {
      setupTimer.end();
    }
  });

  describe('Functionality Group', () => {
    beforeEach(() => {
      const timer = measureTestTime('Test Setup');
      try {
        // Setup for this group
      } finally {
        timer.end();
      }
    });

    afterEach(() => {
      // Cleanup for this group
    });

    it('should behave in expected way', async () => {
      const timer = measureTestTime('Individual Test');
      try {
        // Test implementation
      } finally {
        timer.end();
      }
    });
  });

  afterAll(() => {
    testTimer.end();
  });
});
```

## Key Testing Principles

1. **Test Isolation**
   - Each test should be independent
   - Use proper setup and teardown
   - Avoid shared state between tests
   - Monitor setup/teardown performance
   - Use transaction isolation for database tests

2. **Test Coverage Requirements**
   - Unit Tests: 80% coverage minimum
   - Integration Tests: Critical paths covered
   - E2E Tests: Core user journeys covered
   - Performance Tests: All API endpoints monitored

3. **Performance Standards**
   - Unit tests: < 100ms per test
   - Integration tests: < 1s per test
   - E2E tests: < 5s per test
   - API tests: < 2s per endpoint
   - CI allowance: 50% higher thresholds

## Getting Started

1. **Setup Development Environment**
   ```powershell
   # Install dependencies
   npm install
   
   # Run all tests
   npm test
   
   # Run specific test suites
   npm run test:unit
   npm run test:integration
   npm run test:e2e
   npm run test:performance
   
   # Clear test database
   npm run test:db:clear
   ```

2. **Writing Tests**
   - Follow the patterns in existing test files
   - Use the appropriate testing framework
   - Implement proper error handling
   - Include performance monitoring
   - Follow test data management practices
   - Use the test database for integration tests

3. **Test Documentation**
   - Document test purpose and scenarios
   - Include example usage
   - Document performance requirements
   - Include timing thresholds
   - Document any special setup requirements

## Contributing

1. **Before Submitting**
   - Ensure all tests pass
   - Meet coverage requirements
   - Follow error handling patterns
   - Verify performance thresholds
   - Include proper documentation

2. **Code Review Checklist**
   - [ ] Tests follow established patterns
   - [ ] Error cases are covered
   - [ ] Documentation is updated
   - [ ] Performance requirements met
   - [ ] Resource cleanup implemented
   - [ ] Timing thresholds verified

## Related Documentation

- [Error Handling Patterns](./error-handling-patterns.md)
- [Test Data Management](./test-data-management.md)
- [Test Debugging Guide](./test-debugging-guide.md)
- [API Testing Standards](./api-testing-standards.md)
- [Performance Testing Standards](./performance-testing-standards.md)
- [Test Database Standards](./test-database-standards.md)

## Test Maintenance

1. **Regular Maintenance Tasks**
   - Review and update flaky tests
   - Validate test data integrity
   - Update deprecated test patterns
   - Monitor test performance
   - Review performance reports
   - Investigate slow tests

2. **Troubleshooting**
   - Check the [Troubleshooting Guide](./troubleshooting-guide.md)
   - Review test logs and reports
   - Analyze performance metrics
   - Consult test debugging standards

## Documentation Structure

### Specialized Testing Areas
- [Cookie Handling](./cookie-handling.md) - Standards for testing cookie-related functionality
- [Statistics Testing](./statistics-testing.md) - Guidelines for testing statistical computations
- [Flaky Test Audit](./flaky-test-audit.md) - Documentation of flaky tests and mitigation strategies
- [Performance Monitoring](./performance-testing-standards.md) - Standards for test performance and optimization
- [Test Database Standards](./test-database-standards.md) - Dedicated test database configuration and usage

## Key Features

1. **Comprehensive Test Coverage**
   - Unit testing with Vitest
   - Integration testing
   - E2E testing with Playwright
   - API endpoint testing
   - Performance monitoring
   - Dedicated test database

2. **Quality Assurance**
   - Error handling standards
   - Test data management
   - Debugging practices
   - Performance thresholds
   - Resource optimization

3. **Maintenance and Support**
   - Troubleshooting procedures
   - Test failure analysis
   - Documentation standards
   - Performance monitoring
   - Best practices

## Getting Started

For new developers working with the testing framework:

1. Start with the [Error Handling Patterns](./error-handling-patterns.md) document
2. Review the [Test Data Management](./test-data-management.md) guidelines
3. Familiarize yourself with the [Performance Testing Standards](./performance-testing-standards.md)
4. Check [API Test Coverage](./api-test-coverage.md) for endpoint testing requirements
5. Read [Test Database Standards](./test-database-standards.md) for integration tests
6. Consult the [Troubleshooting Guide](./troubleshooting-guide.md)

## Contributing

When contributing to the testing framework:

1. Follow the established patterns in [Error Handling Patterns](./error-handling-patterns.md)
2. Ensure proper test data management as outlined in [Test Data Management](./test-data-management.md)
3. Meet performance requirements from [Performance Testing Standards](./performance-testing-standards.md)
4. Document any new issues and solutions in the [Troubleshooting Guide](./troubleshooting-guide.md)
5. Maintain test coverage metrics in [API Test Coverage](./api-test-coverage.md)

## Related Documentation

- [E2E Testing Standards](../testing-framework/playwright-e2e-standards.md)
- [Test Debugging Standards](../testing-framework/test-debugging-standards.md)
- [Test Database Standards](../testing-framework/test-database-standards.md) 
