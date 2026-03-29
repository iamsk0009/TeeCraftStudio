// Firebase is disabled for local-only operation.
// Exporting dummy objects to prevent import errors.

export const analytics = { 
  mock: true, 
  logEvent: () => {} 
};

export const db = { 
  mock: true, 
  collection: () => ({ 
    doc: () => ({ 
      get: () => Promise.resolve({ exists: false, data: () => ({}) }),
      set: () => Promise.resolve(),
      onSnapshot: (cb) => { cb({ exists: false, data: () => ({}) }); return () => {}; }
    }),
    where: () => ({
      getDocs: () => Promise.resolve({ docs: [] }),
      query: () => ({})
    })
  }) 
}; 

export const storage = { 
  mock: true, 
  ref: () => ({ 
    put: () => Promise.resolve(), 
    getDownloadURL: () => Promise.resolve(""),
    listAll: () => Promise.resolve({ items: [] }),
    deleteObject: () => Promise.resolve()
  }) 
};

const app = { mock: true };
export default app;
