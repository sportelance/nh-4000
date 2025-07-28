    # NH 4000-Footers Database Schema

## Overview
This document outlines the current data structures used in the NH 4000-Footers tracker application. These structures are currently stored in localStorage but are designed to be easily migrated to a database system.

## Current Storage Keys

### Primary Keys
- `nh4000_mountains` - Mountain data and positions
- `nh4000_hikes` - All hike records (denormalized for performance)

---

## 1. Mountain Data Structure

### Current localStorage Format
```javascript
// Key: 'nh4000_mountains'
// Value: Array of [mountainId, mountainObject] pairs
[
  [
    "mt-washington",
    {
      "id": "mt-washington",
      "name": "Washington",
      "x": 71.22063104453298,
      "y": 41.0274154589372,
      "elevation": 6288,
      "hikes": []
    }
  ]
]
```

### Proposed Database Schema

#### Mountains Table
```sql
CREATE TABLE mountains (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    elevation INTEGER NOT NULL,
    x_coordinate DECIMAL(10,8) NOT NULL,
    y_coordinate DECIMAL(10,8) NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    custom_creator VARCHAR (50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Mountain Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | VARCHAR(50) | Unique mountain identifier | `mt-washington` |
| `name` | VARCHAR(100) | Mountain name | `Washington` |
| `elevation` | INTEGER | Elevation in feet | `6288` |
| `x_coordinate` | DECIMAL(10,8) | X position (percentage) | `71.22063104` |
| `y_coordinate` | DECIMAL(10,8) | Y position (percentage) | `41.02741546` |
| `is_custom` | BOOLEAN | Whether user-created | `false` |
| `created_at` | TIMESTAMP | Record creation time | `2025-07-28 00:00:00` |
| `updated_at` | TIMESTAMP | Last update time | `2025-07-28 00:00:00` |

---

## 2. Hike Data Structure

### Current localStorage Format
```javascript
// Key: 'nh4000_hikes'
// Value: Array of hike objects
[
  {
    "mountainId": "mt-willey",
    "date": "2025-07-15",
    "companions": "John, Sarah",
    "notes": "Beautiful day, great views",
    "completed": true,
    "id": "1753673552193"
  }
]
```

### Proposed Database Schema

#### Hikes Table
```sql
CREATE TABLE hikes (
    id VARCHAR(50) PRIMARY KEY,
    mountain_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    hike_date DATE,
    companions TEXT,
    notes TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mountain_id) REFERENCES mountains(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Hike Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | VARCHAR(50) | Unique hike identifier | `1753673552193` |
| `mountain_id` | VARCHAR(50) | Reference to mountain | `mt-willey` |
| `user_id` | VARCHAR(50) | Reference to user | `user_123` |
| `hike_date` | DATE | Date of hike | `2025-07-15` |
| `companions` | TEXT | Hiking companions | `John, Sarah` |
| `notes` | TEXT | Hike notes | `Beautiful day, great views` |
| `completed` | BOOLEAN | Whether hike was completed | `true` |
| `created_at` | TIMESTAMP | Record creation time | `2025-07-28 00:00:00` |
| `updated_at` | TIMESTAMP | Last update time | `2025-07-28 00:00:00` |

---

## 3. User Data Structure (Future)

### Proposed Database Schema

#### Users Table
```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### User Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | VARCHAR(50) | Unique user identifier | `user_123` |
| `username` | VARCHAR(100) | Unique username | `hiker_jane` |
| `email` | VARCHAR(255) | User email | `jane@example.com` |
| `password_hash` | VARCHAR(255) | Hashed password | `$2b$10$...` |
| `created_at` | TIMESTAMP | Account creation time | `2025-07-28 00:00:00` |
| `updated_at` | TIMESTAMP | Last update time | `2025-07-28 00:00:00` |

---

## 4. Data Migration Strategy

### From localStorage to Database

#### Step 1: Export Current Data
```javascript
// Export mountains
const mountains = JSON.parse(localStorage.getItem('nh4000_mountains'));
console.log(JSON.stringify(mountains, null, 2));

// Export hikes
const hikes = JSON.parse(localStorage.getItem('nh4000_hikes'));
console.log(JSON.stringify(hikes, null, 2));
```

#### Step 2: Transform Data
```javascript
// Transform mountains for database
const mountainRecords = mountains.map(([id, mountain]) => ({
    id: mountain.id,
    name: mountain.name,
    elevation: mountain.elevation,
    x_coordinate: mountain.x,
    y_coordinate: mountain.y,
    is_custom: mountain.id.startsWith('custom-')
}));

// Transform hikes for database
const hikeRecords = hikes.map(hike => ({
    id: hike.id,
    mountain_id: hike.mountainId,
    user_id: 'default_user', // Assign to default user initially
    hike_date: hike.date || null,
    companions: hike.companions || null,
    notes: hike.notes || null,
    completed: hike.completed
}));
```

#### Step 3: Database Insertion
```sql
-- Insert mountains
INSERT INTO mountains (id, name, elevation, x_coordinate, y_coordinate, is_custom)
VALUES (?, ?, ?, ?, ?, ?);

-- Insert hikes
INSERT INTO hikes (id, mountain_id, user_id, hike_date, companions, notes, completed)
VALUES (?, ?, ?, ?, ?, ?, ?);
```

---

## 5. API Endpoints (Future)

### Mountain Endpoints
```
GET    /api/mountains          - Get all mountains
GET    /api/mountains/:id      - Get specific mountain
POST   /api/mountains          - Create new mountain (custom)
PUT    /api/mountains/:id      - Update mountain
DELETE /api/mountains/:id      - Delete mountain (custom only)
```

### Hike Endpoints
```
GET    /api/hikes              - Get all hikes for user
GET    /api/hikes/:id          - Get specific hike
POST   /api/hikes              - Create new hike
PUT    /api/hikes/:id          - Update hike
DELETE /api/hikes/:id          - Delete hike
```

### User Endpoints
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login user
GET    /api/auth/profile       - Get user profile
PUT    /api/auth/profile       - Update user profile
```

---

## 6. Indexes for Performance

```sql
-- Mountains table indexes
CREATE INDEX idx_mountains_custom ON mountains(is_custom);
CREATE INDEX idx_mountains_elevation ON mountains(elevation);

-- Hikes table indexes
CREATE INDEX idx_hikes_mountain_id ON hikes(mountain_id);
CREATE INDEX idx_hikes_user_id ON hikes(user_id);
CREATE INDEX idx_hikes_date ON hikes(hike_date);
CREATE INDEX idx_hikes_completed ON hikes(completed);
CREATE INDEX idx_hikes_user_mountain ON hikes(user_id, mountain_id);

-- Users table indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

---

## 7. Data Validation Rules

### Mountains
- `id` must be unique and follow pattern: `mt-[name]` or `custom-[timestamp]`
- `name` must be 1-100 characters
- `elevation` must be positive integer
- `x_coordinate` and `y_coordinate` must be between 0-100
- `is_custom` defaults to false for default mountains

### Hikes
- `mountain_id` must reference existing mountain
- `user_id` must reference existing user
- `hike_date` must be valid date (can be null)
- `completed` defaults to false
- `id` must be unique timestamp-based string

### Users
- `username` must be 3-100 characters, alphanumeric + underscore
- `email` must be valid email format
- `password_hash` must be bcrypt hash

---

## 8. Backup Strategy

### localStorage Backup
```javascript
// Create backup of current data
const backup = {
    mountains: JSON.parse(localStorage.getItem('nh4000_mountains')),
    hikes: JSON.parse(localStorage.getItem('nh4000_hikes')),
    timestamp: new Date().toISOString()
};

// Save backup
localStorage.setItem('nh4000_backup_' + Date.now(), JSON.stringify(backup));
```

### Database Backup
```sql
-- Export mountains
SELECT * FROM mountains INTO OUTFILE '/backup/mountains.csv';

-- Export hikes
SELECT * FROM hikes INTO OUTFILE '/backup/hikes.csv';

-- Export users
SELECT * FROM users INTO OUTFILE '/backup/users.csv';
```

---

## 9. Migration Checklist

- [ ] Create database tables with proper schemas
- [ ] Export current localStorage data
- [ ] Transform data to match database schema
- [ ] Insert data into database
- [ ] Verify data integrity
- [ ] Update application to use API endpoints
- [ ] Test all functionality with database
- [ ] Remove localStorage dependency
- [ ] Deploy with database backend

---

*Last updated: July 28, 2025* 