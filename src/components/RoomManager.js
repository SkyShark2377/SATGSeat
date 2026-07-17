// src/components/RoomManager.js
import { DataStore } from '../services/DataStore.js';

export const RoomManager = {
    template: `
    <div class="max-w-4xl mx-auto">
        <h1 class="text-xl font-bold mb-6 border-b border-gray-300 pb-2">PHYSICAL ROOM REGISTRY</h1>
        
        <form @submit.prevent="saveRoom" class="bg-white p-6 rounded border border-gray-300 shadow-sm flex flex-col gap-4 mb-8">
            <input v-model="form.name" placeholder="Room Name" required class="w-full px-4 py-2 border border-gray-400 rounded">
            <input v-model="form.teacher" placeholder="Teacher Name" class="w-full px-4 py-2 border border-gray-400 rounded">
            <div class="grid grid-cols-2 gap-4">
                <input type="number" v-model.number="form.width" placeholder="Width (ft)" class="px-4 py-2 border border-gray-400 rounded">
                <input type="number" v-model.number="form.length" placeholder="Length (ft)" class="px-4 py-2 border border-gray-400 rounded">
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white font-bold py-3 rounded shadow">
                {{ editingId ? 'Update' : 'Add' }}
            </button>
        </form>

        <div class="space-y-3">
            <div v-for="(r, id) in rooms" :key="id" class="bg-white p-4 border border-gray-300 rounded shadow-sm flex justify-between items-center">
                <div>
                    <div class="font-bold text-lg">{{ r.name }}</div>
                    <div class="text-sm text-gray-600">{{ r.teacher }}</div>
                </div>
                <button @click="editRoom(id)" class="text-blue-600 underline font-bold">Edit</button>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            rooms: DataStore.getRooms(), // This gets the reactive object
            editingId: null,
            form: { name: '', teacher: '', isPrimary: false, width: 30, length: 25 }
        };
    },
    methods: {
        editRoom(id) {
            this.editingId = id;
            const r = this.rooms[id];
            this.form = { name: r.name, teacher: r.teacher, isPrimary: r.isPrimaryHomeroom, width: r.widthFeet, length: r.lengthFeet };
        },
        saveRoom() {
            if (this.editingId) DataStore.updateRoom(this.editingId, this.form);
            else DataStore.addRoom(this.form);
            this.cancelEdit();
        },
        cancelEdit() {
            this.editingId = null;
            this.form = { name: '', teacher: '', isPrimary: false, width: 30, length: 25 };
        }
    }
};