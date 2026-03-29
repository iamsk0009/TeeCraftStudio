import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  updateQuantity,
  addToCartItems,
  resetCartState,
} from "../../redux/cartSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

function CartModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedProduct } = useSelector((state) => state.products);
  const {
    totalPrice,
    quantities,
  } = useSelector((state) => state.cart);

  if (!isOpen) return null;

  const sizes =
    selectedProduct?.sizes?.map((size) => {
      return {
        value: size,
        label: `${size} `,
      };
    }) || [];

  const handleQuantityChange = (size, change) => {
    dispatch(updateQuantity({ size, change }));
  };

  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return totalPrice * getTotalQuantity();
  };

  const handleAddToCart = () => {
    if (getTotalQuantity() === 0) {
      toast.warn(t("cart.selectAtLeastOne"));
      return;
    }

    try {
      // Add items to local cart state
      dispatch(addToCartItems({
        product: selectedProduct,
        quantities,
        totalPrice
      }));

      toast.success(t("cart.addedToCart"), {
        position: "top-center",
        autoClose: 2000,
      });

      // Reset selection and close modal
      setTimeout(() => {
        dispatch(resetCartState());
        onClose();
      }, 500);
      
    } catch (error) {
      console.error("Failed to add to cart:", error);
      toast.error(t("cart.failedToAddCart"));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {selectedProduct?.thumbnailUrl && (
              <img
                src={selectedProduct.thumbnailUrl}
                alt={selectedProduct.name}
                className="w-16 h-16 object-cover rounded-lg shadow-sm"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold text-[#10196A]">
                {selectedProduct?.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl cursor-pointer leading-none">
            ×
          </button>
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {sizes.map((size) => (
              <div key={size.value} className="flex flex-col items-center">
                <span className="text-sm font-medium text-[#10196A] mb-2">{size.label}</span>
                <div className="flex items-center border border-gray-200 rounded-lg w-full relative">
                  <span className="flex-1 text-center font-medium text-[#10196A] py-2">
                    {quantities[size.value] || 0}
                  </span>
                  <div className="absolute right-0 inset-y-0 flex flex-col border-l border-gray-200">
                    <button
                      onClick={() => handleQuantityChange(size.value, 1)}
                      className="flex-1 px-2 hover:bg-gray-50 border-b border-gray-200 flex items-center justify-center transition-colors">
                      <FontAwesomeIcon 
                        icon={faChevronUp} 
                        className="text-gray-400 hover:text-[#10196A] w-3 h-3" 
                      />
                    </button>
                    <button
                      onClick={() => handleQuantityChange(size.value, -1)}
                      className="flex-1 px-2 hover:bg-gray-50 flex items-center justify-center transition-colors"
                      disabled={!quantities[size.value] || quantities[size.value] <= 0}>
                      <FontAwesomeIcon 
                        icon={faChevronDown} 
                        className={`w-3 h-3 ${
                          !quantities[size.value] || quantities[size.value] <= 0
                            ? "text-gray-300"
                            : "text-gray-400 hover:text-[#10196A]"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 pt-4 mb-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-base font-semibold text-[#10196A]">{t("cart.total")}:</span>
              <span className="text-xl font-['Poppins'] font-bold text-[#10196A]">
                ₹ {getTotalPrice().toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleAddToCart}
              className={
                getTotalQuantity() === 0
                ? "bg-gray-200 text-gray-400 w-full px-4 py-3 rounded-lg lg:text-xl font-semibold lg:px-8 lg:py-4 cursor-not-allowed transition-colors"
                : "bg-[#B6F03F] hover:bg-[#A5E03A] text-[#10196A] w-full px-4 py-3 rounded-lg transition-colors lg:text-xl font-semibold lg:px-8 lg:py-4 shadow-md"
              }
              disabled={getTotalQuantity() === 0}>
              <span>{t("cart.addToCart")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartModal;
