// NH 4000 Footers Map Application
class NH4000Map {
    constructor() {
        this.zoomLevel = 1;
        this.maxZoom = 8;
        this.minZoom = 0.5;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.currentPosition = { x: 0, y: 0 };
        this.mountains = new Map();
        this.currentMountain = null;
        this.editingHikeId = null;
        this.resizeTimeout = null;
        this.gestureStartZoom = null;
        
        this.initializeElements();
        this.loadMountains();
        this.setupEventListeners();
        this.initializeInfoPanel();
        
        // Wait for image to load before rendering mountains
        this.initializeMap();
    }

    initializeElements() {
        this.mapBackground = document.querySelector('.map-background');
        this.mapWrapper = document.querySelector('.map-wrapper');
        this.mountainPins = document.getElementById('mountain-pins');
        this.mapImage = document.getElementById('map-image');
        
        // Controls
        this.zoomInBtn = document.getElementById('zoom-in');
        this.zoomOutBtn = document.getElementById('zoom-out');
        this.resetZoomBtn = document.getElementById('reset-zoom');
        this.addMountainBtn = document.getElementById('add-mountain');
        
        // Modals
        this.hikeModal = document.getElementById('hike-modal');
        this.detailsModal = document.getElementById('details-modal');
        this.hikeForm = document.getElementById('hike-form');
        this.hikeList = document.getElementById('hike-list');
        
        // Form elements
        this.mountainNameInput = document.getElementById('mountain-name');
        this.hikeDateInput = document.getElementById('hike-date');
        this.hikeCompanionsInput = document.getElementById('hike-companions');
        this.hikeNotesInput = document.getElementById('hike-notes');
        this.hikeCompletedInput = document.getElementById('hike-completed');
    }

