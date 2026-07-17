// src/components/StudentRegistry.js
import { DataStore } from '../services/DataStore.js';

export const StudentRegistry = {
    template: `
        <div class="bg-white border border-gray-300 rounded shadow-sm flex flex-col h-full w-full overflow-hidden">
            <div class="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
                <h2 class="text-lg font-black text-gray-800 uppercase tracking-wide">Student Directory</h2>
                <div class="flex items-center gap-3">
                    <button @click="$refs.csvInput.click()" class="text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow transition">📥 Import Roster</button>
                    <input type="file" ref="csvInput" @change="handleRosterUpload" accept=".csv" class="hidden">
                    
                    <button @click="deleteAll" class="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow transition">🗑️ Clear Roster</button>
                    
                    <span class="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{{ Object.keys(students).length }} Registered</span>
                </div>
            </div>
            
            <div class="overflow-y-auto custom-scrollbar flex-1">
                <table class="w-full text-left border-collapse text-sm">
                    <thead class="bg-gray-100 border-b border-gray-300 text-gray-600 text-xs uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                            <th class="p-4 font-bold">Student Name</th>
                            <th class="p-4 font-bold">Gender</th>
                            <th class="p-4 font-bold text-center">Preferred Seating</th>
                            <th class="p-4 font-bold">Enforced Restrictions</th>
                            <th class="p-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="Object.keys(students).length === 0">
                            <td colspan="5" class="p-8 text-center text-gray-500 italic">No students registered yet. Use the left panel to add them.</td>
                        </tr>
                        <tr v-for="(s, id) in students" :key="id" :class="ui.editingStudentId === id ? 'bg-blue-50' : 'hover:bg-gray-50'" class="border-b border-gray-100 transition">
                            <td class="p-4 font-bold text-gray-800 flex items-center gap-1.5">
                                {{ s.name }}
                                <span v-if="s.isHomeroom" title="Homeroom Base" class="text-lg leading-none mt-0.5">🏠</span>
                            </td>
                            <td class="p-4 text-gray-600">{{ s.gender }}</td>
                            <td class="p-4 text-center">
                                <span v-if="s.requiresPreferredSeating" class="bg-yellow-100 border border-yellow-300 text-yellow-800 text-[10px] font-black px-2 py-1 rounded shadow-sm tracking-wider uppercase">FRONT</span>
                            </td>
                            <td class="p-4">
                                <div class="flex flex-wrap gap-1.5">
                                    <span v-for="rId in s.restrictedStudentIds" :key="rId" class="bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                                        ⚠️ {{ students[rId]?.name }}
                                        <button @click="removeRestriction(s.id, rId)" class="hover:text-red-900 ml-1 font-bold bg-red-200 rounded-full w-4 h-4 flex items-center justify-center leading-none">&times;</button>
                                    </span>
                                </div>
                            </td>
                            <td class="p-4 text-right whitespace-nowrap">
                                <button @click="editStudent(id)" class="text-blue-600 hover:text-blue-800 font-bold text-xs mr-4 transition">Edit</button>
                                <button @click="deleteStudent(id)" class="text-red-500 hover:text-red-700 font-bold text-xs transition">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
    data() {
        return {
            students: DataStore.getStudents(),
            ui: DataStore.state.ui
        };
    },
    methods: {
        handleRosterUpload(event) {
            const file = event.target.files ? event.target.files[0] : null;
            if (file) {
                DataStore.importRoster(file);
                event.target.value = ''; 
            }
        },
        editStudent(id) {
            DataStore.setEditingStudent(id);
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