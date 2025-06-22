# UI Framework Components

## Overview

The UI Framework provides a comprehensive set of components built on Material UI, designed for consistency, accessibility, and ease of use. These components form the building blocks of the application's user interface.

## Core Components

### ThemeProvider

The root component that provides theme context and manages theme switching.

```typescript
interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Provides theme context and manages theme state
  // Handles theme persistence and synchronization
  // Supports system theme detection
}
```

Key Features:
- Theme context provision
- Light/Dark mode support
- Theme persistence
- System theme detection
- Real-time theme switching

### AppLayout

Main application layout component with responsive menu handling.

```typescript
interface AppLayoutProps {
  children: ReactNode;
  menuContent: ReactNode;
  forceMenuPosition?: 'side' | 'top' | null;
}

export function AppLayout(props: AppLayoutProps) {
  // Manages responsive layout
  // Handles menu positioning
  // Provides app bar and navigation
}
```

Key Features:
- Responsive layout
- Dynamic menu positioning
- Mobile adaptation
- Theme integration
- User menu integration

### Dialog

Reusable dialog component with consistent styling and behavior.

```typescript
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export function Dialog(props: DialogProps) {
  // Provides modal dialog functionality
  // Handles keyboard and click-outside
  // Manages focus trapping
}
```

Key Features:
- Consistent styling
- Keyboard navigation
- Focus management
- Responsive sizing
- Action buttons

## Form Components

### TextField

Enhanced text input component with validation and theming.

```typescript
interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  required?: boolean;
  disabled?: boolean;
}

export function TextField(props: TextFieldProps) {
  // Provides text input functionality
  // Handles validation and errors
  // Supports different input types
}
```

Key Features:
- Input validation
- Error handling
- Helper text
- Password visibility toggle
- Responsive design

### Button

Customized button component with variants and loading state.

```typescript
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export function Button(props: ButtonProps) {
  // Provides button functionality
  // Handles loading state
  // Supports icons and variants
}
```

Key Features:
- Multiple variants
- Loading state
- Icon support
- Full width option
- Disabled state

## Layout Components

### Card

Enhanced card component with consistent spacing and actions.

```typescript
interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  elevation?: number;
  onClick?: () => void;
}

export function Card(props: CardProps) {
  // Provides card container
  // Handles title and actions
  // Supports elevation
}
```

Key Features:
- Consistent padding
- Title section
- Action area
- Elevation control
- Click handling

### Grid

Responsive grid system for layout management.

```typescript
interface GridProps {
  children: ReactNode;
  spacing?: number;
  container?: boolean;
  item?: boolean;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export function Grid(props: GridProps) {
  // Provides grid layout
  // Handles responsive breakpoints
  // Manages spacing
}
```

Key Features:
- Responsive columns
- Spacing control
- Nested grids
- Breakpoint support
- Container/Item system

## Navigation Components

### MenuBar

Responsive menu component with position adaptation.

```typescript
interface MenuBarProps {
  items: MenuItem[];
  activeId?: string;
  onItemClick: (id: string) => void;
  position?: 'side' | 'top';
}

export function MenuBar(props: MenuBarProps) {
  // Provides navigation menu
  // Handles active state
  // Adapts to position
}
```

Key Features:
- Position adaptation
- Active state tracking
- Mobile responsiveness
- Nested menu support
- Keyboard navigation

### Breadcrumbs

Navigation breadcrumbs with automatic truncation.

```typescript
interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  maxItems?: number;
  separator?: string | ReactNode;
}

export function Breadcrumbs(props: BreadcrumbsProps) {
  // Provides breadcrumb navigation
  // Handles truncation
  // Supports custom separators
}
```

Key Features:
- Automatic truncation
- Custom separators
- Link integration
- Mobile optimization
- Accessibility support

## UrlMenu

### Purpose
A responsive menu system for navigating URLs with optimized state management and advanced interaction patterns. Provides visual indicators of URL loading states and supports long press actions for state management.

### Interface
```tsx
interface UrlMenuProps {
  urlGroups: UrlGroup[];
  initialUrlId?: string;
  onUrlSelect?: (urlId: string) => void;
}

interface UrlGroup {
  id: string;
  name: string;
  urls: {
    id: string;
    title: string;
    url: string;
    urlMobile: string | null;
    iconPath: string | null;
    idleTimeoutMinutes: number | null;
  }[];
}
```

### Key Features

#### State Management
- Manages four distinct URL states:
  1. `active-loaded`: Active button + green dot (visible iframe with content)
  2. `active-unloaded`: Active button, no dot (visible iframe, no content)
  3. `inactive-loaded`: Normal button + green dot (hidden iframe with cached content)
  4. `inactive-unloaded`: Normal button, no dot (hidden iframe, no content)

#### State Transition Diagram
```
┌─────────────────┐   click    ┌─────────────────┐
│ inactive-unloaded│ ────────> │  active-loaded  │
└─────────────────┘            └─────────────────┘
        ▲                             │
        │                             │
    long-press                   click another URL
        │                             │
        │                             ▼
┌─────────────────┐   click    ┌─────────────────┐
│  inactive-loaded │ <──────── │  active-unloaded │
└─────────────────┘            └─────────────────┘
```

