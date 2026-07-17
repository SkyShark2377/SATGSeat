// src/components/RoomEditor.js
import { DataStore } from '../services/DataStore.js';

export const RoomEditor = {
    template: `
        <div class="w-full h-full bg-slate-200 overflow-hidden relative shadow-inner flex flex-col items-center justify-center">
            
            <div v-if="activeRoom" class="text-center flex flex-col items-center max-w-md">
                <div class="w-24 h-24 bg-white rounded-2xl shadow-md border-2 border-dashed border-blue-400 flex items-center justify-center text-4xl mb-4">
                    🛋️
                </div>
                <h2 class="text-2xl font-black text-slate-700 mb-2">Room Layout Editor</h2>
                <p class="text-slate-500 mb-6">
                    This workspace will become the dedicated Fabric.js canvas for <strong>{{ activeRoom.name }}</strong> during Phase 2.
                </p>
                <div class="bg-blue-100 text-blue-800 px-4 py-3 rounded-lg border border-blue-200 text-sm font-semibold shadow-sm">
                    Changes made here will be automatically applied to every class period assigned to this room!
                </div>
            </div>

            <div v-else class="text-slate-400 flex flex-col items-center">
                <span class="text-4xl mb-2">🏠</span>
                <p class="font-bold uppercase tracking-wider">Select a room to edit its layout</p>
            </div>

        </div>
    `,
    data() {
        return {
            rooms: DataStore.getRooms(),
            ui: DataStore.state.ui
        };
    },
    computed: {
        activeRoom() {
            return this.ui.activeRoomId ? this.rooms[this.ui.activeRoomId] : null;
        }
    }
};