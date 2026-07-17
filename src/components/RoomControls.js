// src/components/RoomControls.js
import { DataStore } from '../services/DataStore.js';
import { CanvasEngine } from '../services/CanvasEngine.js';

export const RoomControls = {
    template: `
        <div class="flex flex-col gap-6 w-full text-xs h-full">
            
            <div class="bg-white shrink-0">
                <h2 class="font-bold text-xs text-gray-800 mb-2 uppercase tracking-wider border-b border-gray-200 pb-1">
                    Create Physical Room
                </h2>
                <form @submit.prevent="createRoom" class="flex flex-col gap-2.5">
                    <div>
                        <label class="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Room Name / Number</label>
                        <input v-model="form.name" placeholder="e.g., Room 204" required class="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none text-xs">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Width (ft)</label>
                            <input type="number" v-model.number="form.widthFeet" required class="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none text-xs">
                        </div>
                        <div>
                            <label class="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Depth (ft)</label>
                            <input type="number" v-model.number="form.lengthFeet" required class="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none text-xs">
                        </div>
                    </div>

                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded shadow-sm transition text-xs mt-1">
                        Register Room
                    </button>
                </form>
            </div>

            <div class="flex-1 flex flex-col min-h-0">
                <h2 class="font-bold text-xs text-gray-800 mb-2 uppercase tracking-wider border-b border-gray-200 pb-1">
                    Registered Rooms
                </h2>
                <div class="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1 pb-4">
                    
                    <div v-for="(room, id) in rooms" :key="id" 
                         class="border rounded transition flex flex-col bg-white overflow-hidden shadow-sm"
                         :class="ui.activeRoomId === id ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200 hover:bg-gray-50'">
                        
                        <div @click="ui.activeRoomId = id" class="px-3 py-2 flex justify-between items-center cursor-pointer" :class="ui.activeRoomId === id ? 'bg-blue-50' : ''">
                            <span class="font-bold text-xs flex items-center gap-2 text-gray-800">
                                <span v-if="room.isPrimaryHomeroom">🏠</span> {{ room.name }}
                            </span>
                            <span v-if="ui.activeRoomId === id" class="text-[10px] font-bold text-blue-600 uppercase">Active</span>
                        </div>

                        <div v-if="ui.activeRoomId === id" class="px-3 pb-3 pt-2 border-t border-blue-100 flex flex-col gap-2 bg-blue-50/30">
                            <div>
                                <label class="block text-[9px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Edit Name</label>
                                <input v-model="room.name" @change="saveRoom(room)" class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 outline-none">
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-[9px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Width (ft)</label>
                                    <input type="number" v-model.number="room.widthFeet" @change="updateDimensions" class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 outline-none">
                                </div>
                                <div>
                                    <label class="block text-[9px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Depth (ft)</label>
                                    <input type="number" v-model.number="room.lengthFeet" @change="updateDimensions" class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 outline-none">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-2 mt-2">
                                <button @click="duplicateRoom(id)" class="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold py-1 rounded text-[10px] transition shadow-sm">Clone Sandbox</button>
                                <button @click="deleteRoom(id)" class="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold py-1 rounded text-[10px] transition shadow-sm">Delete Room</button>
                            </div>
                        </div>

                    </div>

                </div>
            </div>

        </div>
    `,
    data() {
        return {
            rooms: DataStore.getRooms(),
            ui: DataStore.state.ui,
            form: { name: '', widthFeet: 30, lengthFeet: 25 }
        };
    },
    methods: {
        cleanName(name) {
            // Strip out both variants of the emoji before it hits the database
            return name ? name.replace(/[🏠匠]/g, '').trim() : '';
        },
        createRoom() {
            this.form.name = this.cleanName(this.form.name);
            DataStore.addRoom(this.form);
            this.form = { name: '', widthFeet: 30, lengthFeet: 25 };
        },
        saveRoom(room) {
            room.name = this.cleanName(room.name);
            DataStore.persist();
            // Force the canvas to redraw so the header updates immediately
            window.dispatchEvent(new CustomEvent('force-canvas-redraw'));
        },
        updateDimensions() {
            DataStore.persist();
            window.dispatchEvent(new CustomEvent('force-canvas-redraw'));
        },
        duplicateRoom(id) {
            const newId = DataStore.duplicateRoom(id);
            if (newId) CanvasEngine.duplicateBlueprint(id, newId);
        },
        deleteRoom(id) { DataStore.deleteRoom(id); }
    }
};