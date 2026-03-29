import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchDesignFromLocalStorage } from "../utils/save";

function MyDesigns() {
  const { t } = useTranslation();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        setLoading(true);
        const fetchedDesigns = [];

        // In local-only mode, we look for all keys starting with "design_"
        // and also the legacy "design" key if it exists
        const designKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('design_') || key === 'design'
        );

        for (const key of designKeys) {
          try {
            const designDataStr = localStorage.getItem(key);
            if (designDataStr) {
              const designData = JSON.parse(designDataStr);
              if (designData.textureUrl && designData.designId) {
                // Avoid duplicates if both "design" and "design_ID" exist for same design
                if (!fetchedDesigns.find(d => d.id === designData.designId)) {
                  fetchedDesigns.push({
                    id: designData.designId,
                    textureUrl: designData.textureUrl,
                  });
                }
              }
            }
          } catch (e) {
            console.error(`Error parsing design from key ${key}:`, e);
          }
        }

        setDesigns(fetchedDesigns);
      } catch (error) {
        console.error("Error fetching designs:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDesigns();
  }, []);
  
  const baseUrl = `${window.location.origin}`
  const [redirectingDesign, setRedirectingDesign] = useState(false);

  const handleClick = async (docId) => {
    try {
      setRedirectingDesign(true);
      const designData = await fetchDesignFromLocalStorage(docId);
      const productName = designData.product?.name?.toLowerCase().replace(/\s+/g, '-') || 'default-product';
      
      // Update the URL to local-only structure
      window.location.href = `${baseUrl}/${productName}/${docId}`;
    } catch (error) {
      console.error('Error processing design:', error);
      window.location.href = `${baseUrl}/default-product/${docId}`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-purple-700 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {redirectingDesign && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-800">{t('myDesigns.openingDesign')}</span>
          </div>
        </div>
      )}
      <div className="h-full flex flex-col relative">
        <h2 className="md:text-xl text-lg font-semibold mb-4 flex-shrink-0">
          {t('myDesigns.title')}
        </h2>

        <div className="flex-1 overflow-y-auto">
          {designs.length === 0 ? (
            <p>{t('myDesigns.noDesigns')}</p>
          ) : (
            <div className="flex flex-wrap md:gap-6 gap-4 pb-4">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="relative group cursor-pointer w-20 h-20 md:w-48 md:h-48 shadow-lg rounded-lg"
                  onClick={() => handleClick(design.id)}
                >
                  <img
                    src={design.textureUrl}
                    alt="My Design"
                    className="w-full h-full object-cover rounded-xl shadow-md transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-200">
                    <span className="text-white font-medium text-sm">{t('myDesigns.editDesign')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default MyDesigns;
