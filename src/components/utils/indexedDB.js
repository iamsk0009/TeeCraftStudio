// Helper functions for IndexedDB operations
const DB_NAME = 'designsDB';
const DB_VERSION = 1;
const STORE_NAME = 'designs';

// Open IndexedDB connection
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'designId' });
      }
    };
  });
};

// Save design to IndexedDB
export const saveToIndexedDB = async (designData) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(designData);

    request.onsuccess = () => resolve({ success: true });
    request.onerror = () => reject(request.error);
  });
};

// Get design from IndexedDB
export const getFromIndexedDB = async (designId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(designId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Delete design from IndexedDB
export const deleteFromIndexedDB = async (designId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(designId);

    request.onsuccess = () => resolve({ success: true });
    request.onerror = () => reject(request.error);
  });
};

export const deleteDatabase = async () => {
  return new Promise((resolve, reject) => {
    // Close all connections first
    try {
      const request = indexedDB.databases?.();
      if (request) {
        request.forEach(db => {
          if (db.name === DB_NAME) {
            const openRequest = indexedDB.open(DB_NAME);
            openRequest.onsuccess = () => {
              openRequest.result.close();
            };
          }
        });
      }
    } catch (error) {
      console.warn('Error closing DB before deletion:', error);
    }

    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

    deleteRequest.onsuccess = () => resolve({ success: true });
    deleteRequest.onerror = () => reject(deleteRequest.error);
    deleteRequest.onblocked = () => {
      console.warn('Database deletion blocked');
      resolve({ success: true }); // Resolve anyway since the deletion is queued
    };
  });
};