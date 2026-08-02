// src/components/StudentRegistry.js
import { DataStore } from '../services/DataStore.js';

export const StudentRegistry = {
    template: `
        <div class="bg-white border border-gray-300 rounded shadow-sm flex flex-col h-full w-full overflow-hidden relative">
            <div class="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
                
                <div class="flex items-center gap-3">
                    <h2 class="text-lg font-black text-gray-800 uppercase tracking-wide">Student Directory</h2>
                    <span class="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{{ Object.keys(students).length }} Registered</span>
                </div>

                <div class="flex items-center gap-3">
                    
                    <select v-model="settings.rosterGradeFilter" @change="saveSettings" class="text-xs font-bold border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white text-gray-700 shadow-sm cursor-pointer">
                        <option value="all">Filter: All Grades</option>
                        <option v-for="g in uniqueGrades" :key="g" :value="g">Grade {{ g }}</option>
                    </select>

                    <select v-model="settings.rosterSortMode" @change="saveSettings" class="text-xs font-bold border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white text-gray-700 shadow-sm cursor-pointer">
                        <option value="alpha">Sort: Last Name (A-Z)</option>
                        <option value="homeroom">Sort: Homeroom First</option>
                    </select>

                    <div class="relative">
                        <button @click="$refs.csvInput.click()" class="text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow transition w-full">📥 Import Roster</button>
                        <div class="absolute top-[calc(100%+4px)] right-0 text-[9px] text-gray-500 whitespace-nowrap leading-none tracking-tight">Google Sheets: File > Download > CSV</div>
                        <input type="file" ref="csvInput" @change="handleRosterUpload" accept=".csv" class="hidden">
                    </div>
                    
                    <button @click="deleteAll" class="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow transition">🗑️ Clear Roster</button>
                    
                    <button @click="showMockModal = true" class="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded shadow transition">🧪 Mock Data</button>
                </div>
            </div>
            
            <div class="overflow-y-auto custom-scrollbar flex-1">
                <table class="w-full text-left border-collapse text-sm">
                    <thead class="bg-gray-100 border-b border-gray-300 text-gray-600 text-xs uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                            <th class="p-4 font-bold">Student Name</th>
                            <th class="p-4 font-bold">Gender</th>
                            <th class="p-4 font-bold">Grade</th>
                            <th class="p-4 font-bold text-center">Preferred Seating</th>
                            <th class="p-4 font-bold">Enforced Restrictions</th>
                            <th class="p-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="Object.keys(students).length === 0">
                            <td colspan="6" class="p-8 text-center text-gray-500 italic">No students registered yet. Use the left panel to add them.</td>
                        </tr>
                        
                        <tr v-for="s in sortedStudents" :key="s.id" 
                            @click="editStudent(s.id)"
                            :class="ui.editingStudentId === s.id ? 'bg-blue-100 shadow-inner' : 'hover:bg-gray-50'" 
                            class="border-b border-gray-100 transition cursor-pointer group">
                            
                            <td class="p-4 font-bold text-gray-800 flex items-center gap-1.5">
                                {{ s.name }}
                                <span v-if="s.isHomeroom" title="Homeroom Base" class="text-lg leading-none mt-0.5">🏠</span>
                                <span v-if="s.notes" :title="s.notes" class="text-sm cursor-help opacity-70 hover:opacity-100 transition">📝</span>
                            </td>
                            <td class="p-4 text-gray-600">{{ s.gender }}</td>
                            <td class="p-4 text-gray-600 font-semibold">{{ s.grade || '-' }}</td>
                            <td class="p-4 text-center">
                                <span v-if="s.requiresPreferredSeating" class="bg-yellow-100 border border-yellow-300 text-yellow-800 text-[10px] font-black px-2 py-1 rounded shadow-sm tracking-wider uppercase">FRONT</span>
                            </td>
                            <td class="p-4">
                                <div class="flex flex-wrap gap-1.5">
                                    <span v-for="rId in s.restrictedStudentIds" :key="rId" class="bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                                        ⚠️ {{ students[rId]?.name }}
                                        <button @click.stop="removeRestriction(s.id, rId)" class="hover:text-red-900 ml-1 font-bold bg-red-200 rounded-full w-4 h-4 flex items-center justify-center leading-none">&times;</button>
                                    </span>
                                </div>
                            </td>
                            <td class="p-4 text-right whitespace-nowrap">
                                <button @click.stop="deleteStudent(s.id)" title="Delete Student" class="text-red-400 hover:text-red-600 transition text-base leading-none grayscale opacity-60 hover:grayscale-0 hover:opacity-100">
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-if="showMockModal" class="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
                    <div class="bg-purple-900 text-white px-5 py-3 flex justify-between items-center">
                        <h2 class="text-sm font-bold flex items-center gap-2">🧪 Generate Mock Roster</h2>
                    </div>
                    <div class="p-5 flex flex-col gap-4 text-sm bg-slate-50 text-slate-700">
                        <div>
                            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Total Students</label>
                            <input type="number" v-model.number="mockConfig.total" class="w-full px-2 py-1.5 border border-slate-300 rounded outline-none focus:border-purple-500">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">% Female (Remainder Male)</label>
                            <input type="number" v-model.number="mockConfig.percentFemale" min="0" max="100" class="w-full px-2 py-1.5 border border-slate-300 rounded outline-none focus:border-purple-500">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">% Preferred Seating Chance</label>
                            <input type="number" v-model.number="mockConfig.percentPreferred" min="0" max="100" class="w-full px-2 py-1.5 border border-slate-300 rounded outline-none focus:border-purple-500">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Exact # of Homeroom Students</label>
                            <input type="number" v-model.number="mockConfig.homeroomCount" :max="mockConfig.total" class="w-full px-2 py-1.5 border border-slate-300 rounded outline-none focus:border-purple-500">
                        </div>
                    </div>
                    <div class="bg-white px-5 py-3 flex justify-end gap-2 border-t border-slate-200">
                        <button @click="showMockModal = false" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-1.5 px-4 rounded transition text-xs shadow-sm cursor-pointer">Cancel</button>
                        <button @click="triggerMockGeneration" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 px-6 rounded transition text-xs shadow-sm cursor-pointer">Generate</button>
                    </div>
                </div>
            </div>

        </div>
    `,
    data() {
        return {
            students: DataStore.state.students,
            settings: DataStore.state.settings,
            ui: DataStore.state.ui,
            showMockModal: false,
            mockConfig: {
                total: 200,
                percentFemale: 50,
                percentPreferred: 15,
                homeroomCount: 30
            }
        };
    },
    computed: {
        uniqueGrades() {
            return [...new Set(Object.values(this.students).map(s => s.grade).filter(Boolean))].sort();
        },
        sortedStudents() {
            return DataStore.getSortedStudents(null, this.settings.rosterSortMode, this.settings.rosterGradeFilter);
        }
    },
    methods: {
        saveSettings() {
            DataStore.persist();
        },
        triggerMockGeneration() {
            DataStore.generateMockRoster(this.mockConfig);
            this.showMockModal = false;
        },
        handleRosterUpload(event) {
            const file = event.target.files ? event.target.files[0] : null;
            if (file) {
                DataStore.importRoster(file);
                event.target.value = ''; 
            }
        },
        editStudent(id) {
            if (this.ui.editingStudentId === id) {
                DataStore.setEditingStudent(null);
            } else {
                DataStore.setEditingStudent(id);
            }
        },
        deleteStudent(id) {
            if(confirm('Remove student completely?')) {
                DataStore.deleteStudent(id);
                if (this.ui.editingStudentId === id) DataStore.setEditingStudent(null);
            }
        },
        deleteAll() {
            DataStore.deleteAllStudents();
        },
        removeRestriction(s1, s2) {
            DataStore.removeRestriction(s1, s2);
        }
    }
};