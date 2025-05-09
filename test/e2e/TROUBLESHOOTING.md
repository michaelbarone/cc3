# E2E Testing Troubleshooting Guide

## Common Issues and Solutions

### Server Health Check Failures

1. **Server Not Starting**
   ```
   Error: Server health check failed after maximum retries
   ```
   **Solutions:**
   - Ensure the development server is running (`npm run dev`)
   - Check if the port 3000 is available
   - Verify no other instances are running
   - Check server logs for startup errors

2. **Database Connection Issues**
   ```
   Server not healthy: { database: false, filesystem: true, memory: true }
   ```
   **Solutions:**
   - Verify database is running
   - Check database connection string
   - Ensure database migrations are up to date
   - Check database logs for errors

3. **Filesystem Issues**
   ```
   Server not healthy: { database: true, filesystem: false, memory: true }
   ```
   **Solutions:**
   - Check file permissions in the data directory
   - Verify disk space availability
   - Ensure required directories exist
   - Check for locked files

4. **Memory Issues**
   ```
   Server not healthy: { database: true, filesystem: true, memory: false }
   ```
   **Solutions:**
   - Check available system memory
   - Look for memory leaks
   - Adjust memory thresholds if needed
   - Consider cleaning up test data

### Login Page Verification Issues

1. **Page Load Timeout**
   ```
   Error: Timeout waiting for selector 'h1:has-text("Dashboard")'
   ```
   **Solutions:**
   - Increase browser timeout in config
   - Check network connectivity
   - Verify server response times
   - Check for JavaScript errors

2. **Missing Elements**
   ```
   Error: Unable to find element "text=admin"
   ```
   **Solutions:**
   - Verify database seeding
   - Check if admin user exists
   - Ensure correct page navigation
   - Check for rendering issues

## Configuration Tips

### Environment Variables

```bash
# Health Check Configuration
TEST_HEALTH_MAX_ATTEMPTS=5      # Maximum retry attempts
TEST_HEALTH_BASE_DELAY=1000     # Base delay between retries (ms)
TEST_HEALTH_TIMEOUT=30000       # Health check timeout (ms)
TEST_HEALTH_ENDPOINT=/api/health # Health check endpoint

# Browser Configuration
TEST_BROWSER_TIMEOUT=30000      # Browser operation timeout (ms)
TEST_BROWSER_SCREENSHOTS=true   # Enable failure screenshots
TEST_BROWSER_VIDEO=false        # Enable video recording
TEST_ARTIFACTS_DIR=./artifacts  # Test artifacts directory

# Environment Configuration
TEST_BASE_URL=http://localhost:3000 # Application base URL
TEST_LOG_LEVEL=debug               # Logging verbosity
TEST_PRESERVE_OUTPUT=false         # Preserve test outputs
```

### Logging Levels

- **debug**: Most verbose, includes all details
- **info**: Standard information and status
- **warn**: Only warnings and errors
- **error**: Only error messages

## Debugging Tips

1. **Enable Debug Logging**
   ```bash
   TEST_LOG_LEVEL=debug npm run test:e2e
   ```

2. **Capture Screenshots**
   ```bash
   TEST_BROWSER_SCREENSHOTS=true npm run test:e2e
   ```

3. **Record Videos**
   ```bash
   TEST_BROWSER_VIDEO=true npm run test:e2e
   ```

4. **Preserve Test Outputs**
   ```bash
   TEST_PRESERVE_OUTPUT=true npm run test:e2e
   ```

## Health Check Details

The health check endpoint (`/api/health`) verifies three critical systems:

1. **Database**
   - Verifies connection
   - Checks query execution
   - Validates migrations

2. **Filesystem**
   - Checks data directory access
   - Verifies read/write permissions
   - Validates storage availability

3. **Memory**
   - Monitors heap usage
   - Checks memory thresholds
   - Validates resource availability

## Best Practices

1. **Clean Environment**
   - Start with a fresh database
   - Clear test artifacts
   - Reset application state

2. **Proper Configuration**
   - Use appropriate timeouts
   - Enable necessary debugging
   - Configure proper retries

3. **Systematic Debugging**
   - Check server logs
   - Review browser console
   - Examine screenshots
   - Analyze videos if enabled

4. **Resource Management**
   - Clean up test data
   - Remove old artifacts
   - Monitor system resources 
