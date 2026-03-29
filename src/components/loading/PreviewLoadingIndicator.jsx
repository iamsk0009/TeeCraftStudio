import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * PreviewLoadingIndicator - Shows when previews are being generated in background
 * 
 * Usage:
 * <PreviewLoadingIndicator designId={designId} userId={userId} />
 */
export default function PreviewLoadingIndicator({ designId, userId }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!designId || !userId) return;

    // Listen to design document changes
    const designDocRef = doc(db, 'designs', userId, 'mydesigns', designId);
    
    const unsubscribe = onSnapshot(designDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const previewUrls = data.previewUrls || {};
        const totalViews = 4; // front, back, left, right
        const completedViews = Object.keys(previewUrls).length;
        
        setProgress((completedViews / totalViews) * 100);
        
        // Check if all previews are ready
        if (completedViews < totalViews) {
          setIsGenerating(true);
        } else {
          setIsGenerating(false);
        }
      }
    });

    // Set initial generating state
    setIsGenerating(true);

    return () => unsubscribe();
  }, [designId, userId]);

  if (!isGenerating) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 flex items-center gap-3 z-50 border border-gray-200">
      <div className="relative w-10 h-10">
        <svg className="animate-spin h-10 w-10 text-blue-500" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <div className="flex flex-col">
        <p className="text-sm font-medium text-gray-700">
          Generating previews...
        </p>
        <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
