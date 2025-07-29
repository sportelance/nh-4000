// NH 4000 Footers Map Application
class NH4000Map {
    constructor() {
        // Initialize data structures
        this.mountains = new Map();
        this.currentMountain = null;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.zoomLevel = 1;
        this.currentPosition = { x: 0, y: 0 };
        this.resizeTimeout = null;
        
        // Initialize GitHub storage
        this.githubStorage = new GitHubStorage('sportelance', 'nh-4000', 'main');
        
        this.initializeElements();
        this.initializeMap();
        this.setupEventListeners();
        this.initializeInfoPanel();
    }

    initializeElements() {
        this.mapContainer = document.getElementById('map-container');
        this.mapWrapper = document.querySelector('.map-wrapper');
        this.mapBackground = document.querySelector('.map-background');
        this.mapImage = document.getElementById('map-image');
        this.mountainPins = document.getElementById('mountain-pins');
        this.zoomInBtn = document.getElementById('zoom-in');
        this.zoomOutBtn = document.getElementById('zoom-out');
        this.resetBtn = document.getElementById('reset-zoom');
        this.hikeModal = document.getElementById('hike-modal');
        this.detailsModal = document.getElementById('details-modal');
        this.infoPanel = document.getElementById('info-panel');
        this.closePanelBtn = document.getElementById('close-panel');
        
        // Form elements
        this.mountainNameInput = document.getElementById('mountain-name');
        this.hikeDateInput = document.getElementById('hike-date');
        this.companionsInput = document.getElementById('hike-companions');
        this.notesInput = document.getElementById('hike-notes');
        this.completedCheckbox = document.getElementById('hike-completed');
        this.hikeForm = document.getElementById('hike-form');
    }

    setupEventListeners() {
        // Zoom controls
        if (this.zoomInBtn) this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (this.zoomOutBtn) this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetZoom());
        
        // Map interactions (mouse)
        if (this.mapWrapper) {
            this.mapWrapper.addEventListener('mousedown', (e) => this.startDrag(e));
            this.mapWrapper.addEventListener('mousemove', (e) => this.drag(e));
            this.mapWrapper.addEventListener('mouseup', () => this.endDrag());
            this.mapWrapper.addEventListener('mouseleave', () => this.endDrag());
            
            // Wheel zoom
            this.mapWrapper.addEventListener('wheel', (e) => this.handleWheelZoom(e));
            
            // Touch zoom for mobile (Safari) - DISABLED in favor of custom touch handling
            // this.mapWrapper.addEventListener('gesturestart', (e) => this.handleGestureStart(e));
            // this.mapWrapper.addEventListener('gesturechange', (e) => this.handleGestureChange(e));
            // this.mapWrapper.addEventListener('gestureend', (e) => this.handleGestureEnd(e));
        }
        
        // Enhanced touch handling for mobile
        this.setupTouchHandling();
        
