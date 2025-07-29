# GitHub Storage Setup Guide

This guide will help you set up the NH 4000-Footers tracker to use GitHub as a NoSQL database.

## Overview

Instead of using a traditional database, this approach stores data as JSON files in your GitHub repository. This provides:
- ✅ **No backend required** - Pure static site
- ✅ **Version control** - All changes are tracked
- ✅ **Free hosting** - GitHub Pages + GitHub API
- ✅ **Data persistence** - Stored in your repository
- ✅ **Easy backup** - Just clone the repo

## Step 1: Create GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name like "NH4000 Tracker"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `public_repo` (if using public repo)
5. Click "Generate token"
6. **Copy the token** - you won't see it again!

## Step 2: Update Repository Configuration

1. Open `map/map.js`
2. Find this line:
   ```javascript
   this.githubStorage = new GitHubStorage('yourusername', 'nh-4000', 'main');
   ```
3. Replace with your actual GitHub username and repository name:
   ```javascript
   this.githubStorage = new GitHubStorage('yourusername', 'your-repo-name', 'main');
   ```

## Step 3: Set Up GitHub Token

### Option A: Browser Storage (Recommended for Development)
1. Open your browser's developer console
2. Run this command:
   ```javascript
   localStorage.setItem('github_token', 'your_github_token_here');
   ```

### Option B: Environment Variable (For Production)
If deploying to a platform that supports environment variables, set:
```
GITHUB_TOKEN=your_github_token_here
```

## Step 4: Initialize Data Files

The repository should already contain:
- `data/mountains.json` - All 48 default NH 4000-footers
- `data/hikes.json` - Empty array for your hikes

If these files don't exist, create them in your repository.

## Step 5: Test the Setup

1. Open the application in your browser
2. Open developer console (F12)
3. Check for any errors
4. Try adding a hike to test the GitHub storage

## Step 6: Deploy to GitHub Pages

1. Push your code to GitHub
2. Go to repository Settings > Pages
3. Select source: "Deploy from a branch"
4. Choose branch: "main" (or your default branch)
5. Click "Save"

Your app will be available at: `https://yourusername.github.io/your-repo-name`

## How It Works

### Data Storage
- **Mountains**: Stored in `data/mountains.json`
- **Hikes**: Stored in `data/hikes.json`
- **Format**: Standard JSON arrays

### API Operations
- **Read**: Uses GitHub API to fetch file contents
- **Write**: Uses GitHub API to update files
- **Delete**: Removes items from arrays and saves

### Authentication
- Uses GitHub Personal Access Token
- Stored in browser localStorage
- Required for write operations

## Security Considerations

### Token Security
- ✅ **Never commit tokens** to your repository
- ✅ **Use minimal permissions** (only `repo` scope)
- ✅ **Rotate tokens** periodically
- ✅ **Store tokens securely** (localStorage for development)

### Data Privacy
- **Public repos**: Data is visible to everyone
- **Private repos**: Data is only visible to you and collaborators
- **Consider**: Use private repo for personal data

## Troubleshooting

### Common Issues

#### "GitHub API error: 401"
- Token is invalid or expired
- Token doesn't have correct permissions
- Solution: Generate new token with `repo` scope

#### "GitHub API error: 404"
- Repository doesn't exist
- Username/repo name is incorrect
- Solution: Check repository configuration

#### "GitHub API error: 403"
- Token doesn't have write permissions
- Repository is private and token lacks access
- Solution: Check token permissions and repository visibility

#### Data not loading
- Check browser console for errors
- Verify data files exist in repository
- Check network tab for API calls

### Debug Mode

Add this to your browser console to enable debug logging:
```javascript
localStorage.setItem('debug_github', 'true');
```

## Data Migration

### From localStorage
If you have existing localStorage data:

1. Export your data using the export page
2. Manually add to `data/mountains.json` and `data/hikes.json`
3. Commit and push to GitHub

### From Database
If migrating from a database:

1. Export data as JSON
2. Format according to the schema
3. Add to the appropriate data files
4. Commit and push to GitHub

## Performance Considerations

### Rate Limiting
- GitHub API has rate limits
- Authenticated requests: 5,000 per hour
- Unauthenticated requests: 60 per hour
- Consider caching for read operations

### File Size
- Keep JSON files under 100MB
- Consider splitting data if it grows large
- Monitor repository size

## Backup Strategy

### Automatic Backups
- GitHub provides automatic version control
- Every change creates a commit
- Easy to revert to previous versions

### Manual Backups
```bash
# Clone your repository
git clone https://github.com/yourusername/your-repo-name.git

# Backup data files
cp data/mountains.json backup/
cp data/hikes.json backup/
```

## Future Enhancements

### Multi-User Support
- Use GitHub OAuth for user authentication
- Store user-specific data in separate files
- Implement user permissions

### Offline Support
- Cache data in localStorage
- Sync when connection is restored
- Handle conflicts gracefully

### Data Validation
- Add JSON schema validation
- Implement data integrity checks
- Add error recovery mechanisms

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify your GitHub token and permissions
3. Ensure data files exist and are valid JSON
4. Check GitHub API status at https://www.githubstatus.com/ 