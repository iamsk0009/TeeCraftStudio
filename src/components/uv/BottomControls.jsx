import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  faMinus,
  faPlus,
  faSave,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { setZoomLevel } from "../../redux/bottomControlsSlice";
import { saveDesignToLocalStorage } from "../utils/save";
import { useTranslation } from "react-i18next";

function BottomControls() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const zoomLevel = useSelector((state) => state.bottomControls.zoomLevel);
  const color = useSelector((state) => state.color.color);
  const textureUrl = useSelector((state) => state.texture.textureUrl);
  const { designId } = useSelector((state) => state.design);
  const { selectedProduct, categories } = useSelector((state) => state.products);
  const images = useSelector((state) => state.upload.images);
  const textboxes = useSelector((state) => state.upload.textboxes);
  const layerOrder = useSelector((state) => state.upload.layerOrder);

  const handleZoomIn = () => {
    dispatch(setZoomLevel(Math.min(zoomLevel + 10, 200)));
  };

  const handleZoomOut = () => {
    dispatch(setZoomLevel(Math.max(zoomLevel - 10, 50)));
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const designData = {
        designId,
        productId: selectedProduct.id,
        selectedProduct: selectedProduct,
        categories: categories,
        images,
        textboxes,
        textureUrl,
        color,
        layerOrder,
      };

      await saveDesignToLocalStorage(designData);

      toast.success(t("bottomControls.designSaved"), {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error("Error saving design:", error);
      toast.error(t("bottomControls.saveError"), {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    }
  };

  return (
    <>
      <div className="absolute bottom-8 md:left-40 md:transform md:-translate-x-1/2 right-[22.5%] md:right-auto bg-white rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.1)] px-3 py-1.5 flex items-center gap-0 md:gap-4 border border-gray-200 layer-controls">
        {/* Left Section - Selection Tools */}
        <div className="hidden md:flex items-center gap-2 border-r border-gray-200 pr-4"></div>

        {/* Middle Section - Zoom Controls */}
        <div className="hidden md:flex items-center gap-2">
          <button
            className="group relative p-2 hover:bg-gray-100 rounded-xl cursor-pointer"
            onClick={handleZoomOut}>
            <FontAwesomeIcon
              icon={faMinus}
              className="text-[#10196A] hover:text-[#A074DB]"
            />
            <div className="absolute invisible group-hover:visible bottom-full left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded mb-4 whitespace-nowrap">
              {t("bottomControls.zoomOut")}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-gray-800 border-r-[6px] border-r-transparent"></div>
            </div>
          </button>
          <span className="w-16 text-center text-sm font-medium text-[#10196A] select-none">
            {Math.round(zoomLevel)}%
          </span>
          <button
            className="group relative p-2 hover:bg-gray-100 rounded-xl cursor-pointer"
            onClick={handleZoomIn}>
            <FontAwesomeIcon
              icon={faPlus}
              className="text-[#10196A] hover:text-[#A074DB]"
            />
            <div className="absolute invisible group-hover:visible bottom-full left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded mb-4 whitespace-nowrap">
              {t("bottomControls.zoomIn")}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-gray-800 border-r-[6px] border-r-transparent"></div>
            </div>
          </button>
        </div>

        {/* Right Section - Save Control */}
        <div className="flex items-center gap-2 md:border-l md:border-[#10196A] md:pl-4">
          <button
            className={`group relative p-1.5 md:p-2 hover:bg-gray-100 rounded-xl  ${
              isSaving ? "cursor-not-allowed opacity-70" : "cursor-pointer"
            }`}
            onClick={handleSave}>
            {isSaving ? (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="text-[#10196A] animate-spin text-sm md:text-base"
                />
                <span className="hidden md:flex text-xs">
                  {t("bottomControls.savingDesign")}
                </span>
              </div>
            ) : (
              <>
                <FontAwesomeIcon
                  icon={faSave}
                  className="text-[#10196A] hover:text-[#A074DB] text-base"
                />
                <div className="absolute invisible group-hover:visible bottom-full left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded mb-4 whitespace-nowrap">
                  {t("bottomControls.saveDesign")}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-gray-900 border-r-[6px] border-r-transparent"></div>
                </div>
              </>
            )}
          </button>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default BottomControls;
