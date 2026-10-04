/**
 * IndexedDB Persistent Storage for User Character Poses
 * Allows saving high-resolution PNG data URLs across browser sessions,
 * avoiding the 5MB quota limit of localStorage.
 */

const DB_NAME = 'ShortsCharacterDB';
const DB_VERSION = 1;
const STORE_NAME = 'character_poses';
const POSES_KEY = 'saved_poses_data';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open database'));
    };
  });
}

/**
 * Save user character poses to IndexedDB
 */
export async function saveStoredPoses(poses: Record<string, string>): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(poses, POSES_KEY);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.warn('Failed to save character poses to IndexedDB');
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('IndexedDB write error:', err);
    // Fallback: try localStorage for smaller data sets if possible
    try {
      localStorage.setItem(POSES_KEY, JSON.stringify(poses));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Retrieve saved character poses from IndexedDB
 */
export async function getStoredPoses(): Promise<Record<string, string> | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(POSES_KEY);

      request.onsuccess = () => {
        if (request.result && typeof request.result === 'object') {
          resolve(request.result as Record<string, string>);
        } else {
          // Check fallback localStorage
          try {
            const raw = localStorage.getItem(POSES_KEY);
            if (raw) {
              resolve(JSON.parse(raw));
              return;
            }
          } catch {}
          resolve(null);
        }
      };

      request.onerror = () => {
        try {
          const raw = localStorage.getItem(POSES_KEY);
          if (raw) {
            resolve(JSON.parse(raw));
            return;
          }
        } catch {}
        resolve(null);
      };
    });
  } catch (err) {
    try {
      const raw = localStorage.getItem(POSES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }
}

/**
 * Clear stored character poses from IndexedDB
 */
export async function clearStoredPoses(): Promise<boolean> {
  try {
    try {
      localStorage.removeItem(POSES_KEY);
    } catch {}

    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(POSES_KEY);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
