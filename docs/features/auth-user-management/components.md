# Authentication & User Management Components

## Component Overview

The authentication and user management system consists of several key components that handle user authentication, profile management, and settings.

## Authentication Components

### LoginPage

Purpose: Modern login page component that handles user authentication, first run experience, and provides an exceptional user experience with accessibility features.

```typescript
const LoginPage: React.FC = () => {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const redirectPath = searchParams.get("redirect") || "/";
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  // Handles redirect for authenticated users
  useEffect(() => {
    if (!loading && user && !justLoggedOut) {
      router.replace(redirectPath);
    }
  }, [loading, user, justLoggedOut, router, redirectPath]);

  // Component implementation with loading state and keyboard navigation
  // First run experience for backup restoration
};
```

Key Features:
- Modern visual design with subtle animations
- Responsive layout for all device sizes
- Automatic redirect for authenticated users
- Loading state with smooth transitions
- Proper redirect path handling
- Respects logout state
- Theme configuration support
- Keyboard navigation across user tiles
- WCAG 2.1 compliant accessibility
- Performance optimized with memoization
- First run experience with backup restore functionality
- Smooth fade-in transitions
- Memory leak prevention
- Proper focus management
- UI flashing prevention during load

### UserTile

Purpose: Displays a clickable user tile with avatar and username for login selection, with enhanced accessibility and keyboard navigation.

```typescript
interface UserTileProps {
  user: {
    id: string;
    username: string;
    avatar_url?: string;
    requiresPassword: boolean;
    isAdmin: boolean;
    lastLoginAt?: string;
  };
  isSelected: boolean;
  onSelect: (user: UserTile) => void;
  index: number;
  setRef: (index: number) => (el: HTMLDivElement | null) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, index: number, user: UserTile) => void;
}

const UserTile: React.FC<UserTileProps> = ({ user, isSelected, onSelect, index, setRef, onKeyDown }) => {
  // Component implementation with keyboard navigation and accessibility
};
```

Key Features:
- Modern card design with hover effects
- Displays user avatar with fallback
- Shows username with proper text styling
- Indicates password requirement
- Handles selection state with animations
- Provides click interaction
- Immediate login for passwordless users
- Selection state reset when clicking outside
- Full keyboard navigation support
- ARIA roles and labels for accessibility
- Focus management
- Smooth transitions and animations

### PasswordForm

Purpose: Handles password input and validation for password-protected users with enhanced accessibility.

```typescript
interface PasswordFormProps {
  userId: string;
  onSubmit: (password: string) => Promise<void>;
  onCancel: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

const PasswordForm: React.FC<PasswordFormProps> = ({ userId, onSubmit, onCancel, onKeyDown }) => {
  // Component implementation with keyboard interaction
};
```

Key Features:
- Password input field with animation
- Show/hide password toggle
- Keyboard support (Escape to cancel)
- Focus management
- Validation feedback
- Submit handling with loading state
- Cancel option
- ARIA attributes for accessibility
- Screen reader support

### RestoreBackup

Purpose: Facilitates the restoration of a backup file during first run experience.

```typescript
interface RestoreBackupProps {
  onRestoreComplete: () => void;
}

const RestoreBackup: React.FC<RestoreBackupProps> = ({ onRestoreComplete }) => {
  // Component implementation
};
```

Key Features:
- File selection and upload
- Progress indicator
- Success and error handling
- Keyboard accessibility
- ARIA labels for screen readers
- Seamless integration with login flow
- Automatic page refresh after successful restore

## Profile Components

### AvatarUpload

Purpose: Manages user avatar upload and preview.

```typescript
interface AvatarUploadProps {
  currentAvatar?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ currentAvatar, onUpload, onRemove }) => {
  // Component implementation
};
```

Key Features:
- Drag and drop support
- Image preview
- Upload progress
- Error handling
- Remove option

### ProfileSettings

Purpose: Provides interface for managing user profile settings.

```typescript
interface ProfileSettingsProps {
  user: User;
  onUpdate: (updates: Partial<User>) => Promise<void>;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onUpdate }) => {
  // Component implementation
};
```

Key Features:
- Avatar management
- Username editing
- Password management
- Settings persistence
- Form validation

## Settings Components

### PasswordManagement

Purpose: Handles password creation and updates.

```typescript
interface PasswordManagementProps {
  hasPassword: boolean;
  onUpdate: (newPassword?: string) => Promise<void>;
}

const PasswordManagement: React.FC<PasswordManagementProps> = ({ hasPassword, onUpdate }) => {
  // Component implementation
};
```

