import { useRef, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setColor } from "../../redux/colorSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotate } from "@fortawesome/free-solid-svg-icons";
import { HexColorPicker } from "react-colorful";

const ColorPicker = () => {
  const dispatch = useDispatch();
  const { color } = useSelector((state) => state.color);
  const selectedProduct = useSelector(
    (state) => state.products.selectedProduct
  );
  const pickerRef = useRef(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [showColorInput, setShowColorInput] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [inputColor, setInputColor] = useState("#ffffff");

  useEffect(() => {
    if (
      selectedProduct?.colors &&
      Array.isArray(selectedProduct.colors) &&
      selectedProduct.colors.length > 0
    ) {
      setColorPalette(selectedProduct.colors);
      setShowColorInput(false);
    } else {
      setColorPalette([]);
      setShowColorInput(true);
    }
  }, [selectedProduct]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const currentColor = color;
    if (currentColor) {
      setInputColor(currentColor);
    }
  }, [color]);

  const handleColorSelect = (hexColor) => {
    dispatch(setColor({ color: hexColor }));
    setInputColor(hexColor);
  };

  const handleColorInputChange = (newColor) => {
    setInputColor(newColor);
    handleColorSelect(newColor);
  };

  const handleTrashClick = () => {
    handleColorSelect("#ffffff");
  };

  return (
    <div
      ref={pickerRef}
      className="absolute left-1/2 md:left-[20%]  md:top-1/2 bottom-30 transform -translate-x-1/2 md:-translate-y-1/2 p-1 sm:p-2 color-picker"
    >
      <div className="flex justify-center items-center space-x-3">
        <div className="space-y-10">
          <div className="flex items-center md:flex-col space-x-2 md:space-x-0 md:space-y-2">
            {colorPalette.length > 0 ? (
              <div className="overflow-x-auto md:overflow-x-visible scrollbar-hide max-w-[200px] md:max-w-none">
                <div className="flex space-x-2 items-center md:flex-col md:space-x-0 md:space-y-2">
                  {colorPalette.map((colorItem, index) => (
                    <button
                      key={index}
                      className={`
                      w-10 h-10 md:w-8 md:h-8
                      rounded-full border-2
                      hover:scale-110
                      active:scale-95
                      transition-transform
                      touch-manipulation
                      cursor-pointer
                      flex-shrink-0
                      ${
                        colorItem === inputColor
                          ? "border-blue-500 border-2 shadow-lg ring-2 ring-blue-300"
                          : "border-gray-300 hover:border-gray-400 hover:shadow-md"
                      }
                    `}
                      style={{ backgroundColor: colorItem }}
                      onClick={() => handleColorSelect(colorItem)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {showColorInput && (
              <div className=" flex items-center">
                <button
                  className="relative w-8 h-8 p-0 rounded-full border-2 border-gray-300 hover:border-gray-400 cursor-pointer transition-colors flex items-center justify-center"
                  onClick={() => setShowPicker(!showPicker)}
                  aria-label="Open color picker"
                >
                  {/* Color wheel donut: full conic gradient with inner white circle to create a hole */}
                  <span
                    className="w-full h-full rounded-full block"
                    style={{
                      background:
                        "conic-gradient(#ff0000 0deg, #ff9900 45deg, #ffff00 90deg, #33cc33 135deg, #00cccc 180deg, #3333cc 225deg, #cc33cc 270deg, #ff0077 315deg, #ff0000 360deg)",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 3px rgba(0,0,0,0.12)",
                    }}
                  />

                  {/* inner white circle (the 'hole' of the donut) to match the sample image */}
                  <span
                    className="absolute bg-white rounded-full"
                    style={{
                      width: "56%",
                      height: "56%",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                    }}
                  />
                </button>
                {showPicker && (
                  <div className="absolute top-12 z-50 bg-white p-1 rounded-lg shadow-lg">
                    <HexColorPicker color={inputColor} onChange={handleColorInputChange} />
                    <div className="mt-2 flex items-center">
                      <input
                        type="text"
                        value={inputColor}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setInputColor(newValue);
                          if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
                            handleColorSelect(newValue);
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border rounded"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            <FontAwesomeIcon
              icon={faRotate}
              style={{ height: "22px", width: "22px", cursor: "pointer",color: "#10196A" }}
              onClick={handleTrashClick}
              title={"Remove Color"}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;