#### Comprehensive State Transition Diagram
```
                                         initial load
                                              │
                                              ▼
┌─────────────────┐         click          ┌─────────────────┐
│ inactive-unloaded│ ──────────────────────>│  active-loaded  │
└─────────────────┘                         └─────────────────┘
        ▲                                          │  ▲
        │                                          │  │
 long-press unload            click different URL  │  │ reload (after error)
        │                                          │  │
        │                                          ▼  │
┌─────────────────┐         click          ┌─────────────────┐
│  inactive-loaded │<─────────────────────>│  active-unloaded │
└─────────────────┘                        └─────────────────┘
        ▲                                          │
        │                                          │
        └──────────────────────────────────────────┘
                     long-press unload

Events that trigger state transitions:
- click: User clicks on an URL menu item
- click different URL: User clicks on a different URL while one is active
- long-press unload: User performs a long-press action on an URL item
- reload: System reloads content after error or manual refresh
- initial load: System initializes with default URL

State characteristics:
- active-loaded: Selected + visible + content loaded (green dot)
- active-unloaded: Selected + visible + no content
- inactive-loaded: Not selected + cached content (green dot)
- inactive-unloaded: Not selected + no cached content

#### Interaction Patterns
- **Click**: Standard selection of URL
- **Long Press**: Advanced action for unloading content while maintaining selection state
- **Visual Feedback**: Progress indicator during long press
- **Haptic Feedback**: Vibration on mobile devices when long press completes

#### Edge Case Handling
- Manages rapid click sequences between different URLs
- Handles interrupted long press actions gracefully
- Properly manages state during browser tab switching
- Provides proper cleanup of event listeners to prevent memory leaks

### Example
```tsx
import { UrlMenu } from "@/app/components/url-menu/UrlMenu";

function MyComponent() {
  const urlGroups = [
    {
      id: "group1",
      name: "Main Apps",
      urls: [
        {
          id: "url1",
          title: "Dashboard",
          url: "https://dashboard.example.com",
          urlMobile: null,
          iconPath: null,
          idleTimeoutMinutes: 30
        },
        // More URLs...
      ]
    }
  ];

  const handleUrlSelect = (urlId: string) => {
    console.log(`Selected URL: ${urlId}`);
  };

  return (
    <UrlMenu 
      urlGroups={urlGroups}
      initialUrlId="url1"
      onUrlSelect={handleUrlSelect}
    />
  );
}
```

### Testing Considerations
- **Component Testing**: Verify rendering, group expansion/collapse, and URL selection
- **Interaction Testing**: Test click and long press behaviors
- **State Management**: Verify proper state transitions between the four URL states
- **Edge Cases**: Test rapid clicks, interrupted actions, and browser tab switching
- **Accessibility**: Ensure keyboard navigation, proper focus management, and screen reader support

## Theme Components

### ThemeSelector

Visual theme selection component for the appearance settings page.

```typescript
interface ThemeSelectorProps {
  currentTheme: 'light' | 'dark';
  onChange: (theme: 'light' | 'dark') => void;
}

export function ThemeSelector(props: ThemeSelectorProps) {
  // Provides visual theme selection
  // Handles theme switching
  // Shows preview of each theme
}
```

Key Features:
- Visual theme previews
- Interactive selection cards
- Visual indicators for active theme
- Smooth transition animations
- Accessibility support

### MenuPositionSelector

Component for selecting menu position preference.

```typescript
interface MenuPositionSelectorProps {
  value: 'side' | 'top';
  onChange: (position: 'side' | 'top') => void;
  disabled?: boolean;
}

export function MenuPositionSelector(props: MenuPositionSelectorProps) {
  // Provides visual position selection
  // Handles position switching
  // Shows preview of each position
}
```

Key Features:
- Visual position previews
- Interactive selection cards
- Visual indicators for active position
- Responsive design
- Accessibility support

### AppearanceSettingsPage

Page component for managing theme and layout preferences.

```typescript
export function AppearanceSettingsPage() {
  // Manages user appearance preferences
  // Provides theme and menu position selection
  // Handles preference persistence
}
```

Key Features:
- Theme mode selection
- Menu position selection
- Visual previews
- Preference persistence
- Success/error notifications
- Loading states

## Usage Examples

### Theme Integration

```typescript
function App() {
  return (
    <ThemeProvider>
      <AppLayout>
        <Card title="Example">
          <TextField
            label="Input"
            value={value}
            onChange={setValue}
          />
          <Button
            variant="contained"
            onClick={handleClick}
          >
            Submit
          </Button>
        </Card>
      </AppLayout>
    </ThemeProvider>
  );
}
```

### Dialog Usage

```typescript
function DialogExample() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Open Dialog
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Example Dialog"
        actions={
          <Button onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        Dialog content goes here
      </Dialog>
    </>
  );
}
```

### Grid Layout

```typescript
function GridExample() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Card title="Left Content">
          Content
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card title="Right Content">
          Content
        </Card>
      </Grid>
    </Grid>
  );
}
```

## Testing Considerations

### Component Testing

```typescript
describe('Button', () => {
  it('renders with correct variant', () => {
    render(<Button variant="contained">Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-contained');
  });

  it('handles loading state', () => {
    render(<Button loading>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

### Theme Testing

```typescript
describe('ThemeProvider', () => {
  it('provides theme context', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    expect(result.current.mode).toBe('light');
  });

  it('toggles theme', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    act(() => {
      result.current.toggleColorMode();
    });
    
    expect(result.current.mode).toBe('dark');
  });
});
```

### Integration Testing

```typescript
describe('AppLayout', () => {
  it('adapts to screen size', async () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );
    
    // Test desktop view
    expect(screen.getByRole('navigation')).toHaveClass('side');
    
    // Test mobile view
    window.innerWidth = 500;
    fireEvent(window, new Event('resize'));
    
    await waitFor(() => {
      expect(screen.getByRole('navigation')).toHaveClass('top');
    });
  });
});
``` 
