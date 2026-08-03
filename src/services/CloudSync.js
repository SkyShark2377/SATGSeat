// src/services/CloudSync.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCJCNngnXu19YmXOHg7esaZk8EVqTwQgvg",
    authDomain: "seating-chart-sync.firebaseapp.com",
    projectId: "seating-chart-sync",
    storageBucket: "seating-chart-sync.firebasestorage.app",
    messagingSenderId: "760833999134",
    appId: "1:760833999134:web:f347283ca6fb560522890f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const CloudSync = {
    syncKey: null,
    unsubscribe: null,
    pendingTimeout: null,
    isReceiving: false,
    
    // NEW: Memory bank to kill server echoes
    lastKnownPayload: null, 

    setStatus(status) {
        window.dispatchEvent(new CustomEvent('cloud-status', { detail: { status } }));
    },

    init(key) {
        this.syncKey = key;
        const docRef = doc(db, "workspaces", this.syncKey);
        
        this.setStatus('connected');
        console.log(`☁️ Cloud Sync Connected to: ${key}`);

        this.unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.metadata.hasPendingWrites) return;

            if (snapshot.exists()) {
                const data = snapshot.data();
                
                // NEW: THE ECHO KILLER
                // If the incoming data is identical to what we just sent (or already received), ignore it!
                if (data.payload === this.lastKnownPayload) return;
                
                this.lastKnownPayload = data.payload;

                if (localStorage.getItem('CS_OfflineChanges') === 'true') {
                    window.dispatchEvent(new CustomEvent('cloud-conflict', { detail: data.payload }));
                    return;
                }

                if (data.payload) {
                    window.dispatchEvent(new CustomEvent('cloud-data-received', { detail: data.payload }));
                    this.setStatus('connected');
                }
            }
        });
    },

    triggerPush() {
        if (!this.syncKey || this.isReceiving) return; 
        
        if (!navigator.onLine) {
            localStorage.setItem('CS_OfflineChanges', 'true');
            this.setStatus('offline');
            return;
        }
        
        if (this.pendingTimeout) clearTimeout(this.pendingTimeout);
        
        this.pendingTimeout = setTimeout(async () => {
            this.setStatus('syncing'); 

            try {
                // NEW: Memorize exactly what we are sending to the server BEFORE we send it
                const payloadString = this.getCloudPayload();
                this.lastKnownPayload = payloadString;

                const docRef = doc(db, "workspaces", this.syncKey);
                await setDoc(docRef, {
                    payload: payloadString,
                    lastUpdated: serverTimestamp()
                });
                
                localStorage.removeItem('CS_OfflineChanges');
                this.setStatus('connected');
                
            } catch (e) {
                console.error("☁️ Cloud Sync Failed", e);
                this.setStatus('error');
            }
        }, 1000); 
    },

    getCloudPayload() {
        const dump = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key === 'ClassroomSeatingSuite_v2' || key.startsWith('CS_')) { 
                dump[key] = localStorage.getItem(key);
            }
        }
        return JSON.stringify(dump);
    }
};