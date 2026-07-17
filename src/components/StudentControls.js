// src/components/StudentControls.js
import { DataStore } from '../services/DataStore.js';

export const StudentControls = {
    template: `
        <div class="flex flex-col gap-4 w-full">
            <div class="bg-white">
                <h2 class="font-bold text-xs text-gray-800 mb-2 uppercase tracking-wider border-b border-gray-200 pb-1">
                    {{ editingId ? 'Edit Student' : 'Add Student' }}
                </h2>
                <form @submit.prevent="saveStudent" class="flex flex-col gap-2.5">
                    <input v-model="form.name" placeholder="Full Name" required class="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none text-xs">
                    
                    <select v-model="form.gender" class="w-full px-2 py-1.5 border border-gray-300 rounded bg-white focus:border-blue-500 outline-none text-xs">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Unspecified">Unspecified</option>
                    </select>

                    <div class="flex flex-col gap-1.5 bg-gray-50 p-2 rounded border border-gray-100 mt-0.5">
                        <label class="flex items-center gap-2 cursor-pointer text-gray-700 text-[11px] font-bold">
                            <input type="checkbox" v-model="form.requiresPreferredSeating" class="w-3.5 h-3.5 text-blue-600 rounded"> 
                            <span>Preferred Seating (FRONT)</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer text-gray-700 text-[11px] font-bold">
                            <input type="checkbox" v-model="form.isHomeroom" class="w-3.5 h-3.5 text-blue-600 rounded"> 
                            <span>Homeroom Base 🏠</span>
                        </label>
                    </div>

                    <div class="flex gap-2 mt-1">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded shadow-sm transition text-xs">
                            {{ editingId ? 'Update' : 'Save' }}
                        </button>
                        <button v-if="editingId" @click="cancelEdit" type="button" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1.5 rounded shadow-sm transition text-xs">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>

            <div class="mt-2">
                <h2 class="font-bold text-xs text-gray-800 mb-1 uppercase tracking-wider border-b border-gray-200 pb-1">Restrictions</h2>
                <p class="text-[10px] text-gray-500 mb-2 leading-tight">Keep specific students separated on the layout.</p>
                
                <form @submit.prevent="addRestriction" class="flex flex-col gap-2">
                    <select v-model="restriction.student1" required class="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-xs">
                        <option value="" disabled>Student 1...</option>
                        <option v-for="(s, id) in students" :key="'r1'+id" :value="id">{{ s.name }}</option>
                    </select>
                    
                    <div class="text-center text-[10px] font-bold text-red-500 uppercase tracking-widest my-0.5">Must Not Sit Near</div>
                    
                    <select v-model="restriction.student2" required class="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-xs">
                        <option value="" disabled>Student 2...</option>
                        <option v-for="(s, id) in students" :key="'r2'+id" :value="id" :disabled="s.id === restriction.student1">{{ s.name }}</option>
                    </select>

                    <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded shadow-sm transition mt-1 text-xs">
                        Block Placement
                    </button>
                </form>
            </div>
        </div>
    `,
    data() {
        return {
            students: DataStore.getStudents(),
            form: { name: '', gender: 'Unspecified', requiresPreferredSeating: false, isHomeroom: false },
            restriction: { student1: '', student2: '' }
        };
    },
    computed: {
        editingId() { return DataStore.state.ui?.editingStudentId; },
        editingStudent() { return this.editingId ? this.students[this.editingId] : null; }
    },
    watch: {
        editingStudent: {
            immediate: true,
            handler(newVal) {
                if (newVal) {
                    this.form = { name: newVal.name, gender: newVal.gender, requiresPreferredSeating: newVal.requiresPreferredSeating, isHomeroom: newVal.isHomeroom };
                } else {
                    this.form = { name: '', gender: 'Unspecified', requiresPreferredSeating: false, isHomeroom: false };
                }
            }
        }
    },
    methods: {
        saveStudent() {
            if (this.editingId) DataStore.updateStudent(this.editingId, this.form);
            else DataStore.addStudent(this.form);
            this.cancelEdit();
        },
        cancelEdit() {
            DataStore.setEditingStudent(null);
            this.form = { name: '', gender: 'Unspecified', requiresPreferredSeating: false, isHomeroom: false };
        },
        addRestriction() {
            DataStore.addRestriction(this.restriction.student1, this.restriction.student2);
            this.restriction = { student1: '', student2: '' };
        }
    }
};