# Activity Logging System

## Overview

The Activity Logging System provides a comprehensive audit trail of user and system actions within the Control Center application. This system tracks key operations for security, troubleshooting, and compliance purposes, storing structured data about each action.

## Planned Implementation

As outlined in the project plan, we will implement a robust activity logging system with the following capabilities:

1. **Structured Activity Records**: Store detailed information about each action
2. **Admin User Interface**: View, search, and analyze activity logs
3. **Configurable Retention**: Control how long logs are kept
4. **Automated Pruning**: Remove old logs based on retention policy
5. **Comprehensive Coverage**: Track all key system and user actions

## Data Model

### Activity Log Model

The system will use a Prisma model to store activity logs:

```prisma
model ActivityLog {
  id               String    @id @default(uuid())
  timestamp        DateTime  @default(now())
  userId           String?
  actingUserName   String
  userRole         String?
  actionType       String
  details          Json?
  targetEntityType String?
  targetEntityId   String?
  isSuccess        Boolean   @default(true)
  user             User?     @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([timestamp])
  @@index([actionType])
  @@index([userId])
  @@index([targetEntityType, targetEntityId])
}

model SystemSetting {
  id               String   @id @default("singleton")
  logRetentionDays Int      @default(180)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

## Tracked Actions

The system will track the following key actions:

### User Authentication

- User login attempts (success/failure)
- User logout events
- Session management actions

### User Management

- User creation
- User profile updates
- User role changes
- User activation/deactivation

### System Configuration

- Application branding changes
- System settings modifications
- Theme changes
- Registration settings updates

### Content Management

- URL group creation/modification/deletion
- URL creation/modification/deletion
- URL group membership changes
- URL reordering operations

### System Operations

- Backup creation
- System restoration
- Log pruning actions
- System initialization

### User Preferences

- Theme changes
- Menu position updates
- Language preference changes
- User-specific setting modifications

## Logging Service

A centralized logging service will provide a consistent interface for creating activity log entries:

```typescript
interface CreateActivityLogDto {
  userId?: string;
  actingUserName: string;
  userRole?: string;
  actionType: string;
  details?: Record<string, any>;
  targetEntityType?: string;
  targetEntityId?: string;
  isSuccess?: boolean;
}

