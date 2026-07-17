// src/components/LayoutControls.js
import { DataStore } from '../services/DataStore.js';
import { CanvasEngine } from '../services/CanvasEngine.js';

export const LayoutControls = {
    template: `
        <div class="flex flex-col gap-4 w-full h-full text-xs">
            
            <!-- NEW WARNING NOTE -->
            <div class="bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded-lg text-[10px] leading-tight text-center shadow-sm">
                ⚠️ <strong>Note:</strong> Furniture changes made in this tab are temporary. To permanently alter the physical room, use the <strong>Rooms</strong> tab.
            </div>

            <div>
                <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1">Active Class Period</label>
                <select v-model="ui.activePeriodId" @change="handlePeriodChange" class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white font-semibold text-blue-900 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer">
                    <option v-for="p in periods" :key="p.id" :value="p.id">
                        {{ p.id === 'period_homeroom_base' ? '🏠 ' : '🕒 ' }}{{ p.name }}
                    </option>
                </select>
            </div>

            <div v-if="ui.activePeriodId === 'period_homeroom_base'" class="bg-indigo-50 border border-indigo-200 p-3 rounded-lg flex flex-col gap-2 shrink-0">
                <span class="font-bold text-indigo-900 uppercase text-[10px] tracking-wider">🏠 Homeroom Anchors</span>
                
                <!-- NEW TOGGLE BUTTON -->
                <button @click="toggleHomeroomAnchors" class="w-full font-bold py-2 rounded shadow-sm cursor-pointer transition text-[10px] uppercase tracking-wider" :class="hasAnchors ? 'bg-indigo-200 hover:bg-indigo-300 text-indigo-800' : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
                    {{ hasAnchors ? '🔓 Clear All Anchors' : '⚓ Anchor Current Seats' }}
                </button>
            </div>

            <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 flex flex-col gap-3 shrink-0 shadow-sm">
                <span class="font-bold text-blue-950 uppercase text-[10px] tracking-wider border-b border-blue-200 pb-1">Automated Placement</span>
                
                <div>
                    <label class="flex justify-between font-medium text-gray-700 mb-1">
                        <span>Min Separation:</span>
                        <span class="font-bold text-blue-700">{{ Math.floor(settings.minSeparationInches / 12) }}' {{ settings.minSeparationInches % 12 }}"</span>
                    </label>
                    <input type="range" v-model.number="settings.minSeparationInches" @input="triggerValidation" min="24" max="120" step="6" class="w-full accent-blue-600 cursor-pointer">
                </div>

                <div>
                    <label class="block font-medium text-gray-700 mb-1 text-[10px] uppercase">Seating Arrangement</label>
                    <select v-model="settings.genderDistributionMode" @change="saveSettings" class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white text-blue-900 font-semibold focus:outline-none cursor-pointer">
                        <option value="random">🎲 Random Scatter</option>
                        <option value="alternating">🔀 Alternating (B/G)</option>
                        <option value="clustered">🧱 Clustered / Grouped</option>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-2 mt-1">
                    <button @click="handleAutoAssign" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-1 rounded shadow cursor-pointer transition">
                        🎲 Auto-Assign
                    </button>
                    <button @click="handleClearAssignments" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-1 rounded shadow cursor-pointer transition">
                        🚫 Clear Seats
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-2 shrink-0">
                <button @click="zoomIn" class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-1.5 rounded shadow cursor-pointer transition">➕ Zoom</button>
                <button @click="zoomOut" class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-1.5 rounded shadow cursor-pointer transition">➖ Zoom</button>
                <button @click="resetView" class="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 rounded shadow cursor-pointer transition">🔍 Reset</button>
            </div>
            
            <button @click="printLayout" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-widest uppercase py-2 rounded shadow-sm cursor-pointer transition shrink-0">
                🖨️ Export PDF
            </button>

            <div class="flex-1 flex flex-col min-h-[150px] border border-gray-200 rounded-lg bg-gray-50 overflow-hidden shadow-sm">
                <div class="flex justify-between items-center bg-gray-100 border-b border-gray-200 px-3 py-2 shrink-0">
                    <span class="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Class Roster</span>
                    <span v-if="unseatedCount > 0" class="text-[10px] font-bold bg-amber-200 border border-amber-400 text-amber-800 px-2 py-0.5 rounded-full shadow-sm">
                        {{ unseatedCount }} Unseated
                    </span>
                    <span v-else class="text-[10px] font-bold bg-green-200 border border-green-400 text-green-800 px-2 py-0.5 rounded-full shadow-sm">
                        All Seated
                    </span>
                </div>
                
                <div class="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1.5">
                    <div v-for="student in rosterStudents" :key="student.id"
                         draggable="true"
                         @dragstart="handleDragStart($event, student.id)"
                         :class="seatedStudentIds.includes(student.id) ? 'opacity-70 bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:border-blue-400'"
                         class="border rounded px-2 py-2 flex justify-between items-center cursor-grab active:cursor-grabbing hover:shadow-sm transition">
                        
                        <span class="font-bold text-gray-700 flex items-center gap-1.5 text-xs">
                            <span class="text-gray-400 cursor-move">⣿</span>
                            {{ student.name }}
                        </span>
                        
                        <div class="flex items-center gap-2">
                            <span v-if="seatedStudentIds.includes(student.id)" class="text-[9px] font-bold text-green-700 bg-green-100 border border-green-300 px-1 py-0.5 rounded shadow-sm">SEATED</span>
                            <span v-if="student.requiresPreferredSeating" class="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-bold border border-amber-300">FRONT</span>
                            <div v-if="student.gender === 'Male'" class="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                            <div v-else-if="student.gender === 'Female'" class="w-2.5 h-2.5 rounded-full bg-pink-400"></div>
                            <div v-else class="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                        </div>
                    </div>
                    
                    <div v-if="rosterStudents.length === 0" class="text-center text-gray-400 text-xs italic mt-6 px-4">
                        No students are assigned to this class period yet.
                    </div>
                </div>
            </div>

            <div class="mt-auto pt-4 border-t border-gray-200 flex flex-col gap-2 shrink-0">
                <div class="flex gap-2">
                    <button @click="handleToggleSnap" :class="settings.isSnapEnabled ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'" class="flex-1 font-bold py-2 rounded shadow-sm cursor-pointer transition text-[10px] uppercase tracking-wider">
                        Snap: {{ settings.isSnapEnabled ? 'ON' : 'OFF' }}
                    </button>
                    <button @click="handleToggleDeskLock" :class="settings.isDeskLockEnabled ? 'bg-amber-600 text-white' : 'bg-gray-300 text-gray-600'" class="flex-1 font-bold py-2 rounded shadow-sm cursor-pointer transition text-[10px] uppercase tracking-wider">
                        Desks: {{ settings.isDeskLockEnabled ? 'LOCKED' : 'UNLOCKED' }}
                    </button>
                    <button @click="handleToggleTextFlip" :class="settings.isTextFlipped ? 'bg-purple-600 text-white' : 'bg-slate-700 text-white'" class="flex-1 font-bold py-2 rounded shadow-sm cursor-pointer transition text-[10px] uppercase tracking-wider">
                        POV: {{ settings.isTextFlipped ? 'TEACHER' : 'BOARD' }}
                    </button>
                </div>
            </div>

            <div v-if="showReassignModal" class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
                    <div class="bg-blue-900 text-white px-5 py-3 flex justify-between items-center">
                        <h2 class="text-sm font-bold flex items-center gap-2">🎲 Auto-Assigner</h2>
                    </div>
                    <div class="p-5 flex flex-col gap-4 text-sm bg-slate-50 text-center text-slate-700">
                        <span class="text-4xl">🤔</span>
                        <p>All students in this period are already assigned to a seat.</p>
                        <p class="text-xs text-slate-500">Would you like to clear all unlocked seats and run the Auto-Assigner again?</p>
                    </div>
                    <div class="bg-white px-5 py-3 flex justify-end gap-2 border-t border-slate-200">
                        <button @click="showReassignModal = false" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-1.5 px-4 rounded transition text-xs shadow-sm cursor-pointer">Cancel</button>
                        <button @click="forceReassign" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-6 rounded transition text-xs shadow-sm cursor-pointer">Reassign Anyway</button>
                    </div>
                </div>
            </div>

        </div>
    `,
    data() {
        return {
            periods: DataStore.getPeriods(),
            ui: DataStore.state.ui,
            settings: DataStore.state.settings,
            showReassignModal: false
        };
    },
    computed: {
        activePeriod() {
            return this.ui.activePeriodId ? this.periods[this.ui.activePeriodId] : null;
        },
        seatedStudentIds() {
            this.ui.layoutNonce; 
            return CanvasEngine.getSeatedStudentIds();
        },
        rosterStudents() {
            this.ui.layoutNonce; 
            if (!this.activePeriod) return [];
            
            const assignedIds = this.activePeriod.studentIds || [];
            
            return Object.values(DataStore.state.students)
                .filter(s => assignedIds.includes(s.id))
                .sort((a, b) => a.name.localeCompare(b.name));
        },
        unseatedCount() {
            return this.rosterStudents.filter(s => !this.seatedStudentIds.includes(s.id)).length;
        },
        hasAnchors() {
            return Object.values(DataStore.state.students).some(s => s.ownedSeatKey !== null);
        }
    },
    mounted() {
        // NEW: Sync database state and force layout load when switching to this tab
        this.ui.currentTab = 'seating';
        DataStore.persist();
        setTimeout(() => CanvasEngine.loadLayout(), 50);

        window.addEventListener('canvas-layout-modified', () => {
            this.ui.layoutNonce++;
            this.triggerValidation();
        });
        window.addEventListener('canvas-layout-moving', () => {
            this.triggerValidation();
        });

        if (this.settings.isSnapEnabled === undefined) this.settings.isSnapEnabled = true;
        CanvasEngine.setSnap(this.settings.isSnapEnabled);
        CanvasEngine.setDeskLock(this.settings.isDeskLockEnabled);
        CanvasEngine.flipSeatText(this.settings.isTextFlipped);
    },
    methods: {
        handleDragStart(event, studentId) {
            event.dataTransfer.setData('text/plain', studentId);
            event.dataTransfer.effectAllowed = 'move';
        },
        saveSettings() { DataStore.persist(); },
        triggerValidation() {
            DataStore.persist();
            CanvasEngine.validateSeatingLayout(DataStore.state.students, this.settings.minSeparationInches);
        },
        
        // --- AUTO ASSIGN LOGIC ---
        handleAutoAssign() {
            if (this.rosterStudents.length === 0) return;
            
            if (this.unseatedCount === 0) {
                this.showReassignModal = true;
                return;
            }
            
            const unseated = this.rosterStudents.filter(s => !this.seatedStudentIds.includes(s.id));
            CanvasEngine.autoAssign(unseated, this.settings.genderDistributionMode);
        },
        
        forceReassign() {
            this.showReassignModal = false;
            CanvasEngine.clearSeats(); 
            
            setTimeout(() => {
                const newlyUnseated = this.rosterStudents.filter(s => !this.seatedStudentIds.includes(s.id));
                CanvasEngine.autoAssign(newlyUnseated, this.settings.genderDistributionMode);
            }, 100);
        },

        handleClearAssignments() {
            if (confirm("Clear all unlocked seats in this layout?")) CanvasEngine.clearSeats();
        },
        
        // --- NEW TOGGLE HANDLER ---
        toggleHomeroomAnchors() {
            if (this.hasAnchors) {
                if (confirm("Clear all Homeroom Anchor assignments globally?")) {
                    DataStore.clearAllHomeroomAnchors();
                    CanvasEngine.loadLayout(); 
                }
            } else {
                const count = CanvasEngine.anchorCurrentSeats();
                alert(`Successfully anchored ${count} students to their current seats.`);
            }
        },
		
		// --- REDRAW ON DROPDOWN CHANGE ---
		handlePeriodChange() {
            DataStore.persist();
            CanvasEngine.loadLayout();
        },
        
        handleDragStart(event, studentId) {
            event.dataTransfer.setData('text/plain', studentId);
            event.dataTransfer.effectAllowed = 'move';
        },
        
        // --- TOGGLES ---
        handleToggleSnap() {
            this.settings.isSnapEnabled = !this.settings.isSnapEnabled;
            CanvasEngine.setSnap(this.settings.isSnapEnabled);
            this.saveSettings();
        },
        handleToggleDeskLock() {
            this.settings.isDeskLockEnabled = !this.settings.isDeskLockEnabled;
            CanvasEngine.setDeskLock(this.settings.isDeskLockEnabled);
            this.saveSettings();
        },
        handleToggleTextFlip() {
            this.settings.isTextFlipped = !this.settings.isTextFlipped;
            CanvasEngine.flipSeatText(this.settings.isTextFlipped);
            this.saveSettings();
        },

        // --- CAMERA ---
        zoomIn() { CanvasEngine.canvas.setZoom(CanvasEngine.canvas.getZoom() * 1.25); },
        zoomOut() { CanvasEngine.canvas.setZoom(Math.max(0.1, CanvasEngine.canvas.getZoom() * 0.8)); },
        resetView() { CanvasEngine.recalculateDimensions(); },

        // --- EXPORT ---
        printLayout() {
            const periodName = this.activePeriod ? this.activePeriod.name : 'Custom_Layout';
            CanvasEngine.exportToPDF(periodName);
        }
    }
};