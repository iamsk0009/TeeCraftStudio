import  { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function PreviewUrls() {
  const navigate = useNavigate();
  const { designId } = useParams();

  const [previewUrls, setPreviewUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPreviews = async () => {
      if (!designId) {
        setError('Design ID is required');
        setLoading(false);
        return;
      }

      try {
        // Get light data from localStorage
        const lightDataStr = localStorage.getItem(`design_${designId}`) || localStorage.getItem("design");
        if (!lightDataStr) {
          throw new Error("Design not found in local storage");
        }
        
        const lightData = JSON.parse(lightDataStr);
        
        // Check if designId matches (if we pulled from "design" key)
        if (lightData.designId !== designId && !localStorage.getItem(`design_${designId}`)) {
           throw new Error("Design ID mismatch or not found");
        }

        // Use previewUrls if they exist in the saved data
        setPreviewUrls(lightData.previewUrls || {});
      } catch (err) {
        console.error('Error fetching preview urls from local storage', err);
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchPreviews();
  }, [designId]);

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="text-xl">Loading previews…</div>
    </div>
  );
  
  if (error) return (
    <div className="h-screen w-full flex flex-col items-center justify-center">
      <div className="text-xl text-red-600 mb-4">{error}</div>
      <button 
        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors" 
        onClick={() => navigate(-1)}
      >
        Go back
      </button>
    </div>
  );

  const views = ['front', 'back', 'left', 'right'];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="h-screen max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-2 gap-6 h-full">
          {views.map((v) => (
            <div 
              key={v} 
              className="relative bg-white rounded-lg shadow-lg overflow-hidden flex items-center justify-center"
            >
              {previewUrls[v] ? (
                <img 
                  src={previewUrls[v]} 
                  alt={`${v} preview`} 
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" 
                />
              ) : (
                <div className="text-lg text-gray-400 capitalize absolute inset-0 flex items-center justify-center">
                  {v} view not available locally
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
