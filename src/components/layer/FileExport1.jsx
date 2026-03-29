import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { generateTextureForPart } from "../utils/generateTexture";

const FileExport1 = () => {
  const { t } = useTranslation();

  const { selectedProduct, categories } = useSelector((state) => state.products);
  const color = useSelector((state) => state.color.color);
  const images = useSelector((state) => state.upload.images);
  const textboxes = useSelector((state) => state.upload.textboxes);
  const layerOrder = useSelector((state) => state.upload.layerOrder);
  const [selectedViews, setSelectedViews] = useState({
    front: true,
    back: true,
    right: true,
    left: true,
  });
  const [isLoading, setIsLoading] = useState({
    views: false,
    svg: false,
  });

  const handleScreenshot = async () => {
    if (!window.setCanvasView || !window.takeCanvasScreenshot) return;

    setIsLoading((prev) => ({ ...prev, views: true }));

    // Filter selected views
    const selectedViewsList = Object.entries(selectedViews)
      .filter(([, isSelected]) => isSelected)
      .map(([view]) => view);

    if (selectedViewsList.length === 0) {
      setIsLoading((prev) => ({ ...prev, views: false }));
      return;
    }

    try {
      const allPreviews = [];
      // Process views sequentially
      for (const view of selectedViewsList) {
        // Set single view at a time
        window.selectedViews = [view];
        // Add a small delay to ensure canvas updates
        await new Promise((resolve) => setTimeout(resolve, 300));
        // Capture single view
        const previews = await window.takeCanvasScreenshot();
        allPreviews.push(...previews);
      }
      // Download each preview
      allPreviews.forEach(({ view, screenshotDataUrl }) => {
        const link = document.createElement("a");
        link.href = screenshotDataUrl;
        link.download = `product_${view}_view.png`;
        link.click();
      });
    } catch (error) {
      console.error("Error downloading screenshots:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, views: false }));
    }
  };

  const handleSvgDownload = async () => {
    if (!selectedProduct?.selectedSvgIds?.[0]) {
      console.error("No SVG part selected");
      return;
    }

    setIsLoading((prev) => ({ ...prev, svg: true }));

    try {
      // Check if this is a socks product
      const socksCategory = categories?.find(cat => 
        cat.name?.toLowerCase().includes('socks')
      );
      const isSocksProduct = socksCategory && selectedProduct?.category === socksCategory.id;
      
      // Create refs from DOM elements
      const containerRef = { current: document.querySelector(".content") };
      const svgRef = { current: document.querySelector("#Layer_1") };
      const textureCanvasRef = { current: document.createElement("canvas") };
     
      const svgUrl = await generateTextureForPart(
        containerRef,
        svgRef,
        textureCanvasRef,
        images,
        textboxes,
        color, // Pass color directly
        layerOrder,
        isSocksProduct
      );

      const link = document.createElement("a");
      link.href = svgUrl;
      link.download = `product_layered.svg`;
      link.click();

      // Cleanup URL object
      URL.revokeObjectURL(svgUrl);
    } catch (error) {
      console.error("Error downloading SVG:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, svg: false }));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 layer-controls w-full h-full">
      <h2 className="md:text-lg text-sm font-semibold text-gray-800">
        {t("fileExport.title")}
      </h2>
      <div className="flex flex-col gap-6">
        <div className="w-full max-w-xs">
          <label className="block text-gray-700 md:text-sm text-xs font-bold mb-2">
            {t("fileExport.selectViews")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(selectedViews).map(([view, isSelected]) => (
              <label
                key={view}
                className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() =>
                    setSelectedViews((prev) => ({
                      ...prev,
                      [view]: !prev[view],
                    }))
                  }
                  className="form-checkbox h-4 w-4 text-[#823AEC] rounded border-gray-300 focus:ring-[#823AEC]"
                />
                <span className="ml-2 md:text-sm text-xs font-medium text-gray-700">
                  {t(`fileExport.${view}View`)}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="space-y-4">
            <button
              onClick={handleScreenshot}
              disabled={isLoading.views}
              className={`w-full ${
                isLoading.views
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#823AEC] hover:bg-[#6B2EC7] cursor-pointer"
              } text-white px-6 py-3 rounded-xl md:text-base text-sm flex items-center justify-center`}>
              {isLoading.views ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t("fileExport.downloading")}
                </>
              ) : (
                t("fileExport.exportButton")
              )}
            </button>

            <button
              onClick={handleSvgDownload}
              disabled={isLoading.svg}
              className={`w-full ${
                isLoading.svg
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#823AEC] hover:bg-[#6B2EC7] cursor-pointer"
              } text-white px-6 py-3 rounded-xl md:text-base text-sm flex items-center justify-center`}>
              {isLoading.svg ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t("fileExport.downloadingSvg")}
                </>
              ) : (
                "Download Layered SVG"
              )}
            </button>

            <div className="md:text-sm text-xs text-gray-500 mt-2">
              {t("fileExport.viewsInfo")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileExport1;
