// src/components/PeriodControls.js
import { DataStore } from '../services/DataStore.js';

export const PeriodControls = {
    template: `
        <div class="flex flex-col gap-6 w-full text-xs h-full">
            
            <div class="bg-white shrink-0">
                <h2 class="font-bold text-xs text-gray-800 mb-2 uppercase tracking-wider border-b border-gray-200 pb-1">
                    Create New Class Period
                </h2>
                <form @submit.prevent="createPeriod" class="flex flex-col gap-2.5">
                    <div>
                        <label class="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Period Hour / Title</label>
                        <input v-model="form.name" placeholder="e.g., 1st Hour Algebra" required class="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none text-xs">
                    </div>
                    
                    <div>
                        <label class="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Assigned Classroom</label>
                        <select v-model="form.classroomId" required class="w-full px-2 py-1.5 border border-gray-300 rounded bg-white focus:border-blue-500 outline-none text-xs">
                            <option value="" disabled>Select Room...</option>
                            <option v-for="(room, rId) in rooms" :key="rId" :value="rId"> {{ room.name }}</option>
                        </select>
                    </div>

                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded shadow-sm transition text-xs mt-1">
                        Initialize Class Hour
                    </button>
                </form>
            </div>

            <div class="flex-1 flex flex-col min-h-0">
                <h2 class="font-bold text-xs text-gray-800 mb-2 uppercase tracking-wider border-b border-gray-200 pb-1">
                    Registered Class Hours
                </h2>
                <div class="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1 pb-4">
                    
                    <div v-for="(period, id) in periods" :key="id" 
                         class="border rounded transition flex flex-col bg-white overflow-hidden shadow-sm"
                         :class="ui.activePeriodId === id ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200 hover:bg-gray-50'">
                        
                        <div @click="ui.activePeriodId = id" class="px-3 py-2 flex justify-between items-center cursor-pointer" :class="ui.activePeriodId === id ? 'bg-blue-50' : ''">
                            <span class="font-bold text-xs flex items-center gap-2 text-gray-800">
                                <span v-if="id === 'period_homeroom_base'">🏠</span>
                                <span v-else>🕒</span>
                                {{ period.name }}
                            </span>
                            <span v-if="ui.activePeriodId === id" class="text-[10px] font-bold text-blue-600 uppercase">Active</span>
                        </div>

                        <div v-if="ui.activePeriodId === id" class="px-3 pb-3 pt-2 border-t border-blue-100 flex flex-col gap-2 bg-blue-50/30">
                            
                            <div>
                                <label class="block text-[9px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Edit Period Name</label>
                                <input v-model="period.name" @change="savePeriod" class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 outline-none">
                            </div>
                            
                            <div>
                                <label class="block text-[9px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Assigned Room</label>
                                <select v-model="period.classroomId" @change="handleRoomChange" class="w-full px-2 py-1 border border-gray-300 rounded bg-white text-xs focus:border-blue-500 outline-none cursor-pointer">
                                    <option v-for="(room, rId) in rooms" :key="rId" :value="rId"> {{ room.name }}</option>
                                </select>
                            </div>

                            <div class="grid grid-cols-2 gap-2 mt-2">
                                <!-- NEW BUTTON: Only shows for Homeroom Base -->
                                <button v-if="id === 'period_homeroom_base'" @click="assignHomeroomStudents" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded text-[10px] transition shadow-sm col-span-2 mb-1">
                                    Populate Homeroom Roster
                                </button>
                                
                                <button @click="clearActiveRoster" class="bg-white hover:bg-red-50 border border-red-200 text-red-600 font-bold py-1.5 rounded text-[10px] transition shadow-sm" :class="id === 'period_homeroom_base' ? 'col-span-2' : ''">
                                    Clear Roster
                                </button>
                                
                                <button v-if="id !== 'period_homeroom_base'" @click="deletePeriod(id)" class="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold py-1.5 rounded text-[10px] transition shadow-sm">
                                    Delete Class
                                </button>
                            </div>
                        </div>

                    </div>

                </div>
            </div>

        </div>
    `,
    data() {
        return {
            periods: DataStore.getPeriods(),
            rooms: DataStore.getRooms(),
            ui: DataStore.state.ui,
            form: { name: '', classroomId: '' }
        };
    },
    methods: {
        createPeriod() {
            DataStore.addPeriod(this.form);
            this.form = { name: '', classroomId: '' };
        },
        savePeriod() { 
            DataStore.persist(); 
        },
        handleRoomChange() {
            DataStore.persist();
            window.dispatchEvent(new CustomEvent('period-room-changed'));
        },
        deletePeriod(id) {
            if (confirm("Delete this class period completely?")) {
                DataStore.deletePeriod(id);
            }
        },
        clearActiveRoster() {
            if (!this.ui.activePeriodId || !this.periods[this.ui.activePeriodId]) return;
            if (confirm(`Clear all assigned students from ${this.periods[this.ui.activePeriodId].name}?`)) {
                DataStore.clearPeriodRoster(this.ui.activePeriodId);
            }
        },
        // --- NEW METHOD ---
        assignHomeroomStudents() {
            const allHomeroomStudents = Object.values(DataStore.state.students).filter(s => s.isHomeroom);
            
            if (allHomeroomStudents.length === 0) {
                alert("No students are flagged as Homeroom Base. Edit students or update your CSV.");
                return;
            }

            const hrPeriod = this.periods['period_homeroom_base'];
            if (hrPeriod) {
                let addedCount = 0;
                allHomeroomStudents.forEach(s => {
                    if (!hrPeriod.studentIds.includes(s.id)) {
                        hrPeriod.studentIds.push(s.id);
                        addedCount++;
                    }
                });
                DataStore.persist();
                alert(`Success! Added ${addedCount} homeroom students to the roster.`);
            }
        }
    }
};