    setupEventListeners() {
        // Zoom controls
        this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        this.resetZoomBtn.addEventListener('click', () => this.resetZoom());
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

    loadMountains() {
        // Load from localStorage or use default mountains
        const savedMountains = localStorage.getItem('nh4000_mountains');
        if (savedMountains) {
            this.mountains = new Map(JSON.parse(savedMountains));
        } else {
            this.initializeDefaultMountains();
        }
        
        // Load hikes
        const savedHikes = localStorage.getItem('nh4000_hikes');
        if (savedHikes) {
            const hikes = JSON.parse(savedHikes);
            hikes.forEach(hike => {
                if (this.mountains.has(hike.mountainId)) {
                    const mountain = this.mountains.get(hike.mountainId);
                    if (!mountain.hikes) mountain.hikes = [];
                    mountain.hikes.push(hike);
                }
            });
        }
    }

    initializeDefaultMountains() {
        // Default NH 4000 footers with positions from localStorage
        const defaultMountains = [
            { id: 'mt-washington', name: 'Washington', x: 71.22063104453298, y: 41.0274154589372, elevation: 6288 },
            { id: 'mt-adams', name: 'Adams', x: 71.64946358448455, y: 33.77838164251208, elevation: 5774 },
            { id: 'mt-jefferson', name: 'Jefferson', x: 69.52849935493592, y: 36.05869565217391, elevation: 5712 },
            { id: 'mt-monroe', name: 'Monroe', x: 68.79455944948253, y: 43.23393719806763, elevation: 5372 },
            { id: 'mt-madison', name: 'Madison', x: 73.83907357968191, y: 32.53683574879227, elevation: 5367 },
            { id: 'mt-lafayette', name: 'Lafayette', x: 30.127322171841303, y: 57.44987922705314, elevation: 5260 },
            { id: 'mt-lincoln', name: 'Lincoln', x: 30.23965160653916, y: 59.373429951690824, elevation: 5089 },
            { id: 'mt-south-twin', name: 'South Twin', x: 41.530523420063844, y: 53.49214975845411, elevation: 4902 },
            { id: 'mt-carter-dome', name: 'Carter Dome', x: 85.83024073367798, y: 41.45193236714976, elevation: 4832 },
            { id: 'mt-moosilauke', name: 'Moosilauke', x: 8.855030440432804, y: 77.03055555555555, elevation: 4802 },
            { id: 'mt-eisenhower', name: 'Eisenhower', x: 65.39564440489308, y: 45.856280193236714, elevation: 4760 },
            { id: 'mt-north-twin', name: 'North Twin', x: 40.93631699014041, y: 51.27113526570049, elevation: 4761 },
            { id: 'mt-carrigain', name: 'Carrigain', x: 53.772939502876895, y: 67.16980676328504, elevation: 4700 },
            { id: 'mt-bond', name: 'Bond', x: 44.345813793070974, y: 58.346376811594205, elevation: 4698 },
            { id: 'mt-middle-carter', name: 'Middle Carter', x: 86.29068288508441, y: 36.36123188405798, elevation: 4610 },
            { id: 'mt-west-bond', name: 'West Bond', x: 41.07822108276596, y: 58.43442028985507, elevation: 4540 },
            { id: 'mt-garfield', name: 'Garfield', x: 33.71223196881091, y: 53.40893719806763, elevation: 4500 },
            { id: 'mt-liberty', name: 'Liberty', x: 30.754630512472808, y: 63.54975845410629, elevation: 4459 },
            { id: 'mt-south-carter', name: 'South Carter', x: 85.26262436317579, y: 38.196135265700484, elevation: 4430 },
            { id: 'mt-wildcat', name: 'Wildcat', x: 82.56536129474247, y: 42.68997584541063, elevation: 4422 },
            { id: 'mt-wildcat-d', name: 'Wildcat D', x: 79.82142995875357, y: 43.824637681159416, elevation: 4070 },
            { id: 'mt-hancock', name: 'Hancock', x: 48.423046680038794, y: 68.7542270531401, elevation: 4420 },
            { id: 'mt-south-kinsman', name: 'South Kinsman', x: 19.60254252949873, y: 62.793719806763285, elevation: 4358 },
            { id: 'mt-field', name: 'Field', x: 55.587439731238995, y: 51.869927536231884, elevation: 4340 },
            { id: 'mt-osceola', name: 'Osceola', x: 43.19592938667119, y: 80.84746376811594, elevation: 4340 },
            { id: 'mt-flume', name: 'Flume', x: 32.337688693015416, y: 64.94142512077296, elevation: 4328 },
            { id: 'mt-south-hancock', name: 'South Hancock', x: 48.524658692827074, y: 70.3433574879227, elevation: 4319 },
            { id: 'mt-pierce', name: 'Pierce', x: 63.40898710813534, y: 47.907850241545894, elevation: 4310 },
            { id: 'mt-north-kinsman', name: 'North Kinsman', x: 19.67444422079084, y: 60.21086956521739, elevation: 4293 },
            { id: 'mt-willey', name: 'Willey', x: 57.04283849384599, y: 53.71207729468599, elevation: 4285 },
            { id: 'mt-bondcliff', name: 'Bondcliff', x: 43.036524693712266, y: 60.17403381642512, elevation: 4265 },
            { id: 'mt-zealand', name: 'Zealand', x: 46.30493138542814, y: 54.48599033816425, elevation: 4260 },
            { id: 'mt-north-tripyramid', name: 'North Tripyramid', x: 54.19295391087757, y: 84.37657004830919, elevation: 4180 },
            { id: 'mt-cabot', name: 'Cabot', x: 57.75887080826059, y: 7.3142149758454105, elevation: 4170 },
            { id: 'mt-east-osceola', name: 'East Osceola', x: 45.50166739648369, y: 79.16376811594202, elevation: 4156 },
            { id: 'mt-middle-tripyramid', name: 'Middle Tripyramid', x: 54.71552997664586, y: 85.94408212560386, elevation: 4140 },
            { id: 'mt-cannon', name: 'Cannon', x: 24.297722970873238, y: 57.94685990338164, elevation: 4100 },
            { id: 'mt-hale', name: 'Hale', x: 46.1540734972832, y: 48.76545893719807, elevation: 4054 },
            { id: 'mt-jackson', name: 'Jackson', x: 61.9531813548229, y: 50.9487922705314, elevation: 4052 },
            { id: 'mt-tom', name: 'Tom', x: 54.08469438323398, y: 50.189130434782605, elevation: 4051 },
            { id: 'mt-moriah', name: 'Moriah', x: 90.56924050767013, y: 31.10012077294686, elevation: 4049 },
            { id: 'mt-passaconaway', name: 'Passaconaway', x: 61.524077487734374, y: 87.25217391304348, elevation: 4043 },
            { id: 'mt-owl-head', name: 'Owl\'s Head', x: 35.0344091071748, y: 59.7650966183575, elevation: 4025 },
            { id: 'mt-galehead', name: 'Galehead', x: 38.53927739874378, y: 53.46400966183575, elevation: 4024 },
            { id: 'mt-whiteface', name: 'Whiteface', x: 58.955423482216005, y: 90.43599033816425, elevation: 4020 },
            { id: 'mt-waumbek', name: 'Waumbek', x: 57.04216017600362, y: 18.065458937198066, elevation: 4006 },
            { id: 'mt-isolation', name: 'Isolation', x: 70.01295395796255, y: 48.9975845410628, elevation: 4004 },
            { id: 'mt-tecumseh', name: 'Tecumseh', x: 40.89439694748142, y: 85.52572463768117, elevation: 4003 }
        ];

        defaultMountains.forEach(mountain => {
            this.mountains.set(mountain.id, {
                ...mountain,
                hikes: []
            });
        });
        
        this.saveMountains();
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
        const isCustomMountain = mountain.id.startsWith('custom-');
        
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
                    <button class="delete-btn" onclick="window.nh4000Map.deleteHike('${mountain.id}', ${index})">🗑️</button>
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
                this.hikeCompanionsInput.value = hike.companions || '';
                this.hikeNotesInput.value = hike.notes || '';
                this.hikeCompletedInput.checked = hike.completed;
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
        this.hikeCompanionsInput.value = '';
        this.hikeNotesInput.value = '';
        this.hikeCompletedInput.checked = false;
    }

    handleHikeSubmit(e) {
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
            const customMountains = Array.from(this.mountains.values()).filter(m => m.id.startsWith('custom-'));
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
            companions: this.hikeCompanionsInput.value,
            notes: this.hikeNotesInput.value,
            completed: this.hikeCompletedInput.checked,
            id: Date.now().toString()
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
        
        this.saveMountains();
        this.saveHikes();
        this.updatePinStatus();
        this.closeModals();
        
        // Refresh details if open
        if (this.detailsModal.style.display === 'block') {
            this.renderHikeList(this.currentMountain);
        }
    }

    editHike(mountainId, hikeIndex) {
        this.openHikeModal(mountainId, hikeIndex);
    }

    deleteHike(mountainId, hikeIndex) {
        if (confirm('Are you sure you want to delete this hike?')) {
            const mountain = this.mountains.get(mountainId);
            mountain.hikes.splice(hikeIndex, 1);
            
            this.saveMountains();
            this.saveHikes();
            this.updatePinStatus();
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

    deleteMountain(mountainId) {
        const mountain = this.mountains.get(mountainId);
        if (!mountain) return;
        
        if (confirm(`Are you sure you want to delete "${mountain.name}"? This will also delete all associated hikes.`)) {
            this.mountains.delete(mountainId);
            this.saveMountains();
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
            hikes: []
        };
        
        this.mountains.set(mountainId, newMountain);
        this.saveMountains();
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

    saveMountains() {
        const mountainsArray = Array.from(this.mountains.entries());
        localStorage.setItem('nh4000_mountains', JSON.stringify(mountainsArray));
    }

    saveHikes() {
        const allHikes = [];
        this.mountains.forEach(mountain => {
            if (mountain.hikes) {
                allHikes.push(...mountain.hikes);
            }
        });
        localStorage.setItem('nh4000_hikes', JSON.stringify(allHikes));
    }

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