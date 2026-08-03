// src/services/CloudSync.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// Notice we swapped onSnapshot for getDoc here:
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
    pendingTimeout: null,
    isReceiving: false,

    setStatus(status) {
        window.dispatchEvent(new CustomEvent('cloud-status', { detail: { status } }));
    },

    init(key) {
        this.syncKey = key;
        this.setStatus('connected');
        console.log(`☁️ Cloud Sync Connected to: ${key}`);
        
        // Fetch the newest data immediately when she opens the app
        this.pullData();
    },

    // Manual one-time fetch
    async pullData() {
        if (!this.syncKey) return;
        
        this.setStatus('syncing'); 
        this.isReceiving = true; // Lock the transmitter
        
        try {
            const docRef = doc(db, "workspaces", this.syncKey);
            const snapshot = await getDoc(docRef); 
            
            if (snapshot.exists()) {
                const data = snapshot.data();
                
                if (localStorage.getItem('CS_OfflineChanges') === 'true') {
                    window.dispatchEvent(new CustomEvent('cloud-conflict', { detail: data.payload }));
                    this.isReceiving = false; // FIX: Unlock so she can push her local conflict choice!
                    return;
                }

                if (data.payload) {
                    window.dispatchEvent(new CustomEvent('cloud-data-received', { detail: data.payload }));
                    // If data exists, the 2.5s timer in index.html will handle the unlock
                } else {
                    this.isReceiving = false; // FIX: Unlock if payload is mysteriously empty
                }
            } else {
                // THE SMOKING GUN FIX: The workspace doesn't exist yet!
                console.log("☁️ Brand new workspace detected. Transmitter unlocked.");
                this.isReceiving = false; 
            }
            
            this.setStatus('connected');
        } catch (e) {
            console.error("☁️ Cloud Sync Pull Failed", e);
            this.setStatus('error');
            this.isReceiving = false; // FIX: Always unlock if the network fails
        }
    },

    // Push remains exactly the same! (But we removed the memory JSON checker since there are no more echoes)
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
                const docRef = doc(db, "workspaces", this.syncKey);
                await setDoc(docRef, {
                    payload: this.getCloudPayload(),
                    lastUpdated: serverTimestamp()
                });
                
                localStorage.removeItem('CS_OfflineChanges');
                this.setStatus('connected');
                
            } catch (e) {
                console.error("☁️ Cloud Sync Push Failed", e);
                this.setStatus('error');
            }
        }, 1000); 
    },

    getCloudPayload() {
        const dump = {};
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key === 'ClassroomSeatingSuite_v2' || key.startsWith('CS_')) { 
                keys.push(key);
            }
        }
        keys.sort();
        for (const key of keys) {
            dump[key] = localStorage.getItem(key);
        }
        return JSON.stringify(dump);
    }
};