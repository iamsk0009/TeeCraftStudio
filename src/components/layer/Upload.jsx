import React, { useRef, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { useTranslation } from "react-i18next";
import {
  addImage,
  setSelectedImage,
  setSelectedElement,
  // deleteImage,
} from "../../redux/uploadSlice";
import { deleteImageSafe } from "../../utils/deleteImageSafe";
import { constrainElementToPath } from "../utils/elementConstraints";
import { setSelectedTool } from "../../redux/loadingSlice";
import {
  faTrash,
  faPlus,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// 🔹 Memoized selector outside component
const selectUserUploadedImages = createSelector(
  [(state) => state.upload.images],
  (images) => images.filter((img) => img.isUserUploaded)
);

// 🔹 Loading Spinner
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-4 w-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  );
}

// 🔹 Individual image component (memoized)
const UploadImage = React.memo(
  ({ image, selectedPath, onClick, onDelete, onReAdd, loading }) => (
    <div
      className={`relative md:w-24 md:h-24 w-14 h-14 bg-gray-100 rounded-lg shadow-md overflow-hidden group ${!selectedPath ? "opacity-50 grayscale" : ""
        }`}
    >
      <img
        src={image.imageUrl || image.src}
        alt={image.name || "image"}
        className={`w-full h-full object-cover ${loading ? "opacity-50" : ""} ${!selectedPath ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        onClick={() => selectedPath && onClick(image)}
      />
      {onDelete && (
        <button
          onClick={() => onDelete(image.id)}
          className="absolute top-2 right-2 bg-white rounded text-red-600 w-6 h-6 flex items-center hover:bg-gray-100 justify-center cursor-pointer"
          title="Delete Image"
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      )}
      {onReAdd && (
        <button
          onClick={() => selectedPath && onReAdd(image)}
          className={`absolute top-2 left-2 bg-white rounded w-6 h-6 flex items-center justify-center hover:bg-gray-100 ${!selectedPath ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          title="Add Again"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        </div>
      )}
    </div>
  )
);

