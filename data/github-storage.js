class GitHubStorage {
    constructor(owner, repo, branch = 'main') {
        this.owner = owner;
        this.repo = repo;
        this.branch = branch;
        this.baseUrl = 'https://api.github.com';
        this.token = localStorage.getItem('github_token'); // Auto-load from localStorage
    }

    // Set GitHub token for authentication
    setToken(token) {
        this.token = token;
        localStorage.setItem('github_token', token);
    }

    // Get headers for API requests
    getHeaders() {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }
        
        return headers;
    }

    async readFile(path) {
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(),
                mode: 'cors',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null; // File doesn't exist
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return JSON.parse(atob(data.content));
        } catch (error) {
            console.error('Error reading file from GitHub:', error);
            
            // If it's a CORS error, try to provide a helpful message
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                console.warn('CORS error detected. This might be due to network issues or GitHub API problems.');
                console.warn('The app will fall back to localStorage data if available.');
            }
            
            throw error;
        }
    }

    // Write data to a file in the repository
    async writeFile(path, content, message = 'Update data') {
        try {
            // First, get the current file to get its SHA (required for updates)
            const currentFile = await this.readFile(path);
            let sha = null;
            
            if (currentFile !== null) {
                // File exists, get its SHA
                const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`;
                const response = await fetch(url, {
                    headers: this.getHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    sha = data.sha;
                }
            }

            // Prepare the request body
            const body = {
                message: message,
                content: btoa(JSON.stringify(content, null, 2)), // Encode as base64
                branch: this.branch
            };

            if (sha) {
                body.sha = sha; // Include SHA for updates
            }

            const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error writing file to GitHub:', error);
            return false;
        }
    }

    // Read mountains data
    async readMountains() {
        return await this.readFile('data/mountains.json');
    }

    // Write mountains data
    async writeMountains(mountains) {
        return await this.writeFile('data/mountains.json', mountains, 'Update mountains data');
    }

    // Read hikes data
    async readHikes() {
        return await this.readFile('data/hikes.json');
    }

    // Write hikes data
    async writeHikes(hikes) {
        return await this.writeFile('data/hikes.json', hikes, 'Update hikes data');
    }

    // Delete a file
    async deleteFile(path, message = 'Delete file') {
        try {
            // Get the current file to get its SHA
            const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`;
            const response = await fetch(url, {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                return false; // File doesn't exist
            }

            const data = await response.json();
            const sha = data.sha;

            // Delete the file
            const deleteUrl = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;
            const deleteResponse = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    message: message,
                    sha: sha,
                    branch: this.branch
                })
            });

            return deleteResponse.ok;
        } catch (error) {
            console.error('Error deleting file from GitHub:', error);
            return false;
        }
    }

    // Check if user has write access (requires token)
    async hasWriteAccess() {
        if (!this.token) {
            return false;
        }

        try {
            const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}`;
            const response = await fetch(url, {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.permissions && data.permissions.push;
        } catch (error) {
            console.error('Error checking write access:', error);
            return false;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubStorage;
} else {
    window.GitHubStorage = GitHubStorage;
} 