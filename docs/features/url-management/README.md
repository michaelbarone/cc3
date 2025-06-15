# URL Management

## Overview

The URL management system allows URLs to be organized into groups, with the following key features:
- URLs can belong to multiple groups
- Each URL can have different display orders in different groups
- Batch operations support for managing URLs within groups
- Flexible URL properties including mobile-specific URLs and idle timeout settings

## Data Structure

### URL Entity
```typescript
interface Url {
  id: string;
  title: string;
  url: string;
  urlMobile?: string | null;
  iconPath?: string | null; // Should use /api/public/icons/* format
  idleTimeoutMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### URL Group Entity
```typescript
interface UrlGroup {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### URL-Group Relationship
```typescript
interface UrlsInGroups {
  urlId: string;
  groupId: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Key Features

### 1. Multiple Group Membership
- URLs can be assigned to any number of groups
- Each URL-group relationship maintains its own display order
- URLs can be moved between groups without losing their configuration

### 2. Display Order Management
- Display order is managed at the relationship level (UrlsInGroups)
- Each URL can have a different display order in each group
- Reordering in one group doesn't affect the URL's order in other groups

### 3. Batch Operations
- Support for bulk URL operations within groups:
  - Adding multiple URLs to a group
  - Removing multiple URLs from a group
  - Reordering multiple URLs within a group
  - Moving URLs between groups

## API Endpoints

### URL Management
- `GET /api/admin/url-groups/[id]/urls` - List URLs in a group
- `POST /api/admin/url-groups/[id]/urls` - Add URL to group
- `DELETE /api/admin/url-groups/[id]/urls/[urlId]` - Remove URL from group
- `PUT /api/admin/url-groups/[id]/urls/[urlId]` - Update URL properties in group

### Batch Operations
- `POST /api/admin/url-groups/[id]/urls/batch` - Perform batch operations
  - Supported operations: add, remove, reorder
  - Maintains atomic transactions for data consistency

## Usage Examples

### Adding a URL to Multiple Groups
```typescript
// 1. Create the URL
const url = await prisma.url.create({
  data: {
    title: "Example URL",
    url: "https://example.com",
    idleTimeoutMinutes: 10,
  },
});

// 2. Add to multiple groups with different orders
await Promise.all([
  prisma.urlsInGroups.create({
    data: {
      urlId: url.id,
      groupId: group1.id,
      displayOrder: 0,
    },
  }),
  prisma.urlsInGroups.create({
    data: {
      urlId: url.id,
      groupId: group2.id,
      displayOrder: 5,
    },
  }),
]);
```

### Reordering URLs in a Group
```typescript
// Move a URL up in the order
await prisma.$transaction([
  prisma.urlsInGroups.update({
    where: {
      urlId_groupId: {
        urlId: url1.id,
        groupId: group.id,
      },
    },
    data: { displayOrder: url1.displayOrder - 1 },
  }),
  prisma.urlsInGroups.update({
    where: {
      urlId_groupId: {
        urlId: url2.id,
        groupId: group.id,
      },
    },
    data: { displayOrder: url2.displayOrder + 1 },
  }),
]);
```

## Best Practices

1. URL Creation
   - Always create URLs independently of groups
   - Add group relationships after URL creation
   - Set appropriate idle timeout values

2. Group Management
   - Use meaningful group names and descriptions
   - Maintain logical grouping of URLs
   - Consider user access patterns when organizing groups

3. Display Order
   - Keep display orders sequential without gaps
   - Update affected URLs when changing order
   - Use transactions for order updates

4. Performance Considerations
   - Use batch operations for multiple updates
   - Include proper indexes on urlId and groupId
   - Consider pagination for large groups

## Database Schema

```prisma
model Url {
  id                String         @id @default(cuid())
  title             String
  url               String
  urlMobile         String?
  iconPath          String?
  idleTimeoutMinutes Int          @default(10)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  urls              UrlsInGroups[]
}

model UrlGroup {
  id            String         @id @default(cuid())
  name          String
  description   String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  urls          UrlsInGroups[]
  userUrlGroups UserUrlGroup[]
}

model UrlsInGroups {
  url         Url      @relation(fields: [urlId], references: [id], onDelete: Cascade)
  urlId       String
  group       UrlGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  groupId     String
  displayOrder Int     @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@id([urlId, groupId])
  @@index([groupId, displayOrder])
}
```

## Error Handling

1. URL Operations
   - Handle duplicate URL assignments
   - Validate URL format and accessibility
   - Check for circular references

2. Group Operations
   - Validate group existence before operations
   - Handle group deletion with URL preservation
   - Maintain referential integrity

3. Order Operations
   - Handle concurrent order updates
   - Validate order range
   - Maintain order consistency

## Testing

1. Unit Tests
   - URL creation and validation
   - Group management operations
   - Order manipulation logic

2. Integration Tests
   - URL-group relationship management
   - Batch operations
   - Order consistency

3. Performance Tests
   - Large group handling
   - Batch operation efficiency
   - Order update performance 
