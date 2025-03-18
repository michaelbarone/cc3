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
