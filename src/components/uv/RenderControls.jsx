import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  updateTextboxStyle,
  updateTextboxContent,
  moveElementUp,
  moveElementDown,
  updateImageSvgColor,
  updateTextboxPosition,
} from "../../redux/uploadSlice";
import { constrainElementToPath } from "../utils/elementConstraints";
import { measureTextDimensions } from "../utils/textMetrics";
import { MIN_TEXTBOX_FONT_SIZE } from "../utils/constants";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify,
  faBold,
  faItalic,
  faCog,
  faArrowUp,
  faArrowDown,
  faFont,
  faTextHeight,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { HexColorPicker } from "react-colorful";

function RenderControls({
  type,
  id,
  isSelected,
  onUpdateTexture,
  textareaRef,
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  openPopup = false,
}) {
  const dispatch = useDispatch();
  const textbox = useSelector((state) =>
    state.upload.textboxes.find((tb) => tb.id === id)
  );
  const layerOrder = useSelector((state) => state.upload.layerOrder);
  const allTextboxes = useSelector((state) => state.upload.textboxes);
  const allImages = useSelector((state) => state.upload.images);

  const totalItems = layerOrder.length;
  const currentLayerIndex = layerOrder.findIndex(
    (item) => item.type === type && item.id === id
  );
  const canMoveForward =
    currentLayerIndex < layerOrder.length - 1 && currentLayerIndex !== -1;
  const canMoveBackward = currentLayerIndex > 0;

  // State
  const [showPopup, setShowPopup] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editText, setEditText] = useState("");

  const popupRef = useRef(null);
  const buttonRef = useRef(null);

  // ---- NEW: get the image object when type === 'image' ----
  const image = useSelector((state) =>
    type === "image" ? state.upload.images.find((i) => i.id === id) : null
  );

  // ---- colour-picker state (only for SVG images) ----
  // const [showSvgColorPicker, setShowSvgColorPicker] = useState(false);
  const [svgHex, setSvgHex] = useState("");
  const [svgColorChanged, setSvgColorChanged] = useState(false);

  // NEW: Sync svgHex with Redux svgColor when image changes
  useEffect(() => {
    if (type === "image" && image?.isSvg) {
      setSvgHex(image.svgColor);
      setSvgColorChanged(false);
    }
  }, [type, image]);

  // 1. Sync non-text locals (bold, italic, color) and canvas textarea on textbox changes
  useEffect(() => {
    if (textbox && textareaRef?.current) {
      setIsBold(textbox.fontWeight === "bold");
      setIsItalic(textbox.fontStyle === "italic");
      // setHexInputValue(textbox.fontColor || "#ff0000");

      // Sync canvas textarea content and ALL styles
      if (textareaRef.current.value !== textbox.text) {
        textareaRef.current.value = textbox.text || "";
      }

      // Apply all styles to canvas textarea
      textareaRef.current.style.fontSize = `${textbox.fontSize || 24}px`;
      textareaRef.current.style.fontFamily = textbox.fontFamily || "Arial";
      textareaRef.current.style.fontWeight = textbox.fontWeight || "normal";
      textareaRef.current.style.fontStyle = textbox.fontStyle || "normal";
      textareaRef.current.style.color = textbox.fontColor || "#ff0000";
      textareaRef.current.style.textAlign = textbox.textAlign || "left";
      textareaRef.current.style.lineHeight = `${textbox.lineHeight || 1.2}em`;
      textareaRef.current.style.letterSpacing = `${
        textbox.letterSpacing || 0
      }px`;
    }
  }, [textbox, textareaRef]);

  // 2. Initialize editText ONLY when popup opens (ignores textbox changes during session)
  useEffect(() => {
    if (showPopup && textbox) {
      setEditText(textbox.text || "");
    }
  }, [showPopup, textbox]);

  // 3. Handle external popup trigger
  useEffect(() => {
    if (openPopup > 0) {
      setShowPopup(true);
    }
  }, [openPopup]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !showPopup &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        return;
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopup]);

  const checkOverlap = (rect1, rect2) => {
    return !(
      rect1.x + rect1.width <= rect2.x ||
      rect2.x + rect2.width <= rect1.x ||
      rect1.y + rect1.height <= rect2.y ||
      rect2.y + rect2.height <= rect1.y
    );
  };

  const hasOverlapWithOthers = () => {
    const currentElement = { x, y, width, height };
    for (const tb of allTextboxes) {
      if (tb.id !== id) {
        const otherRect = {
          x: tb.x,
          y: tb.y,
          width: tb.width,
          height: tb.height,
        };
        if (checkOverlap(currentElement, otherRect)) return true;
      }
    }
    for (const img of allImages) {
      if (!(type === "image" && img.id === id)) {
        const otherRect = {
          x: img.x,
          y: img.y,
          width: img.width,
          height: img.height,
        };
        if (checkOverlap(currentElement, otherRect)) return true;
      }
    }
    return false;
  };

  const showLayerControls = totalItems >= 2 && hasOverlapWithOthers();

  const handleStyleChange = (property, value) => {
    if (!textbox) return;
    let appliedValue = value;
    let fontSizeUpdate = null;

    const computeFontSizeUpdate = (requestedSize) => {
      const currentFontSize = textbox.fontSize || 24;
      if (!currentFontSize) return null;

      const parsedTarget = Number.isFinite(requestedSize)
        ? requestedSize
        : parseFloat(requestedSize);
      if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) return null;

      const clampedTarget = Math.max(MIN_TEXTBOX_FONT_SIZE, parsedTarget);
      const metrics = measureTextDimensions({
        text: textbox.text || "Text",
        fontSize: clampedTarget,
        fontFamily: textbox.fontFamily || "Arial",
        fontWeight: textbox.fontWeight || "normal",
        fontStyle: textbox.fontStyle || "normal",
        lineHeight: textbox.lineHeight || 1.2,
        letterSpacing: textbox.letterSpacing || 0,
      });

      const desiredSize = {
        width: Math.max(20, Math.ceil(metrics.width)),
        height: Math.max(20, Math.ceil(metrics.height)),
      };

      const constrained = constrainElementToPath(
        textbox,
        { x: textbox.x ?? 0, y: textbox.y ?? 0 },
        desiredSize,
        textbox?.targetElement
      );

      const finalWidth = constrained.size.width;
      const finalHeight = constrained.size.height;
      const widthRatio =
        desiredSize.width > 0 ? finalWidth / desiredSize.width : 1;
      const heightRatio =
        desiredSize.height > 0 ? finalHeight / desiredSize.height : 1;
      const appliedRatio = Math.min(widthRatio, heightRatio);

      const appliedFontSize = Math.max(
        MIN_TEXTBOX_FONT_SIZE,
        Math.round(
          clampedTarget *
            (Number.isFinite(appliedRatio) && appliedRatio > 0
              ? appliedRatio
              : 1)
        )
      );

      return {
        fontSize: appliedFontSize,
        position: constrained.position,
        size: constrained.size,
      };
    };

    // First dispatch to Redux
    if (property === "fontSize") {
      fontSizeUpdate = computeFontSizeUpdate(value);
      if (!fontSizeUpdate) return;

      dispatch(
        updateTextboxPosition({
          id,
          x: fontSizeUpdate.position.x,
          y: fontSizeUpdate.position.y,
          width: fontSizeUpdate.size.width,
          height: fontSizeUpdate.size.height,
          onCanvas: textbox.onCanvas,
        })
      );
      dispatch(updateTextboxStyle({ id, fontSize: fontSizeUpdate.fontSize }));
      appliedValue = fontSizeUpdate.fontSize;
    } else {
      dispatch(updateTextboxStyle({ id, [property]: value }));
    }

    // Update canvas textarea immediately with the new value
    if (textareaRef?.current) {
      if (property === "fontSize") {
        textareaRef.current.style.fontSize = `${appliedValue}px`;
        textareaRef.current.style.lineHeight = `${
          (textbox?.lineHeight || 1.2) * appliedValue
        }px`;
        textareaRef.current.style.whiteSpace = "pre";
        textareaRef.current.style.overflow = "hidden";
        textareaRef.current.style.resize = "none";
        if (fontSizeUpdate?.size?.height) {
          textareaRef.current.style.height = `${fontSizeUpdate.size.height}px`;
        } else {
          textareaRef.current.style.height = `${appliedValue}px`;
        }
      } else if (property === "fontWeight") {
        textareaRef.current.style.fontWeight = value;
      } else if (property === "fontStyle") {
        textareaRef.current.style.fontStyle = value;
      } else if (property === "fontFamily") {
        textareaRef.current.style.fontFamily = value;
      } else if (property === "fontColor") {
        textareaRef.current.style.color = value;
      } else if (property === "textAlign") {
        textareaRef.current.style.textAlign = value;
      } else if (property === "lineHeight") {
        textareaRef.current.style.lineHeight = `${
          value * (textbox?.fontSize || 24)
        }px`;
      } else if (property === "letterSpacing") {
        textareaRef.current.style.letterSpacing = `${value}px`;
      }
    }

    onUpdateTexture();
  };

  const handleBoldToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const newBoldState = !isBold;
    setIsBold(newBoldState);
    handleStyleChange("fontWeight", newBoldState ? "bold" : "normal");
  };

  const handleItalicToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const newItalicState = !isItalic;
    setIsItalic(newItalicState);
    handleStyleChange("fontStyle", newItalicState ? "italic" : "normal");
  };

  const handleMoveForward = (e) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch(moveElementDown({ type, id }));
    onUpdateTexture();
  };

  const handleMoveBackward = (e) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch(moveElementUp({ type, id }));
    onUpdateTexture();
  };

  const handleAlignmentChange = (alignment, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    handleStyleChange("textAlign", alignment);
  };

  const handleUpdateSvgColor = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    // Only dispatch and update texture when user explicitly clicks Update
    dispatch(updateImageSvgColor({ id, color: svgHex }));
    console.log(`Updated SVG color for ${id} to ${svgHex}`);
    onUpdateTexture();
    setSvgColorChanged(false);
    // Close popup after update
    setShowPopup(false);
  };

  const fonts = [
    "Arial",
    "Verdana",
    "Helvetica",
    "Tahoma",
    "Trebuchet MS",
    "Times New Roman",
    "Georgia",
    "Garamond",
    "Courier New",
    "Brush Script MT",
    "Lucida Console",
    "Impact",
    "Comic Sans MS",
    "Palatino Linotype",
    "Segoe UI",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Oswald",
    "Source Sans Pro",
    "Raleway",
    "Ubuntu",
  ];

  const alignmentOptions = [
    { value: "left", icon: faAlignLeft, title: "Align Left" },
    { value: "center", icon: faAlignCenter, title: "Align Center" },
    { value: "right", icon: faAlignRight, title: "Align Right" },
    { value: "justify", icon: faAlignJustify, title: "Justify" },
  ];

  // Don't show settings for regular images (only for textbox or SVG images)
  const shouldShowSettings =
    type === "textbox" || (type === "image" && image?.isSvg);

  if (!isSelected) return null;

  const buttonTop = y - 50;
  const buttonLeft = x + width / 2;

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPopup((prev) => !prev);
  };

  const handleButtonTouchStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleButtonTouchEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPopup((prev) => !prev);
  };

  const handleClosePopup = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Validate text before closing
    if (type === "textbox" && textbox) {
      let finalText = editText;
      if (!finalText || !finalText.trim()) {
        finalText = "Text";
        setEditText("Text");
        // Update Redux with default text
        dispatch(updateTextboxContent({ id, text: finalText }));
        // Force texture update after state change
        setTimeout(() => {
          onUpdateTexture();
        }, 50);
      } else {
        // Text is not empty, just update texture
        onUpdateTexture();
      }
    }

    setShowPopup(false);
  };

  const arrowSpacing = 48;
  const upLeft = buttonLeft - arrowSpacing;
  const downLeft = buttonLeft;
  const settingsLeft = buttonLeft + arrowSpacing;

  return (
    <>
      {/* Layer Controls Buttons */}
      {showLayerControls && (
        <>
          {/* Forward Button */}
          <div
            onClick={handleMoveForward}
            onMouseDown={(e) => e.stopPropagation()}
            className={`absolute rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors cursor-pointer ${
              canMoveForward
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            style={{
              top: `${buttonTop}px`,
              left: `${upLeft}px`,
              zIndex: 99999,
              pointerEvents: "auto",
              userSelect: "none",
            }}
            title="Move Forward">
            <FontAwesomeIcon icon={faArrowUp} className="text-xs" />
          </div>

          {/* Backward Button */}
          <div
            onClick={handleMoveBackward}
            onMouseDown={(e) => e.stopPropagation()}
            className={`absolute rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors cursor-pointer ${
              canMoveBackward
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            style={{
              top: `${buttonTop}px`,
              left: `${downLeft}px`,
              zIndex: 99999,
              pointerEvents: "auto",
              userSelect: "none",
            }}
            title="Move Backward">
            <FontAwesomeIcon icon={faArrowDown} className="text-xs" />
          </div>
        </>
      )}

      {/* Settings Button */}
      {shouldShowSettings && (
        <div
          ref={buttonRef}
          onClick={handleButtonClick}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={handleButtonTouchStart}
          onTouchEnd={handleButtonTouchEnd}
          className="absolute bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors cursor-pointer"
          style={{
            top: `${buttonTop}px`,
            left: `${showLayerControls ? settingsLeft : buttonLeft}px`,
            transform: showLayerControls ? "none" : "translateX(-50%)",
            zIndex: 99999,
            pointerEvents: "auto",
            userSelect: "none",
          }}
          title="Open Settings">
          <FontAwesomeIcon icon={faCog} className="text-lg" />
        </div>
      )}

      {/* Compact Modal */}
      {showPopup &&
        typeof document !== "undefined" &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 bg-black/5 flex items-center justify-center"
            style={{
              zIndex: 999998,
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPopup(false);
                setShowColorPicker(false);
              }
            }}
            onTouchEnd={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                setShowPopup(false);
                setShowColorPicker(false);
              }
            }}>
            <div
              ref={popupRef}
              className="bg-white rounded-xl shadow-2xl p-3 w-full max-w-sm mx-2"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                // keep it compact: no internal scrolling; content is tight
                maxHeight: "none",
              }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  {type === "textbox" ? "Text" : "Element"}
                </h3>
                <button
                  onClick={handleClosePopup}
                  className="w-10 h-10 rounded-md flex items-center justify-center hover:bg-gray-100">
                  <FontAwesomeIcon icon={faXmark} className="text-xl" />
                </button>
              </div>

              {/* NEW: SVG color picker section (only for SVG images) */}
              {type === "image" && image?.isSvg && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    SVG Color
                  </label>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // setShowSvgColorPicker(!showSvgColorPicker);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className={`w-full h-12 border-2 rounded cursor-pointer flex items-center justify-between px-3 transition-colors ${
                        svgHex
                          ? "border-gray-300 hover:border-blue-500"
                          : "border-dashed border-gray-300 hover:border-gray-400"
                      }`}
                      style={{
                        backgroundColor: svgHex || "transparent",
                      }}>
                      <span
                        className={`font-medium ${
                          svgHex ? "text-white drop-shadow-md" : "text-gray-500"
                        }`}>
                        {svgHex || "Change color and click Update"}
                      </span>
                    </button>
                    {/* {showSvgColorPicker && ( */}
                    <div
                      className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}>
                      <HexColorPicker
                        color={svgHex}
                        onChange={(color) => {
                          setSvgHex(color);
                          setSvgColorChanged(true);
                        }}
                      />
                      <input
                        type="text"
                        value={svgHex}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newValue = e.target.value;
                          setSvgHex(newValue);
                          if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
                            setSvgColorChanged(true);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="#000000"
                      />
                    </div>
                    {/* )} */}
                  </div>
                </div>
              )}

              {/* TEXT AREA */}
              {type === "textbox" && (
                <div className="mb-2">
                  <textarea
                    value={editText}
                    onChange={(e) => {
                      e.stopPropagation();
                      let newText = e.target.value;
                      // If user clears everything, default to "Text"
                      // if (!newText || !newText.trim()) {
                      //   newText = "Text";
                      // }
                      setEditText(newText);
                      // Immediate update to Redux
                      dispatch(updateTextboxContent({ id, text: newText }));
                      // Update texture immediately
                      setTimeout(() => onUpdateTexture(), 0);
                    }}
                    onBlur={() => {
                      // Ensure at least "Text" is present when leaving the field
                      let finalText = editText;
                      if (!finalText || !finalText.trim()) {
                        finalText = "Text";
                        setEditText("Text");
                      }
                      dispatch(updateTextboxContent({ id, text: finalText }));
                      setTimeout(() => onUpdateTexture(), 0);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full h-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Type..."
                    style={{
                      fontFamily: textbox?.fontFamily || "Arial",
                      // fontSize: `${textbox?.fontSize || 24}px`,
                      fontWeight: textbox?.fontWeight || "normal",
                      fontStyle: textbox?.fontStyle || "normal",
                      color: "#000000",
                      textAlign: textbox?.textAlign || "left",
                      // lineHeight: `${(textbox?.lineHeight || 1.2) * (textbox?.fontSize || 24)}px`,
                      letterSpacing: `${textbox?.letterSpacing || 0}px`,
                    }}
                  />
                </div>
              )}

              {/* ROW: Font family, size, color swatch */}
              {type === "textbox" && (
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {/* Font family */}
                  <div className="col-span-3">
                    <div className="relative">
                      <FontAwesomeIcon
                        icon={faFont}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
                      />
                      <select
                        value={textbox?.fontFamily || "Arial"}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStyleChange("fontFamily", e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {fonts.map((font) => (
                          <option
                            key={font}
                            value={font}
                            style={{ fontFamily: font }}>
                            {font}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Font size */}
                  <div className="col-span-2">
                    <div className="relative">
                      <FontAwesomeIcon
                        icon={faTextHeight}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
                      />
                      <input
                        type="number"
                        min="10"
                        max="200"
                        value={textbox?.fontSize || 24}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStyleChange(
                            "fontSize",
                            parseInt(e.target.value || 0, 10)
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Color swatch (icon-only, no hex text) */}
                  <div className="col-span-1 flex items-center justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowColorPicker((s) => !s);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded border border-gray-300"
                      title="Text color"
                      style={{
                        backgroundColor: textbox?.fontColor || "#ff0000",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Tiny color popover */}
              {showColorPicker && (
                <div
                  className="mb-2 p-2 bg-white border rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}>
                  <HexColorPicker
                    color={textbox?.fontColor || "#ff0000"}
                    onChange={(color) => {
                      handleStyleChange("fontColor", color);
                    }}
                  />
                </div>
              )}

              {/* Row: B / I / Align (icons only) */}
              {type === "textbox" && (
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={handleBoldToggle}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-8 h-8 border rounded flex items-center justify-center ${
                      isBold
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white border-gray-300 hover:bg-gray-100"
                    }`}
                    title="Bold">
                    <FontAwesomeIcon icon={faBold} />
                  </button>
                  <button
                    onClick={handleItalicToggle}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-8 h-8 border rounded flex items-center justify-center ${
                      isItalic
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white border-gray-300 hover:bg-gray-100"
                    }`}
                    title="Italic">
                    <FontAwesomeIcon icon={faItalic} />
                  </button>

                  <div className="flex items-center gap-1 ml-1">
                    {alignmentOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={(e) => handleAlignmentChange(option.value, e)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`w-8 h-8 border rounded flex items-center justify-center ${
                          (textbox?.textAlign || "left") === option.value
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white border-gray-300 hover:bg-gray-100"
                        }`}
                        title={option.title}>
                        <FontAwesomeIcon icon={option.icon} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Row: Letter spacing & Line height (compact sliders) */}
              {type === "textbox" && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                      <span>Letter Spacing</span>
                      <span>{textbox?.letterSpacing || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="20"
                      step="0.5"
                      value={textbox?.letterSpacing || 0}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStyleChange(
                          "letterSpacing",
                          parseFloat(e.target.value)
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none slider"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                      <span>Line Spacing</span>
                      <span>
                        {(
                          (textbox?.lineHeight || 1.2) *
                          (textbox?.fontSize || 24)
                        ).toFixed(0)}
                        px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={textbox?.lineHeight || 1.2}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStyleChange(
                          "lineHeight",
                          parseFloat(e.target.value)
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none slider"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mb-2">
                {type === "image" && image?.isSvg && (
                  <button
                    onClick={handleUpdateSvgColor}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!svgColorChanged}
                    title="Update SVG Color">
                    Update
                  </button>
                )}
              </div>

              <style>{`
                .slider::-webkit-slider-thumb {
                  appearance: none;
                  width: 14px;
                  height: 14px;
                  border-radius: 50%;
                  background: #3b82f6;
                  cursor: pointer;
                }
                .slider::-moz-range-thumb {
                  width: 14px;
                  height: 14px;
                  border-radius: 50%;
                  background: #3b82f6;
                  cursor: pointer;
                  border: none;
                }
              `}</style>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default RenderControls;
