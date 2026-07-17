// src/components/PeriodAssignment.js
import { DataStore } from '../services/DataStore.js';
import { CanvasEngine } from '../services/CanvasEngine.js';

export const PeriodAssignment = {
    template: `
        <div class="bg-white border border-gray-300 rounded shadow-sm flex flex-col h-full w-full overflow-hidden text-sm">
            
            <div class="bg-gray-50 border-b border-gray-200 p-4 shrink-0">
                <h2 class="text-sm font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
                    Roster Setup Dashboard: 
                    <span class="text-blue-600">{{ activePeriod ? activePeriod.name : 'None Selected' }}</span>
                </h2>
            </div>
            
            <div class="flex-1 flex overflow-hidden">
                
                <div class="w-1/3 flex flex-col border-r border-gray-200 bg-gray-50/30">
                    <div class="p-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center shrink-0">
                        <span class="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Available Students</span>
                        <span class="bg-gray-300 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{{ availableStudents.length }}</span>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1.5">
                        <div v-for="student in availableStudents" :key="student.id"
                             @click="assign(student.id)"
                             class="bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm rounded px-3 py-2 flex justify-between items-center cursor-pointer group transition">
                            
                            <span class="font-semibold text-gray-700 flex items-center gap-1.5 text-xs">
                                {{ student.name }}
                                <span v-if="student.isHomeroom" title="Homeroom Base" class="text-[10px]">🏠</span>
                            </span>
                            <span class="hidden group-hover:block text-blue-600 font-bold text-xs">Add &rarr;</span>
                        </div>
                        <div v-if="availableStudents.length === 0" class="text-center text-gray-400 text-xs italic mt-4">
                            All students assigned.
                        </div>
                    </div>
                </div>

                <div class="w-1/3 flex flex-col border-r border-gray-300 bg-white">
                    <div class="p-3 bg-[#1e3a8a] border-b border-[#1e3a8a] flex justify-between items-center shrink-0 text-white">
                        <span class="text-[10px] font-bold uppercase tracking-wider">Assigned Roster</span>
                        <span class="bg-blue-600 text-white border border-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{{ assignedStudents.length }}</span>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1.5">
                        <div v-for="student in assignedStudents" :key="student.id"
                             @click="unassign(student.id)"
                             class="bg-blue-50/30 border border-blue-100 hover:border-red-300 hover:bg-red-50 hover:shadow-sm rounded px-3 py-2 flex justify-between items-center cursor-pointer group transition">
                            
                            <span class="font-semibold text-blue-900 flex items-center gap-1.5 text-xs">
                                {{ student.name }}
                                <span v-if="student.isHomeroom" title="Homeroom Base" class="text-[10px]">🏠</span>
                            </span>
                            <span class="hidden group-hover:block text-red-600 font-bold text-xs">&larr; Remove</span>
                        </div>
                        <div v-if="assignedStudents.length === 0" class="text-center text-gray-400 text-xs italic mt-4">
                            No students assigned.
                        </div>
                    </div>
                </div>

                <div class="w-1/3 flex flex-col bg-slate-200 relative shadow-inner">
                    <div class="absolute top-0 left-0 w-full bg-slate-800/80 backdrop-blur text-white p-2 flex justify-between items-center z-10 border-b border-slate-700">
                        <span class="text-[10px] font-bold uppercase tracking-wider">Assigned Room Map</span>
                        <span class="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                            <span v-if="isActiveRoomHomeroom">🏠</span> {{ activeRoomName }}
                        </span>
                    </div>
                    
                    <div id="minimap-container" class="w-full h-full flex items-center justify-center pt-8">
                        <canvas id="minimap-canvas"></canvas>
                    </div>
                </div>

            </div>
        </div>
    `,
    data() {
        return {
            students: DataStore.getStudents(),
            periods: DataStore.getPeriods(),
            rooms: DataStore.getRooms(),
            ui: DataStore.state.ui,
            resizeObserver: null
        };
    },
    computed: {
        activePeriod() {
            return this.ui.activePeriodId ? this.periods[this.ui.activePeriodId] : null;
        },
        activeRoomName() {
            if (!this.activePeriod || !this.activePeriod.classroomId) return 'Unassigned';
            const room = this.rooms[this.activePeriod.classroomId];
            // Scrub any dirty emojis globally
            return room ? room.name.replace(/🏠/g, '').trim() : 'Unknown Room';
        },
        isActiveRoomHomeroom() {
            if (!this.activePeriod || !this.activePeriod.classroomId) return false;
            const room = this.rooms[this.activePeriod.classroomId];
            return room ? !!room.isPrimaryHomeroom : false;
        },
        availableStudents() {
            if (!this.activePeriod) return [];
            const assignedIds = this.activePeriod.studentIds || [];
            return Object.values(this.students)
                         .filter(s => !assignedIds.includes(s.id))
                         .sort((a, b) => a.name.localeCompare(b.name));
        },
        assignedStudents() {
            if (!this.activePeriod) return [];
            const assignedIds = this.activePeriod.studentIds || [];
            return Object.values(this.students)
                         .filter(s => assignedIds.includes(s.id))
                         .sort((a, b) => a.name.localeCompare(b.name));
        }
    },
    mounted() {
        this.updateMinimap();
        window.addEventListener('period-room-changed', this.updateMinimap);

        const container = document.getElementById('minimap-container');
        if (container) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.activePeriod && this.activePeriod.classroomId) {
                    const room = this.rooms[this.activePeriod.classroomId];
                    if (room) CanvasEngine.scaleMinimap('minimap-container', room.widthFeet * 12, room.lengthFeet * 12);
                }
            });
            this.resizeObserver.observe(container);
        }
    },
    unmounted() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        window.removeEventListener('period-room-changed', this.updateMinimap);
    },
    watch: {
        'ui.activePeriodId'() { this.updateMinimap(); },
        'assignedStudents'() { this.updateMinimap(); } 
    },
    methods: {
        assign(studentId) {
            if (this.ui.activePeriodId) DataStore.assignStudentToPeriod(this.ui.activePeriodId, studentId);
        },
        unassign(studentId) {
            if (this.ui.activePeriodId) DataStore.removeStudentFromPeriod(this.ui.activePeriodId, studentId);
        },
        updateMinimap() {
            this.$nextTick(() => {
                if (this.activePeriod && this.activePeriod.classroomId) {
                    CanvasEngine.renderMinimap('minimap-canvas', 'minimap-container', this.activePeriod.classroomId, this.activePeriod.id);
                }
            });
        }
    }
};