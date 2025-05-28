# User Settings & Preferences Architecture

## System Design

### Directory Structure

```
app/
├── settings/
│   ├── appearance/
│   │   └── page.tsx           # Theme and menu position settings
│   └── layout.tsx             # Settings layout with forced side menu
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx      # Main layout with dynamic menu position
│   └── ui/
│       └── MenuBar.tsx        # Menu component with position adaptation
├── lib/
│   ├── hooks/
│   │   └── useUserPreferences.ts  # Preferences management hook
│   └── settings/
│       └── types.ts           # Settings type definitions
└── api/
    └── user/
        └── preferences/
            └── route.ts       # Preferences API endpoints
```

## Component Architecture

### Core Components

```typescript
// Settings Components
interface AppearanceSettings {
  themeMode: 'light' | 'dark';
  menuPosition: 'side' | 'top';
  onThemeChange: (mode: 'light' | 'dark') => void;
  onMenuPositionChange: (position: 'side' | 'top') => void;
}

// Layout Components
interface AppLayout {
  children: ReactNode;
  menuContent: ReactNode;
  forceMenuPosition?: 'side' | 'top' | null;
}

// Menu Components
interface MenuBar {
  menuPosition?: 'side' | 'top';
  urlGroups: UrlGroup[];
  activeUrlId: string | null;
  loadedUrlIds?: string[];
  onUrlClick: (url: Url) => void;
}
```

## Data Models

### User Preferences

```typescript
interface UserPreferences {
  menuPosition: 'side' | 'top';
  themeMode: 'light' | 'dark';
}

interface Setting<T> {
  key: string;
  value: T;
  defaultValue: T;
  label: string;
  description?: string;
}

interface ThemePreferenceSetting extends Setting<'light' | 'dark' | 'system'> {
  key: 'themePreference';
}
```

### Database Schema

