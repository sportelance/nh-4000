# NH 4000 Footers Tracker

An interactive web application for tracking your hikes on New Hampshire's 48 4000-foot mountains. Built with vanilla JavaScript modules, this application provides an intuitive map interface with zoom capabilities and comprehensive hike tracking.

## Features

### 🗺️ Interactive Map
- **High-resolution relief map** of New Hampshire
- **Zoom and pan functionality** with mouse wheel and drag controls
- **Responsive mountain pins** that scale with zoom level
- **Visual status indicators**: Green for completed hikes, red for pending

### 🏔️ Mountain Tracking
- **All 48 NH 4000-footers** pre-loaded with approximate positions
- **Custom mountain addition** by clicking on the map
- **Triangle-shaped pins** with mountain names
- **Click to view details** and manage hikes

### 📝 Hike Management
- **Multiple hike entries** per mountain
- **Comprehensive hike data**:
  - Date of hike
  - Companions/hiking partners
  - Personal notes and memories
  - Completion status
- **Edit and delete** existing hike entries
- **Visual status tracking** with completion indicators

### 💾 Data Persistence
- **Local storage** for immediate data persistence
- **Structured for database migration** - ready for future backend integration
- **Export/import capabilities** for data backup

## Getting Started

1. **Clone or download** the project files
2. **Open `index.html`** in a modern web browser
3. **Click "View Interactive Map"** to start tracking your hikes
4. **Click on mountain pins** to add or view hike details

**Note**: The interactive map is located in the `map/` folder for better organization.

## Usage

### Basic Navigation
- **Zoom**: Use mouse wheel or zoom buttons (🔍+ / 🔍-)
- **Pan**: Click and drag the map
- **Reset**: Click the home button (🏠) to reset view

### Adding Hikes
1. **Click on a mountain pin** to open details
2. **Click "Add New Hike"** to create a new entry
3. **Fill in the details**:
   - Date (optional)
   - Companions (optional)
   - Notes (optional)
   - Check "Completed this hike" if finished
4. **Save** to record your hike

### Managing Data
- **Edit hikes**: Click the pencil icon (✏️) on any hike entry
- **Delete hikes**: Click the trash icon (🗑️) to remove entries
- **Add custom mountains**: Use the + button to place new pins

## Technical Architecture

### Frontend Structure
```
nh-4000/
├── index.html          # Landing page with stats
├── map/               # Interactive map module
│   ├── map.html       # Main interactive map
│   ├── map.css        # Styling and responsive design
│   └── map.js         # Core application logic (ES6 modules)
└── images/
    └── relief_map_web.jpg # NH relief map (2052x2305px)
```

### Data Structure
The application uses a modular approach with clear separation of concerns:

```javascript
// Mountain data structure
{
  id: 'mt-washington',
  name: 'Mount Washington',
  x: 50,           // Percentage position on map
  y: 30,
  elevation: 6288,
  hikes: []        // Array of hike entries
}

// Hike data structure
{
  mountainId: 'mt-washington',
  date: '2024-01-15',
  companions: 'John, Sarah',
  notes: 'Beautiful winter hike!',
  completed: true,
  id: 'unique-hike-id'
}
```

## Future Database Integration

The application is designed for easy migration to a database backend. Here's the planned architecture:

### Database Schema (MongoDB/PostgreSQL)

```javascript
// Users collection/table
{
  userId: 'uuid',
  username: 'string',
  email: 'string',
  createdAt: 'timestamp'
}

// Mountains collection/table
{
  mountainId: 'string',
  name: 'string',
  x: 'number',      // Map position percentage
  y: 'number',
  elevation: 'number',
  isCustom: 'boolean'
}

// Hikes collection/table
{
  hikeId: 'uuid',
  userId: 'uuid',
  mountainId: 'string',
  date: 'date',
  companions: 'string',
  notes: 'text',
  completed: 'boolean',
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
}
```

### API Endpoints (Future)
```javascript
// Authentication
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout

// Mountains
GET /api/mountains
POST /api/mountains (custom mountains)
PUT /api/mountains/:id

// Hikes
GET /api/users/:userId/hikes
POST /api/hikes
PUT /api/hikes/:id
DELETE /api/hikes/:id

// User data
GET /api/users/:userId/stats
```

### Migration Strategy
1. **Phase 1**: Add user authentication system
2. **Phase 2**: Create database schema and API endpoints
3. **Phase 3**: Modify frontend to use API instead of localStorage
4. **Phase 4**: Add data migration tools for existing users

## Browser Compatibility

- **Modern browsers** with ES6 module support
- **Chrome 61+**, **Firefox 60+**, **Safari 10.1+**, **Edge 16+**
- **Mobile responsive** design for tablets and phones

## Local Development

To run the application locally:

1. **No build process required** - pure HTML/CSS/JS
2. **Serve files** using any local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. **Open** `http://localhost:8000` in your browser

## Contributing

This project is designed to be easily extensible. Key areas for contribution:

- **Database integration** implementation
- **Additional map features** (trails, weather, etc.)
- **Mobile app** development
- **Social features** (sharing hikes, leaderboards)
- **Advanced analytics** and statistics

## License

This project is open source and available under the MIT License.

---

**Happy Hiking! 🏔️**

Track your progress through New Hampshire's magnificent 4000-foot peaks and create lasting memories of your mountain adventures.
