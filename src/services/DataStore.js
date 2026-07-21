// src/services/DataStore.js
const { reactive } = Vue;

export const DataStore = {
    // The master state object
    state: reactive({
        students: {},
        periods: {},
        classrooms: {},
        settings: {
            roomWidthFeet: 30,
            roomLengthFeet: 25,
            globalDeskWidth: 24,
            globalDeskLength: 18,
            minSeparationInches: 48,
            isDeskLockEnabled: false,
            isTextFlipped: false,
            genderDistributionMode: 'random'
        },
        ui: { 
            currentTab: 'layout',
            activeRoomId: null,   
            layoutNonce: 0,       
            editingStudentId: null,
            activePeriodId: 'period_homeroom_base',
			isBoardMode: false
        }
    }),

    init() {
        const saved = localStorage.getItem('ClassroomSeatingSuite_v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(this.state, parsed);
        }
        this.ensureDefaults();
    },

    ensureDefaults() {
        if (Object.keys(this.state.classrooms).length === 0) {
            this.state.classrooms['room_homeroom_base'] = {
                id: 'room_homeroom_base',
                name: 'Primary Homeroom',
                teacher: 'Teacher Homeroom',
                isPrimaryHomeroom: true,
                widthFeet: 30,
                lengthFeet: 25
            };
        }
        if (!this.state.periods['period_homeroom_base']) {
            this.state.periods['period_homeroom_base'] = {
                id: 'period_homeroom_base',
                name: 'Homeroom Base',
                studentIds: [],
                layoutMode: 'custom',
                classroomId: 'room_homeroom_base'
            };
        }
    },

    persist() {
        localStorage.setItem('ClassroomSeatingSuite_v2', JSON.stringify(this.state));
    },

	// --- DEV UTILITY ---
    devWipeDatabase() {
        if (confirm("🚨 NUCLEAR WIPE: This will permanently eradicate all local database records, layouts, and ghost data for this application. Continue?")) {
            
            // 1. Grab a static array of every key in the browser's storage
            const allKeys = Object.keys(localStorage);
            
            // 2. Destroy anything remotely related to the app (case-insensitive)
            allKeys.forEach(key => {
                const k = key.toLowerCase();
                if (k.includes('cs_') || k.includes('classroomseating') || k.includes('room_') || k.includes('period_')) {
                    localStorage.removeItem(key);
                }
            });

            // 3. Reload to start completely fresh
            window.location.reload(); 
        }
    },

	// --- FILE I/O UTILITIES ---
    exportData() {
        const backup = {
            version: "2.0",
            vueState: JSON.parse(localStorage.getItem('ClassroomSeatingSuite_v2') || '{}'),
            rooms: {},
            periods: {}
        };
        
        // Dynamically scrape all layout and assignment keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('CS_Room_')) backup.rooms[key] = JSON.parse(localStorage.getItem(key));
            if (key && key.startsWith('CS_Period_')) backup.periods[key] = JSON.parse(localStorage.getItem(key));
        }
        
        const dataStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `ClassroomSeating_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    },

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!importedData.vueState || importedData.version !== "2.0") {
                    alert("Invalid backup file. Please ensure it is a V2 backup.");
                    return;
                }
                
                // Restore state
                localStorage.setItem('ClassroomSeatingSuite_v2', JSON.stringify(importedData.vueState));
                
                // Restore room layouts and period assignments
                if (importedData.rooms) Object.keys(importedData.rooms).forEach(k => localStorage.setItem(k, JSON.stringify(importedData.rooms[k])));
                if (importedData.periods) Object.keys(importedData.periods).forEach(k => localStorage.setItem(k, JSON.stringify(importedData.periods[k])));
                
                alert("Data imported successfully! The application will now reload.");
                window.location.reload();
            } catch (err) { 
                alert("Invalid file format. Please ensure you are importing a valid Classroom Seating JSON backup."); 
            }
        };
        reader.readAsText(file);
    },

    importRoster(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/);
            let importedCount = 0; let updatedCount = 0;

            // Skip index 0 assuming there is a header row
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const cols = line.split(',');
                const name = cols[0] ? cols[0].trim() : '';
                if (!name) continue;

                let gender = 'Unspecified';
                if (cols[1]) {
                    const g = cols[1].trim().toLowerCase();
                    if (['m', 'male', 'boy', 'b'].includes(g)) gender = 'Male';
                    else if (['f', 'female', 'girl', 'g'].includes(g)) gender = 'Female';
                }

                const p = cols[2] ? cols[2].trim().toLowerCase() : '';
                const requiresPreferredSeating = ['true', 'yes', 'y', '1'].includes(p);

                // NEW: Grab column 4 for Homeroom status
                const h = cols[3] ? cols[3].trim().toLowerCase() : '';
                const isHomeroom = ['true', 'yes', 'y', '1'].includes(h);

                const existingStudent = Object.values(this.state.students).find(s => s.name.toLowerCase() === name.toLowerCase());

                if (existingStudent) {
                    existingStudent.gender = gender; 
                    existingStudent.requiresPreferredSeating = requiresPreferredSeating; 
                    existingStudent.isHomeroom = isHomeroom; // Update existing
                    updatedCount++;
                } else {
                    const id = 'std_' + Math.random().toString(36).substr(2, 9).toUpperCase();
                    this.state.students[id] = { id, name, gender, requiresPreferredSeating, isHomeroom, restrictedStudentIds: [], ownedSeatKey: null };
                    importedCount++;
                }
            }
            this.persist();
            alert(`Roster Processed!\nAdded ${importedCount} new students.\nUpdated ${updatedCount} existing students.`);
        };
        reader.readAsText(file);
    },

    // --- CLASSROOM METHODS ---
    getRooms() { return this.state.classrooms; },
    
    addRoom(roomData) {
        const id = 'room_' + Math.random().toString(36).substr(2, 9);
        this.state.classrooms[id] = {
            id,
            name: roomData.name,
			teacherName: roomData.teacherName || '',
            widthFeet: roomData.widthFeet || 25,
            lengthFeet: roomData.lengthFeet || 35
        };
        this.state.ui.activeRoomId = id;
        this.persist();
        return id;
    },

    duplicateRoom(roomId) {
        const original = this.state.classrooms[roomId];
        if (!original) return null;
        
        const newId = 'room_' + Math.random().toString(36).substr(2, 9);
        this.state.classrooms[newId] = {
            ...original,
            id: newId,
            name: original.name + ' (Copy)'
        };
        this.state.ui.activeRoomId = newId;
        this.persist();
        return newId;
    },

    deleteRoom(id) {
        // 1. HARD ERROR VALIDATION: Check if any periods are using this room
        const assignedPeriods = Object.values(this.state.periods).filter(p => p.classroomId === id);
        if (assignedPeriods.length > 0) {
            const names = assignedPeriods.map(p => p.name).join(', ');
            alert(`⛔ CANNOT DELETE ROOM\n\nThis room is currently assigned to the following class periods:\n${names}\n\nYou must reassign or delete these classes before deleting this physical room.`);
            return false;
        }

        // 2. Safe to delete
        delete this.state.classrooms[id];
        if (this.state.ui.activeRoomId === id) {
            const remaining = Object.keys(this.state.classrooms);
            this.state.ui.activeRoomId = remaining.length > 0 ? remaining[0] : null;
        }
        this.persist();
        return true;
    },
    editRoom(roomId, updatedData) {
        if (this.state.classrooms[roomId]) {
            // Merge the new data (name, width, length) into the existing room
            this.state.classrooms[roomId] = { 
                ...this.state.classrooms[roomId], 
                ...updatedData 
            };
            this.persist();
        }
    },

    // --- PERIOD METHODS ---
    getPeriods() { return this.state.periods; },
    
    addPeriod(formData) {
        const id = 'per_' + Math.random().toString(36).substr(2, 9);
        this.state.periods[id] = {
            id,
            name: formData.name,
            classroomId: formData.classroomId,
            studentIds: [],
            layoutMode: 'custom'
        };
        // Auto-select the newly created period
        this.state.ui.activePeriodId = id;
        this.persist();
    },

    deletePeriod(id) {
        if (id === 'period_homeroom_base') {
            alert("The primary Homeroom Base period cannot be deleted.");
            return;
        }
        delete this.state.periods[id];
        // If we deleted the active period, fallback to homeroom
        if (this.state.ui.activePeriodId === id) {
            this.state.ui.activePeriodId = 'period_homeroom_base';
        }
        this.persist();
    },

    setPeriodLayoutMode(periodId, mode) {
        if (this.state.periods[periodId]) {
            this.state.periods[periodId].layoutMode = mode;
            this.persist();
        }
    },

    assignStudentToPeriod(periodId, studentId) {
        const p = this.state.periods[periodId];
        if (p && !p.studentIds.includes(studentId)) {
            p.studentIds.push(studentId);
            this.persist();
        }
    },

    removeStudentFromPeriod(periodId, studentId) {
        const p = this.state.periods[periodId];
        if (p) {
            p.studentIds = p.studentIds.filter(id => id !== studentId);
            this.persist();
        }
    },

    clearPeriodRoster(periodId) {
        if (this.state.periods[periodId]) {
            this.state.periods[periodId].studentIds = [];
            this.persist();
        }
    },
	
	editPeriod(periodId, updatedData) {
        if (this.state.periods[periodId]) {
            this.state.periods[periodId] = { 
                ...this.state.periods[periodId], 
                ...updatedData 
            };
            this.persist();
        }
    },

    // --- STUDENT METHODS ---
    getStudents() { return this.state.students; },
	setEditingStudent(id) {
        this.state.ui.editingStudentId = id;
    },
    
    addStudent(formData) {
        const id = 'std_' + Math.random().toString(36).substr(2, 9);
        this.state.students[id] = {
            id,
            name: formData.name,
            gender: formData.gender,
            isHomeroom: formData.isHomeroom || false,
            requiresPreferredSeating: formData.requiresPreferredSeating || false,
            restrictedStudentIds: [],
            ownedSeatKey: null
        };
        this.persist();
    },
    
    updateStudent(id, formData) {
        if (this.state.students[id]) {
            this.state.students[id].name = formData.name;
            this.state.students[id].gender = formData.gender;
            this.state.students[id].isHomeroom = formData.isHomeroom;
            this.state.students[id].requiresPreferredSeating = formData.requiresPreferredSeating;
            this.persist();
        }
    },
    
    deleteStudent(id) {
        const student = this.state.students[id];
        if (student && student.restrictedStudentIds) {
            student.restrictedStudentIds.forEach(restrictedId => {
                const otherStudent = this.state.students[restrictedId];
                if (otherStudent && otherStudent.restrictedStudentIds) {
                    otherStudent.restrictedStudentIds = otherStudent.restrictedStudentIds.filter(rId => rId !== id);
                }
            });
        }
        delete this.state.students[id];
        this.persist();
    },
	
	deleteAllStudents() {
        if (confirm("🚨 WARNING: This will permanently delete ALL students from the directory and clear them from all seating charts. Are you sure?")) {
            // 1. Wipe the student dictionary
            this.state.students = {};
            
            // 2. Clear all period rosters so ghost IDs don't linger
            Object.values(this.state.periods).forEach(p => {
                p.studentIds = [];
            });
            
            this.persist();
            
            // 3. Force the canvas to update to clear any seated students
            window.dispatchEvent(new CustomEvent('canvas-layout-modified'));
            window.dispatchEvent(new CustomEvent('force-canvas-redraw'));
        }
    },
	
	clearAllHomeroomAnchors() {
        Object.values(this.state.students).forEach(s => {
            s.ownedSeatKey = null;
        });
        this.persist();
    },
    
    addRestriction(student1Id, student2Id) {
        if (!student1Id || !student2Id || student1Id === student2Id) return;

        const s1 = this.state.students[student1Id];
        const s2 = this.state.students[student2Id];

        if (s1 && s2) {
            const list1 = s1.restrictedStudentIds ? [...s1.restrictedStudentIds] : [];
            const list2 = s2.restrictedStudentIds ? [...s2.restrictedStudentIds] : [];

            if (!list1.includes(student2Id)) list1.push(student2Id);
            if (!list2.includes(student1Id)) list2.push(student1Id);

            s1.restrictedStudentIds = list1;
            s2.restrictedStudentIds = list2;

            this.persist();
        }
    },
    
    removeRestriction(studentId, restrictedId) {
        const s1 = this.state.students[studentId];
        const s2 = this.state.students[restrictedId];

        if (s1 && s1.restrictedStudentIds) {
            s1.restrictedStudentIds = s1.restrictedStudentIds.filter(id => id !== restrictedId);
        }
        if (s2 && s2.restrictedStudentIds) {
            s2.restrictedStudentIds = s2.restrictedStudentIds.filter(id => id !== studentId);
        }

        this.persist();
    }
};