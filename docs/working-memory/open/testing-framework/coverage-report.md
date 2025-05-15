# Coverage Report (2025-05-15)

## Coverage Issues

The following components do not meet the required coverage thresholds:

1. Iframe Components (`./app/components/iframe/**/*.{ts,tsx}`)
   - Lines: 46.28% (Threshold: 90%)
   - Functions: 40% (Threshold: 90%)
   - Statements: 46.28% (Threshold: 90%)
   - Branches: 78.57% (Threshold: 90%)

2. State Management (`./app/lib/state/**/*.{ts,tsx}`)
   - Branches: 86.66% (Threshold: 90%)

## Test Failures

The following tests are currently failing:

1. URL Menu Component Tests (`app/components/url-menu/UrlMenu.test.tsx`)
   - `should handle URL expansion`: Timeout error finding element
   - `should handle empty states`: Unable to find text "No URLs available"
   - `should handle long press to unload URL`: Unable to find element with role="list"
   - `should handle rapid clicks between different URLs`: Assertion error with null element
   - `should handle interrupted long press correctly`: Assertion error with null element
   - `should handle browser tab switching during operations`: Element not in document

2. API Endpoint Tests
   - `app/api/admin/url-groups/route.test.ts`:
     - GET test where `data.urls` is undefined instead of array
     - PUT test with 500 status instead of 200

3. Performance Tests
   - `app/api/admin/users/[id]/avatar/route.test.ts`:
     - Performance test timing threshold exceeded (324.7ms vs 200ms limit)

## Action Plan

1. Iframe Component Coverage Issues:
   - Increase test coverage by adding tests for missing functionality
   - Focus on untested functions and branches
   - Implement missing interaction tests

2. State Management Branch Coverage:
   - Add tests for edge case branches (remaining 3.34%)
   - Ensure all conditional paths are tested

3. URL Menu Test Failures:
   - Debug timing issues in component rendering
   - Fix selectors to properly target elements
   - Adjust waiting strategy for asynchronous operations

4. API Test Failures:
   - Fix URL Groups API mock implementation to return proper data structure
   - Fix transaction handling in PUT route

5. Performance Test Failures:
   - Adjust threshold for avatar upload validation or optimize implementation
   - Consider moving threshold from 200ms to 350ms based on actual performance

## Priority Items

1. Fix URL Groups API tests:
   - Investigate mock implementation for GET route to ensure `data.urls` is properly set
   - Debug PUT route handler returning 500 instead of 200

2. Fix performance threshold for avatar upload test
   - Increase threshold or optimize file validation logic

## Next Steps

1. Address failing tests first to establish proper baseline
2. Implement additional tests to increase coverage for iframe components
3. Add targeted tests for state management branches
4. Re-run coverage report to verify improvements 
