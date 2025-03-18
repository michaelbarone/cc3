# Testing Framework Documentation

## Overview

This project uses the following testing stack:

### Unit & Integration Testing
- Vitest - Test runner
- React Testing Library - Component testing
- MSW (Mock Service Worker) - API mocking
- Testing Library User Event - User interaction testing

### E2E Testing (Planned)
- Playwright
- Cross-browser testing
- Mobile viewport testing

## Directory Structure

```
__tests__/
├── setup.ts                   # Global test setup and configuration
├── utils/
│   └── test-utils.tsx        # Common test utilities and wrappers
├── mocks/
│   ├── handlers/             # MSW API route handlers
│   │   ├── auth.ts          # Authentication route mocks
│   │   ├── urls.ts          # URL management route mocks
│   │   └── users.ts         # User management route mocks
│   ├── data/                # Mock data fixtures
│   │   ├── users.ts        
│   │   ├── urls.ts
│   │   └── groups.ts
│   └── server.ts            # MSW server setup
└── __snapshots__/           # Test snapshots if needed
```

## Key Design Decisions

1. **MSW Over Direct Database Testing**
   - Using MSW for API mocking instead of test databases
   - Faster test execution
   - Better isolation
   - More reliable tests
   - Database tests will be in separate suites

2. **Test Organization**
   - Tests located next to source files
   - Common utilities centralized
   - Shared mock data and handlers
   - Clear separation of concerns

3. **Test Utilities**
   - Shared provider wrapper
   - Common test helpers
   - Reusable fixtures
   - Custom matchers as needed

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# UI mode
npm run test:ui
```

## Best Practices

1. **Test Isolation**
   - Each test runs independently
   - MSW handlers reset between tests
   - Provider state cleaned up
   - No shared state between tests

2. **Performance**
   - Fast matchers preferred
   - Efficient setup/teardown
   - Cached fixtures where appropriate
   - Minimal use of heavy operations

3. **Maintainability**
   - Descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)
   - Document complex scenarios
   - Keep tests focused and simple

4. **Developer Experience**
   - Clear error messages
   - Helpful test utilities
   - Good documentation
   - Example test cases

## Mock Data Guidelines

1. **API Mocks**
   - Match API response structure
   - Include error cases
   - Test edge cases
   - Realistic data shapes

2. **User Scenarios**
   - Common user types (admin, regular)
   - Various permission levels
   - Different data states
   - Edge cases

## Future Considerations

1. **Coverage Goals**
   - Critical paths
   - User flows
   - Error handling
   - Edge cases

2. **E2E Testing**
   - Cross-browser testing
   - Mobile testing
   - Performance testing
   - Accessibility testing 