interface ActivityLogService {
  createActivityLogEntry(data: CreateActivityLogDto): Promise<ActivityLog>;
  getActivityLogs(options: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filterBy?: Partial<ActivityLog>;
  }): Promise<{
    logs: ActivityLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  pruneActivityLogs(olderThan?: Date): Promise<{ entriesPruned: number }>;
}
```

## Admin Interface

Administrators will have access to an activity log interface:

```typescript
function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  
  // Fetch logs with pagination and filters
  useEffect(() => {
    fetchLogs();
  }, [pagination.page, pagination.pageSize, filters]);
  
  return (
    <Paper>
      <Typography variant="h6">Activity Logs</Typography>
      
      {/* Filters */}
      <Box sx={{ mb: 2 }}>
        <TextField label="Action Type" />
        <TextField label="User" />
        <DateRangePicker label="Date Range" />
        <Button variant="outlined">Apply Filters</Button>
      </Box>
      
      {/* Log Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Success</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                <TableCell>{log.actingUserName}</TableCell>
                <TableCell>{log.actionType}</TableCell>
                <TableCell>
                  <JSONViewer data={log.details} />
                </TableCell>
                <TableCell>
                  {log.targetEntityType && log.targetEntityId
                    ? `${log.targetEntityType}:${log.targetEntityId}`
                    : "-"}
                </TableCell>
                <TableCell>
                  {log.isSuccess ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <ErrorIcon color="error" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[25, 50, 100]}
        component="div"
        count={pagination.total}
        rowsPerPage={pagination.pageSize}
        page={pagination.page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
```

## Log Retention Management

### Retention Configuration

Administrators will be able to configure log retention policies:

```typescript
function LogRetentionSettings() {
  const [retentionDays, setRetentionDays] = useState(180);
  const [loading, setLoading] = useState(false);
  
  // Fetch current retention policy
  useEffect(() => {
    fetchRetentionPolicy();
  }, []);
  
  // Update retention policy
  const handleSavePolicy = async () => {
    setLoading(true);
    try {
      await updateRetentionPolicy(retentionDays);
      // Show success message
    } catch (error) {
      // Show error message
    } finally {
      setLoading(false);
    }
  };
  
  // Trigger manual pruning
  const handlePruneNow = async () => {
    setLoading(true);
    try {
      const result = await pruneLogsNow();
      // Show success message with count of pruned entries
    } catch (error) {
      // Show error message
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper>
      <Typography variant="h6">Log Retention Policy</Typography>
      
      <FormControl fullWidth sx={{ my: 2 }}>
        <InputLabel>Retention Period</InputLabel>
        <Select
          value={retentionDays}
          onChange={(e) => setRetentionDays(Number(e.target.value))}
        >
          <MenuItem value={30}>30 Days</MenuItem>
          <MenuItem value={90}>90 Days</MenuItem>
          <MenuItem value={180}>180 Days (Default)</MenuItem>
          <MenuItem value={365}>365 Days</MenuItem>
          <MenuItem value={0}>Keep Indefinitely</MenuItem>
        </Select>
        <FormHelperText>
          Logs older than this period will be automatically pruned. 
          Set to 0 to keep logs indefinitely.
        </FormHelperText>
      </FormControl>
      
      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleSavePolicy}
          disabled={loading}
        >
          Save Policy
        </Button>
        
        <Button
          variant="outlined"
          onClick={handlePruneNow}
          disabled={loading}
        >
          Prune Logs Now
        </Button>
      </Box>
    </Paper>
  );
}
```

### Automated Pruning

The system will use a scheduled task to automatically prune old logs:

```typescript
// Scheduled task using node-cron
cron.schedule("0 3 * * *", async () => { // 3:00 AM every day
  console.log("Running automated log pruning task");
  
  try {
    // Get retention policy
    const systemSettings = await prisma.systemSetting.findUnique({
      where: { id: "singleton" },
    });
    
    const retentionDays = systemSettings?.logRetentionDays ?? 180;
    
    // Skip if retention is set to keep indefinitely
    if (retentionDays === 0) {
      console.log("Log retention set to indefinite, skipping pruning");
      return;
    }
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Delete old logs
    const result = await prisma.activityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });
    
    // Log the pruning operation
    await prisma.activityLog.create({
      data: {
        actingUserName: "SYSTEM",
        actionType: "SYSTEM_LOG_PRUNED",
        details: {
          entriesPruned: result.count,
          policyDays: retentionDays,
          cutoffDate: cutoffDate.toISOString(),
        },
        isSuccess: true,
      },
    });
    
    console.log(`Pruned ${result.count} old log entries`);
  } catch (error) {
    console.error("Error pruning logs:", error);
  }
});
```

## API Endpoints

### Log Management API

```typescript
// GET /api/admin/activity-log
export async function GET(req: Request) {
  const session = await getSession();
  
  // Check admin authorization
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  
  // Parse query parameters
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);
  const sortBy = searchParams.get("sortBy") || "timestamp";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  
  // Apply filters if provided
  const filters: any = {};
  if (searchParams.get("actionType")) {
    filters.actionType = searchParams.get("actionType");
  }
  if (searchParams.get("userId")) {
    filters.userId = searchParams.get("userId");
  }
  // More filters...
  
  try {
    // Get total count
    const total = await prisma.activityLog.count({
      where: filters,
    });
    
    // Get paginated logs
    const logs = await prisma.activityLog.findMany({
      where: filters,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: page * pageSize,
      take: pageSize,
    });
    
    return new Response(
      JSON.stringify({
        logs,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch activity logs" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// POST /api/admin/system/logs/prune-now
export async function POST(req: Request) {
  const session = await getSession();
  
  // Check admin authorization
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  
  try {
    // Get retention policy
    const systemSettings = await prisma.systemSetting.findUnique({
      where: { id: "singleton" },
    });
    
    const retentionDays = systemSettings?.logRetentionDays ?? 180;
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Delete old logs
    const result = await prisma.activityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });
    
    // Log the manual pruning operation
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        actingUserName: session.user.username || "ADMIN",
        userRole: "ADMIN",
        actionType: "MANUAL_LOG_PRUNED",
        details: {
          entriesPruned: result.count,
          policyDays: retentionDays,
          cutoffDate: cutoffDate.toISOString(),
        },
        isSuccess: true,
      },
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        entriesPruned: result.count,
        policyDays: retentionDays,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error pruning logs:", error);
    return new Response(
      JSON.stringify({ error: "Failed to prune logs" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

## Implementation Plan

1. **Database Schema Updates**:
   - Create ActivityLog model
   - Add logRetentionDays to SystemSetting model
   - Generate and run migrations

2. **Core Service Implementation**:
   - Implement ActivityLogService
   - Create utility functions for structured logging
   - Integrate with existing authentication flows

3. **Admin UI Development**:
   - Create ActivityLogPage component
   - Implement filtering and pagination
   - Add log retention configuration

4. **Scheduled Task Setup**:
   - Implement automated pruning task
   - Set up node-cron scheduler
   - Add task monitoring

5. **API Endpoint Development**:
   - Implement log retrieval API
   - Create manual pruning endpoint
   - Add retention policy management

## Best Practices

1. **Sensitive Data Handling**:
   - Never log passwords or security tokens
   - Mask sensitive personal information
   - Follow data protection regulations

2. **Performance Considerations**:
   - Use database indexes for efficient queries
   - Implement pagination for large result sets
   - Consider asynchronous logging for high-volume operations

3. **Security Requirements**:
   - Restrict log access to administrators only
   - Validate all input parameters
   - Protect against injection attacks

4. **Maintenance Strategies**:
   - Monitor log volume growth
   - Adjust retention policies as needed
   - Archive important logs before pruning 
