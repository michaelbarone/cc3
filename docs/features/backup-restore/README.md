# Backup and Restore System

## Overview

The Backup and Restore system provides administrators with a robust mechanism to create backups of the application's data and configuration, and to restore the system from those backups when needed. This system ensures data integrity, supports disaster recovery, and enables system migration.

## Key Features

- **Complete System Backup**: Creates a comprehensive backup of the database and uploaded files
- **Single-File Archive**: Packages all backed up content into a single, compressed ZIP file
- **Admin-Only Access**: Restricts backup and restore operations to administrators
- **Progress Tracking**: Provides feedback on backup and restore operations
- **Background Processing**: Handles operations asynchronously to avoid blocking the UI
- **Robust Error Handling**: Provides clear error messages and recovery options

## Current Implementation

### Backup Process

1. **Initiation**: Admin triggers backup via the UI, which calls the `/api/admin/backup` endpoint
2. **Collection**: The system gathers the following files:
   - SQLite database file
   - User avatar images
   - URL icons
   - Application logos
   - Favicon files
3. **Compression**: Files are packaged into a ZIP archive with timestamped filename
4. **Download**: The archive is sent to the client for download
5. **Cleanup**: Temporary files created during the process are removed

### Restore Process

1. **Upload**: Admin uploads a backup ZIP file via the UI
2. **Validation**: System validates the archive structure and content
3. **Extraction**: Files are extracted to temporary location
4. **Database Restoration**: SQLite database is replaced
5. **File Restoration**: User files are restored to their appropriate locations
6. **Cleanup**: Temporary files are removed
7. **Confirmation**: Success/failure message is displayed to the user

## File Structure

The backup ZIP archive currently contains:

```
backup-YYYY-MM-DD-THH-MM-SS.zip
├── data/
│   └── app.db                # SQLite database file
└── public/
    ├── avatars/              # User avatar images
    ├── icons/                # URL icons
    ├── logos/                # Application logos
    └── favicon*              # Favicon files
```

## Planned Enhancements

### Manifest File Implementation

As outlined in the project plan, we will implement a manifest file for backup archives to improve validation, version tracking, and metadata storage:

1. **Manifest Structure**:
   ```json
   {
     "backupCreatedAtTimestamp": "2025-05-10T08:30:00Z",
     "databaseSchemaVersionId": "20250328015539_update_url_in_group_table_name",
     "applicationVersion": "1.2.3",
     "contentInventory": {
       "database": true,
       "avatars": 5,
       "icons": 12,
       "logos": 2,
       "favicon": true
     }
   }
   ```

2. **Future Archive Structure**:
   ```
   backup-YYYY-MM-DD-THH-MM-SS.zip
   ├── backup_manifest.json   # Metadata and version information
   ├── data/
   │   └── app.db             # SQLite database file
   └── public/
       ├── avatars/           # User avatar images
       ├── icons/             # URL icons
       ├── logos/             # Application logos
       └── favicon*           # Favicon files
   ```

3. **Enhanced Validation**:
   - Schema version compatibility checking
   - Content inventory verification
   - File integrity validation
   - Application version compatibility assessment

4. **Background Processing**:
   - Asynchronous backup creation
   - Progress tracking and reporting
   - Cancelable operations
   - Job status persistence

## API Endpoints

### Current API

#### GET /api/admin/backup
- **Purpose**: Creates and downloads a backup archive
- **Authentication**: Requires admin role
- **Response**: Binary ZIP file with appropriate headers
- **Error Handling**: Returns appropriate error responses with details

#### POST /api/admin/backup
- **Purpose**: Restores from a backup archive
- **Authentication**: Requires admin role
- **Request**: Form data with `backup` file field
- **Response**: JSON with success/error message
- **Error Handling**: Returns appropriate error responses with details

### Future API Enhancements

#### POST /api/admin/system/backup
- **Purpose**: Initiates an asynchronous backup process
- **Authentication**: Requires admin role
- **Response**: 202 Accepted with job ID
- **Background Process**: Creates the backup file with manifest

#### GET /api/admin/system/backups
- **Purpose**: Lists all available backup files
- **Authentication**: Requires admin role
- **Response**: JSON array of backup metadata

#### GET /api/admin/system/backups/:id
- **Purpose**: Downloads a specific backup file
- **Authentication**: Requires admin role
- **Response**: Binary ZIP file with appropriate headers

#### DELETE /api/admin/system/backups/:id
- **Purpose**: Deletes a specific backup file
- **Authentication**: Requires admin role
- **Response**: JSON with success/error message

## User Interface

### Admin Dashboard Integration

The backup and restore functionality is integrated into the Admin Dashboard:

```typescript
function DatabaseManagement() {
  // State for tracking backup/restore operations
  const [backupState, setBackupState] = useState({
    isLoading: false,
    progress: 0,
    error: null,
    success: null,
  });

  // Functions for backup and restore
  const handleCreateBackup = async () => {/* implementation */};
  const handleRestoreBackup = async (file) => {/* implementation */};

  return (
    <Paper>
      <Typography variant="h6">Database Management</Typography>
      
      <Box>
        <Typography variant="subtitle1">Backup and Restore</Typography>
        <Typography variant="body2" color="text.secondary">
          Create a backup of the database and all uploaded files, or restore from a previous backup.
        </Typography>
        
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />}
            onClick={handleCreateBackup}
            disabled={backupState.isLoading}
          >
            Create Backup
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={backupState.isLoading}
          >
            Restore from Backup
          </Button>
          
          <input 
            type="file" 
            accept=".zip" 
            style={{ display: "none" }} 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
          />
        </Box>
        
        {/* Progress and status indicators */}
      </Box>
    </Paper>
  );
}
```

## Best Practices

1. **Backup Frequency**:
   - Regular scheduled backups (recommended: daily)
   - Additional manual backups before major changes
   - Retention of multiple backup versions

2. **Restore Testing**:
   - Periodic restoration testing in a non-production environment
   - Verification of restored data integrity
   - Documentation of restore procedures

3. **Security Considerations**:
   - Secure storage of backup files
   - Encryption of sensitive data
   - Restricted access to backup files

4. **Performance Optimization**:
   - Efficient file compression
   - Incremental backup strategies for future implementations
   - Optimized file handling for large datasets

## Dependencies

- Node.js file system API
- Archive utility libraries
- SQLite database management
- Background processing capabilities

## Future Roadmap

1. **Short-term**:
   - Implement manifest file with metadata
   - Add schema version compatibility checking
   - Enhance validation during restore

2. **Medium-term**:
   - Implement backup file management UI
   - Add backup rotation and cleanup policies
   - Support incremental backups

3. **Long-term**:
   - Cloud storage integration
   - Scheduled automatic backups
   - Advanced backup strategies (differential, incremental) 