```prisma
model UserPreference {
  id           String   @id @default(uuid())
  userId       String   @unique
  menuPosition String?  @default("top") // Default is top menu
  themeMode    String?  @default("light")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Service Layer

### Settings Service

The settings service provides a consistent interface for managing user preferences:

```typescript
interface SettingsService {
  getSetting<T>(userId: string, key: string): Promise<T | null>;
  setSetting<T>(userId: string, key: string, value: T): Promise<void>;
  deleteSetting(userId: string, key: string): Promise<void>;
  getAllSettings(userId: string): Promise<Record<string, unknown>>;
}
```

Implementation:

```typescript
class PrismaSettingsService implements SettingsService {
  async getSetting<T>(userId: string, key: string): Promise<T | null> {
    const setting = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
    });
    return setting ? JSON.parse(setting.value) : null;
  }
  
  // Implementation for other methods...
}
```

## Hook Layer

### useUserPreferences Hook

This hook provides a simple interface for reading and updating user preferences:

```typescript
function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    menuPosition: "top", // Default to top menu
    theme: "light",
  });
  
  // Fetch preferences from API
  useEffect(() => {
    fetch("/api/user/preferences")
      .then(res => res.json())
      .then(data => {
        setPreferences({
          menuPosition: data.preferences?.menuPosition || "top",
          theme: data.preferences?.themeMode || "light",
        });
      });
  }, []);
  
  // Update preferences
  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const response = await fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPrefs),
    });
    
    if (response.ok) {
      const data = await response.json();
      setPreferences({
        menuPosition: data.preferences?.menuPosition || "top",
        theme: data.preferences?.themeMode || "light",
      });
    }
  };
  
  return { preferences, updatePreferences };
}
```

## API Layer

### Preferences Endpoints

```typescript
// GET /api/user/preferences
export async function GET(req: Request) {
  const session = await getSession();
  
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  const preferences = await prisma.userPreference.findUnique({
    where: { userId: session.user.id },
  });
  
  return new Response(
    JSON.stringify({
      preferences: {
        menuPosition: preferences?.menuPosition || "top", // Default to top menu
        themeMode: preferences?.themeMode || "light",
      },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

// POST /api/user/preferences
export async function POST(req: Request) {
  const session = await getSession();
  
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  const body = await req.json();
  
  const preferences = await prisma.userPreference.upsert({
    where: { userId: session.user.id },
    update: {
      menuPosition: body.menuPosition,
      themeMode: body.themeMode,
    },
    create: {
      userId: session.user.id,
      menuPosition: body.menuPosition || "top", // Default to top menu
      themeMode: body.themeMode || "light",
    },
  });
  
  return new Response(
    JSON.stringify({
      preferences: {
        menuPosition: preferences.menuPosition,
        themeMode: preferences.themeMode,
      },
      success: true,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
```

## UI Implementation

### AppearanceSettingsPage

```tsx
export default function AppearanceSettingsPage() {
  const { preferences, updatePreferences } = useUserPreferences();

  const handleMenuPositionChange = (position: "side" | "top") => {
    updatePreferences({ menuPosition: position });
  };

  return (
    <Box>
      <Typography variant="h6">Menu Position</Typography>
      <RadioGroup
        value={preferences.menuPosition || "top"} // Default to top menu
        onChange={(e) => handleMenuPositionChange(e.target.value as "side" | "top")}
      >
        <FormControlLabel value="top" control={<Radio />} label="Top Menu" />
        <FormControlLabel value="side" control={<Radio />} label="Side Menu" />
      </RadioGroup>
      
      {/* Other settings... */}
    </Box>
  );
}
```

### AppLayout

```tsx
export default function AppLayout({ children, menuContent, forceMenuPosition }) {
  const { preferences } = useUserPreferences();
  
  // Use forced position, or preference, with top as the default
  const menuPosition = forceMenuPosition || preferences.menuPosition || "top";
  
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppBar position="static">
        {/* Header content... */}
      </AppBar>
      
      {menuPosition === "top" ? (
        <>
          <Box sx={{ height: 64 }}>{menuContent}</Box>
          <Box sx={{ flexGrow: 1 }}>{children}</Box>
        </>
      ) : (
        <Box sx={{ display: "flex", flexGrow: 1 }}>
          <Box sx={{ width: 240 }}>{menuContent}</Box>
          <Box sx={{ flexGrow: 1 }}>{children}</Box>
        </Box>
      )}
    </Box>
  );
}
```

## Migration and Defaults

When a user hasn't set preferences yet:

1. Default menu position is "top"
2. Default theme is "light"
3. Preferences are created on first access
4. Changes persist immediately across sessions

## Technical Decisions

### State Management

1. Preference Hook
   - Custom `useUserPreferences` hook for centralized state
   - Optimistic updates with error recovery
   - Caching with configurable duration
   - Automatic synchronization across components

2. Theme Context
   - React context for theme state
   - System theme detection
   - Real-time theme switching
   - Persistence in localStorage

3. Layout Management
   - Dynamic menu position based on preferences
   - Mobile-first responsive design
   - Forced positions for specific routes
   - Automatic mobile adaptation

## Performance Considerations

### Caching Configuration

```typescript
const CACHE_DURATION = 5000; // 5 seconds cache

interface CacheConfig {
  enabled: boolean;
  duration: number;
  staleWhileRevalidate: boolean;
}

const defaultCacheConfig: CacheConfig = {
  enabled: true,
  duration: 5000,
  staleWhileRevalidate: true,
};
```

### Loading Settings

```typescript
const loadingConfig = {
  suspense: true,
  fallback: <SettingsSkeleton />,
  errorBoundary: true,
};
```

### Resource Settings

```typescript
const resourceConfig = {
  maxConcurrentRequests: 3,
  retryAttempts: 2,
  retryDelay: 1000,
};
```

## Error Handling

### Error Types

```typescript
interface PreferenceError extends Error {
  code: 'FETCH_ERROR' | 'UPDATE_ERROR' | 'VALIDATION_ERROR';
  context?: Record<string, unknown>;
}

class PreferenceUpdateError extends Error {
  constructor(message: string, public preference: keyof UserPreferences) {
    super(message);
    this.name = 'PreferenceUpdateError';
  }
}
```

### Recovery Strategy

1. Optimistic Updates
   - Store previous state
   - Apply immediate UI update
   - Revert on error
   - Retry with exponential backoff

2. Error Boundary
   - Catch rendering errors
   - Provide fallback UI
   - Enable manual retry
   - Log errors for monitoring

## State Synchronization

### Event Interface

```typescript
interface PreferenceEvent {
  type: 'update' | 'reset' | 'error';
  preference: keyof UserPreferences;
  value?: unknown;
  timestamp: number;
}

interface PreferenceSubscriber {
  onPreferenceChange: (event: PreferenceEvent) => void;
  onError: (error: PreferenceError) => void;
}
```

### Update Flow

1. User triggers preference change
2. Optimistic update applied
3. API request initiated
4. Success: confirm update
5. Error: revert and retry

## Initialization Process

```typescript
async function initializePreferences() {
  // 1. Load cached preferences
  const cached = loadFromCache();
  
  // 2. Apply defaults
  const withDefaults = {
    ...DEFAULT_PREFERENCES,
    ...cached,
  };
  
  // 3. Fetch from API
  const fresh = await fetchPreferences();
  
  // 4. Merge and update
  const final = {
    ...withDefaults,
    ...fresh,
  };
  
  // 5. Update cache
  updateCache(final);
  
  return final;
}
```

## Configuration Requirements

### Environment Variables

```typescript
interface PreferenceConfig {
  CACHE_DURATION: number;
  DEFAULT_THEME: 'light' | 'dark';
  DEFAULT_MENU_POSITION: 'side' | 'top';
  ENABLE_SYSTEM_THEME: boolean;
  SYNC_INTERVAL: number;
}
```

### Feature Flags

```typescript
const preferenceFlags = {
  enableSystemTheme: true,
  enableMenuPosition: true,
  enablePreferenceSync: true,
  enablePreferenceExport: false,
};
```

## Security Considerations

1. Access Control
   - JWT authentication for API
   - User-specific preferences
   - Route protection
   - CSRF prevention

2. Data Validation
   - Input sanitization
   - Schema validation
   - Type checking
   - Error boundaries

3. State Protection
   - Immutable preferences
   - Atomic updates
   - Version tracking
   - Audit logging

## Monitoring and Logging

### Metrics Collection

```typescript
interface PreferenceMetrics {
  updateLatency: number;
  cacheHitRate: number;
  errorRate: number;
  syncDelay: number;
}
```

### Performance Monitoring

1. Key Metrics
   - Preference update latency
   - Cache hit/miss ratio
   - Error frequency
   - Sync delay

2. Health Checks
   - API availability
   - Cache integrity
   - State consistency
   - Error rates 
