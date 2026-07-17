// src/components/PeriodManager.js
import { DataStore } from '../services/DataStore.js';

export const PeriodManager = {
    template: `
        <div class="max-w-4xl mx-auto">
            <h1 class="text-xl font-bold mb-6 border-b border-gray-300 pb-2 uppercase">Create Class Period</h1>
            <form @submit.prevent="addPeriod" class="bg-white p-6 rounded border border-gray-300 shadow-sm flex flex-col gap-4 mb-8">
                <input v-model="form.name" placeholder="Period Name (e.g., 1st Hour)" required class="w-full px-4 py-2 border border-gray-400 rounded">
                <select v-model="form.classroomId" required class="w-full px-4 py-2 border border-gray-400 rounded bg-white">
                    <option value="" disabled>Select Assigned Room</option>
                    <option v-for="(r, id) in rooms" :key="id" :value="id">{{ r.name }}</option>
                </select>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition shadow">Initialize Period</button>
            </form>

            <div>
                <h2 class="text-sm font-bold uppercase text-gray-500 tracking-wider mb-2">Registered Class Hours</h2>
                <div class="space-y-3">
                    <div v-for="(p, id) in periods" :key="id" class="bg-white border border-gray-300 p-4 rounded shadow-sm flex justify-between items-center">
                        <div>
                            <div class="font-bold text-lg text-gray-800">{{ p.name }}</div>
                            <div class="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-block mt-1">{{ rooms[p.classroomId]?.name }}</div>
                        </div>
                        <div class="flex gap-2 bg-gray-100 p-1 rounded">
                            <button @click="setMode(id, 'custom')" :class="p.layoutMode === 'custom' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'" class="px-4 py-1.5 rounded font-bold transition">Custom Layout</button>
                            <button @click="setMode(id, 'mirrored')" :class="p.layoutMode === 'mirrored' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'" class="px-4 py-1.5 rounded font-bold transition">Mirror Room</button>
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
            form: { name: '', classroomId: '' }
        };
    },
    methods: {
        addPeriod() {
            DataStore.addPeriod(this.form);
            this.form = { name: '', classroomId: '' };
        },
        setMode(id, mode) {
            DataStore.setPeriodLayoutMode(id, mode);
        }
    }
};