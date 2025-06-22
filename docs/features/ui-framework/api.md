# UI Framework API Documentation

## Theme API

### useTheme Hook

Hook for accessing and manipulating the current theme.

```typescript
interface ThemeAPI {
  mode: 'light' | 'dark';
  toggleColorMode: () => void;
  setMode: (mode: 'light' | 'dark') => void;
  theme: Theme; // Material UI theme object
}

function useTheme(): ThemeAPI;
```

Example Usage:
```typescript
function ThemeToggle() {
  const { mode, toggleColorMode } = useTheme();
  
  return (
    <IconButton onClick={toggleColorMode}>
      {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  );
}
```

### useUserPreferences Hook

Hook for managing user preferences including theme settings.

```typescript
interface UserPreferences {
  theme: 'light' | 'dark';
  menuPosition: 'side' | 'top';
  // Other user preferences
}

interface UserPreferencesAPI {
  preferences: UserPreferences;
  isLoading: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

function useUserPreferences(): UserPreferencesAPI;
```

Example Usage:
```typescript
function AppearanceSettings() {
  const { preferences, updatePreferences } = useUserPreferences();
  const themeContext = useContext(ThemeContext);
  
  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    // Update database preference
    await updatePreferences({ theme: newTheme });
    
    // Update UI theme if needed
    if (themeContext && themeContext.mode !== newTheme) {
      themeContext.toggleColorMode();
    }
  };
  
  return (
    <ThemeSelector 
      currentTheme={preferences.theme}
      onChange={handleThemeChange}
    />
  );
}
```

### createTheme

Function to create a custom theme with our default configuration.

```typescript
interface CustomThemeOptions {
  mode?: 'light' | 'dark';
  primary?: string;
  secondary?: string;
  background?: {
    default?: string;
    paper?: string;
  };
  typography?: Partial<TypographyOptions>;
}

function createTheme(options?: CustomThemeOptions): Theme;
```

Example Usage:
```typescript
const theme = createTheme({
  mode: 'dark',
  primary: '#1976d2',
  secondary: '#dc004e',
  typography: {
    fontFamily: 'Inter, sans-serif'
  }
});
```

## Layout API

### useMenuPosition Hook

Hook for managing menu position based on screen size and user preferences.

```typescript
interface MenuPositionAPI {
  position: 'side' | 'top';
  isMobile: boolean;
  togglePosition: () => void;
  setPosition: (position: 'side' | 'top') => void;
}

function useMenuPosition(): MenuPositionAPI;
```

Example Usage:
```typescript
function Layout() {
  const { position, isMobile } = useMenuPosition();
  
  return (
    <AppLayout
      menuPosition={position}
      collapsible={isMobile}
    >
      {children}
    </AppLayout>
  );
}
```

### useBreakpoints Hook

Hook for responsive design and breakpoint detection.

```typescript
interface BreakpointAPI {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

function useBreakpoints(): BreakpointAPI;
```

Example Usage:
```typescript
function ResponsiveComponent() {
  const { isMobile, breakpoint } = useBreakpoints();
  
  return (
    <div className={isMobile ? 'mobile' : 'desktop'}>
      Current breakpoint: {breakpoint}
    </div>
  );
}
```

## Component Utilities

### useDialog Hook

Hook for managing dialog state and actions.

```typescript
interface DialogAPI {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

function useDialog(initialState?: boolean): DialogAPI;
```

Example Usage:
```typescript
function DialogExample() {
  const dialog = useDialog();
  
  return (
    <>
      <Button onClick={dialog.open}>Open Dialog</Button>
      <Dialog
        open={dialog.isOpen}
        onClose={dialog.close}
      >
        Dialog content
      </Dialog>
    </>
  );
}
```

### useLoadingButton Hook

Hook for managing button loading states.

```typescript
interface LoadingButtonAPI {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
}

function useLoadingButton(): LoadingButtonAPI;
```

Example Usage:
```typescript
function SubmitButton() {
  const { isLoading, withLoading } = useLoadingButton();
  
  const handleClick = async () => {
    await withLoading(submitData());
  };
  
  return (
    <Button
      loading={isLoading}
      onClick={handleClick}
    >
      Submit
    </Button>
  );
}
```

## Form Utilities

### useFormField Hook

Hook for managing form field state with validation.

```typescript
interface FormFieldAPI<T> {
  value: T;
  error: string | null;
  touched: boolean;
  onChange: (value: T) => void;
  onBlur: () => void;
  reset: () => void;
  validate: () => boolean;
}

function useFormField<T>(
  initialValue: T,
  validate?: (value: T) => string | null
): FormFieldAPI<T>;
```

Example Usage:
```typescript
function EmailField() {
  const email = useFormField('', (value) => {
    if (!value) return 'Email is required';
    if (!value.includes('@')) return 'Invalid email';
    return null;
  });
  
  return (
    <TextField
      label="Email"
      value={email.value}
      onChange={email.onChange}
      onBlur={email.onBlur}
      error={email.touched ? email.error : null}
    />
  );
}
```

### useForm Hook

Hook for managing form state and validation.

```typescript
interface FormAPI<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
  handleChange: (field: keyof T) => (value: any) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (onSubmit: (values: T) => void) => (e: FormEvent) => void;
  reset: () => void;
}

function useForm<T extends object>(
  initialValues: T,
  validate?: (values: T) => Partial<Record<keyof T, string>>
): FormAPI<T>;
```

Example Usage:
```typescript
interface LoginForm {
  email: string;
  password: string;
}

function LoginForm() {
  const form = useForm<LoginForm>({
    email: '',
    password: ''
  }, (values) => {
    const errors: Partial<Record<keyof LoginForm, string>> = {};
    if (!values.email) errors.email = 'Required';
    if (!values.password) errors.password = 'Required';
    return errors;
  });
  
  return (
    <form onSubmit={form.handleSubmit(onLogin)}>
      <TextField
        label="Email"
        value={form.values.email}
        onChange={form.handleChange('email')}
        onBlur={form.handleBlur('email')}
        error={form.touched.email ? form.errors.email : undefined}
      />
      <TextField
        type="password"
        label="Password"
        value={form.values.password}
        onChange={form.handleChange('password')}
        onBlur={form.handleBlur('password')}
        error={form.touched.password ? form.errors.password : undefined}
      />
      <Button
        type="submit"
        disabled={!form.isValid}
      >
        Login
      </Button>
    </form>
  );
}
```

## Animation Utilities

### useTransition Hook

Hook for managing element transitions.

```typescript
interface TransitionAPI {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  className: string;
}

function useTransition(
  duration?: number,
  timingFunction?: string
): TransitionAPI;
```

Example Usage:
```typescript
function FadeElement() {
  const transition = useTransition(300, 'ease-in-out');
  
  return (
    <>
      <Button onClick={transition.toggle}>Toggle</Button>
      <div className={transition.className}>
        Fade content
      </div>
    </>
  );
}
```

## Error Boundaries

### withErrorBoundary HOC

Higher-order component for error handling.

```typescript
interface ErrorBoundaryProps {
  fallback?: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error) => void;
}

function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options?: ErrorBoundaryProps
): ComponentType<P>;
```

Example Usage:
```typescript
const SafeComponent = withErrorBoundary(RiskyComponent, {
  fallback: (error) => (
    <Alert severity="error">
      {error.message}
    </Alert>
  ),
  onError: (error) => {
    console.error(error);
    analytics.trackError(error);
  }
});
``` 