function Upload() {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();

  const selectedPath = useSelector((state) => state.color.selectedPathId);
  const uploadCategories = useSelector(
    (state) => state.products.uploadCategories
  );
  const uploadImages = useSelector((state) => state.products.uploadImages);
  const uploadsLoaded = useSelector((state) => state.products.uploadsLoaded);
  const uploadedImages = useSelector(selectUserUploadedImages);

  const [category, setCategory] = useState("all");
  const [loadingImages, setLoadingImages] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ Only enabled upload categories (keep "all" even though it is synthetic)
  const enabledUploadCategories = useMemo(
    () =>
      uploadCategories.filter(
        (cat) => cat.id === "all" || cat.enabled === true
      ),
    [uploadCategories]
  );

  // ✅ Helper: check if an image itself is enabled (if field exists)
  const isImageEnabled = useCallback((img) => {
    if (typeof img.enabled === "undefined") return true; // backward compatible
    return img.enabled === true;
  }, []);

  // 🔹 Add image to canvas
  const addToCanvas = useCallback(
    (item, isUserUploaded = false) => {
      setLoadingImages((prev) => ({ ...prev, [item.id]: true }));

      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const baseWidth = 120;
        const initialWidth = baseWidth;
        const initialHeight = initialWidth / aspectRatio;

        const containerWidth = 600;
        const containerHeight = 600;

        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;

        const initialPosition = {
          x: centerX - initialWidth / 2,
          y: centerY - initialHeight / 2,
        };

        const initialSize = { width: initialWidth, height: initialHeight };

        const { position, size } = constrainElementToPath(
          { ...initialPosition, ...initialSize },
          initialPosition,
          initialSize,
          selectedPath
        );

        const newImage = {
          id: Date.now(),
          src: item.imageUrl || item.src,
          ...position,
          ...size,
          rotation: 0,
          onCanvas: true,
          targetElement: selectedPath,
          isUserUploaded,
          name: item.name,
          category: item.category, // Include category information
        };

        dispatch(addImage(newImage));
        dispatch(setSelectedImage(newImage));
        dispatch(setSelectedElement({ type: "image", id: newImage.id }));
        dispatch(setSelectedTool(""));

        setLoadingImages((prev) => ({ ...prev, [item.id]: false }));
      };
      img.src = item.imageUrl || item.src;
    },
    [dispatch, selectedPath]
  );

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) =>
        addToCanvas({ imageUrl: e.target.result, name: file.name }, true);
      reader.readAsDataURL(file);
      fileInputRef.current.value = "";
    },
    [addToCanvas]
  );

  const handleSelectImage = useCallback(
    (image) => {
      dispatch(setSelectedImage(image));
      dispatch(setSelectedElement({ type: "image", id: image.id }));
    },
    [dispatch]
  );

  const handleDeleteImage = useCallback(
    (imageId) => {
      dispatch(deleteImageSafe(imageId));
    },
    [dispatch]
  );

  const handleReAddImage = useCallback(
    (image) => {
      addToCanvas(image, true);
    },
    [addToCanvas]
  );

  const matchesSearch = useCallback(
    (item) => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      if (item.name?.toLowerCase().includes(lowerQuery)) return true;
      if (item.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)))
        return true;
      if (item.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery)))
        return true;
      return false;
    },
    [searchQuery]
  );

  // 🔹 Render one category section
  const renderCategorySection = useCallback(
    (cat) => {
      if (!cat || cat.id === "all") return null; // don't render synthetic "all" as a section

      // Special: user uploaded images category
      if (cat.name.toLowerCase() === "images") {
        const filteredUploadedImages = uploadedImages.filter(matchesSearch);

        return (
          <div key={cat.id}>
            <h3 className="font-semibold mb-2">
              {t(`upload.${cat.name.trim()}`)}
            </h3>

            <button
              onClick={() => selectedPath && fileInputRef.current.click()}
              className={`py-2 px-3 rounded-xl  ${selectedPath
                  ? "bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
            >
              {t("upload.addImage")}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept=".png,.jpg,.jpeg"
              className="hidden"
            />
            <p className="mt-2 text-xs text-red-500">
              By uploading a design, you confirm that it does not violate any
              applicable laws or rights of third parties.
            </p>
            <div className="mt-4">
              <h4 className="font-normal mb-2 text-gray-800">
                {t("upload.uploadedImages")}
              </h4>
              <div className="flex flex-wrap gap-4">
                {filteredUploadedImages.length > 0 ? (
                  filteredUploadedImages.map((image) => (
                    <UploadImage
                      key={image.id}
                      image={image}
                      selectedPath={selectedPath}
                      onClick={handleSelectImage}
                      onDelete={handleDeleteImage}
                      onReAdd={handleReAddImage}
                      loading={loadingImages[image.id]}
                    />
                  ))
                ) : (
                  <p className="md:text-sm text-xs text-gray-500">
                    {t("upload.noImagesYet")}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Normal category: only show enabled images from this enabled category
      const filteredImages = uploadImages.filter(
        (img) =>
          img.category === cat.id &&
          isImageEnabled(img) &&
          matchesSearch(img)
      );

      if (filteredImages.length === 0) return null;

      return (
        <div key={cat.id}>
          <h3 className="font-semibold mb-2">
            {t(`upload.${cat.name.trim()}`)}
          </h3>
          <div className="flex flex-wrap gap-4">
            {filteredImages.map((item) => (
              <UploadImage
                key={item.id}
                image={item}
                selectedPath={selectedPath}
                onClick={addToCanvas}
                loading={loadingImages[item.id]}
              />
            ))}
          </div>
        </div>
      );
    },
    [
      uploadImages,
      selectedPath,
      handleFileInput,
      uploadedImages,
      handleSelectImage,
      handleDeleteImage,
      handleReAddImage,
      loadingImages,
      addToCanvas,
      matchesSearch,
      isImageEnabled,
      t,
    ]
  );

  return (
    <div className="flex flex-col h-full">
      {!selectedPath && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2 text-center">
          <p className="text-red-800 md:text-base text-xs flex items-center justify-center gap-2">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="text-red-800"
            />
            {t("upload.selectRegion")}
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 min-h-0">
        {/* LEFT SIDEBAR */}
        <div className="w-full md:w-44 pr-2 flex-shrink-0">
          <h3 className="font-bold text-lg mb-2 text-center md:text-left">
            {t("upload.categories")}
          </h3>
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible justify-start md:justify-start px-2 md:px-0">
            {enabledUploadCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-2 rounded-xl md:text-lg text-sm text-center md:text-left whitespace-nowrap flex-shrink-0 ${category === cat.id
                    ? "bg-purple-600 text-white"
                    : "text-gray-700 hover:bg-gray-300"
                  } cursor-pointer`}
              >
                {t(`upload.${cat.name.trim()}`)}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 min-h-0 flex md:text-base text-xs flex-col">
          <input
            type="text"
            placeholder={t("upload.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 flex-shrink-0"
          />

          <div className="flex-1 overflow-y-auto">
            {!uploadsLoaded ? (
              <LoadingSpinner />
            ) : (
              <div className="flex flex-col md:text-base text-xs gap-6 pb-4">
                {category === "all"
                  ? enabledUploadCategories
                    .filter((cat) => cat.id !== "all") // don't render "All" as a section
                    .map((cat) => renderCategorySection(cat))
                  : renderCategorySection(
                    enabledUploadCategories.find(
                      (cat) => cat.id === category
                    )
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Upload;
