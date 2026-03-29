import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  setSelectedCategory,
  setSelectedProduct,
} from "../../redux/productsSlice";
import { setDesignId } from "../../redux/designSlice";
import { useState } from "react";
import { resetCartState } from "../../redux/cartSlice";
import { resetBottomControlsState } from "../../redux/bottomControlsSlice";
import { resetColorState } from "../../redux/colorSlice";
import { resetUploadState } from "../../redux/uploadSlice";
import { resetTextureState } from "../../redux/textureSlice";
import { setSvgLoaded } from "../../redux/loadingSlice";

function ProductOverlay() {
  const { products, categories, selectedCategory } = useSelector(
    (state) => state.products
  );
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showToast, setShowToast] = useState(false);

  // ✅ Only enabled categories
  console.log(categories);
  
  const enabledCategories = categories.filter((cat) => cat.enabled === true);
  const enabledCategoryIds = new Set(enabledCategories.map((cat) => cat.id));

  // ✅ Products must be enabled AND belong to an enabled category
  const filteredProducts =
    selectedCategory.id === "all"
      ? products.filter(
          (product) =>
            product.enabled === true &&
            enabledCategoryIds.has(product.category)
        )
      : products.filter(
          (product) =>
            product.enabled === true &&
            product.category === selectedCategory.id &&
            enabledCategoryIds.has(product.category)
        );

  const generateShortId = () => {
    // Generate a short, unique ID (8 characters)
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `${timestamp.slice(-4)}${random}`;
  };

  const handleProductSelect = async (product) => {
    if (isLoading) return;
    try {
      setIsLoading(true);

      if (product.category === "socks") {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }

      dispatch(setSvgLoaded(false));
      dispatch(resetTextureState());
      dispatch(resetColorState());
      dispatch(resetUploadState());
      dispatch(resetCartState());
      dispatch(resetBottomControlsState());

      const designId = generateShortId();
      if (!designId || typeof designId !== "string") {
        console.error("Invalid designId:", designId);
        return;
      }

      dispatch(setSelectedProduct(product));
      dispatch(setDesignId({ designId }));
      const formattedProductName = product.name
        .toLowerCase()
        .replace(/\s+/g, "-");
      navigate(`/${formattedProductName}/${designId}`);
    } catch (error) {
      console.error("Error creating design:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full mesh-gradient z-50 flex flex-col gap-6 overflow-hidden">
      {/* Dynamic Light Header */}
      <div className="flex items-center justify-between p-6 glass mx-4 mt-4 rounded-2xl shadow-lg border border-white/50 backdrop-blur-xl">
        <div className="flex flex-col">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-900 via-slate-800 to-indigo-900 bg-clip-text text-transparent tracking-tight">
            {t("categories.title")}
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Discover our latest designs
          </p>
        </div>
        
        <div className="relative group">
          <select
            value={selectedCategory.id}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "all") {
                dispatch(setSelectedCategory({ id: "all", name: "All" }));
              } else {
                const selectedCat = enabledCategories.find((cat) => cat.id === val);
                dispatch(setSelectedCategory(selectedCat || { id: "all", name: "All" }));
              }
            }}
            className="appearance-none bg-white/40 border border-slate-200 text-slate-800 px-6 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer backdrop-blur-md font-semibold pr-10"
          >
            <option value="all" className="bg-white">{t("categories.all", { defaultValue: "All Items" })}</option>
            {enabledCategories.map((category) => (
              <option key={category.id} value={category.id} className="bg-white">
                {t(`Products.${category.name}`)}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <div className="grow grid gap-8 p-6 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] overflow-y-auto scroll-container pb-24">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            onClick={isLoading ? null : () => handleProductSelect(product)}
            className={`group flex flex-col h-[28rem] bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl shadow-xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-100 active:scale-95 ${
              isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          >
            <div className="relative h-2/3 overflow-hidden bg-slate-100">
              <img
                src={product.thumbnailUrl}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Coming Soon Glass Overlay (Brighter for Light Theme) */}
              {product.category === "socks" && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[4px] flex flex-col items-center justify-center gap-4 animate-fade-slide-up">
                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white px-6 py-2 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl animate-pulse ring-4 ring-white/30">
                    Coming Soon
                  </div>
                  <p className="text-indigo-900/60 text-[10px] font-bold tracking-widest uppercase">Premium Edition</p>
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-indigo-500 pointer-events-none" />
            </div>

            <div className="flex-1 p-6 flex flex-col justify-between bg-white/40">
              <div>
                <h3 className="text-slate-900 font-bold text-xl tracking-wide group-hover:text-indigo-700 transition-colors">
                  {product.name}
                </h3>
                <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-extrabold">
                  {product.category}
                </p>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <span className="text-indigo-600 font-extrabold text-sm tracking-tighter uppercase">
                  {product.category === "socks" ? "Waitlisted" : "Customize"}
                </span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
                  product.category === "socks" ? "bg-slate-100 text-slate-300" : "bg-indigo-600 text-white group-hover:bg-indigo-500 group-hover:scale-110"
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Premium Toast for Light Theme */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-fade-slide-up">
          <div className="bg-white text-indigo-950 px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-indigo-100 font-bold flex items-center gap-4 ring-4 ring-indigo-500/10">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-lg animate-bounce text-white">🚀</span>
            </div>
            <div className="flex flex-col">
              <span className="text-indigo-950 text-sm mb-0.5">Stay Tuned!</span>
              <span className="text-indigo-600/70 text-[11px] font-semibold leading-none">This product is coming soon to the studio.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductOverlay;
