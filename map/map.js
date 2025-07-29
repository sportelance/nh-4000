// NH 4000 Footers Map Application
class NH4000Map {
    constructor() {
        this.zoom = 1;
        this.maxZoom = 8;
        this.minZoom = 0.5;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.mountains = new Map();
        this.currentMountain = null;
        this.editingHikeId = null;
        this.isPanning = false;
        this.isZooming = false;
        this.longPressTimer = null;
        this.longPressThreshold = 500; // 500ms for long press
        this.touchStartPos = { x: 0, y: 0 };
        this.touchStartTime = 0;
        
        // Initialize GitHub storage
        this.githubStorage = new GitHubStorage('sportelance', 'nh-4000', 'main');
        
        this.initializeElements();
        this.initializeMap();
        this.setupEventListeners();
        this.initializeInfoPanel();
    }

    initializeElements() {
        this.mapContainer = document.getElementById('map-container');
        this.mapWrapper = document.getElementById('map-wrapper');
        this.mapBackground = document.getElementById('map-background');
        this.mapImage = document.getElementById('map-image');
        this.mountainPins = document.getElementById('mountain-pins');
        this.zoomInBtn = document.getElementById('zoom-in');
        this.zoomOutBtn = document.getElementById('zoom-out');
        this.resetBtn = document.getElementById('reset');
        this.hikeModal = document.getElementById('hike-modal');
        this.detailsModal = document.getElementById('details-modal');
        this.infoPanel = document.getElementById('info-panel');
        this.closePanelBtn = document.getElementById('close-panel');
        
        // Form elements
        this.mountainNameInput = document.getElementById('mountain-name');
        this.hikeDateInput = document.getElementById('hike-date');
        this.companionsInput = document.getElementById('companions');
        this.notesInput = document.getElementById('notes');
        this.completedCheckbox = document.getElementById('completed');
        this.hikeForm = document.getElementById('hike-form');
    }

