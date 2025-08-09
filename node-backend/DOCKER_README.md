# Docker Setup for MongoDB

This directory contains Docker Compose configuration to run MongoDB for the Chat with PDF Node.js backend.

## Services

### MongoDB
- **Image**: mongo:7.0
- **Port**: 27017
- **Database**: ${MONGO_INITDB_DATABASE} (from `.env`)
- **Admin User**: ${MONGO_INITDB_ROOT_USERNAME} / ${MONGO_INITDB_ROOT_PASSWORD} (from `.env`)
- Reads environment variables from `.env` via `env_file` in `docker-compose.yml`

> Note: We no longer run mongo-express or any init scripts. The container only starts MongoDB.

## Quick Start

### 1. Start MongoDB
```bash
docker-compose up -d
```

### 2. Check Status
```bash
docker-compose ps
```

### 3. View Logs
```bash
docker-compose logs -f mongodb
```

### 4. Stop Services
```bash
docker-compose down
```

### 5. Stop and Remove Volumes (⚠️ This will delete all data)
```bash
docker-compose down -v
```

## Database Access

### Connection Strings
- Recommended (admin user; include authSource=admin):
  `mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@localhost:27017/${MONGO_INITDB_DATABASE}?authSource=admin`

> If you later create a dedicated app user, update the URI accordingly.

## Environment Variables

Place these in `node-backend/.env` (used by Docker and the Node app):
```
# Docker Mongo init (used by docker-compose)
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password123
MONGO_INITDB_DATABASE=chat_with_pdf

# Node app connection (use admin; authSource=admin is required)
MONGODB_URI=mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@localhost:27017/${MONGO_INITDB_DATABASE}?authSource=admin
```

## Database Schema

No initialization script is used. MongoDB starts with a root admin user based on `.env`. Collections will be created by your application as needed.

## Troubleshooting

### Port Already in Use
If port 27017 is already in use, modify the port mapping in docker-compose.yml:
```yaml
ports:
  - "27018:27017"  # Use port 27018 instead
```

### Reset Database
To start with a fresh database:
```bash
docker-compose down -v
docker-compose up -d
```