        // Modal events
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', () => this.closeModals());
        });
        
        // Form submission
        if (this.hikeForm) this.hikeForm.addEventListener('submit', (e) => this.handleHikeSubmit(e));
        
        // Modal actions
        const cancelHikeBtn = document.getElementById('cancel-hike');
        if (cancelHikeBtn) cancelHikeBtn.addEventListener('click', () => this.closeModals());
        
        const addNewHikeBtn = document.getElementById('add-new-hike');
        if (addNewHikeBtn) addNewHikeBtn.addEventListener('click', () => {
            this.closeModals();
            if (this.currentMountain) this.openHikeModal(this.currentMountain.id);
        });
        
        const closeDetailsBtn = document.getElementById('close-details');
        if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', () => this.closeModals());
        
        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
        
        // Handle window resize to maintain pin positions
        window.addEventListener('resize', () => this.handleWindowResize());
        
        // Info panel close functionality
        const closePanelBtn = document.getElementById('close-panel');
        if (closePanelBtn) closePanelBtn.addEventListener('click', () => {
            this.hideInfoPanel();
        });

        // Swipe to dismiss info panel
        this.setupSwipeToDismiss();
    }

    setupTouchHandling() {
        if (!this.mapWrapper) return;
        
        let startX = 0;
        let startY = 0;
        let isDragging = false;
        let startDistance = 0;
        let startZoom = 1;

        this.mapWrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // Single touch - start drag
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isDragging = true;
            } else if (e.touches.length === 2) {
                // Two touches - start pinch zoom
                startDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                startZoom = this.zoomLevel;
            }
        });

        this.mapWrapper.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isDragging) {
                // Single touch drag
                const deltaX = e.touches[0].clientX - startX;
                const deltaY = e.touches[0].clientY - startY;
                
                this.currentPosition.x += deltaX;
                this.currentPosition.y += deltaY;
                
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                
                this.updateTransform();
            } else if (e.touches.length === 2) {
                // Pinch zoom
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                
                const scale = currentDistance / startDistance;
                this.zoomLevel = Math.max(0.5, Math.min(8, startZoom * scale));
                this.updateTransform();
            }
        });

        this.mapWrapper.addEventListener('touchend', () => {
            isDragging = false;
            startDistance = 0;
        });

        // Long press to add mountain (mobile)
        let longPressTimer = null;
        this.mapWrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                longPressTimer = setTimeout(() => {
                    const touch = e.touches[0];
                    const rect = this.mapWrapper.getBoundingClientRect();
                    const x = ((touch.clientX - rect.left) / rect.width) * 100;
                    const y = ((touch.clientY - rect.top) / rect.height) * 100;
                    this.addNewMountain(x, y);
                }, 500);
            }
        });

        this.mapWrapper.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        this.mapWrapper.addEventListener('touchmove', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });
    }

    async initializeMap() {
        if (!this.mapImage) {
            console.warn('Map image element not found');
            return;
        }
        
        // Wait for image to load
        if (this.mapImage.complete && this.mapImage.naturalHeight) {
            await this.loadData();
            this.renderMountains();
            this.updateTransform();
        } else {
            this.mapImage.addEventListener('load', async () => {
                await this.loadData();
                this.renderMountains();
                this.updateTransform();
            });
            
            // Fallback timeout
            setTimeout(async () => {
                if (this.mountains.size === 0) {
                    await this.loadData();
                    this.renderMountains();
                    this.updateTransform();
                }
            }, 2000);
        }
    }

    async loadData() {
        try {
            // Load mountains from GitHub
            const mountainsData = await this.githubStorage.readMountains();
            
            // Load hikes from GitHub
            const hikesData = await this.githubStorage.readHikes();
            
            // Process mountains data from GitHub
            this.mountains.clear();
            if (mountainsData) {
                mountainsData.forEach(mountain => {
                    this.mountains.set(mountain.id, {
                        id: mountain.id,
                        name: mountain.name,
                        x: parseFloat(mountain.x),
                        y: parseFloat(mountain.y),
                        elevation: mountain.elevation,
                        is_custom: mountain.is_custom,
                        hikes: []
                    });
                });
            }
            
            // Process hikes data from GitHub and associate with mountains
            if (hikesData) {
                hikesData.forEach(hike => {
                    const mountain = this.mountains.get(hike.mountain_id);
                    if (mountain) {
                        mountain.hikes.push({
                            id: hike.id,
                            mountainId: hike.mountain_id,
                            date: hike.hike_date,
                            companions: hike.companions,
                            notes: hike.notes,
                            completed: hike.completed
                        });
                    }
                });
            }
            
            // Now merge with localStorage data to catch any local-only changes
            this.mergeLocalStorageData();
            
        } catch (error) {
            console.error('Error loading data from GitHub:', error);
            
            // Check if it's a CORS or network error
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.message.includes('504')) {
                console.warn('Network or CORS error detected. This might be temporary. Falling back to localStorage data.');
                console.warn('Your data is safe in localStorage and will sync when the connection is restored.');
            }
            
            // Fallback to localStorage if GitHub fails
            this.loadFromLocalStorage();
        }
    }

    mergeLocalStorageData() {
        try {
            // Load mountains from localStorage
            const localMountainsData = localStorage.getItem('nh4000_mountains');
            if (localMountainsData) {
                const localMountains = JSON.parse(localMountainsData);
                localMountains.forEach(([id, localMountain]) => {
                    const existingMountain = this.mountains.get(id);
                    
                    if (existingMountain) {
                        // Mountain exists in both GitHub and localStorage
                        // Merge hikes, keeping the most recent version of each hike
                        if (localMountain.hikes && localMountain.hikes.length > 0) {
                            if (!existingMountain.hikes) existingMountain.hikes = [];
                            
                            localMountain.hikes.forEach(localHike => {
                                const existingHikeIndex = existingMountain.hikes.findIndex(h => h.id === localHike.id);
                                if (existingHikeIndex >= 0) {
                                    // Update existing hike with local data (more recent)
                                    existingMountain.hikes[existingHikeIndex] = localHike;
                                } else {
                                    // Add new hike from localStorage
                                    existingMountain.hikes.push(localHike);
                                }
                            });
                        }
                    } else {
                        // Mountain only exists in localStorage (was added locally but failed to sync to GitHub)
                        this.mountains.set(id, localMountain);
                    }
                });
            }
            
            // Load hikes from localStorage as additional backup
            const localHikesData = localStorage.getItem('nh4000_hikes');
            if (localHikesData) {
                const localHikes = JSON.parse(localHikesData);
                localHikes.forEach(localHike => {
                    const mountain = this.mountains.get(localHike.mountainId);
                    if (mountain) {
                        if (!mountain.hikes) mountain.hikes = [];
                        
                        // Check if this hike already exists
                        const existingHike = mountain.hikes.find(h => h.id === localHike.id);
                        if (!existingHike) {
                            // Add hike from localStorage if it doesn't exist in memory
                            mountain.hikes.push({
                                id: localHike.id,
                                mountainId: localHike.mountainId,
                                date: localHike.date,
                                companions: localHike.companions,
                                notes: localHike.notes,
                                completed: localHike.completed
                            });
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error merging localStorage data:', error);
        }
    }

    loadFromLocalStorage() {
        const mountainsData = localStorage.getItem('nh4000_mountains');
        const hikesData = localStorage.getItem('nh4000_hikes');
        
        if (mountainsData) {
            const mountains = JSON.parse(mountainsData);
            this.mountains.clear();
            mountains.forEach(([id, mountain]) => {
                this.mountains.set(id, mountain);
            });
        }
        
        if (hikesData) {
            const hikes = JSON.parse(hikesData);
            hikes.forEach(hike => {
                const mountain = this.mountains.get(hike.mountainId);
                if (mountain) {
                    mountain.hikes.push(hike);
                }
            });
        }
    }

    async saveMountain(mountain) {
        // Save to local memory first (immediate access)
        this.mountains.set(mountain.id, mountain);
        
        // Save to localStorage as backup
        this.saveToLocalStorage();
        
        // Save to GitHub for persistence
        try {
            await this.githubStorage.writeMountains(Array.from(this.mountains.values()));
        } catch (error) {
            console.error('Failed to save to GitHub, but data is saved locally:', error);
        }
    }

    async saveHike(hike) {
        const mountain = this.mountains.get(hike.mountainId);
        if (mountain) {
            if (!mountain.hikes) mountain.hikes = [];
            mountain.hikes.push(hike);
            await this.saveMountain(mountain);
        }
    }

    saveToLocalStorage() {
        try {
            // Save mountains to localStorage
            const mountainsData = Array.from(this.mountains.entries());
            localStorage.setItem('nh4000_mountains', JSON.stringify(mountainsData));
            
            // Save hikes to localStorage
            const allHikes = [];
            this.mountains.forEach(mountain => {
                if (mountain.hikes) {
                    mountain.hikes.forEach(hike => {
                        allHikes.push({
                            id: hike.id,
                            mountainId: hike.mountainId,
                            date: hike.date,
                            companions: hike.companions,
                            notes: hike.notes,
                            completed: hike.completed
                        });
                    });
                }
            });
            localStorage.setItem('nh4000_hikes', JSON.stringify(allHikes));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    async deleteHike(hikeId) {
        for (const [id, mountain] of this.mountains) {
            mountain.hikes = mountain.hikes.filter(hike => hike.id !== hikeId);
            await this.saveMountain(mountain);
        }
    }

    async deleteMountain(mountainId) {
        this.mountains.delete(mountainId);
        
        // Save to localStorage as backup
        this.saveToLocalStorage();
        
        // Save to GitHub for persistence
        try {
            await this.githubStorage.writeMountains(Array.from(this.mountains.values()));
        } catch (error) {
            console.error('Failed to save to GitHub, but data is saved locally:', error);
        }
        
        this.renderMountains();
    }

    renderMountains() {
        if (!this.mountainPins) {
            console.warn('Mountain pins container not found');
            return;
        }
        
        // Check if map image is ready before rendering pins
        if (!this.mapImage || !this.mapImage.complete || !this.mapImage.naturalWidth) {
            return;
        }
        
        this.mountainPins.innerHTML = '';
        
        this.mountains.forEach((mountain, id) => {
            const pin = this.createMountainPin(mountain);
            this.mountainPins.appendChild(pin);
        });
        
        this.updatePinStatus();
    }

    createMountainPin(mountain) {
        const pin = document.createElement('div');
        pin.className = 'mountain-pin';
        pin.dataset.mountainId = mountain.id;
        
        // Convert percentage to pixels based on actual image dimensions
        this.updatePinPosition(pin, mountain);
        
        const hasCompletedHikes = mountain.hikes && mountain.hikes.some(hike => hike.completed);
        pin.classList.add(hasCompletedHikes ? 'completed' : 'pending');
        
        pin.innerHTML = `
            <div class="triangle"></div>
            <div class="label">${mountain.name}</div>
        `;
        
        this.makePinClickable(pin, mountain);
        
        return pin;
    }

    updatePinPosition(pin, mountain) {
        if (!this.mapImage || !this.mapWrapper) {
            console.warn('Map image or wrapper not found');
            return;
        }
        
        const mapImage = this.mapImage;
        const rect = this.mapWrapper.getBoundingClientRect();
        
        // Calculate the actual image dimensions within the container
        const imageAspectRatio = mapImage.naturalWidth / mapImage.naturalHeight;
        const containerAspectRatio = rect.width / rect.height;
        
        let imageWidth, imageHeight, imageLeft, imageTop;
        
        if (containerAspectRatio > imageAspectRatio) {
            // Container is wider than image
            imageHeight = rect.height;
            imageWidth = rect.height * imageAspectRatio;
            imageLeft = (rect.width - imageWidth) / 2;
            imageTop = 0;
        } else {
            // Container is taller than image
            imageWidth = rect.width;
            imageHeight = rect.width / imageAspectRatio;
            imageLeft = 0;
            imageTop = (rect.height - imageHeight) / 2;
        }
        
        // Convert percentage to pixels within the actual image area
        const pixelX = imageLeft + (mountain.x / 100) * imageWidth;
        const pixelY = imageTop + (mountain.y / 100) * imageHeight;
        
        pin.style.left = `${pixelX}px`;
        pin.style.top = `${pixelY}px`;
    }

    makePinClickable(pin, mountain) {
        // Click to show mountain details
        pin.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showMountainDetails(mountain);
        });

        // Touch support for mountain pins
        pin.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showMountainDetails(mountain);
        });
    }

    handleWindowResize() {
        if (!this.mapWrapper) return;
        
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            // Update all pin positions based on new container dimensions
            this.mountains.forEach((mountain, id) => {
                const pin = document.querySelector(`[data-mountain-id="${id}"]`);
                if (pin) {
                    this.updatePinPosition(pin, mountain);
                }
            });
        }, 100);
    }

    updatePinStatus() {
        this.mountains.forEach((mountain, id) => {
            const pin = document.querySelector(`[data-mountain-id="${id}"]`);
            if (pin) {
                const hasCompletedHikes = mountain.hikes && mountain.hikes.some(hike => hike.completed);
                pin.className = `mountain-pin ${hasCompletedHikes ? 'completed' : 'pending'}`;
            }
        });
    }

    showMountainDetails(mountain) {
        this.currentMountain = mountain;
        
        const modal = document.getElementById('details-modal');
        const title = document.getElementById('details-title');
        const hikeList = document.getElementById('hike-list');
        
        title.textContent = `${mountain.name} (${mountain.elevation})`;
        
        this.renderHikeList(mountain);
        
        modal.style.display = 'block';
    }

    renderHikeList(mountain) {
        const hikeList = document.getElementById('hike-list');
        
        if (!mountain.hikes || mountain.hikes.length === 0) {
            hikeList.innerHTML = '<p>No hikes recorded yet.</p>';
            return;
        }
        
        hikeList.innerHTML = mountain.hikes.map((hike, index) => `
            <div class="hike-entry">
                <div class="hike-header">
                    <span class="hike-date">${hike.date || 'No date'}</span>
                    <span class="hike-status ${hike.completed ? 'completed' : 'pending'}">
                        ${hike.completed ? '✓ Completed' : '○ Pending'}
                    </span>
                </div>
                ${hike.companions ? `<div class="hike-companions">With: ${hike.companions}</div>` : ''}
                ${hike.notes ? `<div class="hike-notes">${hike.notes}</div>` : ''}
                <div class="hike-actions">
                    <button onclick="window.nh4000Map.editHike('${mountain.id}', ${index})" class="btn-edit">Edit</button>
                    <button onclick="window.nh4000Map.deleteHike('${mountain.id}', ${index})" class="btn-delete">Delete</button>
                </div>
            </div>
        `).join('');
    }

    openHikeModal(mountainId = null, hikeIndex = null) {
        const modal = document.getElementById('hike-modal');
        const title = document.getElementById('modal-title');
        const mountainNameInput = document.getElementById('mountain-name');
        
        if (mountainId) {
            const mountain = this.mountains.get(mountainId);
            if (mountain) {
                title.textContent = 'Add Hike';
                mountainNameInput.value = mountain.name;
                mountainNameInput.disabled = true;
                this.currentMountain = mountain;
            }
        } else {
            title.textContent = 'Add New Mountain';
            mountainNameInput.value = '';
            mountainNameInput.disabled = false;
            this.currentMountain = null;
        }
        
        if (hikeIndex !== null && this.currentMountain && this.currentMountain.hikes[hikeIndex]) {
            // Editing existing hike
            const hike = this.currentMountain.hikes[hikeIndex];
            title.textContent = 'Edit Hike';
            document.getElementById('hike-date').value = hike.date || '';
            document.getElementById('hike-companions').value = hike.companions || '';
            document.getElementById('hike-notes').value = hike.notes || '';
            document.getElementById('hike-completed').checked = hike.completed || false;
        } else {
            // Adding new hike
            this.clearHikeForm();
        }
        
        modal.style.display = 'block';
    }

    clearHikeForm() {
        document.getElementById('hike-date').value = '';
        document.getElementById('hike-companions').value = '';
        document.getElementById('hike-notes').value = '';
        document.getElementById('hike-completed').checked = false;
    }

    async handleHikeSubmit(e) {
        e.preventDefault();
        
        const mountainName = document.getElementById('mountain-name').value.trim();
        const hikeDate = document.getElementById('hike-date').value;
        const companions = document.getElementById('hike-companions').value.trim();
        const notes = document.getElementById('hike-notes').value.trim();
        const completed = document.getElementById('hike-completed').checked;
        
        if (!mountainName) {
            alert('Please enter a mountain name');
            return;
        }
        
        let mountain;
        
        if (this.currentMountain) {
            // Adding hike to existing mountain
            mountain = this.currentMountain;
        } else {
            // Creating new mountain
            const mountainId = 'custom-' + Date.now();
            mountain = {
                id: mountainId,
                name: mountainName,
                x: 50, // Default position
                y: 50,
                elevation: 4000,
                is_custom: true,
                hikes: []
            };
            await this.saveMountain(mountain);
        }
        
        // Create hike
        const hike = {
            id: 'hike-' + Date.now(),
            mountainId: mountain.id,
            date: hikeDate,
            companions: companions,
            notes: notes,
            completed: completed
        };
        
        await this.saveHike(hike);
        
        this.closeModals();
        this.renderMountains();
    }

    editHike(mountainId, hikeIndex) {
        this.openHikeModal(mountainId, hikeIndex);
    }

    async deleteHike(mountainId, hikeIndex) {
        if (!confirm('Are you sure you want to delete this hike?')) return;
        
        const mountain = this.mountains.get(mountainId);
        if (mountain && mountain.hikes[hikeIndex]) {
            const hike = mountain.hikes[hikeIndex];
            mountain.hikes.splice(hikeIndex, 1);
            await this.saveMountain(mountain);
            this.renderMountains();
            this.showMountainDetails(mountain);
        }
    }

    editMountain(mountainId) {
        const mountain = this.mountains.get(mountainId);
        if (mountain && mountain.is_custom) {
            const newName = prompt('Enter new mountain name:', mountain.name);
            if (newName && newName.trim()) {
                mountain.name = newName.trim();
                this.saveMountain(mountain);
                this.renderMountains();
            }
        }
    }

    async deleteMountain(mountainId) {
        const mountain = this.mountains.get(mountainId);
        if (mountain && mountain.is_custom) {
            if (!confirm(`Are you sure you want to delete ${mountain.name}?`)) return;
            
            await this.deleteMountain(mountainId);
        }
    }

    addNewMountain(x, y) {
        if (this.isLocationOccupied(x, y)) {
            alert('A mountain already exists at this location');
            return;
        }
        
        const mountainName = prompt('Enter mountain name:');
        if (!mountainName || !mountainName.trim()) return;
        
        const mountainId = 'custom-' + Date.now();
        const mountain = {
            id: mountainId,
            name: mountainName.trim(),
            x: x,
            y: y,
            elevation: 4000,
            is_custom: true,
            hikes: []
        };
        
        this.saveMountain(mountain);
        this.renderMountains();
    }

    isLocationOccupied(x, y, tolerance = 3) {
        for (const [id, mountain] of this.mountains) {
            const distance = Math.sqrt(
                Math.pow(mountain.x - x, 2) + Math.pow(mountain.y - y, 2)
            );
            if (distance < tolerance) return true;
        }
        return false;
    }

    handleDoubleClick(e) {
        if (e.target.classList.contains('mountain-pin') || 
            e.target.closest('.mountain-pin') || 
            e.target.classList.contains('modal') ||
            e.target.closest('.modal')) {
            return;
        }
        
        const rect = this.mapWrapper.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        this.addNewMountain(x, y);
    }

    showClickFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.className = 'click-feedback';
        feedback.style.left = `${x}px`;
        feedback.style.top = `${y}px`;
        
        this.mapWrapper.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 500);
    }

    zoomIn() {
        this.zoomLevel = Math.min(8, this.zoomLevel * 1.2);
        this.updateTransform();
    }

    zoomOut() {
        console.log('zoomOut called - current zoomLevel:', this.zoomLevel);
        this.zoomLevel = Math.max(0.5, this.zoomLevel / 1.2);
        console.log('zoomOut - new zoomLevel:', this.zoomLevel);
        console.log('About to call updateTransform...');
        this.updateTransform();
        console.log('updateTransform called');
    }

    resetZoom() {
        this.zoomLevel = 1;
        this.currentPosition = { x: 0, y: 0 };
        this.updateTransform();
    }

    handleWheelZoom(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoomLevel = Math.max(0.5, Math.min(8, this.zoomLevel * delta));
        this.updateTransform();
    }

    handleGestureStart(e) {
        e.preventDefault();
    }

    handleGestureChange(e) {
        e.preventDefault();
        this.zoomLevel = Math.max(0.5, Math.min(8, this.zoomLevel * e.scale));
        this.updateTransform();
    }

    handleGestureEnd(e) {
        e.preventDefault();
    }

    startDrag(e) {
        if (e.target.classList.contains('mountain-pin') || e.target.closest('.mountain-pin')) {
            return;
        }
        
        this.isDragging = true;
        this.dragStart = { x: e.clientX - this.currentPosition.x, y: e.clientY - this.currentPosition.y };
        this.mapWrapper.style.cursor = 'grabbing';
    }

    drag(e) {
        if (!this.isDragging) return;
        
        this.currentPosition.x = e.clientX - this.dragStart.x;
        this.currentPosition.y = e.clientY - this.dragStart.y;
        this.updateTransform();
    }

    endDrag() {
        this.isDragging = false;
        this.mapWrapper.style.cursor = 'grab';
    }

    startTouchDrag(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        this.isDragging = true;
        this.dragStart = { x: touch.clientX - this.currentPosition.x, y: touch.clientY - this.currentPosition.y };
    }

    touchDrag(e) {
        if (!this.isDragging || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        this.currentPosition.x = touch.clientX - this.dragStart.x;
        this.currentPosition.y = touch.clientY - this.dragStart.y;
        this.updateTransform();
    }

    endTouchDrag() {
        this.isDragging = false;
    }

    updateTransform() {
        console.log('updateTransform called - mapBackground exists:', !!this.mapBackground);
        
        if (!this.mapBackground) {
            console.error('mapBackground is null! Cannot apply transform.');
            return;
        }
        
        console.log('updateTransform called - zoomLevel:', this.zoomLevel, 'position:', this.currentPosition);
        
        // Temporarily disable transitions to see if that's the issue
        this.mapBackground.style.transition = 'none';
        
        const transform = `translate(${this.currentPosition.x}px, ${this.currentPosition.y}px) scale(${this.zoomLevel})`;
        this.mapBackground.style.transform = transform;
        
        console.log('Applied transform:', transform);
        console.log('Actual style.transform:', this.mapBackground.style.transform);
        
        // Force a reflow to ensure the transform is applied
        this.mapBackground.offsetHeight;
    }

    closeModals() {
        if (this.hikeModal) this.hikeModal.style.display = 'none';
        if (this.detailsModal) this.detailsModal.style.display = 'none';
    }

    hideInfoPanel() {
        const infoPanel = document.getElementById('info-panel');
        if (infoPanel) {
            infoPanel.classList.add('hidden');
        }
        
        // Save to localStorage that user has dismissed the info panel
        localStorage.setItem('nh4000_info_dismissed', 'true');
    }

    showInfoPanel() {
        const infoPanel = document.getElementById('info-panel');
        const closeButton = document.getElementById('close-panel');
        
        if (infoPanel) {
            infoPanel.classList.remove('hidden');
        }
        
        if (closeButton) {
            closeButton.style.visibility = 'visible';
        }
    }

    shouldShowInfoPanel() {
        return localStorage.getItem('nh4000_info_dismissed') !== 'true';
    }

    initializeInfoPanel() {
        if (this.shouldShowInfoPanel()) {
            this.showInfoPanel();
        } else {
            // If info panel should be hidden, also hide the close button
            const closeButton = document.getElementById('close-panel');
            if (closeButton) {
                closeButton.style.display = 'none';
            }
        }
    }

    setupSwipeToDismiss() {
        const infoPanel = document.getElementById('info-panel');
        if (!infoPanel) return;
        
        let startX = 0;
        let startY = 0;
        let isSwiping = false;

        infoPanel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = false;
        });

        infoPanel.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            const deltaX = e.touches[0].clientX - startX;
            const deltaY = e.touches[0].clientY - startY;

            // Check if this is a horizontal swipe (more horizontal than vertical)
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                isSwiping = true;
                e.preventDefault();
                
                // Apply transform based on swipe distance
                const swipeDistance = Math.max(0, deltaX);
                const maxSwipe = 100;
                const opacity = 1 - (swipeDistance / maxSwipe);
                const translateX = Math.min(swipeDistance, maxSwipe);
                
                infoPanel.style.transform = `translateX(${translateX}px)`;
                infoPanel.style.opacity = opacity;
            }
        });

        infoPanel.addEventListener('touchend', (e) => {
            if (!isSwiping) return;

            const deltaX = e.changedTouches[0].clientX - startX;
            
            // If swiped more than 50px to the right, dismiss the panel
            if (deltaX > 50) {
                this.hideInfoPanel();
            } else {
                // Reset position
                infoPanel.style.transform = '';
                infoPanel.style.opacity = '';
            }
            
            startX = 0;
            startY = 0;
            isSwiping = false;
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.nh4000Map = new NH4000Map();
    } catch (error) {
        console.error('Error initializing NH4000Map:', error);
    }
});

// Export for potential future database integration
export { NH4000Map }; 