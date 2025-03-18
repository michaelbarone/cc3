# Core Infrastructure Architecture

## System Design

### Application Structure
```
/app/                    # Next.js App Router root
├── actions/             # Server actions
├── api/                 # API routes
├── components/          # UI components
├── config/             # Configuration
├── constants/          # Constants
├── hooks/              # React hooks
├── services/           # Business logic
├── stores/             # State management
├── types/              # TypeScript types
└── utils/              # Utilities
```

### Database Schema
```
User
├── id: string
├── username: string
├── password_hash: string?
├── is_admin: boolean
├── last_active_url: string?
├── created_at: DateTime
└── updated_at: DateTime

URLGroup
├── id: string
├── name: string
├── description: string
├── created_at: DateTime
└── updated_at: DateTime

URL
├── id: string
├── url_group_id: string
├── title: string
├── url: string
├── icon_path: string?
├── display_order: number
├── created_at: DateTime
└── updated_at: DateTime

UserURLGroup
├── user_id: string
├── url_group_id: string
└── created_at: DateTime
```

## Technical Decisions

### Next.js App Router
- Chosen for server-side rendering capabilities
- Enables efficient page loading and SEO optimization
- Provides built-in API route handling
- Supports React Server Components

### SQLite with Prisma
- Selected for simplicity and portability
- No separate database server required
- Prisma provides type-safe database access
- Easy backup and restore capabilities

### Docker Configuration
- Multi-stage build for optimized image size
- Named volumes for data persistence
- Health checks for container monitoring
- Non-root user for security

## Performance Considerations

### Database Optimization
- Proper indexing on frequently queried fields
- Connection pooling for efficient resource use
- Transaction management for data integrity
- Periodic cleanup of unused data

### Container Performance
- Multi-stage builds reduce image size
- Volume mounts for efficient I/O
- Resource limits for predictable performance
- Proper cache configuration

## Security Measures

### Application Security
- Environment variable validation
- Secure cookie handling
- Input validation
- Error handling

### Container Security
- Non-root user execution
- Limited container capabilities
- Proper file permissions
- Health monitoring

## Dependencies

### Core Dependencies
- Next.js 15.2.2
- TypeScript
- Prisma ORM
- SQLite

### Development Tools
- ESLint
- Docker
- Docker Compose

## Configuration Requirements

### Environment Variables
```env
DATABASE_URL=file:./data/app.db
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### Docker Volumes
```yaml
volumes:
  - ./data:/app/data
  - ./public:/app/public
```

## Initialization Process

1. Environment Validation
   - Check required variables
   - Validate configurations
   - Set up logging

2. Database Setup
   - Run migrations
   - Create initial admin user
   - Set up default configurations

3. Application Start
   - Initialize Next.js
   - Start health monitoring
   - Begin request handling 
