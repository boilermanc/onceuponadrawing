const DB_NAME = 'onceuponadrawing-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'draft';
const DRAFT_KEY = 'current-draft';

interface StoredDraft {
  originalImage: string;
  analysisJson: string;
  videoBlob: Blob;
}

interface RestoredDraft {
  originalImage: string;
  analysis: object;
  videoUrl: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveDraft(
  originalImage: string,
  analysis: object,
  videoUrl: string
): Promise<void> {
  // Fetch the blob from the blob URL
  const response = await fetch(videoUrl);
  const videoBlob = await response.blob();

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const draft: StoredDraft = {
      originalImage,
      analysisJson: JSON.stringify(analysis),
      videoBlob,
    };

    const request = store.put(draft, DRAFT_KEY);

    request.onerror = () => {
      reject(new Error(`Failed to save draft: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function restoreDraft(): Promise<RestoredDraft | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(DRAFT_KEY);

    request.onerror = () => {
      reject(new Error(`Failed to restore draft: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      const draft = request.result as StoredDraft | undefined;

      if (!draft) {
        resolve(null);
        return;
      }

      const videoUrl = URL.createObjectURL(draft.videoBlob);
      const analysis = JSON.parse(draft.analysisJson);

      resolve({
        originalImage: draft.originalImage,
        analysis,
        videoUrl,
      });
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function clearDraft(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(DRAFT_KEY);

    request.onerror = () => {
      reject(new Error(`Failed to clear draft: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function hasDraft(): Promise<boolean> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count(DRAFT_KEY);

    request.onerror = () => {
      reject(new Error(`Failed to check draft: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result > 0);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}
