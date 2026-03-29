import { useSelector, useDispatch } from "react-redux";
import {
  setSelectedCategory,
  setSelectedProduct,
} from "../../redux/productsSlice";
import { resetBottomControlsState } from "../../redux/bottomControlsSlice";
import { resetCartState } from "../../redux/cartSlice";
import { setColor } from "../../redux/colorSlice";
// import { resetTextureState } from "../../redux/textureSlice";
// import { resetUploadState } from "../../redux/uploadSlice";
import {
  setLoading,
  setSelectedTool,
  setSvgLoaded,
} from "../../redux/loadingSlice";
import { useTranslation } from "react-i18next";

function Products() {
  const { products, categories, selectedCategory } = useSelector(
    (state) => state.products
  );
  const currentColor = useSelector((state) => state.color.color);
  const dispatch = useDispatch();
  const { t } = useTranslation();

  // ✅ Only enabled categories
  const enabledCategories = categories.filter((cat) => cat.enabled === true);
  const enabledCategoryIds = new Set(enabledCategories.map((cat) => cat.id));

  // ✅ Products must be enabled AND belong to an enabled category
  const filteredProducts =
    selectedCategory.id === "all"
      ? products.filter(
          (product) =>
            product.enabled === true && enabledCategoryIds.has(product.category)
        )
      : products.filter(
          (product) =>
            product.enabled === true &&
            product.category === selectedCategory.id &&
            enabledCategoryIds.has(product.category)
        );

  const handleProductSelect = (product) => {
    // First set loading and design not loaded state
    dispatch(setLoading(true));
    dispatch(setSvgLoaded(false));
    
    // Reset specific states
    dispatch(resetCartState());
    dispatch(resetBottomControlsState());
    // NOTE: Do NOT reset texture state - it will regenerate automatically when SVG loads
    // dispatch(resetTextureState());
    dispatch(setSelectedTool(""));
    
    // Validate and update color based on new product's color options
    const newProductColors = product?.colors;
    if (newProductColors && Array.isArray(newProductColors) && newProductColors.length > 0) {
      // Product has predefined colors - check if current color is valid
      const isColorValid = newProductColors.includes(currentColor);
      if (!isColorValid) {
        // Current color not in new product's palette, reset to white
        dispatch(setColor({ color: "#ffffff" }));
      }
      // If color is valid, keep it (no action needed)
    } else {
      // Product has no predefined colors (uses color picker)
      // Keep current color if it's valid, otherwise reset to white
      if (!currentColor || currentColor === "") {
        dispatch(setColor({ color: "#ffffff" }));
      }
      // Otherwise keep the current color for the picker
    }
    
    // Note: We intentionally do NOT reset upload state
    // Upload state (images/textboxes) will be transformed by useProductElementTransformer hook in UvPath
    // Texture state will be preserved and regenerated automatically

    // Set the product
    dispatch(setSelectedProduct(product));

    // Navigate to the product designer with the current design ID
    const formattedProductName = product.name
      .toLowerCase()
      .replace(/\s+/g, "-");
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split("/").filter(Boolean);
    const designId = pathSegments[pathSegments.length - 1];

    if (designId && designId !== "designer-tool") {
      const newPath = `/designer-tool/${formattedProductName}/${designId}`;
      // Use replaceState to replace current history entry instead of adding a new one
      // This makes the back button go to the previous page, not the old product
      window.history.replaceState(null, "", newPath);
    }
  };

  return (
    <div className="flex md:flex-row flex-col gap-6 h-full w-full">
      {/* Categories */}
      <div className="md:mb-0 mb-6 md:text-left text-center">
        <h2 className="md:text-lg text-base font-semibold mb-4">
          {t("categories.title")}
        </h2>
        <ul className="md:space-y-2 space-x-2 md:space-x-0 flex md:flex-col overflow-x-auto md:mb-0 mb-4">
          {enabledCategories.map((category) => (
            <li
              key={category.id}
              onClick={() => dispatch(setSelectedCategory(category))}
              className={`md:px-2 md:py-2 px-3 py-1 cursor-pointer transition-colors rounded-md ${
                selectedCategory.id === category.id
                  ? "bg-purple-600 text-white"
                  : "hover:bg-gray-200 text-gray-800"
              }`}>
              {t(`Products.${category.name.trim()}`)}
            </li>
          ))}
        </ul>
      </div>

      {/* Products */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-4 pb-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => handleProductSelect(product)}
              className="flex flex-col items-center h-80 w-64 shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <div className="relative w-full h-64 overflow-hidden">
                <img
                  src={product.thumbnailUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                />
              </div>
              <div className="w-full flex flex-col items-center justify-center p-2">
                <span className="md:text-sm text-xs font-medium text-gray-800">
                  {product.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Products;
