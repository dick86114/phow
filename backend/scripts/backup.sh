#!/bin/bash

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="phow_db"
UPLOADS_DIR="./uploads"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# 1. Database Backup (Assuming PostgreSQL)
# pg_dump $DATABASE_URL > $BACKUP_DIR/db_$TIMESTAMP.sql
echo "Backing up database..."
# Replace with actual pg_dump command if needed

# 2. Uploads Backup
echo "Backing up uploads..."
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz $UPLOADS_DIR

# 3. Clean up old backups (Keep last 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $TIMESTAMP"
