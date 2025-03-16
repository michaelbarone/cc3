# URL Dashboard

A containerized Next.js application for managing and displaying URLs in iframes with user management and admin configuration.

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+ or yarn 1.22+
- Git

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd url-dashboard
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Initialize the database:
```bash
npx prisma generate
npx prisma migrate dev
```

### Development Server

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Docker Deployment

The application can also be run using Docker for both development and production environments.

### Container Architecture

The application is containerized using Docker with a multi-stage build process for optimal production deployment:

- **Base Image**: Node.js 20 Alpine for minimal footprint
- **Development Stage**: Includes full development dependencies
- **Build Stage**: Compiles and optimizes the application
- **Production Stage**: Contains only runtime dependencies

### Key Components:

- Next.js application server
- SQLite database with Prisma ORM
- Automated database migrations and backups
- Health monitoring system

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- Git

### Docker Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd url-dashboard
```

2. Create environment files:
```bash
cp .env.example .env
```

3. Create required directories:
```bash
mkdir -p data backup
```

4. Start the development environment:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Production Deployment

1. Configure production environment:
```bash
cp .env.example .env.production
# Edit .env.production with your production values
```

2. Build and start the production containers:
```bash
docker-compose up --build -d
```

## Backup and Restore Procedures

### Automated Backups

The system automatically:
- Creates backups before migrations
- Maintains rolling backups (last 5 copies)
- Stores backups in the `/app/backup` volume

### Manual Backup

```bash
# Create a backup
docker exec next-sqlite-app /bin/sh -c 'cp /app/data/sqlite.db "/app/backup/sqlite_$(date +%Y%m%d_%H%M%S).db"'
```

### Restore from Backup

```bash
# List available backups
docker exec next-sqlite-app ls -l /app/backup

# Restore from specific backup
docker exec next-sqlite-app /bin/sh -c 'cp /app/backup/sqlite_YYYYMMDD_HHMMSS.db /app/data/sqlite.db'
```

## Troubleshooting

### Common Issues

1. **Container Won't Start**
   - Check logs: `docker-compose logs app`
   - Verify environment variables
   - Ensure ports are available

2. **Database Issues**
   - Check database integrity: `docker exec next-sqlite-app /bin/sh -c 'sqlite3 /app/data/sqlite.db "PRAGMA integrity_check;"'`
   - Verify permissions on data directory
   - Check migration logs

3. **Health Check Failures**
   - Verify application is running: `curl http://localhost:3000/api/health`
   - Check resource usage: `docker stats next-sqlite-app`
   - Review application logs

### Maintenance

1. **Clearing Logs**
```bash
docker-compose logs --truncate 0
```

2. **Updating the Application**
```bash
git pull
docker-compose up --build -d
```

3. **Cleaning Up**
```bash
# Remove unused images
docker image prune -f

# Remove unused volumes
docker volume prune -f
```

## Monitoring

### Health Checks

The application includes built-in health monitoring:
- Container health checks every 30s
- Database integrity verification
- API endpoint monitoring

### Logging

Logs are managed through Docker's json-file driver:
- Maximum size: 10MB per container
- Maximum files: 3 rotation files
- Accessible via: `docker-compose logs`

### Resource Limits

Container resources are constrained to:
- CPU: 0.5 cores (max)
- Memory: 512MB (max)
- Storage: Automatically managed through Docker volumes

## Security

### Container Security

- Non-root user execution
- Limited container capabilities
- Secure volume permissions
- Environment variable protection

### Network Security

- Bridge network isolation
- Port exposure limited to necessary services
- Health check endpoint security

### Best Practices

1. Regularly update base images
2. Monitor security advisories
3. Implement proper backup rotation
4. Maintain access control lists

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| DATABASE_URL | SQLite database path | file:/app/data/sqlite.db | Yes |
| NODE_ENV | Environment mode | production | Yes |
| JWT_SECRET | Authentication secret | - | Yes |
| PORT | Application port | 3000 | No |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT License](LICENSE)
