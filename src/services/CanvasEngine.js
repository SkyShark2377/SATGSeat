// src/services/CanvasEngine.js
import { DataStore } from './DataStore.js';

export const CanvasEngine = {
    canvas: null,
    minimapCanvas: null,
    isSnapEnabled: true,
    isGlobalDeskLocked: false,
    isTextFlipped: false,
    roomInchesW: 360,
    roomInchesH: 300,
    headerWidth: 0, 
    containerId: null,
    isDragging: false,
    lastPosX: 0,
    lastPosY: 0,
    STORAGE_KEY: 'ClassroomSeatingSuite_CanvasLayout_v2', 

    init(canvasId, containerId) {
        const canvasEl = document.getElementById(canvasId);
        if (!canvasEl) return;

        // --- NEW: GHOST CANVAS PREVENTION ---
        // If Vue destroys the tab and recreates the canvas element, we need to 
        // clear the old Fabric instance so it binds to the new HTML element.
        if (this.canvas && this.canvas.lowerCanvasEl !== canvasEl) {
            try { this.canvas.dispose(); } catch(e) {}
            this.canvas = null;
        }

        if (this.canvas) return;

        this.containerId = containerId;

        this.canvas = new fabric.Canvas(canvasId, {
            selection: true,
            preserveObjectStacking: true,
            backgroundColor: '#e2e8f0' 
        });

        fabric.Object.prototype.snapAngle = 5;
        fabric.Object.prototype.snapThreshold = 5;
        
        this.attachControlListeners();

        const container = document.getElementById(containerId);
        if (container) {
            const observer = new ResizeObserver(() => { this.recalculateDimensions(); });
            observer.observe(container);

            container.addEventListener('dragover', (e) => e.preventDefault());
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                const studentId = e.dataTransfer.getData('text/plain');
                if (!studentId) return;

                const pointer = this.canvas.getPointer(e);
                let clickedGroup = null; let clickedSeat = null; let minDistance = 999999;
                
                this.canvas.getObjects().forEach(obj => {
                    if (obj.isFurniture && obj.seats) {
                        obj.seats.forEach(seat => {
                            const globalCenter = this.getGlobalSeatCenter(obj, seat);
                            const dist = Math.sqrt(Math.pow(globalCenter.x - pointer.x, 2) + Math.pow(globalCenter.y - pointer.y, 2));
                            if (dist < minDistance) { minDistance = dist; clickedSeat = seat; clickedGroup = obj; }
                        });
                    }
                });

                if (clickedSeat && minDistance <= 40) {
                    const studentData = DataStore.state.students[studentId];
                    this.assignStudentToSeatObject(clickedGroup, clickedSeat, studentId, studentData, clickedSeat.isLocked);
                }
            });
        }
    },

    recalculateDimensions() {
        const container = document.getElementById(this.containerId);
        if (!container || !this.canvas) return;

        const rect = container.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 50) return;

        const totalH = this.roomInchesH + 40; 
        const maxW = Math.max(this.roomInchesW, (this.headerWidth || 0) + 40);

        const scale = Math.min(rect.width / maxW, rect.height / totalH) * 0.95;
        
        this.canvas.setDimensions({ width: rect.width, height: rect.height });
        this.canvas.setZoom(scale);

        const vpt = this.canvas.viewportTransform;
        vpt[4] = (rect.width - (this.roomInchesW * scale)) / 2; 
        vpt[5] = ((rect.height - (totalH * scale)) / 2) + (40 * scale);

        this.canvas.getObjects().forEach(obj => { if (obj.isFurniture) obj.setCoords(); });
        this.canvas.renderAll();
    },

    getContext() {
        const ui = DataStore.state.ui || {};
        const settings = DataStore.state.settings || {};
        
        const currentTab = ui.currentTab || 'layout';
        const activeRoomId = ui.activeRoomId || settings.activeRoomId;
        const activePeriodId = ui.activePeriodId || 'period_homeroom_base';

        if (currentTab === 'classrooms') {
            return { roomId: activeRoomId, periodId: null };
        } 
        else if (currentTab === 'seating' && activePeriodId) {
            const period = DataStore.state.periods[activePeriodId];
            return { roomId: period ? period.classroomId : null, periodId: period ? period.id : null };
        }
        return { roomId: null, periodId: null };
    },

    renderRoom(widthFeet, lengthFeet) {
        if (!this.canvas) return;
        this.roomInchesW = widthFeet * 12;
        this.roomInchesH = lengthFeet * 12;

        const objects = this.canvas.getObjects();
        objects.forEach(obj => { if (obj.isBackgroundElement) this.canvas.remove(obj); });

        const bgElements = [];

        bgElements.push(new fabric.Rect({
            left: 0, top: 0, width: this.roomInchesW, height: this.roomInchesH,
            fill: '#ffffff', stroke: '#475569', strokeWidth: 3,
            selectable: false, evented: false, hoverCursor: 'default', isBackgroundElement: true
        }));

        for (let i = 6; i < this.roomInchesW; i += 6) {
            bgElements.push(new fabric.Line([i, 1.5, i, this.roomInchesH - 1.5], { stroke: '#e2e8f0', strokeWidth: 1, selectable: false, evented: false, isBackgroundElement: true }));
        }
        for (let j = 6; j < this.roomInchesH; j += 6) {
            bgElements.push(new fabric.Line([1.5, j, this.roomInchesW - 1.5, j], { stroke: '#e2e8f0', strokeWidth: 1, selectable: false, evented: false, isBackgroundElement: true }));
        }

        const ctx = this.getContext();
        let roomName = "CLASSROOM";
        let isHomeroom = false;
        let periodName = "";
        let teacherName = ""; // NEW
        
        if (ctx.roomId && DataStore.state.classrooms[ctx.roomId]) {
            const r = DataStore.state.classrooms[ctx.roomId];
            roomName = r.name.trim().toUpperCase();
            teacherName = r.teacherName ? r.teacherName.trim().toUpperCase() : ""; // NEW
            
            const hrPeriod = DataStore.state.periods['period_homeroom_base'];
            if (hrPeriod && hrPeriod.classroomId === ctx.roomId) {
                isHomeroom = true;
            }
        }

        if (ctx.periodId && DataStore.state.periods[ctx.periodId]) {
            periodName = DataStore.state.periods[ctx.periodId].name.trim().toUpperCase();
        }

        // Combine Room, Period, and Teacher names
        let displayText = "";
        if (teacherName) displayText += teacherName + "\n";
        displayText += (isHomeroom ? '🏠 ' : '') + roomName;
        if (periodName) {
            displayText += " - " + periodName;
        }

        // Top-Left Aligned Combined Title
        const titleText = new fabric.Text(displayText, {
            left: 0,          
            top: -8, // Move down slightly so the text scales upward cleanly
            fontSize: 16, 
            fontFamily: 'sans-serif', 
            fontWeight: 'black', 
            fill: '#1e293b', 
            originX: 'left',  
            originY: 'bottom', // NEW: Forces multiline text to stack upwards
            selectable: false, 
            evented: false, 
            isBackgroundElement: true,
			isRoomHeader: true,
            objectCaching: false,
            lineHeight: 1.2 
        });
        
        bgElements.push(titleText);
        this.headerWidth = titleText.width || 0; 

        bgElements.reverse().forEach(el => { this.canvas.insertAt(el, 0, false); });
        
        this.recalculateDimensions(); 
        this.enforceZIndex();
        this.canvas.renderAll();
    },

    enforceZIndex() {
        if (!this.canvas) return;
        const objects = [...this.canvas.getObjects()];
        objects.sort((a, b) => {
            const getZ = (obj) => {
                if (obj.isBackgroundElement) return 0;
                if (obj.isFurniture && obj.furnitureType && obj.furnitureType.includes('rug')) return 1;
                if (obj.isFurniture && (obj.furnitureType === 'window' || obj.furnitureType === 'door')) return 3;
                if (obj.isFurniture && obj.furnitureType === 'front_marker') return 4; // Always on top
                return 2; 
            };
            return getZ(a) - getZ(b);
        });
        objects.forEach((obj, idx) => { this.canvas.moveTo(obj, idx); });
    },

    getGlobalSeatCenter(group, seatObj) {
        const matrix = group.calcTransformMatrix();
        const localCenter = seatObj.rectObj.getCenterPoint();
        return fabric.util.transformPoint(localCenter, matrix);
    },

    getSeatedStudentIds() {
        if (!this.canvas) return [];
        const seated = [];
        this.canvas.getObjects().forEach(o => {
            if (o.isFurniture && o.seats) {
                o.seats.forEach(s => {
                    if (s.assignedStudentId) seated.push(s.assignedStudentId);
                });
            }
        });
        return seated;
    },

    refreshAllSeatIcons() {
        if (!this.canvas) return;
        const isHomeroomActive = DataStore.state.ui.activePeriodId === 'period_homeroom_base';
        
        this.canvas.getObjects().forEach(g => {
            if (g.isFurniture && g.seats) {
                // FIX: Un-rotate before update
                const originalAngle = g.angle;
                g.set({ angle: 0 });

                g.seats.forEach(s => {
                    const seatKey = g.furnitureId + '_' + s.seatIndex;
                    const isAnchored = Object.values(DataStore.state.students).some(st => st.ownedSeatKey === seatKey);
                    
                    if (s.lockIconObj) s.lockIconObj.set({ opacity: s.isLocked ? 1 : 0 });
                    if (s.anchorIconObj) s.anchorIconObj.set({ opacity: (isAnchored && isHomeroomActive) ? 1 : 0 });
                });
                
                g.addWithUpdate();
                g.set({ angle: originalAngle }); // Snap back to original angle
            }
        });
        this.canvas.requestRenderAll();
    },

    assignStudentToSeatObject(group, seatObj, studentId, studentData, isLocked = false) {
        const seatKey = group.furnitureId + '_' + seatObj.seatIndex;
        
        const activePeriod = DataStore.state.periods[DataStore.state.ui.activePeriodId];
        const activeClassRosterIds = activePeriod ? activePeriod.studentIds : [];
        const currentOwner = Object.values(DataStore.state.students).find(s => s.ownedSeatKey === seatKey);

        if (currentOwner && studentId !== currentOwner.id && activeClassRosterIds.includes(currentOwner.id)) {
            alert(`This desk is reserved for ${currentOwner.name} during this class period.`);
            return false;
        }

        if (studentId) {
            const student = DataStore.state.students[studentId];
            if (student && student.ownedSeatKey && student.ownedSeatKey !== seatKey) {
                let ownsSeatInThisRoom = false;
                this.canvas.getObjects().forEach(g => {
                    if (g.isFurniture && g.seats) {
                        g.seats.forEach(s => {
                            if (g.furnitureId + '_' + s.seatIndex === student.ownedSeatKey) ownsSeatInThisRoom = true;
                        });
                    }
                });
                
                if (ownsSeatInThisRoom) {
                    alert(`Hard Error: ${student.name} has a reserved desk in this room. You must remove their anchor before moving them.`);
                    return false;
                }
            }
        }

        if (studentId) {
            this.canvas.getObjects().filter(o => o.isFurniture).forEach(g => {
                if (g.seats) {
                    g.seats.forEach(s => {
                        if (s.assignedStudentId === studentId && (g !== group || s !== seatObj)) {
                            s.assignedStudentId = null; 
                            s.isLocked = false; 
                            s.textObj.set({ text: "Empty Seat" });
                            this.applySeatStyles(g, s, null);
                        }
                    });
                }
            });
        }

        seatObj.assignedStudentId = studentId || null;
        seatObj.isLocked = isLocked;

        let labelText = "Empty Seat";
        if (studentData) {
            const showHouse = !!studentData.isHomeroom;
            labelText = (showHouse ? "🏠 " : "") + studentData.name;
        }
        seatObj.textObj.set({ text: labelText });
        
        this.applySeatStyles(group, seatObj, studentData);
        this.refreshAllSeatIcons();
        
        this.canvas.renderAll(); 
        this.saveLayout();
        window.dispatchEvent(new CustomEvent('canvas-layout-modified'));
        return true;
    },

    applySeatStyles(group, seatObj, studentData) {
        let chairFill = '#fcd34d'; let chairStroke = '#b45309';
        let deskStroke = '#d97706'; let deskStrokeWidth = 1.5;

        if (studentData) {
            if (studentData.gender === 'Male') { chairFill = '#bfdbfe'; chairStroke = '#3b82f6'; } 
            else if (studentData.gender === 'Female') { chairFill = '#fbcfe8'; chairStroke = '#ec4899'; }
            if (studentData.requiresPreferredSeating) { deskStroke = '#8b5cf6'; deskStrokeWidth = 3; }
        }

        if (seatObj.chairObj) { seatObj.chairObj.set({ fill: chairFill, stroke: chairStroke }); seatObj.chairObj.dirty = true; }
        if (seatObj.rectObj) { seatObj.rectObj.set({ stroke: deskStroke, strokeWidth: deskStrokeWidth, fill: '#fef3c7' }); seatObj.rectObj.dirty = true; }
        
        if (group) {
            // FIX: Prevent ballooning bounding boxes by un-rotating before update
            const originalAngle = group.angle;
            group.set({ angle: 0 });
            group.addWithUpdate();
            group.set({ angle: originalAngle });
        }
    },

    clearSeats() {
        if (!this.canvas) return;
        
        const activePeriod = DataStore.state.periods[DataStore.state.ui.activePeriodId];
        const activeClassRosterIds = activePeriod ? activePeriod.studentIds : [];

        this.canvas.getObjects().forEach(g => {
            if (g.isFurniture && g.seats) {
                g.seats.forEach(s => {
                    const seatKey = g.furnitureId + '_' + s.seatIndex;
                    const anchorOwner = Object.values(DataStore.state.students).find(st => st.ownedSeatKey === seatKey);
                    const isAnchoredByClassMember = anchorOwner && activeClassRosterIds.includes(anchorOwner.id);
                    
                    if (!s.isLocked && s.assignedStudentId && !isAnchoredByClassMember) {
                        s.assignedStudentId = null;
                        s.textObj.set({ text: "Empty Seat" });
                        this.applySeatStyles(g, s, null);
                    }
                });
            }
        });
        
        this.refreshAllSeatIcons();
        this.canvas.renderAll();
        this.saveLayout();
        window.dispatchEvent(new CustomEvent('canvas-layout-modified'));
    },

    autoAssign(unseatedStudents, mode) {
        if (!this.canvas || !unseatedStudents.length) return;
        
        const minSeparationInches = DataStore.state.settings.minSeparationInches || 48;
        const studentsDict = DataStore.state.students;
        
        const activePeriod = DataStore.state.periods[DataStore.state.ui.activePeriodId];
        const activeClassRosterIds = activePeriod ? activePeriod.studentIds : [];

        let emptySeats = [];
        this.canvas.getObjects().forEach(g => {
            if (g.isFurniture && g.seats) {
                g.seats.forEach(s => {
                    const seatKey = g.furnitureId + '_' + s.seatIndex;
                    
                    const isAnchoredByClassMember = activeClassRosterIds.some(id => {
                        const st = studentsDict[id];
                        return st && st.ownedSeatKey === seatKey;
                    });
                    
                    if (!s.assignedStudentId && !s.isLocked && !isAnchoredByClassMember) {
                        const globalCenter = this.getGlobalSeatCenter(g, s);
                        emptySeats.push({ group: g, seat: s, x: globalCenter.x, y: globalCenter.y });
                    }
                });
            }
        });

        let studentsToPlace = [...unseatedStudents];
        
        // 1. Get the physical Room ID for the active period
        const currentPeriod = DataStore.state.periods[DataStore.state.ui.activePeriodId];
        const currentRoomId = currentPeriod ? currentPeriod.classroomId : null;
        
        // 2. Get the physical Room ID where Homeroom takes place
        const homeroomPeriod = DataStore.state.periods['period_homeroom_base'];
        const homeroomRoomId = homeroomPeriod ? homeroomPeriod.classroomId : null;

        // 3. Only waste cycles searching for anchors if we are in the exact same physical room
        if (currentRoomId && homeroomRoomId && currentRoomId === homeroomRoomId) {
            const anchoredStudents = studentsToPlace.filter(s => s.ownedSeatKey);
            studentsToPlace = studentsToPlace.filter(s => !s.ownedSeatKey);

            anchoredStudents.forEach(student => {
                let foundGroup, foundSeat;
                this.canvas.getObjects().forEach(g => {
                    if (g.isFurniture && g.seats) {
                        g.seats.forEach(s => {
                            if (g.furnitureId + '_' + s.seatIndex === student.ownedSeatKey) {
                                foundGroup = g; foundSeat = s;
                            }
                        });
                    }
                });
                
                if (foundGroup && foundSeat) {
                    this.assignStudentToSeatObject(foundGroup, foundSeat, student.id, student, foundSeat.isLocked);
                } else {
                    studentsToPlace.push(student);
                }
            });
        }

        if (emptySeats.length === 0 && studentsToPlace.length > 0) {
            alert("Not enough empty, unlocked, unanchored seats to place everyone!");
            return;
        }

        // --- RADIAL SORTING COMPASS ENGINE ---
        let fX = this.roomInchesW / 2;
        let fY = 0;
        const frontMarker = this.canvas.getObjects().find(o => o.furnitureType === 'front_marker');
        if (frontMarker) {
            fX = frontMarker.left;
            fY = frontMarker.top;
        }

        emptySeats.sort((a, b) => {
            const distA = Math.hypot(a.x - fX, a.y - fY);
            const distB = Math.hypot(b.x - fX, b.y - fY);
            
            // If desks are practically equidistant (e.g. adjacent side-by-side)
            if (Math.abs(distA - distB) < 15) {
                return a.x - b.x; 
            }
            return distA - distB;
        });

        for (let seatIndex = 0; seatIndex < emptySeats.length; seatIndex++) {
            if (studentsToPlace.length === 0) break;

            const targetNode = emptySeats[seatIndex];
            let bestStudentIndex = -1;
            let bestScore = -Infinity;

            let groupMales = 0;
            let groupFemales = 0;
            if (targetNode.group && targetNode.group.seats) {
                targetNode.group.seats.forEach(s => {
                    if (s.assignedStudentId) {
                        const st = studentsDict[s.assignedStudentId];
                        if (st && st.gender === 'Male') groupMales++;
                        if (st && st.gender === 'Female') groupFemales++;
                    }
                });
            }

            for (let i = 0; i < studentsToPlace.length; i++) {
                const student = studentsToPlace[i];
                let score = 0;

                let hasRestriction = false;
                this.canvas.getObjects().forEach(g => {
                    if (g.isFurniture && g.seats) {
                        g.seats.forEach(s => {
                            if (s.assignedStudentId) {
                                const otherStudent = studentsDict[s.assignedStudentId];
                                if (!otherStudent) return;

                                const safeStudentRestricted = student.restrictedStudentIds || [];
                                const safeOtherRestricted = otherStudent.restrictedStudentIds || [];
                                const blocksEachOther = safeStudentRestricted.includes(otherStudent.id) || safeOtherRestricted.includes(student.id);

                                if (blocksEachOther) {
                                    const posB = this.getGlobalSeatCenter(g, s);
                                    const centerDistance = Math.sqrt(Math.pow(targetNode.x - posB.x, 2) + Math.pow(targetNode.y - posB.y, 2));
                                    const edgeToEdgeDistance = centerDistance - 24;

                                    const isViolated = edgeToEdgeDistance < minSeparationInches;
                                    const isSameColumn = Math.abs(targetNode.x - posB.x) < 20; 
                                    const isDirectlyBehind = isSameColumn && Math.abs(targetNode.y - posB.y) < 60;

                                    if (isViolated || isDirectlyBehind) {
                                        hasRestriction = true;
                                    }
                                }
                            }
                        });
                    }
                });

                if (hasRestriction) score -= 1000000; 

                // --- NEW SPATIAL GENDER ENGINE ---
                let adjacentSameGender = 0;
                let adjacentDiffGender = 0;
                let hasSideBySideNeighbor = false;

                if (targetNode.group && targetNode.group.seats) {
                    targetNode.group.seats.forEach(s => {
                        if (s.assignedStudentId) {
                            const otherStudent = studentsDict[s.assignedStudentId];
                            if (otherStudent) {
                                const posB = this.getGlobalSeatCenter(targetNode.group, s);
                                const dx = Math.abs(targetNode.x - posB.x);
                                const dy = Math.abs(targetNode.y - posB.y);

                                // dy < 20 isolates seats to the EXACT SAME ROW (ignoring the seats facing them)
                                // dx < 50 ensures the seat is immediately adjacent left or right
                                if (dy < 20 && dx > 0 && dx < 50) {
                                    hasSideBySideNeighbor = true;
                                    if (otherStudent.gender === student.gender) {
                                        adjacentSameGender++;
                                    } else {
                                        adjacentDiffGender++;
                                    }
                                }
                            }
                        }
                    });
                }

                if (mode === 'alternating') {
                    if (hasSideBySideNeighbor) {
                        // Strictly enforce alternating on the same side of the pod
                        score += (adjacentDiffGender * 50000);
                        score -= (adjacentSameGender * 50000);
                    } else {
                        // Fallback: overall pod balance to ensure we don't accidentally dump all boys in one pod
                        if (groupMales > groupFemales && student.gender === 'Female') score += 10000;
                        if (groupFemales > groupMales && student.gender === 'Male') score += 10000;
                    }
                } 
                else if (mode === 'clustered') {
                    if (hasSideBySideNeighbor) {
                        score += (adjacentSameGender * 50000);
                        score -= (adjacentDiffGender * 50000);
                    } else {
                        if (groupMales > 0 && student.gender === 'Male') score += 10000;
                        if (groupFemales > 0 && student.gender === 'Female') score += 10000;
                    }
                }

                if (student.requiresPreferredSeating) {
                    score += Math.max(1000, 10000 - (seatIndex * 50));
                }

                score += Math.random() * 10;

                if (score > bestScore) {
                    bestScore = score;
                    bestStudentIndex = i;
                }
            }

            if (bestStudentIndex !== -1) {
                const selectedStudent = studentsToPlace.splice(bestStudentIndex, 1)[0];
                this.assignStudentToSeatObject(targetNode.group, targetNode.seat, selectedStudent.id, selectedStudent, false);
            }
        }
        
        this.saveLayout();
        window.dispatchEvent(new CustomEvent('canvas-layout-modified'));
    },

    anchorCurrentSeats() {
        if (!this.canvas) return 0;
        let count = 0;
        this.canvas.getObjects().forEach(g => {
            if (g.isFurniture && g.seats) {
                g.seats.forEach(s => {
                    if (s.assignedStudentId) {
                        const student = DataStore.state.students[s.assignedStudentId];
                        if (student) {
                            student.ownedSeatKey = g.furnitureId + '_' + s.seatIndex;
                            count++;
                        }
                    }
                });
            }
        });
        DataStore.persist();
        this.refreshAllSeatIcons(); 
        return count;
    },

    saveLayout() {
        if (!this.canvas) return;
        const { roomId, periodId } = this.getContext();
        if (!roomId) return; 

        const manifest = [];
        const assignments = {};
        
        let itemsToSave = this.canvas.getObjects();
        const activeObj = this.canvas.getActiveObject();
        if (activeObj && activeObj.type === 'activeSelection') {
            this.canvas.discardActiveObject(); 
            itemsToSave = this.canvas.getObjects(); 
        }
        
        itemsToSave.forEach(obj => {
            if (obj.isFurniture) {
                manifest.push({
                    left: obj.left, top: obj.top, angle: obj.angle, scaleX: obj.scaleX, scaleY: obj.scaleY,
                    furnitureId: obj.furnitureId, furnitureType: obj.furnitureType, blueprint: obj.blueprint, isPositionLocked: obj.isPositionLocked || false
                });

                // NEW: Secretly save the custom front marker pos to the active period
                if (obj.furnitureType === 'front_marker' && periodId) {
                    assignments['front_marker_pos'] = { left: obj.left, top: obj.top, angle: obj.angle };
                }

                if (obj.seats && periodId) {
                    obj.seats.forEach(s => {
                        if (s.assignedStudentId || s.isLocked) { 
                            assignments[obj.furnitureId + '_' + s.seatIndex] = { assignedStudentId: s.assignedStudentId, isLocked: s.isLocked };
                        }
                    });
                }
            }
        });
        
        const ui = DataStore.state.ui || {};
        const currentTab = ui.currentTab || 'layout';

        if (currentTab === 'classrooms') {
            localStorage.setItem(`CS_Room_${roomId}`, JSON.stringify(manifest));
        }
        
        if (periodId) {
            localStorage.setItem(`CS_Period_${periodId}`, JSON.stringify(assignments));
        }
    },

	updateRoomHeaderLayout() {
        if (!this.canvas) return;
        
        const headerObj = this.canvas.getObjects().find(o => o.isRoomHeader);
        if (!headerObj) return;

        const ctx = this.getContext();
        let totalDesks = 0;
        let usedDesks = 0;

        // Calculate counts
        this.canvas.getObjects().forEach(obj => {
            if (obj.isFurniture && obj.seats) {
                totalDesks += obj.seats.length;
                obj.seats.forEach(s => {
                    if (s.assignedStudentId) usedDesks++;
                });
            }
        });

        // Format names
        // Format names
        let roomName = "CLASSROOM";
        let periodName = "";
        let teacherName = ""; // NEW
        let isHomeroom = false;
        
        if (ctx.roomId && DataStore.state.classrooms[ctx.roomId]) {
            const r = DataStore.state.classrooms[ctx.roomId];
            roomName = r.name.trim().toUpperCase();
            teacherName = r.teacherName ? r.teacherName.trim().toUpperCase() : ""; // NEW
            
            const hrPeriod = DataStore.state.periods['period_homeroom_base'];
            if (hrPeriod && hrPeriod.classroomId === ctx.roomId) {
                isHomeroom = true;
            }
        }
        if (ctx.periodId && DataStore.state.periods[ctx.periodId]) {
            periodName = DataStore.state.periods[ctx.periodId].name.trim().toUpperCase();
        }

        // Apply specific formatting based on the active tab
        let headerText = "";
        if (teacherName) headerText += teacherName + "\n";
        headerText += (isHomeroom ? '🏠 ' : '') + roomName;

        if (ctx.periodId) {
            headerText += ` - ${periodName} - ${usedDesks}/${totalDesks} Desks Used`;
        } else {
            headerText += ` - ${totalDesks} Student Desks`;
        }
        
        headerObj.set({ text: headerText });
        this.canvas.requestRenderAll();
	},

    buildFrontMarker() {
        // A clean, circular background badge
        const bg = new fabric.Circle({
            radius: 14, fill: '#ffffff', stroke: '#64748b', strokeWidth: 2, originX: 'center', originY: 'center'
        });
        
        // A sleek 4-point compass star (Grey)
        const star = new fabric.Path('M 0 -9 L 2 -2 L 9 0 L 2 2 L 0 9 L -2 2 L -9 0 L -2 -2 Z', {
            fill: '#94a3b8', originX: 'center', originY: 'center'
        });
        
        // Distinct Red pointer for "North/Front"
        const north = new fabric.Path('M 0 -11 L 3 -2 L -3 -2 Z', {
            fill: '#ef4444', originX: 'center', originY: 'center'
        });

        const frontGroup = new fabric.Group([bg, star, north], {
            originX: 'center', originY: 'center',
            selectable: true, evented: true, hasControls: true, hoverCursor: 'grab', moveCursor: 'grabbing',
            borderColor: '#ef4444', cornerColor: '#ffffff', cornerStrokeColor: '#ef4444', transparentCorners: false
        });
        
        // Hide resizing handles, but keep the rotation handle active so the teacher can point it
        frontGroup.setControlsVisibility({
            mt: false, mb: false, ml: false, mr: false,
            tl: false, tr: false, bl: false, br: false, mtr: true
        });
        
        frontGroup.isFurniture = true; 
        frontGroup.furnitureType = 'front_marker';
        frontGroup.furnitureId = 'front_' + Math.random().toString(36).substr(2, 9);
        return frontGroup;
    },

    spawnDefaultFrontMarker() {
        const group = this.buildFrontMarker();
        group.set({ left: this.roomInchesW / 2, top: 24 });
        this.canvas.add(group);
        this.saveLayout();
    },

    loadLayout() {
        if (!this.canvas) return;
        const { roomId, periodId } = this.getContext();

        const currentObjects = [...this.canvas.getObjects()];
        currentObjects.forEach(obj => { if (obj.isFurniture) this.canvas.remove(obj); });

        if (!roomId) {
            window.dispatchEvent(new CustomEvent('canvas-layout-modified'));
            return;
        }

        const savedRoom = localStorage.getItem(`CS_Room_${roomId}`);
        if (!savedRoom) {
            this.spawnDefaultFrontMarker();
            window.dispatchEvent(new CustomEvent('canvas-layout-modified'));
            return;
        }

        try {
            const manifest = JSON.parse(savedRoom);
            let assignments = {};
            let hasFrontMarker = false;
            
            if (periodId) {
                const savedAssigns = localStorage.getItem(`CS_Period_${periodId}`);
                if (savedAssigns) assignments = JSON.parse(savedAssigns);
            }

            // --- NEW: ANCHOR CONFLICT RESOLUTION (GHOST & EVICTION PROTOCOL) ---
            const currentPeriod = DataStore.state.periods[periodId];
            const homeroomPeriod = DataStore.state.periods['period_homeroom_base'];
            const homeroomRoomId = homeroomPeriod ? homeroomPeriod.classroomId : null;

            // Only enforce anchors if this period physically takes place in the Homeroom
            if (currentPeriod && roomId && roomId === homeroomRoomId) {
                const activeRoster = currentPeriod.studentIds || [];
                
                activeRoster.forEach(studentId => {
                    const student = DataStore.state.students[studentId];
                    if (student && student.ownedSeatKey) {
                        const targetKey = student.ownedSeatKey;

                        // 1. Delete this student from any OLD seats they used to occupy in this period
                        for (const key in assignments) {
                            if (assignments[key].assignedStudentId === studentId && key !== targetKey) {
                                assignments[key].assignedStudentId = null;
                                assignments[key].isLocked = false;
                            }
                        }

                        // 2. Force the student into their anchor, evicting anyone currently sitting there
                        if (!assignments[targetKey]) {
                            assignments[targetKey] = { assignedStudentId: studentId, isLocked: false };
                        } else if (assignments[targetKey].assignedStudentId !== studentId) {
                            assignments[targetKey].assignedStudentId = studentId;
                            assignments[targetKey].isLocked = false; // Unlock so the teacher can re-evaluate
                        }
                    }
                });
            }
            // -------------------------------------------------------------------
            
            manifest.forEach(f => {
                let group = null;
                
                if (f.furnitureType === 'front_marker') {
                    hasFrontMarker = true;
                    group = this.buildFrontMarker();
                    
                    if (periodId && assignments['front_marker_pos']) {
                        f.left = assignments['front_marker_pos'].left;
                        f.top = assignments['front_marker_pos'].top;
                        f.angle = assignments['front_marker_pos'].angle || 0;
                    }
                }
                else if (f.furnitureType === 'row' || f.furnitureType === 'pod') {
                    const count = f.blueprint.count || (f.furnitureType === 'pod' ? f.blueprint.length : 1);
                    const totalSeats = f.furnitureType === 'pod' ? count * 2 : count;
                    const recreatedSeatsData = [];

                    for (let i = 0; i < totalSeats; i++) {
                        const key = f.furnitureId + '_' + i;
                        let aId = assignments[key] ? assignments[key].assignedStudentId : null;
                        let isLocked = assignments[key] ? assignments[key].isLocked : false;

                        // The old 'owner override' logic was safely removed here because 
                        // the new protocol pre-cleans the entire assignment dictionary!
                        recreatedSeatsData.push({ seatIndex: i, assignedStudentId: aId, isLocked: isLocked });
                    }

                    if (f.furnitureType === 'row') group = this.buildRowObject(count, f.blueprint.dW, f.blueprint.dL, recreatedSeatsData);
                    else if (f.furnitureType === 'pod') group = this.buildPodObject(f.blueprint.length, f.blueprint.dW, f.blueprint.dL, recreatedSeatsData);
                } 
                else {
                    group = this.buildAssetObject(f.furnitureType, f.blueprint.width, f.blueprint.height, f.blueprint.fill, f.blueprint.stroke, f.blueprint.label, f.blueprint.textFill, f.blueprint.shape);
                }

                if (group) {
                    group.set({ left: f.left, top: f.top, angle: f.angle, scaleX: f.scaleX, scaleY: f.scaleY, furnitureId: f.furnitureId });
                    if (f.isPositionLocked) {
                        group.isPositionLocked = true;
                        group.set({ lockMovementX: true, lockMovementY: true, lockRotation: true, lockScalingX: true, lockScalingY: true, hasControls: false });
                    }
                    this.canvas.add(group);
                }
            });

            if (!hasFrontMarker) this.spawnDefaultFrontMarker();

            this.canvas.renderAll();
            this.enforceZIndex(); 
            this.refreshAllSeatIcons(); 
            
            // NEW: Automatically persist the cleaned anchor layout back to the hard drive immediately
            this.saveLayout(); 
            
            window.dispatchEvent(new CustomEvent('canvas-layout-modified'));
        } catch (e) { 
            console.error("Layout restoration failed.", e); 
        }
    },

    duplicateBlueprint(oldRoomId, newRoomId) {
        const savedData = localStorage.getItem(`CS_Room_${oldRoomId}`);
        if (savedData) localStorage.setItem(`CS_Room_${newRoomId}`, savedData);
    },

    resizeAllDesksInBlueprint(roomId, newWidth, newHeight) {
        const key = `CS_Room_${roomId}`;
        const saved = localStorage.getItem(key);
        if (!saved) return 0;
        
        try {
            const manifest = JSON.parse(saved);
            let updatedCount = 0;
            
            manifest.forEach(f => {
                if ((f.furnitureType === 'row' || f.furnitureType === 'pod') && f.blueprint) {
                    f.blueprint.dW = newWidth;
                    f.blueprint.dL = newHeight;
                    f.scaleX = 1;
                    f.scaleY = 1;
                    updatedCount++;
                }
            });
            
            if (updatedCount > 0) {
                localStorage.setItem(key, JSON.stringify(manifest));
            }
            return updatedCount;
        } catch (e) { return 0; }
    },

    spawnAsset(assetType) {
        let width = 48, height = 48, fill = '#e2e8f0', stroke = '#94a3b8', label = 'Asset', textFill = '#475569', shape = 'rect';
        
        switch (assetType) {
            case 'teacher_desk': width = 60; height = 30; fill = '#cbd5e1'; stroke = '#64748b'; label = 'Teacher Desk'; textFill = '#334155'; break;
            case 'shelf': width = 48; height = 18; fill = '#fde68a'; stroke = '#d97706'; label = 'Shelf'; textFill = '#92400e'; break;
            case 'cabinet': width = 36; height = 24; fill = '#e5e7eb'; stroke = '#64748b'; label = 'Cabinet'; textFill = '#334155'; break;
            case 'locker': width = 72; height = 18; fill = '#94a3b8'; stroke = '#475569'; label = 'Lockers'; textFill = '#1e293b'; break;
            case 'bookshelf': width = 48; height = 18; fill = '#fcd34d'; stroke = '#b45309'; label = 'Bookshelf'; textFill = '#78350f'; break;
            case 'rug': width = 120; height = 96; fill = '#bae6fd'; stroke = '#0284c7'; label = 'Rect Rug'; textFill = '#0369a1'; break;
            case 'rug_circle': width = 96; height = 96; fill = '#bae6fd'; stroke = '#0284c7'; label = 'Round Rug'; textFill = '#0369a1'; shape = 'circle'; break;
            case 'rug_half': width = 96; height = 48; fill = '#bae6fd'; stroke = '#0284c7'; label = 'Half Rug'; textFill = '#0369a1'; shape = 'half_circle'; break;
            case 'table_round': width = 48; height = 48; fill = '#cbd5e1'; stroke = '#64748b'; label = 'Round Table'; textFill = '#334155'; shape = 'circle'; break;
            case 'table_half': width = 60; height = 30; fill = '#cbd5e1'; stroke = '#64748b'; label = 'Half Table'; textFill = '#334155'; shape = 'half_circle'; break;
            case 'smartboard': width = 96; height = 8; fill = '#1e293b'; stroke = '#0f172a'; label = 'Smartboard'; textFill = '#ffffff'; break;
            case 'door': width = 36; height = 8; fill = '#ef4444'; stroke = '#991b1b'; label = 'Door'; textFill = '#ffffff'; break;
            case 'window': width = 60; height = 8; fill = '#7dd3fc'; stroke = '#0284c7'; label = 'Window'; textFill = '#000000'; break;
            case 'misc': width = 36; height = 36; fill = '#f3f4f6'; stroke = '#9ca3af'; label = 'Misc'; textFill = '#4b5563'; break;
        }

        const group = this.buildAssetObject(assetType, width, height, fill, stroke, label, textFill, shape);
        group.furnitureId = 'asset_' + Math.random().toString(36).substr(2, 9).toUpperCase(); 
        
        const center = this.canvas.getVpCenter();
        group.set({ left: center.x - (width/2), top: center.y - (height/2) }); 
        
        this.canvas.add(group).setActiveObject(group).renderAll(); 
        this.enforceZIndex(); 
        this.saveLayout(); 
    },

    buildAssetObject(assetType, width, height, fill, stroke, labelText, textFill, shape = 'rect') {
        let baseShape;
        if (shape === 'circle') baseShape = new fabric.Circle({ left: 0, top: 0, radius: width / 2, fill: fill, stroke: stroke, strokeWidth: 2, strokeUniform: true });
        else if (shape === 'half_circle') {
            const pathStr = `M 0 ${height} A ${width/2} ${height} 0 0 1 ${width} ${height} Z`;
            baseShape = new fabric.Path(pathStr, { left: 0, top: 0, fill: fill, stroke: stroke, strokeWidth: 2, strokeUniform: true });
        } else {
            baseShape = new fabric.Rect({ left: 0, top: 0, width: width, height: height, fill: fill, stroke: stroke, strokeWidth: 2, rx: (assetType.includes('rug') ? 12 : 2), ry: (assetType.includes('rug') ? 12 : 2), strokeUniform: true });
        }
        
        const label = new fabric.Textbox(labelText, { left: width / 2, top: height / 2, width: width - 4, fontSize: (assetType === 'smartboard' || assetType === 'door' || assetType === 'window') ? 6 : 10, fontFamily: 'sans-serif', fill: textFill, originX: 'center', originY: 'center', textAlign: 'center', fontWeight: 'bold' });
        if (shape === 'half_circle') label.set({ top: height * 0.65 });
        
        const group = new fabric.Group([baseShape, label], { hasRotatingPoint: true, cornerSize: 8 });
        group.isFurniture = true; 
        group.furnitureType = assetType; 
        group.blueprint = { width, height, fill, stroke, label: labelText, textFill, shape };
        return group;
    },

    spawnRow(count, dW, dL) {
        const group = this.buildRowObject(count, dW, dL);
        group.furnitureId = 'furn_' + Math.random().toString(36).substr(2, 9).toUpperCase(); 
        const center = this.canvas.getVpCenter();
        group.set({ left: center.x - (group.width/2), top: center.y - (group.height/2) }); 
        this.canvas.add(group).setActiveObject(group);
        this.enforceZIndex(); 
        this.refreshAllSeatIcons();
        this.saveLayout(); 
    },

    buildRowObject(count, dW, dL, savedSeatsData = null) {
        const parts = []; const seatRefs = [];
        const r = dW / 2; 
        const pathDown = `M 0 0 L ${dW} 0 A ${r} ${r} 0 0 1 0 0 Z`;

        for (let i = 0; i < count; i++) {
            let offX = i * (dW + 2);
            const rect = new fabric.Rect({ left: offX, top: 0, width: dW, height: dL, fill: '#fef3c7', stroke: '#d97706', strokeWidth: 1.5, rx: 2, ry: 2 });
            const chair = new fabric.Path(pathDown, { left: offX, top: dL, stroke: '#b45309', strokeWidth: 1.5, fill: '#fcd34d' });
            
            let studentId = null; let studentData = null; let isLocked = false; 
            
            if (savedSeatsData && savedSeatsData[i]) {
                studentId = savedSeatsData[i].assignedStudentId; isLocked = savedSeatsData[i].isLocked;
                if (studentId) studentData = DataStore.state.students[studentId];
            }

            let labelText = "Empty Seat";
            if (studentData) {
                const showHouse = !!studentData.isHomeroom;
                labelText = (showHouse ? "🏠 " : "") + studentData.name;
            }

            const label = new fabric.Textbox(labelText, { 
                left: offX + (dW / 2), top: dL / 2, width: dW - 4, fontSize: 6, fill: '#78350f', originX: 'center', originY: 'center', textAlign: 'center', fontWeight: 'bold', 
                angle: this.isTextFlipped ? 180 : 0 
            });
            
            const lockIcon = new fabric.Text('🔒', { 
                left: offX + (dW / 2) - 6, top: dL + (r / 2), fontSize: 10, originX: 'center', originY: 'center', selectable: false, opacity: 0 
            });
            const anchorIcon = new fabric.Text('⚓', { 
                left: offX + (dW / 2) + 6, top: dL + (r / 2), fontSize: 10, originX: 'center', originY: 'center', selectable: false, opacity: 0 
            });

            parts.push(rect, chair, label, lockIcon, anchorIcon);
            
            const seatObj = { seatIndex: i, assignedStudentId: studentId, isLocked, rectObj: rect, chairObj: chair, textObj: label, lockIconObj: lockIcon, anchorIconObj: anchorIcon };
            this.applySeatStyles(null, seatObj, studentData);
            seatRefs.push(seatObj);
        }
        
        const group = new fabric.Group(parts, { hasRotatingPoint: true, cornerSize: 8 });
        group.isFurniture = true; group.furnitureType = 'row'; group.blueprint = { count, dW, dL }; 
        group.seats = seatRefs; 
        return group;
    },

    spawnPod(length, dW, dL) {
        const group = this.buildPodObject(length, dW, dL);
        group.furnitureId = 'furn_' + Math.random().toString(36).substr(2, 9).toUpperCase(); 
        const center = this.canvas.getVpCenter();
        group.set({ left: center.x - (group.width/2), top: center.y - (group.height/2) }); 
        this.canvas.add(group).setActiveObject(group);
        this.enforceZIndex(); 
        this.refreshAllSeatIcons();
        this.saveLayout(); 
    },

    buildPodObject(length, dW, dL, savedSeatsData = null) {
        const parts = []; const seatRefs = []; let seatCounter = 0;
        const r = dW / 2; 
        const pathUp = `M 0 ${r} A ${r} ${r} 0 0 1 ${dW} ${r} L 0 ${r} Z`;
        const pathDown = `M 0 0 L ${dW} 0 A ${r} ${r} 0 0 1 0 0 Z`;

        for (let i = 0; i < length; i++) {
            let offX = i * (dW + 2); let offY = 0;
            const rect = new fabric.Rect({ left: offX, top: offY, width: dW, height: dL, fill: '#fef3c7', stroke: '#d97706', strokeWidth: 1.5, rx: 2, ry: 2 });
            const chair = new fabric.Path(pathUp, { left: offX, top: offY - r, stroke: '#b45309', strokeWidth: 1.5, fill: '#fcd34d' });
            
            let studentId = null; let studentData = null; let isLocked = false; 
            
            if (savedSeatsData && savedSeatsData[seatCounter]) {
                studentId = savedSeatsData[seatCounter].assignedStudentId; isLocked = savedSeatsData[seatCounter].isLocked;
                if (studentId) studentData = DataStore.state.students[studentId];
            }

            let labelText = "Empty Seat";
            if (studentData) {
                const showHouse = !!studentData.isHomeroom;
                labelText = (showHouse ? "🏠 " : "") + studentData.name;
            }

            const label = new fabric.Textbox(labelText, { 
                left: offX + (dW / 2), top: offY + (dL / 2), width: dW - 4, fontSize: 6, fill: '#78350f', originX: 'center', originY: 'center', textAlign: 'center', fontWeight: 'bold', 
                angle: this.isTextFlipped ? 180 : 0 
            });

            const lockIcon = new fabric.Text('🔒', { 
                left: offX + (dW / 2) - 6, top: offY - (r / 2), fontSize: 10, originX: 'center', originY: 'center', selectable: false, opacity: 0 
            });
            const anchorIcon = new fabric.Text('⚓', { 
                left: offX + (dW / 2) + 6, top: offY - (r / 2), fontSize: 10, originX: 'center', originY: 'center', selectable: false, opacity: 0 
            });

            parts.push(rect, chair, label, lockIcon, anchorIcon);
            
            const seatObj = { seatIndex: seatCounter, assignedStudentId: studentId, isLocked, rectObj: rect, chairObj: chair, textObj: label, lockIconObj: lockIcon, anchorIconObj: anchorIcon };
            this.applySeatStyles(null, seatObj, studentData);
            seatRefs.push(seatObj);
            seatCounter++;
        }

        for (let i = 0; i < length; i++) {
            let offX = i * (dW + 2); let offY = dL + 4; 
            const rect = new fabric.Rect({ left: offX, top: offY, width: dW, height: dL, fill: '#fef3c7', stroke: '#d97706', strokeWidth: 1.5, rx: 2, ry: 2 });
            const chair = new fabric.Path(pathDown, { left: offX, top: offY + dL, stroke: '#b45309', strokeWidth: 1.5, fill: '#fcd34d' });
            
            let studentId = null; let studentData = null; let isLocked = false;
            
            if (savedSeatsData && savedSeatsData[seatCounter]) {
                studentId = savedSeatsData[seatCounter].assignedStudentId; isLocked = savedSeatsData[seatCounter].isLocked;
                if (studentId) studentData = DataStore.state.students[studentId];
            }

            let labelText = "Empty Seat";
            if (studentData) {
                const showHouse = !!studentData.isHomeroom;
                labelText = (showHouse ? "🏠 " : "") + studentData.name;
            }

            const label = new fabric.Textbox(labelText, { 
                left: offX + (dW / 2), top: offY + (dL / 2), width: dW - 4, fontSize: 6, fill: '#78350f', originX: 'center', originY: 'center', textAlign: 'center', fontWeight: 'bold', 
                angle: this.isTextFlipped ? 180 : 0 
            });

            const lockIcon = new fabric.Text('🔒', { 
                left: offX + (dW / 2) - 6, top: offY + dL + (r / 2), fontSize: 10, originX: 'center', originY: 'center', selectable: false, opacity: 0 
            });
            const anchorIcon = new fabric.Text('⚓', { 
                left: offX + (dW / 2) + 6, top: offY + dL + (r / 2), fontSize: 10, originX: 'center', originY: 'center', selectable: false, opacity: 0 
            });

            parts.push(rect, chair, label, lockIcon, anchorIcon);
            
            const seatObj = { seatIndex: seatCounter, assignedStudentId: studentId, isLocked, rectObj: rect, chairObj: chair, textObj: label, lockIconObj: lockIcon, anchorIconObj: anchorIcon };
            this.applySeatStyles(null, seatObj, studentData);
            seatRefs.push(seatObj);
            seatCounter++;
        }

        const group = new fabric.Group(parts, { hasRotatingPoint: true, cornerSize: 8 });
        group.isFurniture = true; group.furnitureType = 'pod'; group.blueprint = { length, dW, dL }; 
        group.seats = seatRefs;
        return group;
    },
    
    attachControlListeners() {
        // --- MULTI-TOUCH & DOUBLE-TAP STATE VARIABLES ---
        let touchZooming = false;
        let initialDistance = 0;
        let initialZoom = 1;
        let lastPanX = 0;
        let lastPanY = 0;
        let lastTouchTime = 0;

        // 1. MOUSE WHEEL (PC Zoom)
        this.canvas.on('mouse:wheel', (opt) => {
            let zoom = this.canvas.getZoom() * (0.999 ** opt.e.deltaY);
            if (zoom > 5) zoom = 5; if (zoom < 0.1) zoom = 0.1;
            this.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault(); opt.e.stopPropagation();
        });

        // 2. MOUSE DOWN / TOUCH START
        this.canvas.on('mouse:down', (options) => {
            const e = options.e;
            
            // A. PC Panning (Shift-Click or Middle-Click)
            if (e.shiftKey || e.button === 1) { 
                this.isDragging = true; this.canvas.selection = false;
                this.lastPosX = e.clientX; this.lastPosY = e.clientY;
                return;
            }

            // B. MOBILE MULTI-TOUCH: 2-Finger Pinch/Pan Detection
            if (e.touches && e.touches.length === 2) {
                touchZooming = true;
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                
                initialDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                initialZoom = this.canvas.getZoom();
                lastPanX = (t1.clientX + t2.clientX) / 2;
                lastPanY = (t1.clientY + t2.clientY) / 2;
                
                this.canvas.selection = false; 
                this.canvas.discardActiveObject();
                return;
            }

            // C. MOBILE SINGLE-TOUCH: Double-Tap Polyfill
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTouchTime;
            if (tapLength > 0 && tapLength < 300) {
                this.canvas.fire('mouse:dblclick', options);
                if (e.preventDefault) e.preventDefault();
            }
            lastTouchTime = currentTime;
        });

        // 3. MOUSE MOVE / TOUCH MOVE
        this.canvas.on('mouse:move', (options) => {
            const e = options.e;
            
            // A. PC Panning
            if (this.isDragging) {
                this.canvas.viewportTransform[4] += e.clientX - this.lastPosX;
                this.canvas.viewportTransform[5] += e.clientY - this.lastPosY;
                this.canvas.requestRenderAll();
                this.lastPosX = e.clientX; this.lastPosY = e.clientY;
                return;
            }

            // B. MOBILE MULTI-TOUCH: Panning and Zooming
            if (touchZooming && e.touches && e.touches.length === 2) {
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                
                const currentPanX = (t1.clientX + t2.clientX) / 2;
                const currentPanY = (t1.clientY + t2.clientY) / 2;
                
                // Pan Math
                const vpt = this.canvas.viewportTransform;
                vpt[4] += currentPanX - lastPanX; 
                vpt[5] += currentPanY - lastPanY; 
                lastPanX = currentPanX;
                lastPanY = currentPanY;

                // Zoom Math
                const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                const zoomDelta = currentDistance / initialDistance;
                let newZoom = initialZoom * zoomDelta;
                
                if (newZoom > 5) newZoom = 5;
                if (newZoom < 0.1) newZoom = 0.1; // Matched your 0.1 limit

                this.canvas.zoomToPoint({ x: currentPanX, y: currentPanY }, newZoom);
                this.canvas.requestRenderAll();
                
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            }
        });

        // 4. MOUSE UP / TOUCH END
        this.canvas.on('mouse:up', (options) => {
            const e = options.e;
            
            // Turn off PC Panning
            this.isDragging = false; 
            
            // Turn off Mobile Panning if fingers lifted
            if (touchZooming) {
                if (!e.touches || e.touches.length < 2) {
                    touchZooming = false;
                }
            }
            
            this.canvas.selection = true;
            this.canvas.getObjects().forEach(obj => obj.setCoords()); 
        });

        // 5. DOUBLE CLICK / DOUBLE TAP (Moved to Fabric Event to support mobile)
        this.canvas.on('mouse:dblclick', (options) => {
            const activeObj = this.canvas.getActiveObject();
            if (activeObj && activeObj.isFurniture) {
                if (activeObj.seats) {
                    const pointer = this.canvas.getPointer(options.e);
                    let clickedSeat = null; let minDistance = 999999;
                    activeObj.seats.forEach(seat => {
                        const globalCenter = this.getGlobalSeatCenter(activeObj, seat);
                        const dist = Math.sqrt(Math.pow(globalCenter.x - pointer.x, 2) + Math.pow(globalCenter.y - pointer.y, 2));
                        if (dist < minDistance) { minDistance = dist; clickedSeat = seat; }
                    });
                    
                    if (clickedSeat && minDistance <= 40) {
                        const seatKey = activeObj.furnitureId + '_' + clickedSeat.seatIndex;
                        const owner = Object.values(DataStore.state.students).find(st => st.ownedSeatKey === seatKey);

                        window.dispatchEvent(new CustomEvent('open-seat-modal', {
                            detail: {
                                furnitureId: activeObj.furnitureId,
                                seatIndex: clickedSeat.seatIndex,
                                studentId: clickedSeat.assignedStudentId,
                                isLocked: clickedSeat.isLocked,
                                isAnchored: !!owner,
                                anchoredStudentId: owner ? owner.id : null,
                                seatKey: seatKey
                            }
                        }));
                    }
                } else if (activeObj.furnitureType !== 'front_marker') {
                    window.dispatchEvent(new CustomEvent('open-asset-modal', {
                        detail: {
                            id: activeObj.furnitureId,
                            label: activeObj.blueprint.label,
                            width: activeObj.blueprint.width,
                            height: activeObj.blueprint.height,
							fill: activeObj.blueprint.fill,
                            stroke: activeObj.blueprint.stroke,
                            textFill: activeObj.blueprint.textFill,
                            isLocked: activeObj.isPositionLocked || false
                        }
                    }));
                }
            }
        });

        // 6. SNAP TO GRID
        this.canvas.on('object:moving', (options) => {
            if (!this.isSnapEnabled) return;
            let l = Math.round(options.target.left / 6) * 6;
            let t = Math.round(options.target.top / 6) * 6;
            options.target.set({ left: l, top: t });
            
            window.dispatchEvent(new CustomEvent('canvas-layout-moving'));
        });
        
        // 7. PREVENT TEXT SCALING
        this.canvas.on('object:scaling', (options) => {
            const obj = options.target;
            if (obj && obj.isFurniture) {
                obj.getObjects().forEach(child => {
                    if (child.type === 'textbox' || child.type === 'text') {
                        child.set({ scaleX: 1 / obj.scaleX, scaleY: 1 / obj.scaleY });
                    }
                });
            }
        });

        // 8. ASSET RESIZING & SAVE
        this.canvas.on('object:modified', (options) => {
            let obj = options.target;
            if (obj && obj.isFurniture && !obj.seats && obj.blueprint) {
                if (obj.scaleX !== 1 || obj.scaleY !== 1) {
                    obj.blueprint.width *= obj.scaleX; 
                    obj.blueprint.height *= obj.scaleY;
                    
                    const newGroup = this.buildAssetObject(obj.furnitureType, Math.abs(obj.blueprint.width), Math.abs(obj.blueprint.height), obj.blueprint.fill, obj.blueprint.stroke, obj.blueprint.label, obj.blueprint.textFill, obj.blueprint.shape);
                    
                    newGroup.set({ left: obj.left, top: obj.top, angle: obj.angle, furnitureId: obj.furnitureId, isPositionLocked: obj.isPositionLocked });
                    
                    if (newGroup.isPositionLocked) {
                        newGroup.set({ lockMovementX: true, lockMovementY: true, lockRotation: true, lockScalingX: true, lockScalingY: true, hasControls: false });
                    }
                    
                    this.canvas.remove(obj); 
                    this.canvas.add(newGroup); 
                    this.canvas.setActiveObject(newGroup);
                }
            }
            this.saveLayout(); 
        });

        // 9. DELETE KEY LISTENER
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
                const activeObj = this.canvas.getActiveObject();
                if (activeObj && activeObj.isFurniture && !activeObj.isPositionLocked) {
                    this.canvas.remove(activeObj);
                    this.saveLayout();
                    window.dispatchEvent(new CustomEvent('canvas-layout-modified'));
                }
            }
        });
    },
    // test
    updateAssetProperties(config) {
        const obj = this.canvas.getObjects().find(o => o.furnitureId === config.id);
        if (obj && !obj.seats && obj.blueprint) {
            
            // Fallback to existing blueprint colors in case the user edits an older asset
            const fill = config.fill || obj.blueprint.fill;
            const stroke = config.stroke || obj.blueprint.stroke;
            const textFill = config.textFill || obj.blueprint.textFill;

            const newGroup = this.buildAssetObject(
                obj.furnitureType, Math.abs(config.width), Math.abs(config.height), 
                fill, stroke, config.label, textFill, obj.blueprint.shape 
            );
            
            // Force strict boolean
            const lockState = !!config.isLocked; 
            
            newGroup.set({ left: obj.left, top: obj.top, angle: obj.angle, furnitureId: obj.furnitureId, isPositionLocked: lockState });
            newGroup.set({ lockMovementX: lockState, lockMovementY: lockState, lockRotation: lockState, lockScalingX: lockState, lockScalingY: lockState, hasControls: !lockState });
            
            this.canvas.remove(obj); 
            this.canvas.add(newGroup); 
            this.canvas.setActiveObject(newGroup);
            this.saveLayout(); 
        }
    },

    renderMinimap(canvasId, containerId, roomId, periodId) {
        const canvasEl = document.getElementById(canvasId);
        if (!canvasEl) return;

        if (this.minimapCanvas && this.minimapCanvas.lowerCanvasEl !== canvasEl) {
            this.minimapCanvas.dispose();
            this.minimapCanvas = null;
        }

        if (!this.minimapCanvas) {
            this.minimapCanvas = new fabric.StaticCanvas(canvasId, { backgroundColor: '#e2e8f0' });
        }
        
        this.minimapCanvas.clear();
        this.minimapCanvas.backgroundColor = '#e2e8f0';

        const room = DataStore.state.classrooms[roomId];
        if (!room) { this.minimapCanvas.renderAll(); return; }

        const wPx = room.widthFeet * 12;
        const hPx = room.lengthFeet * 12;

        const floor = new fabric.Rect({ left: 0, top: 0, width: wPx, height: hPx, fill: '#ffffff', stroke: '#475569', strokeWidth: 3 });
        this.minimapCanvas.add(floor);
		
		// --- NEW: Add the Header Text to Minimap ---
        let teacherName = room.teacherName ? room.teacherName.trim().toUpperCase() : "";
        let roomName = room.name.trim().toUpperCase();
        let periodName = "";
        if (periodId && DataStore.state.periods[periodId]) {
            periodName = DataStore.state.periods[periodId].name.trim().toUpperCase();
        }
        
        let headerText = "";
        if (teacherName) headerText += teacherName + "\n";
        headerText += roomName;
        if (periodName) headerText += " - " + periodName;

        const titleText = new fabric.Textbox(headerText, {
            left: 0, 
            top: -8, 
            width: wPx, // Force text to wrap if it exceeds the physical room width
            fontSize: 16, 
            fontFamily: 'sans-serif', 
            fontWeight: 'black', 
            fill: '#1e293b', 
            originX: 'left', 
            originY: 'bottom', 
            selectable: false, 
            evented: false, 
            lineHeight: 1.2,
            objectCaching: false 
        });
        
        this.minimapCanvas.add(titleText);
		
        // -------------------------------------------

        const savedRoom = localStorage.getItem(`CS_Room_${roomId}`);
        if (!savedRoom) {
            this.scaleMinimap(containerId, wPx, hPx);
            this.minimapCanvas.renderAll();
            return;
        }

        try {
            const manifest = JSON.parse(savedRoom);
            const savedAssigns = localStorage.getItem(`CS_Period_${periodId}`);
            let assignments = savedAssigns ? JSON.parse(savedAssigns) : {};

            manifest.forEach(f => {
                let group = null;
                
                if (f.furnitureType === 'front_marker') {
                    group = this.buildFrontMarker();
                    
                    // NEW: Keep minimap synced with period overrides
                    if (periodId && assignments['front_marker_pos']) {
                        f.left = assignments['front_marker_pos'].left;
                        f.top = assignments['front_marker_pos'].top;
                        f.angle = assignments['front_marker_pos'].angle || 0;
                    }
                }
                else if (f.furnitureType === 'row' || f.furnitureType === 'pod') {
                    const count = f.blueprint.count || (f.furnitureType === 'pod' ? f.blueprint.length : 1);
                    const totalSeats = f.furnitureType === 'pod' ? count * 2 : count;
                    const recreatedSeatsData = [];

                    for (let i = 0; i < totalSeats; i++) {
                        const key = f.furnitureId + '_' + i;
                        recreatedSeatsData.push(assignments[key] ? 
                            { seatIndex: i, assignedStudentId: assignments[key].assignedStudentId, isLocked: assignments[key].isLocked } : 
                            { seatIndex: i, assignedStudentId: null, isLocked: false });
                    }

                    if (f.furnitureType === 'row') group = this.buildRowObject(count, f.blueprint.dW, f.blueprint.dL, recreatedSeatsData);
                    else if (f.furnitureType === 'pod') group = this.buildPodObject(f.blueprint.length, f.blueprint.dW, f.blueprint.dL, recreatedSeatsData);
                } 
                else {
                    group = this.buildAssetObject(f.furnitureType, f.blueprint.width, f.blueprint.height, f.blueprint.fill, f.blueprint.stroke, f.blueprint.label, f.blueprint.textFill, f.blueprint.shape);
                }

                if (group) {
                    group.set({ left: f.left, top: f.top, angle: f.angle, scaleX: f.scaleX, scaleY: f.scaleY });
                    this.minimapCanvas.add(group);
                }
            });

            this.scaleMinimap(containerId, wPx, hPx);
            this.minimapCanvas.renderAll();
        } catch (e) { console.error("Minimap failed to load.", e); }
    },

    scaleMinimap(containerId, roomW, roomH) {
        const container = document.getElementById(containerId);
        if (!container || !this.minimapCanvas) return;
        
        const rect = container.getBoundingClientRect();
        if (rect.width < 10) return;

        // NEW: Add the same 40px vertical buffer used in the main canvas for the header
        const totalH = roomH + 40;

        const scale = Math.min(rect.width / roomW, rect.height / totalH) * 0.90; 
        
        this.minimapCanvas.setDimensions({ width: rect.width, height: rect.height });
        this.minimapCanvas.setZoom(scale);

        const vpt = this.minimapCanvas.viewportTransform;
        vpt[4] = (rect.width - (roomW * scale)) / 2;
        
        // NEW: Shift the room down into the buffer space so the text isn't cut off at the top
        vpt[5] = ((rect.height - (totalH * scale)) / 2) + (40 * scale);
        
        this.minimapCanvas.renderAll(); 
    },

    setSnap(enabled) {
        this.isSnapEnabled = enabled;
        fabric.Object.prototype.snapAngle = enabled ? 5 : 0;
        fabric.Object.prototype.snapThreshold = enabled ? 5 : 0;
    },

    setDeskLock(isLocked) {
        this.isGlobalDeskLocked = isLocked;
        if (!this.canvas) return;
        this.canvas.getObjects().forEach(obj => {
            if (obj.isFurniture && obj.seats) {
                obj.set({ lockMovementX: isLocked, lockMovementY: isLocked, lockRotation: isLocked, lockScalingX: isLocked, lockScalingY: isLocked, hasControls: !isLocked, hoverCursor: isLocked ? 'default' : 'move' });
            }
        });
        this.canvas.discardActiveObject(); 
        this.canvas.requestRenderAll(); 
    },

    flipSeatText(isFlipped) {
        this.isTextFlipped = isFlipped;
        if (!this.canvas) return;
        this.canvas.getObjects().forEach(obj => {
            if (obj.isFurniture && obj.seats) {
                // FIX: Un-rotate before update
                const originalAngle = obj.angle;
                obj.set({ angle: 0 });

                obj.seats.forEach(s => {
                    if (s.textObj) s.textObj.set({ angle: isFlipped ? 180 : 0 });
                });
                
                obj.addWithUpdate(); 
                obj.set({ angle: originalAngle }); // Snap back
            }
        });
        this.canvas.requestRenderAll();
    },

    validateSeatingLayout(students, minDistanceInches) {
        if (!this.canvas) return;
        const furnitureGroups = this.canvas.getObjects().filter(o => o.isFurniture && o.seats);

        furnitureGroups.forEach(g => {
            let changed = false;
            g.seats.forEach(s => {
                let deskStroke = '#d97706';
                let deskStrokeWidth = 1.5;
                
                if (s.assignedStudentId) {
                    const student = students[s.assignedStudentId];
                    if (student && student.requiresPreferredSeating) { deskStroke = '#8b5cf6'; deskStrokeWidth = 3; }
                }
                
                if (s.rectObj.fill !== '#fef3c7' || s.rectObj.stroke !== deskStroke || s.rectObj.strokeWidth !== deskStrokeWidth) {
                    s.rectObj.set({ fill: '#fef3c7', stroke: deskStroke, strokeWidth: deskStrokeWidth });
                    changed = true;
                }
            });
            if (changed) {
                // FIX 1: Un-rotate before clearing old red highlights
                const originalAngle = g.angle;
                g.set({ angle: 0 });
                g.addWithUpdate(); 
                g.set({ angle: originalAngle });
            }
        });

        const allSeatsPool = [];
        furnitureGroups.forEach(g => g.seats.forEach(s => allSeatsPool.push({ group: g, seat: s })));

        for (let i = 0; i < allSeatsPool.length; i++) {
            for (let j = i + 1; j < allSeatsPool.length; j++) {
                const nodeA = allSeatsPool[i]; const nodeB = allSeatsPool[j];
                if (!nodeA.seat.assignedStudentId || !nodeB.seat.assignedStudentId) continue;

                const studentA = students[nodeA.seat.assignedStudentId];
                const studentB = students[nodeB.seat.assignedStudentId];
                if (!studentA || !studentB) continue;

                const safeRestrictedA = studentA.restrictedStudentIds || [];
                const safeRestrictedB = studentB.restrictedStudentIds || [];

                if (safeRestrictedA.includes(studentB.id) || safeRestrictedB.includes(studentA.id)) {
                    
                    const posA = this.getGlobalSeatCenter(nodeA.group, nodeA.seat);
                    const posB = this.getGlobalSeatCenter(nodeB.group, nodeB.seat);
                    
                    const centerDistance = Math.sqrt(Math.pow(posA.x - posB.x, 2) + Math.pow(posA.y - posB.y, 2));
                    const edgeToEdgeDistance = centerDistance - 24;

                    let isViolated = edgeToEdgeDistance < minDistanceInches;
                    const isSameColumn = Math.abs(posA.x - posB.x) < 20; 
                    const isDirectlyBehind = isSameColumn && Math.abs(posA.y - posB.y) < 60;

                    if (isViolated || isDirectlyBehind) {
                        nodeA.seat.rectObj.set({ fill: '#ef4444' });
                        nodeB.seat.rectObj.set({ fill: '#ef4444' });
                        
                        // FIX 2: Un-rotate before applying new red highlights
                        const angleA = nodeA.group.angle;
                        nodeA.group.set({ angle: 0 });
                        nodeA.group.addWithUpdate(); 
                        nodeA.group.set({ angle: angleA });

                        const angleB = nodeB.group.angle;
                        nodeB.group.set({ angle: 0 });
                        nodeB.group.addWithUpdate();
                        nodeB.group.set({ angle: angleB });
                    }
                }
            }
        }
        this.canvas.renderAll();
    },
    
    exportToPDF(className = "Classroom") {
        if (!this.canvas) return;

        // 1. Reset the view so it is perfectly centered and scaled
        this.recalculateDimensions();
        this.canvas.discardActiveObject();

        // 2. Hide grid lines, strip highlights, and hide lock/anchor icons
        const objects = this.canvas.getObjects();
        
        objects.forEach(obj => {
            if (obj.isBackgroundElement && obj.type === 'line') {
                obj.visible = false;
            }
            
            if (obj.isFurniture && obj.seats) {
                obj.seats.forEach(s => {
                    // Strip color highlights
                    if (s.rectObj) {
                        s.rectObj.set({
                            fill: '#fef3c7',
                            stroke: '#d97706',
                            strokeWidth: 1.5
                        });
                    }
                    // Hide UI icons
                    if (s.lockIconObj) s.lockIconObj.visible = false;
                    if (s.anchorIconObj) s.anchorIconObj.visible = false;
                });
            }
        });

        // Force a render to apply the invisible grids, clean desks, and hidden icons
        this.canvas.renderAll();

        // 3. Export the canvas as a high-res PNG
        const dataUrl = this.canvas.toDataURL({
            format: 'png',
            multiplier: 2 
        });

        // 4. Restore the UI (Grid lines, icons back on, run validation to get highlights back)
        objects.forEach(obj => {
            if (obj.isBackgroundElement && obj.type === 'line') {
                obj.visible = true;
            }
            if (obj.isFurniture && obj.seats) {
                obj.seats.forEach(s => {
                    if (s.lockIconObj) s.lockIconObj.visible = true;
                    if (s.anchorIconObj) s.anchorIconObj.visible = true;
                });
            }
        });
        
        const minSep = DataStore.state.settings.minSeparationInches || 48;
        this.validateSeatingLayout(DataStore.state.students, minSep);

        // 5. Initialize and save the PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'in',
            format: 'letter'
        });

        const pdfWidth = 11;
        const pdfHeight = 8.5;
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        
        const ratio = Math.min(pdfWidth / canvasW, pdfHeight / canvasH);
        const safeRatio = ratio * 0.95; 
        
        const imgWidth = canvasW * safeRatio;
        const imgHeight = canvasH * safeRatio;
        
        const marginX = (pdfWidth - imgWidth) / 2;
        const marginY = (pdfHeight - imgHeight) / 2;

        doc.addImage(dataUrl, 'PNG', marginX, marginY, imgWidth, imgHeight);
        
        const safeName = className.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        doc.save(`Seating_Chart_${safeName}.pdf`);
    },
	
	setBoardMode(isActive) {
        if (!this.canvas) return;

        // 1. Toggle the background
        if (isActive) {
            this.canvas.backgroundColor = '#ffffff';
        } else {
            this.canvas.backgroundColor = 'transparent'; 
        }

        // 2. Strip icons and freeze furniture
        this.canvas.getObjects().forEach(obj => {
            if (obj.furnitureType === 'front_marker') {
                obj.set({ opacity: isActive ? 0 : 1 });
            }

            if (obj.isFurniture) {
                obj.set({ selectable: !isActive, evented: !isActive });

                if (obj.seats) {
                    obj.seats.forEach(s => {
                        if (s.lockIconObj) {
                            if (isActive) s.lockIconObj.set({ opacity: 0 });
                            else s.lockIconObj.set({ opacity: s.isLocked ? 1 : 0 });
                        }
                        if (s.anchorIconObj) {
                            const isHomeroomActive = DataStore.state.ui.activePeriodId === 'period_homeroom_base';
                            const isAnchored = Object.values(DataStore.state.students).some(st => st.ownedSeatKey === obj.furnitureId + '_' + s.seatIndex);
                            
                            if (isActive) s.anchorIconObj.set({ opacity: 0 });
                            else s.anchorIconObj.set({ opacity: (isAnchored && isHomeroomActive) ? 1 : 0 });
                        }
                        
                        // NEW: Strip color highlights to make the board perfectly clean
                        if (isActive && s.rectObj) {
                            s.rectObj.set({ fill: '#fef3c7', stroke: '#d97706', strokeWidth: 1.5 });
                        }
                    });
                    
                    const originalAngle = obj.angle;
                    obj.set({ angle: 0 });
                    obj.addWithUpdate();
                    obj.set({ angle: originalAngle });
                }
            }
        });

        // NEW: Restore the restriction/preference highlights when exiting board mode
        if (!isActive) {
            const minSep = DataStore.state.settings.minSeparationInches || 48;
            this.validateSeatingLayout(DataStore.state.students, minSep);
        } else {
            this.canvas.requestRenderAll();
        }
    }
};