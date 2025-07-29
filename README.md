# NH 4000 Footers Tracker

An interactive web application for tracking your hikes on New Hampshire's 48 4000-foot mountains. Built with vanilla JavaScript modules, this application provides an intuitive map interface with zoom capabilities and comprehensive hike tracking using GitHub as a NoSQL database.

## Features

### 🗺️ Interactive Map
- **High-resolution relief map** of New Hampshire
- **Zoom and pan functionality** with mouse wheel and drag controls
- **Responsive mountain pins** that scale with zoom level
- **Visual status indicators**: Green for completed hikes, red for pending

### 🏔️ Mountain Tracking
- **All 48 NH 4000-footers** pre-loaded with precise coordinates
- **Custom mountain addition** by double-clicking on the map
- **Triangle-shaped pins** with mountain names and elevations
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

### 💾 GitHub Storage
- **No backend required** - Pure static site
- **Data persistence** via GitHub repository
- **Version control** for all data changes
- **Free hosting** on GitHub Pages
- **Secure authentication** with GitHub Personal Access Tokens

## Getting Started

### Quick Start
1. **Clone or download** the project files
2. **Open `setup-token.html`** to configure GitHub storage
3. **Follow the setup guide** to create a GitHub token
4. **Click "View Interactive Map"** to start tracking your hikes

### GitHub Storage Setup
1. **Create a GitHub Personal Access Token**:
   - Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   - Generate new token with `repo` scope
   - Copy the token (starts with `ghp_`)

2. **Configure the application**:
   - Open `setup-token.html` in your browser
   - Paste your GitHub token
   - Test the connection

3. **Update repository settings**:
   - Edit `map/map.js`
   - Change `'yourusername'` and `'nh-4000'` to your actual GitHub username and repository name

## Usage

### Basic Navigation
- **Zoom**: Use mouse wheel or zoom buttons (🔍+ / 🔍-)
- **Pan**: Click and drag the map
- **Reset**: Click the home button (🏠) to reset view
- **Touch support**: Pinch to zoom, swipe to pan on mobile

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
- **Add custom mountains**: Double-click on empty map areas
- **Edit custom mountains**: Click edit/delete icons next to custom mountain names

## Technical Architecture

### Frontend Structure
```
nh-4000/
├── index.html              # Landing page with stats
├── setup-token.html        # GitHub token configuration
├── map/                    # Interactive map module
│   ├── map.html           # Main interactive map
│   ├── map.css            # Styling and responsive design
│   └── map.js             # Core application logic (ES6 modules)
├── data/                   # GitHub storage
│   ├── github-storage.js  # GitHub API integration
│   ├── mountains.json     # All 48 NH 4000-footers
│   └── hikes.json         # User hike data
└── images/
    └── relief_map_web.jpg # NH relief map
```

### Data Structure
The application uses GitHub as a NoSQL database with JSON files:

```javascript
// Mountain data structure (data/mountains.json)
{
  id: 'mt-washington',
  name: 'Washington',
  x: 71.22063104453298,    // Precise map coordinates
  y: 41.0274154589372,
  elevation: 6288,
  is_custom: false
}

// Hike data structure (data/hikes.json)
{
  id: 'unique-hike-id',
  mountain_id: 'mt-washington',
  hike_date: '2024-01-15',
  companions: 'John, Sarah',
  notes: 'Beautiful winter hike!',
  completed: true
}
```

### GitHub Storage System
- **Read operations**: Fetch JSON files via GitHub API
- **Write operations**: Update files via GitHub API with authentication
- **Version control**: Every change creates a commit
- **Backup**: Automatic through Git history

## Deployment

### GitHub Pages (Recommended)
1. **Push code** to your GitHub repository
2. **Enable GitHub Pages** in repository settings
3. **Set source** to "Deploy from a branch"
4. **Choose branch**: `main` (or your default branch)
5. **Your app** will be available at `https://yourusername.github.io/your-repo-name`

### Other Static Hosting
- **Netlify**: Drag and drop the folder
- **Vercel**: Connect your GitHub repository
- **Any static hosting service** that supports HTML/CSS/JS

## Security Considerations

### GitHub Token Security
- ✅ **Never commit tokens** to your repository
- ✅ **Use minimal permissions** (only `repo` scope)
- ✅ **Rotate tokens** periodically
- ✅ **Store tokens securely** (localStorage for development)

### Data Privacy
- **Public repos**: Data is visible to everyone
- **Private repos**: Data is only visible to you and collaborators
- **Consider**: Use private repo for personal data

## Browser Compatibility

- **Modern browsers** with ES6 module support
- **Chrome 61+**, **Firefox 60+**, **Safari 10.1+**, **Edge 16+**
- **Mobile responsive** design for tablets and phones
- **Touch support** for pinch-to-zoom and panning

## Local Development

To run the application locally:

1. **No build process required** - pure HTML/CSS/JS
2. **Serve files** using any local server:
   ```bash
   # Using npm
   npm run dev
   
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```
3. **Open** `http://localhost:8000` in your browser

## Troubleshooting

### Common Issues
- **"GitHub API error: 401"**: Invalid or expired token
- **"GitHub API error: 404"**: Repository doesn't exist
- **Data not loading**: Check browser console for errors
- **Token not working**: Verify permissions and repository access

### Debug Mode
Add this to your browser console:
```javascript
localStorage.setItem('debug_github', 'true');
```

## Contributing

This project is designed to be easily extensible. Key areas for contribution:

- **Enhanced map features** (trails, weather, etc.)
- **Mobile app** development
- **Social features** (sharing hikes, leaderboards)
- **Advanced analytics** and statistics
- **Offline support** with sync capabilities

## License

This project is open source and available under the MIT License.

---

**Happy Hiking! 🏔️**

Track your progress through New Hampshire's magnificent 4000-foot peaks and create lasting memories of your mountain adventures.