    setupEventListeners() {
        // Zoom controls
        this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        this.resetBtn.addEventListener('click', () => this.resetZoom());
        // this.addMountainBtn.addEventListener('click', () => this.enableAddMountainMode());
        
        // Map interactions (mouse)
        this.mapWrapper.addEventListener('mousedown', (e) => this.startDrag(e));
        this.mapWrapper.addEventListener('mousemove', (e) => this.drag(e));
        this.mapWrapper.addEventListener('mouseup', () => this.endDrag());
        this.mapWrapper.addEventListener('mouseleave', () => this.endDrag());
        
        // Wheel zoom
        this.mapWrapper.addEventListener('wheel', (e) => this.handleWheelZoom(e));
        
        // Double-click to add new mountain (desktop)
        // this.mapWrapper.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        // Enhanced touch handling for mobile
        this.setupTouchHandling();
        
        // Touch zoom for mobile (Safari)
        this.mapWrapper.addEventListener('gesturestart', (e) => this.handleGestureStart(e));
        this.mapWrapper.addEventListener('gesturechange', (e) => this.handleGestureChange(e));
        this.mapWrapper.addEventListener('gestureend', (e) => this.handleGestureEnd(e));
        
        // Modal events
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', () => this.closeModals());
        });
        
        // Form submission
        this.hikeForm.addEventListener('submit', (e) => this.handleHikeSubmit(e));
        
        // Modal actions
        document.getElementById('cancel-hike').addEventListener('click', () => this.closeModals());
        document.getElementById('add-new-hike').addEventListener('click', () => {
            this.closeModals();
            this.openHikeModal(this.currentMountain.id);
        });
        document.getElementById('close-details').addEventListener('click', () => this.closeModals());
        
        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
        
        // Handle window resize to maintain pin positions
        window.addEventListener('resize', () => this.handleWindowResize());
        
        // Info panel close functionality
        document.getElementById('close-panel').addEventListener('click', () => {
            this.hideInfoPanel();
        });

        // Swipe to dismiss info panel
        this.setupSwipeToDismiss();
    }

    setupTouchHandling() {
        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let isPanning = false;
        let isZooming = false;
        let initialDistance = 0;
        let initialZoom = 1;

        this.mapWrapper.addEventListener('touchstart', (e) => {
            if (e.target.closest('.mountain-pin')) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const touches = e.touches;
            touchStartTime = Date.now();
            touchStartX = touches[0].clientX;
            touchStartY = touches[0].clientY;
            
            // Check if it's a multi-touch (pinch to zoom)
            if (touches.length === 2) {
                isZooming = true;
                isPanning = false;
                initialDistance = Math.hypot(
                    touches[1].clientX - touches[0].clientX,
                    touches[1].clientY - touches[0].clientY
                );
                initialZoom = this.zoomLevel;
            } else if (touches.length === 1) {
                isPanning = true;
                isZooming = false;
                this.startTouchDrag(e);
            }
        }, { passive: false });

        this.mapWrapper.addEventListener('touchmove', (e) => {
            if (e.target.closest('.mountain-pin')) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const touches = e.touches;
            
            if (isZooming && touches.length === 2) {
                // Handle pinch to zoom
                const currentDistance = Math.hypot(
                    touches[1].clientX - touches[0].clientX,
                    touches[1].clientY - touches[0].clientY
                );
                
                const scale = currentDistance / initialDistance;
                const newZoom = Math.max(0.5, Math.min(8, initialZoom * scale));
                
                if (Math.abs(newZoom - this.zoomLevel) > 0.1) {
                    this.zoomLevel = newZoom;
                    this.updateTransform();
                }
            } else if (isPanning && touches.length === 1) {
                // Handle panning
                this.touchDrag(e);
            }
        }, { passive: false });

        this.mapWrapper.addEventListener('touchend', (e) => {
            if (e.target.closest('.mountain-pin')) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;
            
            // Check for long press (for adding mountains)
            if (touchDuration > 800 && !isPanning && !isZooming) {
                const touch = e.changedTouches[0];
                this.handleLongPress(touch.clientX, touch.clientY);
            }
            
            isPanning = false;
            isZooming = false;
            this.endTouchDrag();
        }, { passive: false });

        this.mapWrapper.addEventListener('touchcancel', (e) => {
            isPanning = false;
            isZooming = false;
            this.endTouchDrag();
        }, { passive: false });
    }

    async initializeMap() {
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
            
            // Process mountains data
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
            
            // Process hikes data and associate with mountains
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
            
            console.log('Data loaded from GitHub:', this.mountains.size, 'mountains,', hikesData ? hikesData.length : 0, 'hikes');
        } catch (error) {
            console.error('Error loading data from GitHub:', error);
            // Fallback to localStorage if GitHub fails
            this.loadFromLocalStorage();
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
        try {
            // Convert mountains Map to array for GitHub storage
            const mountainsArray = Array.from(this.mountains.values());
            await this.githubStorage.writeMountains(mountainsArray);
        } catch (error) {
            console.error('Error saving mountain:', error);
        }
    }

    async saveHike(hike) {
        try {
            // Collect all hikes from all mountains
            const allHikes = [];
            this.mountains.forEach(mountain => {
                if (mountain.hikes) {
                    mountain.hikes.forEach(h => {
                        allHikes.push({
                            id: h.id,
                            mountain_id: h.mountainId,
                            hike_date: h.date,
                            companions: h.companions,
                            notes: h.notes,
                            completed: h.completed
                        });
                    });
                }
            });
            
            await this.githubStorage.writeHikes(allHikes);
        } catch (error) {
            console.error('Error saving hike:', error);
        }
    }

    async deleteHike(hikeId) {
        try {
            // Remove hike from local data
            this.mountains.forEach(mountain => {
                if (mountain.hikes) {
                    mountain.hikes = mountain.hikes.filter(h => h.id !== hikeId);
                }
            });
            
            // Save updated hikes to GitHub
            await this.saveHike({});
        } catch (error) {
            console.error('Error deleting hike:', error);
        }
    }

    async deleteMountain(mountainId) {
        try {
            // Remove mountain from local data
            this.mountains.delete(mountainId);
            
            // Save updated mountains to GitHub
            await this.saveMountain({});
        } catch (error) {
            console.error('Error deleting mountain:', error);
        }
    }

    renderMountains() {
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

    // Add window resize handler to maintain pin positions
    handleWindowResize() {
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
        
        // Check if this is a custom mountain (not one of the defaults)
        const isCustomMountain = mountain.is_custom;
        
        // Create title with mountain name, height, and edit/delete buttons for custom mountains
        let titleHTML = mountain.name;
        if (mountain.elevation) {
            titleHTML += ` <span class="mountain-elevation">(${mountain.elevation} ft)</span>`;
        }
        
        if (isCustomMountain) {
            titleHTML = `
                <div class="mountain-title-with-actions">
                    <span>${mountain.name}${mountain.elevation ? ` <span class="mountain-elevation">(${mountain.elevation} ft)</span>` : ''}</span>
                    <div class="mountain-actions">
                        <button class="edit-mountain-btn" onclick="window.nh4000Map.editMountain('${mountain.id}')" title="Edit Mountain">✏️</button>
                        <button class="delete-mountain-btn" onclick="window.nh4000Map.deleteMountain('${mountain.id}')" title="Delete Mountain">🗑️</button>
                        <div class="mountain-items-spacer"></div>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('details-title').innerHTML = titleHTML;
        
        this.renderHikeList(mountain);
        this.detailsModal.style.display = 'block';
    }

    renderHikeList(mountain) {
        if (!mountain.hikes || mountain.hikes.length === 0) {
            this.hikeList.innerHTML = '<p>No hikes recorded yet. Click "Add New Hike" to get started!</p>';
            return;
        }
        
        this.hikeList.innerHTML = mountain.hikes.map((hike, index) => `
            <div class="hike-entry ${hike.completed ? 'completed' : 'pending'}">
                <div class="hike-actions">
                    <button class="edit-btn" onclick="window.nh4000Map.editHike('${mountain.id}', ${index})">✏️</button>
                    <button class="delete-btn" onclick="window.nh4000Map.deleteHike('${hike.id})">🗑️</button>
                </div>
                <h4>${hike.date || 'No date'} - ${hike.completed ? '✅ Completed' : '⏳ Pending'}</h4>
                ${hike.companions ? `<div class="hike-companions">👥 ${hike.companions}</div>` : ''}
                ${hike.notes ? `<div class="hike-notes">📝 ${hike.notes}</div>` : ''}
            </div>
        `).join('');
    }

    openHikeModal(mountainId = null, hikeIndex = null) {
        this.editingHikeId = hikeIndex;
        
        // Get mountain name field and label
        const mountainNameField = document.getElementById('mountain-name');
        const mountainNameLabel = document.querySelector('label[for="mountain-name"]');
        const mountainNameContainer = mountainNameLabel.parentElement;
        
        if (mountainId) {
            this.currentMountain = this.mountains.get(mountainId);
            
            // Hide mountain name field when adding/editing hikes for existing mountains
            mountainNameContainer.style.display = 'none';
            this.mountainNameInput.removeAttribute('required');
            
            if (hikeIndex !== null) {
                const hike = this.currentMountain.hikes[hikeIndex];
                this.hikeDateInput.value = hike.date || '';
                this.companionsInput.value = hike.companions || '';
                this.notesInput.value = hike.notes || '';
                this.completedCheckbox.checked = hike.completed;
                document.getElementById('modal-title').textContent = 'Edit Hike';
            } else {
                this.clearHikeForm();
                document.getElementById('modal-title').textContent = 'Add Hike';
            }
        } else {
            // Show mountain name field when creating new mountains
            mountainNameContainer.style.display = 'block';
            this.mountainNameInput.disabled = false;
            this.mountainNameInput.setAttribute('required', 'required');
            this.clearHikeForm();
            document.getElementById('modal-title').textContent = 'Add New Mountain';
        }
        
        this.hikeModal.style.display = 'block';
    }

    clearHikeForm() {
        this.mountainNameInput.value = '';
        this.hikeDateInput.value = '';
        this.companionsInput.value = '';
        this.notesInput.value = '';
        this.completedCheckbox.checked = false;
    }

    async handleHikeSubmit(e) {
        e.preventDefault();
        
        // Check if we're creating a new mountain
        if (!this.currentMountain) {
            // Create new mountain
            const mountainName = this.mountainNameInput.value.trim();
            if (!mountainName) {
                alert('Please enter a mountain name');
                return;
            }
            
            // Find the custom mountain we just created
            const customMountains = Array.from(this.mountains.values()).filter(m => m.is_custom);
            const latestCustomMountain = customMountains[customMountains.length - 1];
            
            if (latestCustomMountain) {
                latestCustomMountain.name = mountainName;
                this.currentMountain = latestCustomMountain;
            }
        }
        // Note: When adding/editing hikes for existing mountains, 
        // this.currentMountain is already set and mountain ID is automatically included
        
        const hikeData = {
            mountainId: this.currentMountain.id,
            date: this.hikeDateInput.value,
            companions: this.companionsInput.value,
            notes: this.notesInput.value,
            completed: this.completedCheckbox.checked,
            id: this.editingHikeId !== null ? this.currentMountain.hikes[this.editingHikeId].id : Date.now().toString()
        };
        
        if (this.editingHikeId !== null) {
            // Editing existing hike
            this.currentMountain.hikes[this.editingHikeId] = hikeData;
        } else {
            // Adding new hike
            if (!this.currentMountain.hikes) {
                this.currentMountain.hikes = [];
            }
            this.currentMountain.hikes.push(hikeData);
        }
        
        // Save to API
        await this.saveHike(hikeData);
        this.renderMountains();
        this.closeModals();
        
        // Refresh details if open
        if (this.detailsModal.style.display === 'block') {
            this.renderHikeList(this.currentMountain);
        }
    }

    editHike(mountainId, hikeIndex) {
        this.openHikeModal(mountainId, hikeIndex);
    }

    async deleteHike(mountainId, hikeIndex) {
        if (confirm('Are you sure you want to delete this hike?')) {
            const mountain = this.mountains.get(mountainId);
            const hike = mountain.hikes[hikeIndex];
            
            // Delete from API
            await this.deleteHike(hike.id);
            
            // Remove from local data
            mountain.hikes.splice(hikeIndex, 1);
            this.renderMountains();
            this.renderHikeList(mountain);
        }
    }

    editMountain(mountainId) {
        const mountain = this.mountains.get(mountainId);
        if (!mountain) return;
        
        // Close the details modal first
        this.detailsModal.style.display = 'none';
        
        // Open modal for editing mountain
        this.currentMountain = mountain;
        this.mountainNameInput.value = mountain.name;
        this.mountainNameInput.disabled = false;
        this.clearHikeForm();
        document.getElementById('modal-title').textContent = 'Edit Mountain';
        this.hikeModal.style.display = 'block';
    }

    async deleteMountain(mountainId) {
        const mountain = this.mountains.get(mountainId);
        if (!mountain) return;
        
        if (confirm(`Are you sure you want to delete "${mountain.name}"? This will also delete all associated hikes.`)) {
            // Delete from API
            await this.deleteMountain(mountainId);
            
            // Remove from local data
            this.mountains.delete(mountainId);
            this.renderMountains();
            this.closeModals();
        }
    }

    // enableAddMountainMode() {
    //     this.addMountainBtn.textContent = '📍';
    //     this.addMountainBtn.style.background = '#e74c3c';
    //     this.mapWrapper.style.cursor = 'crosshair';
        
    //     const clickHandler = (e) => {
    //         const rect = this.mapWrapper.getBoundingClientRect();
    //         const x = ((e.clientX - rect.left) / rect.width) * 100;
    //         const y = ((e.clientY - rect.top) / rect.height) * 100;
            
    //         this.addNewMountain(x, y);
            
    //         this.mapWrapper.removeEventListener('click', clickHandler);
    //         this.addMountainBtn.textContent = '➕';
    //         this.addMountainBtn.style.background = '';
    //         this.mapWrapper.style.cursor = 'grab';
    //     };
        
    //     this.mapWrapper.addEventListener('click', clickHandler);
    // }

    addNewMountain(x, y) {
        const mountainId = `custom-${Date.now()}`;
        const newMountain = {
            id: mountainId,
            name: 'New Mountain',
            x: x,
            y: y,
            elevation: 4000,
            is_custom: true,
            hikes: []
        };
        
        this.mountains.set(mountainId, newMountain);
        this.renderMountains();
        
        // Open modal for creating new mountain
        this.currentMountain = null; // This signals we're creating a new mountain
        this.mountainNameInput.value = '';
        this.mountainNameInput.disabled = false;
        this.clearHikeForm();
        document.getElementById('modal-title').textContent = 'Add New Mountain';
        this.hikeModal.style.display = 'block';
    }

    // Check if a location is occupied by an existing mountain
    isLocationOccupied(x, y, tolerance = 3) {
        for (const mountain of this.mountains.values()) {
            const distance = Math.sqrt(
                Math.pow(mountain.x - x, 2) + Math.pow(mountain.y - y, 2)
            );
            if (distance < tolerance) {
                return true;
            }
        }
        return false;
    }

    // Handle double-click to add new mountain
    handleDoubleClick(e) {
        if (e.target.closest('.mountain-pin')) return;
        
        // Prevent double-click from interfering with dragging
        if (this.isDragging) return;
        
        const rect = this.mapWrapper.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Check if location is already occupied
        if (this.isLocationOccupied(x, y)) {
            alert('This location is too close to an existing mountain. Please choose a different location.');
            return;
        }
        
        // Add visual feedback
        this.showClickFeedback(e.clientX, e.clientY);
        
        this.addNewMountain(x, y);
    }

    // Show visual feedback for double-click
    showClickFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            left: ${x - 10}px;
            top: ${y - 10}px;
            width: 20px;
            height: 20px;
            background: #27ae60;
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            animation: clickFeedback 0.6s ease-out forwards;
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            document.body.removeChild(feedback);
        }, 600);
    }

    // Zoom and pan functionality
    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.5, this.maxZoom);
        this.updateTransform();
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.5, this.minZoom);
        this.updateTransform();
    }

    resetZoom() {
        this.zoomLevel = 1;
        this.currentPosition = { x: 0, y: 0 };
        this.updateTransform();
    }

    handleWheelZoom(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * delta));
        this.updateTransform();
    }

    // Touch gesture handlers for mobile zoom
    handleGestureStart(e) {
        e.preventDefault();
        this.gestureStartZoom = this.zoomLevel;
    }

    handleGestureChange(e) {
        e.preventDefault();
        if (this.gestureStartZoom) {
            this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.gestureStartZoom * e.scale));
            this.updateTransform();
        }
    }

    handleGestureEnd(e) {
        e.preventDefault();
        this.gestureStartZoom = null;
    }

    startDrag(e) {
        if (e.target.closest('.mountain-pin')) return;
        
        e.preventDefault();
        this.isDragging = true;
        this.dragStart = { 
            x: e.clientX - this.currentPosition.x, 
            y: e.clientY - this.currentPosition.y 
        };
        this.mapWrapper.style.cursor = 'grabbing';
        this.mapWrapper.style.userSelect = 'none';
    }

    drag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        
        // Use requestAnimationFrame for smoother performance
        requestAnimationFrame(() => {
        this.currentPosition = {
            x: e.clientX - this.dragStart.x,
            y: e.clientY - this.dragStart.y
        };
        this.updateTransform();
        });
    }

    endDrag() {
        this.isDragging = false;
        this.mapWrapper.style.cursor = 'grab';
        this.mapWrapper.style.userSelect = 'auto';
    }

    // Touch drag methods for mobile
    startTouchDrag(e) {
        if (e.target.closest('.mountain-pin')) return;
        
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        this.isDragging = true;
        this.dragStart = { 
            x: touch.clientX - this.currentPosition.x, 
            y: touch.clientY - this.currentPosition.y 
        };
        this.mapWrapper.style.cursor = 'grabbing';
        this.mapWrapper.style.userSelect = 'none';
        
        // Prevent scrolling and bouncing on mobile
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    }

    touchDrag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        
        // Use requestAnimationFrame for smoother performance
        requestAnimationFrame(() => {
            this.currentPosition = {
                x: touch.clientX - this.dragStart.x,
                y: touch.clientY - this.dragStart.y
            };
            this.updateTransform();
        });
    }

    endTouchDrag() {
        this.isDragging = false;
        this.mapWrapper.style.cursor = 'grab';
        this.mapWrapper.style.userSelect = 'auto';
        
        // Restore normal scrolling
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    }

    updateTransform() {
        // Calculate the transform to keep the map centered
        const transform = `translate(${this.currentPosition.x}px, ${this.currentPosition.y}px) scale(${this.zoomLevel})`;
        this.mapBackground.style.transform = transform;
        this.mapBackground.dataset.zoom = Math.round(this.zoomLevel);
    }

    closeModals() {
        this.hikeModal.style.display = 'none';
        this.detailsModal.style.display = 'none';
        this.editingHikeId = null;
    }

    // Note: Data is now saved via API calls instead of localStorage

    hideInfoPanel() {
        console.log('hideInfoPanel');
        const infoPanel = document.getElementById('info-panel');
        const closeButton = document.getElementById('close-panel');
        
        closeButton.style.visibility = 'hidden';
        
        // Save to localStorage that user has dismissed the info panel
        localStorage.setItem('nh4000_info_dismissed', 'true');
    }

    showInfoPanel() {
        console.log('showInfoPanel');
        const infoPanel = document.getElementById('info-panel');
        const closeButton = document.getElementById('close-panel');
        
        closeButton.style.visibility = 'visible';
    }

    showInfoPanel() {
        const infoPanel = document.getElementById('info-panel');
        infoPanel.classList.remove('hidden');
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
            closeButton.style.display = 'none';
        }
    }

    initializeMap() {
        // Check if image is already loaded
        if (this.mapImage.complete && this.mapImage.naturalHeight !== 0) {
            this.renderMountains();
            this.updateTransform();
        } else {
            // Wait for image to load
            this.mapImage.addEventListener('load', () => {
                this.renderMountains();
                this.updateTransform();
            });
            
            // Fallback in case load event doesn't fire
            setTimeout(() => {
                if (this.mapImage.complete) {
                    this.renderMountains();
                    this.updateTransform();
                }
            }, 1000);
        }
    }

    setupSwipeToDismiss() {
        const infoPanel = document.getElementById('info-panel');
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
    window.nh4000Map = new NH4000Map();
});

// Export for potential future database integration
export { NH4000Map }; 