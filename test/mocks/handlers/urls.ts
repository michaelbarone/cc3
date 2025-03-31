import { http, HttpResponse } from 'msw'

export const urlHandlers = [
  // Mock URL groups endpoint
  http.get('/api/url-groups', () => {
    return HttpResponse.json({
      urlGroups: [
        {
          id: '1',
          name: 'Test Group 1',
          description: 'Test group description',
          urls: [
            {
              id: '1',
              title: 'Test URL 1',
              url: 'https://example.com',
              icon_path: null,
              display_order: 1
            }
          ]
        }
      ]
    })
  }),
  // Add a catch-all handler for iframe URLs
  http.get('https://example.com/*', () => {
    return new HttpResponse('<html><body>Mock iframe content</body></html>', {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  }),
  http.get('https://m.example.com/*', () => {
    return new HttpResponse('<html><body>Mock mobile iframe content</body></html>', {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  }),
]
