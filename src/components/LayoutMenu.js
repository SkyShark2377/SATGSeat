// src/components/LayoutMenu.js
import { DataStore } from '../services/DataStore.js';
import { CanvasEngine } from '../services/CanvasEngine.js';

export const LayoutMenu = {
    template: `
        <div class="flex flex-col h-full text-white w-80 bg-[#1e293b] shadow-xl shrink-0 border-l border-slate-800">
            
            <div class="p-4 border-b border-slate-700 shrink-0 bg-slate-900/50">
                <h2 class="font-bold text-lg mb-1 flex items-center gap-2">
                    <span class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow">»</span>
                    Layout Menu
                </h2>
                <p class="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Spawn Furniture & Assets</p>
            </div>

            <div class="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                
                <!-- COMPACTED GLOBAL DESK SIZE -->
                <div>
                    <h3 class="text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-1.5">Global Desk Size (inches)</h3>
                    <div class="flex gap-2 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                        <div class="flex-1 flex items-center gap-2">
                            <label class="text-[10px] text-slate-400 font-bold">W:</label>
                            <input type="number" v-model.number="settings.globalDeskWidth" @change="saveSettings" class="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500 text-white text-center transition">
                        </div>
                        <div class="flex-1 flex items-center gap-2">
                            <label class="text-[10px] text-slate-400 font-bold">D:</label>
                            <input type="number" v-model.number="settings.globalDeskLength" @change="saveSettings" class="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-xs outline-none focus:border-blue-500 text-white text-center transition">
                        </div>
                    </div>
                </div>

                <!-- COMPACTED DESKS & PODS -->
                <div>
                    <h3 class="text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-1.5">Add Desks & Pods</h3>
                    <div class="flex flex-col gap-1.5">
                        <button @click="spawnRow(1)" class="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded py-1.5 px-3 flex justify-between items-center transition shadow-sm">
                            <span class="text-xs font-semibold">Single Desk Slot</span>
                            <span class="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-300 font-bold">+1</span> 
                        </button>
                        
                        <div class="bg-slate-800/50 border border-slate-700/50 rounded p-1.5 flex items-center gap-2">
                            <span class="text-xs font-semibold text-slate-200 flex-1 pl-1">Row Layout</span>
                            <input type="number" v-model.number="uiRowCount" min="2" max="12" class="w-12 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center outline-none focus:border-blue-500 text-white text-xs">
                            <button @click="spawnRow(uiRowCount)" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded transition shadow-sm text-xs">Add</button>
                        </div>

                        <div class="bg-slate-800/50 border border-slate-700/50 rounded p-1.5 flex items-center gap-2">
                            <span class="text-xs font-semibold text-slate-200 flex-1 pl-1">Face-to-Face Pod</span>
                            <input type="number" v-model.number="uiPodLength" min="1" max="8" class="w-12 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center outline-none focus:border-blue-500 text-white text-xs">
                            <button @click="spawnPod(uiPodLength)" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded transition shadow-sm text-xs">Add</button>
                        </div>
                    </div>
                </div>

                <!-- RENAMED TO FURNITURE -->
                <div>
                    <h3 class="text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-1.5">Furniture</h3>
                    <div class="flex flex-col gap-1.5 text-xs">
                        
                        <button @click="spawnAsset('teacher_desk')" class="w-full text-left px-3 py-1.5 border border-slate-600 rounded bg-slate-700 hover:bg-slate-600 font-semibold transition">🖥️ Teacher Desk</button>
                        <button @click="spawnAsset('shelf')" class="w-full text-left px-3 py-1.5 border border-amber-600 rounded bg-amber-800 hover:bg-amber-700 font-semibold transition">🗄️ Open Shelf</button>
                        <button @click="spawnAsset('cabinet')" class="w-full text-left px-3 py-1.5 border border-slate-500 rounded bg-slate-600 hover:bg-slate-500 font-semibold transition">🚪 Tall Cabinet</button>
                        <button @click="spawnAsset('locker')" class="w-full text-left px-3 py-1.5 border border-slate-500 rounded bg-slate-600 hover:bg-slate-500 font-semibold transition">🔐 Lockers</button>
                        <button @click="spawnAsset('bookshelf')" class="w-full text-left px-3 py-1.5 border border-amber-700 rounded bg-amber-900 hover:bg-amber-800 font-semibold transition">📚 Bookshelf</button>
                        
                        <div class="text-[9px] text-slate-400 font-bold tracking-wider mt-2 uppercase">Flooring & Rugs</div>
                        <button @click="spawnAsset('rug')" class="w-full text-left px-3 py-1.5 border border-sky-700 rounded bg-sky-900 hover:bg-sky-800 font-semibold transition">🟦 Rect Rug / Zone</button>
                        <button @click="spawnAsset('rug_circle')" class="w-full text-left px-3 py-1.5 border border-sky-700 rounded bg-sky-900 hover:bg-sky-800 font-semibold transition">🔵 Round Rug</button>
                        <button @click="spawnAsset('rug_half')" class="w-full text-left px-3 py-1.5 border border-sky-700 rounded bg-sky-900 hover:bg-sky-800 font-semibold transition">🌗 Half-Circle Rug</button>

                        <div class="text-[9px] text-slate-400 font-bold tracking-wider mt-2 uppercase">Wall Elements</div>
                        <button @click="spawnAsset('smartboard')" class="w-full text-left px-3 py-1.5 border border-slate-600 rounded bg-slate-800 hover:bg-slate-700 font-semibold transition">📺 Smartboard</button>
                        <button @click="spawnAsset('door')" class="w-full text-left px-3 py-1.5 border border-red-800 rounded bg-red-950 hover:bg-red-900 font-semibold transition">🚪 Doorway</button>
                        <button @click="spawnAsset('window')" class="w-full text-left px-3 py-1.5 border border-sky-800 rounded bg-sky-950 hover:bg-sky-900 font-semibold transition">🪟 Window</button>
						<button @click="spawnAsset('misc')" class="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 transition border-b border-gray-100">
							📦 Misc. Object
						</button>
                    </div>
                </div>

            </div>
        </div>
    `,
    data() {
        return {
            settings: DataStore.state.settings,
            uiRowCount: 4,
            uiPodLength: 3
        };
    },
    methods: {
        saveSettings() { DataStore.persist(); },
        spawnRow(count) { CanvasEngine.spawnRow(count, this.settings.globalDeskWidth, this.settings.globalDeskLength); },
        spawnPod(length) { CanvasEngine.spawnPod(length, this.settings.globalDeskWidth, this.settings.globalDeskLength); },
        spawnAsset(type) { CanvasEngine.spawnAsset(type); }
    }
};