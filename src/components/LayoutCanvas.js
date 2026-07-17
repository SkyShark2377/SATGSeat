// src/components/LayoutCanvas.js
import { CanvasEngine } from '../services/CanvasEngine.js';
import { DataStore } from '../services/DataStore.js';

export const LayoutCanvas = {
    template: `
        <div id="layout-workspace-container" 
             @dragover.prevent 
             @drop="handleDrop"
             class="w-full h-full bg-slate-200 overflow-hidden relative shadow-inner">
            <canvas id="classroom-canvas"></canvas>
        </div>
    `,
    mounted() {
        CanvasEngine.init('classroom-canvas', 'layout-workspace-container');
        
        const settings = DataStore.state.settings;
        CanvasEngine.renderRoom(settings.roomWidthFeet, settings.roomLengthFeet);
        
        // Load the currently active period immediately
        const activePeriod = DataStore.state.ui.activePeriodId;
        CanvasEngine.loadLayout(activePeriod); 
    },
    methods: {
        handleDrop(event) {
            const studentId = event.dataTransfer.getData('text/plain');
            if (!studentId) return;
            const studentData = DataStore.state.students[studentId];
            if (!studentData) return;

            // Get exact drop coordinates on the Fabric.js canvas
            const pointer = CanvasEngine.canvas.getPointer(event);
            let closestNode = null; 
            let minDistance = 999999; 

            // Find all furniture that has seats
            const furniture = CanvasEngine.canvas.getObjects().filter(o => o.isFurniture && o.seats);
            
            // Loop through all seats to find the one closest to the drop point
            furniture.forEach(group => {
                group.seats.forEach(seat => {
                    const globalCenter = CanvasEngine.getGlobalSeatCenter(group, seat);
                    const distance = Math.sqrt(Math.pow(globalCenter.x - pointer.x, 2) + Math.pow(globalCenter.y - pointer.y, 2));
                    if (distance < minDistance) { 
                        minDistance = distance; 
                        closestNode = { group, seat }; 
                    }
                });
            });

            // If dropped within 40 pixels of a desk center, snap them in!
            if (closestNode && minDistance <= 40) { 
                const { group, seat } = closestNode;
                if (seat.isLocked) { 
                    alert("This seat is locked."); 
                    return; 
                }
                CanvasEngine.assignStudentToSeatObject(group, seat, studentId, studentData, false);
            }
        }
    }
};