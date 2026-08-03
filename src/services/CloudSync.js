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
    isReceiving: false, // NEW: Lock to prevent infinite ping-pong loops

    setStatus(status) {
        window.dispatchEvent(new CustomEvent('cloud-status', { detail: { status } }));
    },

    init(key) {
        this.syncKey = key;
        const docRef = doc(db, "workspaces", this.syncKey);
        
        this.setStatus('connected');
        console.log(`☁️ Cloud Sync Connected to: ${key}`);

        this.unsubscribe = onSnapshot(docRef, (snapshot) => {
            // NEW: Ignore local echoes! Firebase immediately fires this when WE click save.
            if (snapshot.metadata.hasPendingWrites) return;

            if (snapshot.exists()) {
                const data = snapshot.data();
                
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
        // NEW: Do not push to the cloud if we are currently unpacking a cloud update!
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
                const docRef = doc(db, "workspaces", this.syncKey);
                await setDoc(docRef, {
                    payload: this.getCloudPayload(),
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