# Authentication & User Management Components

## Component Overview

The authentication and user management system consists of several key components that handle user authentication, profile management, and settings.

## Authentication Components

### UserTile

Purpose: Displays a clickable user tile with avatar and username for login selection.

```typescript
interface UserTileProps {
  user: {
    id: string;
    username: string;
    avatar_url?: string;
    has_password: boolean;
  };
  isSelected: boolean;
  onSelect: (userId: string) => void;
}

const UserTile: React.FC<UserTileProps> = ({ user, isSelected, onSelect }) => {
  // Component implementation
};
```

Key Features:
- Displays user avatar
- Shows username
- Indicates password requirement
- Handles selection state
- Provides click interaction

### PasswordForm

Purpose: Handles password input and validation for password-protected users.

```typescript
interface PasswordFormProps {
  userId: string;
  onSubmit: (password: string) => Promise<void>;
  onCancel: () => void;
}

const PasswordForm: React.FC<PasswordFormProps> = ({ userId, onSubmit, onCancel }) => {
  // Component implementation
};
```

Key Features:
- Password input field
- Show/hide password toggle
- Validation feedback
- Submit handling
- Cancel option

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

### Login Page Setup

```typescript
function LoginPage() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  return (
    <AuthLayout title="Login">
      <div className="grid grid-cols-3 gap-4">
        {users.map(user => (
          <UserTile
            key={user.id}
            user={user}
            isSelected={selectedUser === user.id}
            onSelect={setSelectedUser}
          />
        ))}
      </div>
      {selectedUser && (
        <PasswordForm
          userId={selectedUser}
          onSubmit={handleLogin}
          onCancel={() => setSelectedUser(null)}
        />
      )}
    </AuthLayout>
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
AuthLayout
└── LoginPage
    ├── UserTile[]
    └── PasswordForm

SettingsLayout
├── ProfileSettings
│   └── AvatarUpload
├── PasswordManagement
└── UserSettings
```

## Testing Considerations

1. Component Testing
   - Test user interactions
   - Verify form validation
   - Check error states
   - Test loading states
   - Verify responsive behavior

2. Integration Testing
   - Test form submissions
   - Verify file uploads
   - Check settings persistence
   - Test navigation flow
   - Verify error handling

3. Accessibility Testing
   - Keyboard navigation
   - Screen reader support
   - ARIA attributes
   - Focus management
   - Color contrast 
