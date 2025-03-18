# Application Configuration & Admin Dashboard Components

## Component Overview

The application configuration and admin dashboard system consists of several components that handle application settings, user preferences, and administrative functions.

## Admin Components

### AppConfigPage

Purpose: Main configuration page for application-wide settings.

```typescript
interface AppConfig {
  id: string;
  appName: string;
  appLogo: string | null;
  favicon: string | null;
  loginTheme: string;
  registrationEnabled: boolean;
}

const AppConfigPage: React.FC = () => {
  // Component implementation
};
```

Key Features:
- Application name management
- Logo upload and management
- Favicon management
- Login theme selection
- Registration control
- Settings persistence

### AdminDashboard

Purpose: Main dashboard for system statistics and monitoring.

```typescript
interface Statistics {
  users: {
    total: number;
    active: number;
    admins: number;
  };
  urls: {
    total: number;
    withMobileVersion: number;
    desktopOnly: number;
  };
  userPreferences: {
    themeDistribution: Record<string, number>;
    menuPositionDistribution: Record<string, number>;
  };
}

const AdminDashboard: React.FC = () => {
  // Component implementation
};
```

Key Features:
- User statistics display
- URL statistics overview
- Preference distribution
- Activity monitoring
- Data visualization

### DatabaseManagement

Purpose: Handles database backup and restore operations.

```typescript
interface DatabaseManagementProps {
  onBackupComplete?: () => void;
  onRestoreComplete?: () => void;
}

const DatabaseManagement: React.FC<DatabaseManagementProps> = ({
  onBackupComplete,
  onRestoreComplete
}) => {
  // Component implementation
};
```

Key Features:
- Backup creation
- Restore functionality
- Progress tracking
- Error handling
- File management

## Settings Components

### AppearanceSettings

Purpose: Manages user interface preferences.

```typescript
interface AppearanceSettingsProps {
  preferences: UserPreferences;
  onUpdate: (updates: Partial<UserPreferences>) => Promise<void>;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  preferences,
  onUpdate
}) => {
  // Component implementation
};
```

Key Features:
- Theme selection
- Menu position
- Layout options
- Real-time preview
- Settings persistence

### LogoUpload

Purpose: Handles application logo upload and management.

```typescript
interface LogoUploadProps {
  logoUrl: string | null;
  onUploadSuccess: (url: string) => void;
  onUploadError: (error: string) => void;
  onDelete: () => void;
}

const LogoUpload: React.FC<LogoUploadProps> = ({
  logoUrl,
  onUploadSuccess,
  onUploadError,
  onDelete
}) => {
  // Component implementation
};
```

Key Features:
- File selection
- Image preview
- Upload progress
- Error handling
- Delete functionality

### FaviconUpload

Purpose: Manages browser favicon upload and settings.

```typescript
interface FaviconUploadProps {
  faviconUrl: string | null;
  onUploadSuccess: (url: string) => void;
  onUploadError: (error: string) => void;
  onDelete: () => void;
}

const FaviconUpload: React.FC<FaviconUploadProps> = ({
  faviconUrl,
  onUploadSuccess,
  onUploadError,
  onDelete
}) => {
  // Component implementation
};
```

Key Features:
- Icon upload
- Preview generation
- Size validation
- Format conversion
- Browser preview

## Layout Components

### AdminLayout

Purpose: Provides consistent layout for admin pages.

```typescript
interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title
}) => {
  // Component implementation
};
```

Key Features:
- Navigation menu
- Title display
- Breadcrumbs
- Responsive design
- Access control

### SettingsLayout

Purpose: Layout component for settings pages.

```typescript
interface SettingsLayoutProps {
  children: React.ReactNode;
  activeSection: string;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  children,
  activeSection
}) => {
  // Component implementation
};
```

Key Features:
- Settings navigation
- Section highlighting
- Responsive layout
- Content area
- Back navigation

## Custom Hooks

### useAppConfig

Purpose: Manages application configuration state.

```typescript
function useAppConfig() {
  // Hook implementation
  return {
    config: AppConfig;
    loading: boolean;
    error: Error | null;
    updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
    resetConfig: () => Promise<void>;
  };
}
```

### useUserPreferences

Purpose: Manages user preference state and updates.

```typescript
function useUserPreferences() {
  // Hook implementation
  return {
    preferences: UserPreferences;
    loading: boolean;
    updateThemeMode: (mode: 'light' | 'dark') => Promise<void>;
    updateMenuPosition: (position: 'side' | 'top') => Promise<void>;
  };
}
```

## Usage Examples

### Configuration Page Setup

```typescript
function AppConfiguration() {
  const { config, updateConfig } = useAppConfig();
  const [saving, setSaving] = useState(false);
  
  return (
    <AdminLayout title="Application Configuration">
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Application Branding" />
            <CardContent>
              <TextField
                label="Application Name"
                value={config.appName}
                onChange={handleNameChange}
              />
              <LogoUpload
                logoUrl={config.appLogo}
                onUploadSuccess={handleLogoUpload}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
```

### Dashboard Setup

```typescript
function AdminDashboardPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  
  return (
    <AdminLayout title="Dashboard">
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="User Statistics" />
            <CardContent>
              <Typography>
                Total Users: {statistics?.users.total}
              </Typography>
              <Typography>
                Active Users: {statistics?.users.active}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
```

## Component Relationships

```
AdminLayout
├── AppConfigPage
│   ├── LogoUpload
│   └── FaviconUpload
└── AdminDashboard
    └── DatabaseManagement

SettingsLayout
└── AppearanceSettings
```

## Testing Considerations

1. Component Testing
   - Test configuration updates
   - Verify file uploads
   - Check error handling
   - Test responsiveness
   - Validate access control

2. Hook Testing
   - Test state management
   - Verify updates
   - Test error cases
   - Check loading states
   - Validate cleanup

3. Integration Testing
   - Test configuration flow
   - Verify preference sync
   - Test file operations
   - Check statistics
   - Validate backups

4. E2E Testing
   - Test admin workflows
   - Verify settings changes
   - Test backup/restore
   - Check permissions
   - Validate navigation 
