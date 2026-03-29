import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setTotalPrice } from "../../redux/cartSlice";
import CartModal from "./CartModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShoppingCart } from "@fortawesome/free-solid-svg-icons";
import { saveDesignToLocalStorage } from "../utils/save";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

function AddtoCart() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const selectedProduct = useSelector(
    (state) => state.products.selectedProduct
  );
  const uploadedImages = useSelector((state) => state.upload.images || []);
  const textboxes = useSelector((state) => state.upload.textboxes || []);
  const designId = useSelector((state) => state.design.designId);
  const color = useSelector((state) => state.color.color);
  const textureUrl = useSelector((state) => state.texture.textureUrl);
  const totalPrice = useSelector((state) => state.cart.totalPrice);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const calculateTotalPrice = () => {
      if (!selectedProduct) return 0;
      let total = selectedProduct.price || 0;
      const elementsWithContent = new Set();
      uploadedImages.forEach((image) => {
        if (image.onCanvas && image.targetElement) {
          elementsWithContent.add(image.targetElement);
        }
      });
      textboxes.forEach((textbox) => {
        if (textbox.onCanvas && textbox.targetElement) {
          elementsWithContent.add(textbox.targetElement);
        }
      });
      if (selectedProduct.svgElementPrices) {
        Array.from(elementsWithContent).forEach((elementId) => {
          if (elementId in selectedProduct.svgElementPrices) {
            const elementPrice = parseFloat(
              selectedProduct.svgElementPrices[elementId] || 0
            );
            total += elementPrice;
          }
        });
      }
      return total;
    };
    const total = calculateTotalPrice();
    dispatch(setTotalPrice(total));
  }, [selectedProduct, uploadedImages, textboxes, dispatch]);

  const saveOnCheckout = async () => {
    if (textboxes.length === 0 && uploadedImages.length === 0) {
      Swal.fire({
        icon: "error",
        title: t("alerts.addImageOrText"),
        text: t("alerts.placeElements"),
        confirmButtonText: t("alerts.confirm"),
        confirmButtonColor: "#DC2626",
        background: "#FFFFFF",
        width: isMobile ? '80%' : '32rem',
      });
      return;
    }

    setIsSaving(true);

    try {
      const designData = {
        designId,
        productId: selectedProduct.id,
        images: uploadedImages,
        textboxes,
        textureUrl,
        color,
      };

      await saveDesignToLocalStorage(designData);
      
      toast.success(t("bottomControls.designSaved"), {
        position: "top-right",
        autoClose: 2000,
      });

      setTimeout(() => {
        setIsSaving(false);
        setIsModalOpen(true);
      }, 1000);

    } catch (error) {
      console.error("Error saving design:", error);
      toast.error(t("bottomControls.saveError"));
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="absolute bottom-8 right-4 flex flex-col items-center gap-2 ">
        <div className="md:text-3xl text-xl font-bold text-[#10196A]  font-['Poppins'] ">
          ₹{(uploadedImages.length || textboxes.length > 0) ? `${totalPrice.toFixed(2)}` : "0.00"}
        </div>
        <button
          onClick={saveOnCheckout}
          disabled={isSaving}
          className={`bg-[#B6F03F] hover:bg-[#A074DB] transition-colors rounded-md text-[#10196A] px-4 py-3 cursor-pointer ${isSaving ? "opacity-50 cursor-not-allowed" : ""} flex items-center justify-center gap-2 lg:gap-4 text-base lg:text-xl font-semibold lg:px-8 lg:py-4`}>
          <FontAwesomeIcon
            icon={faShoppingCart}
            className="text-[#10196A] text-xl lg:text-3xl"
            aria-hidden={true}
          />
          <span className="hidden md:inline-block">
            {t("cart.SizeandQuantity")}
          </span>
        </button>
      </div>

      {isSaving && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl flex flex-col items-center gap-4">
            <div className="w-8 h-8 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-[#10196A]">
              Saving design locally...
            </p>
          </div>
        </div>
      )}

      <CartModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

export default AddtoCart;
