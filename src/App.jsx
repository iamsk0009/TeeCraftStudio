import "./App.css";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Provider } from "react-redux";
import store from "./redux/store";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import ProductOverlay from "./components/products/ProductsOverlay";
import {
  setProducts,
  setCategories,
  setUploadCategories,
  setUploadImages,
  setUploadsLoaded,
} from "./redux/productsSlice";
import { initializeUser } from "./redux/userSlice";
import DesignLoader from "./components/design/DesignLoader";
import PreviewUrls from "./components/design/PreviewUrls";
import { fetchDesignFromLocalStorage } from "./components/utils/save";
import { deleteDatabase } from "./components/utils/indexedDB";
import { resetColorState, setColor } from "./redux/colorSlice";
import { addImage, addTextbox, resetUploadState } from "./redux/uploadSlice";
import { setSelectedProduct } from "./redux/productsSlice";
import { setDesignId } from "./redux/designSlice";
import { setGeneratedImages } from "./redux/aiSlices";
import { updateUser, setUserLoginStatus } from "./redux/userSlice";
import localData from "./data/localData.json";

import Header from "./components/common/Header";

function AppContent() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded } = useSelector((state) => state.products);
  const { isInitialized } = useSelector((state) => state.user);
  const [height, setHeight] = useState();
  const { i18n } = useTranslation();
  const toolRef = useRef(null);

  // Initialize user data and set height
  useEffect(() => {
    if (!isInitialized) {
      dispatch(initializeUser());
    }
    setHeight("100svh");
  }, [dispatch, isInitialized]);

  // Handle language change from URL (path or query parameter)
  useEffect(() => {
    // Priority 1: Check for WPML directory-based language (/fr/designer-tool)
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const firstSegment = pathSegments[0];
    let detectedLang = null;

    // Check if first path segment is a language code
    if (firstSegment && ["en", "fr", "de", "nl"].includes(firstSegment)) {
      detectedLang = firstSegment;
    } else {
      // Priority 2: Check query parameter
      const params = new URLSearchParams(location.search);
      const langParam = params.get("lang");
      if (langParam && ["en", "fr", "de", "nl"].includes(langParam)) {
        detectedLang = langParam;
      }
    }

    if (detectedLang && i18n.language !== detectedLang) {
      i18n.changeLanguage(detectedLang);
      localStorage.setItem("wpml_language", detectedLang);
    }
  }, [location.pathname, location.search, i18n]);

  // Auto-load local design if exists and at starting route
  useEffect(() => {
    const handleLocalDesign = async () => {
      const localdesign = localStorage.getItem("design");
      if (!localdesign) return;

      if (localdesign) {
        try {
          const designData = await fetchDesignFromLocalStorage();
          if (!designData || !designData.design || !designData.product) return;
          const { design, product, aiImages } = designData;

          // Reset states
          dispatch(setSelectedProduct(null));
          dispatch(setDesignId({ designId: null }));
          dispatch(resetColorState());
          dispatch(resetUploadState());

          // Set states
          if (product) {
            dispatch(setSelectedProduct(product));
          }
          dispatch(setDesignId({ designId: design.designId }));

          if (design.images && Array.isArray(design.images)) {
            design.images.forEach((image) => dispatch(addImage(image)));
          }

          if (design.textboxes && Array.isArray(design.textboxes)) {
            design.textboxes.forEach((textbox) =>
              dispatch(addTextbox(textbox))
            );
          }
          if (design.color) {
            dispatch(setColor({ color: design.color }));
          }

          if (design.userData && design.userData.isLoggedIn) {
            dispatch(updateUser(design.userData));
            dispatch(setUserLoginStatus(true));
          }

          if (aiImages && Array.isArray(aiImages)) {
            dispatch(setGeneratedImages(aiImages));
          }

          const formattedProductName = product.name
            .toLowerCase()
            .replace(/\s+/g, "-");
          navigate(`/${formattedProductName}/${design.designId}`);

          // Clear storage
          localStorage.removeItem("design");
          await deleteDatabase();
        } catch (error) {
          console.error("Error auto-loading local design:", error);
        }
      }
    };

    // Run only if at starting routes
    if (location.pathname === "/") {
      handleLocalDesign();
    }
  }, [dispatch, navigate, location.pathname]);

  // Load products and categories from local JSON
  useEffect(() => {
    if (!isLoaded) {
      if (localData.products) {
        dispatch(setProducts(localData.products));
      }
      if (localData.categories) {
        dispatch(setCategories(localData.categories));
      }
      if (localData.uploadCategories) {
        dispatch(setUploadCategories(localData.uploadCategories));
      }
      if (localData.uploadImages) {
        dispatch(setUploadImages(localData.uploadImages));
      }
      dispatch(setUploadsLoaded(true));
    }
  }, [dispatch, isLoaded]);

  return (
    <div ref={toolRef} className="absolute w-full h-full flex flex-col">
       <Header />
      <div
        className="relative w-full grow bg-[#f2f4f6] overflow-hidden select-none main-container"
        style={{ height }}>
        <Routes>
          <Route path="/" element={<ProductOverlay />} />
          <Route path="/:designId/previewurls" element={<PreviewUrls />} />
          <Route path="/:productName/:designId" element={<DesignLoader />} />
          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