Key Features:
- Password toggle
- Password strength meter
- Confirmation input
- Validation rules
- Update handling

### UserSettings

Purpose: Manages user-specific application settings.

```typescript
interface UserSettingsProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
}

const UserSettings: React.FC<UserSettingsProps> = ({ settings, onUpdate }) => {
  // Component implementation
};
```

Key Features:
- Theme selection
- Menu position
- Remember me toggle
- Settings persistence
- Real-time updates

## Layout Components

### AuthLayout

Purpose: Provides consistent layout for authentication pages.

```typescript
interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title }) => {
  // Component implementation
};
```

Key Features:
- Consistent styling
- Title display
- Error handling
- Loading states
- Responsive design

### SettingsLayout

Purpose: Provides layout for settings pages with navigation.

```typescript
interface SettingsLayoutProps {
  children: React.ReactNode;
  activeSection: string;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children, activeSection }) => {
  // Component implementation
};
```

Key Features:
- Settings navigation
- Section highlighting
- Breadcrumb navigation
- Responsive layout
- Content area

## Usage Examples

### Enhanced Login Page Setup

```typescript
function LoginPage() {
  const [configLoading, setConfigLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserTile | null>(null);
  const userTilesRef = useRef<Array<HTMLDivElement | null>>([]);
  
  return (
    <ThemeProvider theme={baseTheme}>
      {configLoading ? (
        <LoadingScreen />
      ) : (
        <Fade in={!configLoading} timeout={800}>
          <Container component="main" maxWidth="md">
            {/* App Branding */}
            <Box role="banner">
              {appConfig.appLogo && (
                <Image 
                  src={appConfig.appLogo} 
                  alt={`${appConfig.appName} logo`}
                  priority
                  loading="eager"
                  sizes="(max-width: 100px) 100vw, 100px"
                />
              )}
              <Typography variant="h4">{appConfig.appName}</Typography>
            </Box>
            
            {/* User Tiles Grid */}
            <Box role="region" aria-label="User selection">
              <Typography component="h2" id="login-instruction">
                Select your user account to log in
              </Typography>
              <Grid container spacing={3} justifyContent="center">
                {users.map((user, index) => (
                  <Grid item xs={12} sm={6} md={4} key={user.id}>
                    <UserTile
                      user={user}
                      isSelected={selectedUser?.id === user.id}
                      onSelect={handleUserSelect}
                      index={index}
                      setRef={setRef}
                      onKeyDown={handleKeyDown}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            {/* Restore Backup (First Run Experience) */}
            {isFirstRun && <RestoreBackup onRestoreComplete={handleRestoreComplete} />}
          </Container>
        </Fade>
      )}
    </ThemeProvider>
  );
}
```

### Profile Page Setup

```typescript
function ProfilePage() {
  const { user } = useUser();
  
  return (
    <SettingsLayout activeSection="profile">
      <ProfileSettings
        user={user}
        onUpdate={handleProfileUpdate}
      />
      <PasswordManagement
        hasPassword={!!user.password_hash}
        onUpdate={handlePasswordUpdate}
      />
      <UserSettings
        settings={user.settings}
        onUpdate={handleSettingsUpdate}
      />
    </SettingsLayout>
  );
}
```

## Component Relationships

```
ThemeProvider
└── LoginPage
    ├── LoadingScreen (configLoading === true)
    └── AuthContent (configLoading === false)
        ├── AppBranding
        ├── UserTileGrid
        │   └── UserTile[] (with keyboard navigation)
        │       └── PasswordForm (when selected)
        └── RestoreBackup (when isFirstRun === true)
```

## Testing Considerations

1. Component Testing
   - Test user interactions
   - Verify form validation
   - Check error states
   - Test loading states
   - Verify responsive behavior
   - Test keyboard navigation
   - Test screen reader compatibility

2. Integration Testing
   - Test form submissions
   - Verify file uploads for backup restore
   - Test navigation flow
   - Verify error handling
   - Test focus management
   - Verify animations and transitions

3. Accessibility Testing
   - Keyboard navigation (Tab, Arrow keys, Enter, Escape)
   - Screen reader announcements
   - ARIA attributes and roles
   - Focus management and trapping
   - Color contrast
   - Reduced motion support

4. Performance Testing
   - Initial load time
   - Component memoization
   - Memory leak prevention
   - Animation performance
   - Loading state optimization
