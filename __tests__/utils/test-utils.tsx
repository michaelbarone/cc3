import { AuthProvider } from '@/app/providers/auth-provider'
import { theme } from '@/app/theme'
import { ThemeProvider } from '@mui/material/styles'
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'>

function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={theme}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    ),
    ...options,
  })
}

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { renderWithProviders as render }
