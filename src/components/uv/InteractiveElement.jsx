import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setSelectedElement,
  setSelectedImage,
  setSelectedTextbox,
  updateTextboxPosition,
  updateImagePosition,
  updateTextboxStyle,
  setImageSrc,
  updateTextboxContent,
} from "../../redux/uploadSlice";
import {
  constrainElementToPath,
  getPathBoundingBox,
} from "../utils/elementConstraints";
import ResizeHandles from "./ResizeHandles";
import RenderControls from "./RenderControls";
import { MIN_TEXTBOX_FONT_SIZE } from "../utils/constants";
import { useSvgUrl } from "../hooks/useSvgUrl";
import { useSvgPathColor } from "../hooks/useSvgPathColor";
import { layoutText } from "../utils/textLayout";

function InteractiveElement({
  type,
  element,
  children,
  style,
  onUpdateTexture,
  textareaRef,
  canvasSize,
}) {
  const dispatch = useDispatch();
  const selectedElement = useSelector((state) => state.upload.selectedElement);
  const [isHovered, setIsHovered] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCenteredH, setIsCenteredH] = useState(false);
  const [isCenteredV, setIsCenteredV] = useState(false);
  const [triggerPopup, setTriggerPopup] = useState(0);

  const isSelected =
    selectedElement?.type === type && selectedElement?.id === element.id;

  const fittedText = useMemo(() => {
    if (type !== "textbox" || !element) return null;
    return layoutText({
      text: element.text || "",
      width: element.width || 0,
      height: element.height || 0,
      fontSize: element.fontSize || 24,
      minFontSize: element.minFontSize || MIN_TEXTBOX_FONT_SIZE,
      fontFamily: element.fontFamily || "Arial",
      fontWeight: element.fontWeight || "normal",
      fontStyle: element.fontStyle || "normal",
      lineHeight: element.lineHeight ?? 1.2,
      letterSpacing: element.letterSpacing ?? 0,
    });
  }, [type, element]);

  useEffect(() => {
    if (type !== "textbox" || !element?.id || !fittedText?.fontSize) return;
    const currentSize = element.fontSize || MIN_TEXTBOX_FONT_SIZE;
    if (Math.round(currentSize) !== Math.round(fittedText.fontSize)) {
      dispatch(
        updateTextboxStyle({
          id: element.id,
          fontSize: fittedText.fontSize,
        })
      );
    }
  }, [type, element?.id, element?.fontSize, fittedText?.fontSize, dispatch]);

  const isMovingRef = useRef(false);
  const elementContainerRef = useRef(null);
  const moveData = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const doubleClickTimeoutRef = useRef(null);
  const clickCountRef = useRef(0);

  // Special category constant
  const SPECIAL_CATEGORY_ID = "img_cat_1766324638637";

  // Check if this image belongs to the special category
  const isSpecialCategory =
    type === "image" &&
    element?.category === SPECIAL_CATEGORY_ID &&
    element?.isSvg;

  // Use different hooks based on category
  const { dataUrl: svgDataUrl } = useSvgUrl(
    element?.isSvg && !isSpecialCategory
      ? element.originalSrc || element.src
      : undefined,
    element?.svgColor || "#000000",
    element?.svgStrokeColor || "none",
    false
  );

  // For special category, use path-only colorization
  const specialSvgDataUrl = useSvgPathColor(
    isSpecialCategory ? element.originalSrc || element.src : undefined,
    element?.svgColor || "#000000"
  );

  // Select the appropriate data URL
  const finalSvgDataUrl = isSpecialCategory ? specialSvgDataUrl : svgDataUrl;

  useEffect(() => {
    if (type !== "image" || !element.isSvg || !finalSvgDataUrl) return;
    dispatch(setImageSrc({ id: element.id, src: finalSvgDataUrl }));
  }, [type, element?.isSvg, element?.id, finalSvgDataUrl, dispatch]);

  useEffect(() => {
    if (!isSelected && isEditMode) setIsEditMode(false);
    // Reset triggerPopup when element is deselected
    if (!isSelected && triggerPopup !== 0) {
      setTriggerPopup(0);
    }
  }, [isSelected, isEditMode, triggerPopup]);

  // Unified coordinate getter (mouse + touch)
  const getEventCoordinates = (e) => {
    if (e.touches?.length > 0)
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    if (e.changedTouches?.length > 0)
      return {
        clientX: e.changedTouches[0].clientX,
        clientY: e.changedTouches[0].clientY,
      };
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const getBoundsAndCenter = useCallback(() => {
    if (!element) return null;
    const pathBounds = element.targetElement
      ? getPathBoundingBox(element.targetElement)
      : null;
    if (pathBounds) {
      return {
        boundsLeft: pathBounds.left,
        boundsTop: pathBounds.top,
        boundsRight: pathBounds.right,
        boundsBottom: pathBounds.bottom,
        centerX: pathBounds.left + pathBounds.width / 2,
        centerY: pathBounds.top + pathBounds.height / 2,
      };
    }
    const width = canvasSize?.width || 500;
    const height = canvasSize?.height || 500;
    return {
      boundsLeft: 0,
      boundsTop: 0,
      boundsRight: width,
      boundsBottom: height,
      centerX: width / 2,
      centerY: height / 2,
    };
  }, [element, canvasSize]);

  const handleMoveMove = useCallback(
    (e) => {
      if (!isMovingRef.current) return;
      if (e.cancelable) e.preventDefault();

      const { clientX, clientY } = getEventCoordinates(e);
      const dx = clientX - moveData.current.startX;
      const dy = clientY - moveData.current.startY;

      let newPosition = {
        x: moveData.current.initialX + dx,
        y: moveData.current.initialY + dy,
      };

      const bounds = getBoundsAndCenter();
      if (!bounds) return;
      const {
        centerX,
        centerY,
        boundsLeft,
        boundsTop,
        boundsRight,
        boundsBottom,
      } = bounds;

      const el = element;
      newPosition.x = Math.max(
        boundsLeft,
        Math.min(boundsRight - el.width, newPosition.x)
      );
      newPosition.y = Math.max(
        boundsTop,
        Math.min(boundsBottom - el.height, newPosition.y)
      );

      const elementCenterX = newPosition.x + el.width / 2;
      const elementCenterY = newPosition.y + el.height / 2;
      const snapThreshold = 10;

      const isCenteredHorizontally =
        Math.abs(elementCenterX - centerX) <= snapThreshold;
      const isCenteredVertically =
        Math.abs(elementCenterY - centerY) <= snapThreshold;
      setIsCenteredH(isCenteredHorizontally);
      setIsCenteredV(isCenteredVertically);
      if (isCenteredHorizontally) newPosition.x = centerX - el.width / 2;
      if (isCenteredVertically) newPosition.y = centerY - el.height / 2;

      const { position, size } = constrainElementToPath(
        el,
        newPosition,
        { width: el.width, height: el.height },
        el.targetElement
      );

      if (type === "textbox") {
        dispatch(
          updateTextboxPosition({
            id: el.id,
            ...position,
            ...size,
            onCanvas: el.onCanvas,
          })
        );
      } else if (type === "image") {
        dispatch(
          updateImagePosition({
            id: el.id,
            ...position,
            ...size,
            onCanvas: el.onCanvas,
          })
        );
      }
    },
    [element, type, dispatch, getBoundsAndCenter]
  );

  const handleMoveEnd = useCallback(() => {
    if (!isMovingRef.current) return;
    setIsMoving(false);
    setIsDragging(false);
    isMovingRef.current = false;
    setIsCenteredH(false);
    setIsCenteredV(false);

    document.removeEventListener("mousemove", handleMoveMove);
    document.removeEventListener("mouseup", handleMoveEnd);
    document.removeEventListener("touchmove", handleMoveMove);
    document.removeEventListener("touchend", handleMoveEnd);

    document.body.style.cursor = "default";
    if (typeof onUpdateTexture === "function") onUpdateTexture();
  }, [handleMoveMove, onUpdateTexture]);

  const handleMoveStart = useCallback(
    (e) => {
      e.stopPropagation();
      if (isEditMode) return;

      setIsMoving(true);
      setIsDragging(true);
      isMovingRef.current = true;

      const { clientX, clientY } = getEventCoordinates(e);
      moveData.current = {
        startX: clientX,
        startY: clientY,
        initialX: element.x || 0,
        initialY: element.y || 0,
      };

      // Mouse
      document.addEventListener("mousemove", handleMoveMove, {
        passive: false,
      });
      document.addEventListener("mouseup", handleMoveEnd);
      // Touch
      document.addEventListener("touchmove", handleMoveMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleMoveEnd);

      document.body.style.cursor = "grabbing";
    },
    [element, isEditMode, handleMoveMove, handleMoveEnd]
  );

  const handleMouseEnter = () => {
    if (!selectedElement || selectedElement?.id !== element.id)
      setIsHovered(true);
  };
  const handleMouseLeave = () => setIsHovered(false);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isDragging) {
      setIsDragging(false);
      return;
    }
    
    // If element is not selected, just select it (first click)
    if (!isSelected) {
      dispatch(setSelectedElement({ type, id: element.id }));
      if (type === "image") dispatch(setSelectedImage(element));
      if (type === "textbox") dispatch(setSelectedTextbox(element));
      setIsEditMode(false);
      clickCountRef.current = 0; // Reset click count
      return;
    }
    
    // Element is already selected, handle double-click logic
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      doubleClickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 300);
    } else if (clickCountRef.current === 2) {
      if (doubleClickTimeoutRef.current)
        clearTimeout(doubleClickTimeoutRef.current);
      clickCountRef.current = 0;
      if (type === "textbox") {
        // Open popup instead of entering edit mode
        setTriggerPopup(Date.now());
      }
    }
  };

  const getCursor = () => {
    if (isMoving) return "grabbing";
    if (isEditMode && type === "textbox") return "text";
    if (isSelected) return type === "textbox" && !isEditMode ? "grab" : "";
    return isHovered ? "grab" : "default";
  };

  const setMovingState = (moving) => setIsMoving(moving);

  const renderCenterGuides = () => {
    if (!isMoving || !element || (type !== "image" && type !== "textbox"))
      return null;
    const {
      centerX,
      centerY,
      boundsLeft,
      boundsTop,
      boundsRight,
      boundsBottom,
    } = getBoundsAndCenter();
    const showVerticalGuide = isCenteredH;
    const showHorizontalGuide = isCenteredV;
    const showCenterTitle = isCenteredH && isCenteredV;
    return (
      <div className="absolute inset-0 pointer-events-none z-50">
        {showVerticalGuide && (
          <div
            className="absolute bg-blue-500 opacity-70"
            style={{
              left: `${centerX}px`,
              top: `${boundsTop}px`,
              width: "2px",
              height: `${boundsBottom - boundsTop}px`,
              transform: "translateX(-50%)",
            }}
          />
        )}
        {showHorizontalGuide && (
          <div
            className="absolute bg-blue-500 opacity-70"
            style={{
              left: `${boundsLeft}px`,
              top: `${centerY}px`,
              width: `${boundsRight - boundsLeft}px`,
              height: "2px",
              transform: "translateY(-50%)",
            }}
          />
        )}
        {showCenterTitle && (
          <div
            className="absolute bg-blue-500 text-white px-2 py-1 rounded text-sm font-medium shadow-lg"
            style={{
              left: `${centerX}px`,
              top: `${centerY - 30}px`,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
            }}>
            CENTER
          </div>
        )}
      </div>
    );
  };

  const appliedFontSize =
    fittedText?.fontSize || element?.fontSize || MIN_TEXTBOX_FONT_SIZE;

  const renderedTextLines =
    fittedText?.lines && fittedText.lines.length > 0
      ? fittedText.lines
      : [element?.text || ""];

  const readonlyDisplayText = renderedTextLines.join("\n");

  // Clone children (span for textbox) to inject contentEditable + scale/input handlers
  const modifiedChildren = React.Children.map(children, (child) => {
    if (
      type === "textbox" &&
      React.isValidElement(child) &&
      child.type === "span"
    ) {
      const displayText = isEditMode ? element.text || "" : readonlyDisplayText;
      return React.cloneElement(
        child,
        {
          contentEditable: "none",
          suppressContentEditableWarning: true,
          style: {
            ...child.props.style,
            pointerEvents: isEditMode ? "auto" : "none",
            cursor: isEditMode ? "text" : "grab",
            userSelect: "none",
            WebkitUserSelect: "none",
            fontSize: `${appliedFontSize}px`,
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            wordBreak: "break-word",
            textAlign: element.textAlign || "left",
            lineHeight: element.lineHeight ? String(element.lineHeight) : "1.2",
            letterSpacing: `${element.letterSpacing || 0}px`,
            display: "block",
            width: "100%",
            height: "100%",
            overflow: "hidden",
          },
          onMouseDown: isEditMode ? undefined : handleMoveStart,
          onTouchStart: isEditMode ? undefined : handleMoveStart,
          onKeyDown: (ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              const sel = window.getSelection();
              if (!sel || !sel.rangeCount) return;
              const range = sel.getRangeAt(0);
              const node = document.createTextNode("\n");
              range.insertNode(node);
              range.setStartAfter(node);
              range.setEndAfter(node);
              sel.removeAllRanges();
              sel.addRange(range);
              if (typeof onUpdateTexture === "function") onUpdateTexture();
            }
          },
          onInput: (ev) => {
            if (
              selectedElement &&
              typeof selectedElement.onTextChange === "function"
            ) {
              selectedElement.onTextChange(
                element.id,
                ev.currentTarget.textContent || ""
              );
            }
            if (typeof onUpdateTexture === "function") onUpdateTexture();
          },
          onBlur: () => {
            // Check if textbox content is empty
            if (!element.text || !element.text.trim()) {
              // Restore default text
              dispatch(
                updateTextboxContent({
                  id: element.id,
                  text: "Text",
                })
              );
              if (typeof onUpdateTexture === "function") onUpdateTexture();
            }
            setIsEditMode(false);
          },
        },
        displayText
      );
    }
    return child;
  });

  return (
    <>
      <div
        ref={elementContainerRef}
        id={`${type}-${element.id}`}
        className="absolute touch-none box-border pointer-events-auto layer-controls "
        style={{
          ...style,
          position: "absolute",
          left: `${element.x}px`,
          top: `${element.y}px`,
          width: `${element.width}px`,
          height: `${element.height}px`,
          opacity: element.onCanvas ? "0.9" : "1",
          zIndex: element.onCanvas ? "10" : "20",
          cursor: getCursor(),
          userSelect: "none",
          transition: "outline 0.2s ease",
          touchAction: "none",
          outline: isHovered && !isSelected ? "2px solid #388ceb" : "none",
          transform: `rotate(${element.rotation || 0}deg)`,
          transformOrigin: "center",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }} // ← ADD THIS LINE
        onMouseDown={
          type === "image"
            ? handleMoveStart
            : isEditMode
            ? undefined
            : handleMoveStart
        }
        onTouchStart={
          type === "image"
            ? handleMoveStart
            : isEditMode
            ? undefined
            : handleMoveStart
        }>
        <div className="w-full h-full relative">
          {/* content-wrap - no padding */}
          <div className="absolute inset-0" style={{ overflow: "hidden" }}>
            {type === "image" ? (
              element.isSvg ? (
                finalSvgDataUrl ? (
                  <img
                    src={finalSvgDataUrl}
                    alt="uploaded-svg"
                    className="w-full h-full pointer-events-none select-none"
                    style={{
                      objectFit: "fill",
                      width: "100%",
                      height: "100%",
                      display: "block",
                    }}
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Loading SVG...
                  </div>
                )
              ) : (
                <img
                  src={element.src}
                  alt="uploaded"
                  className="w-full h-full object-fill pointer-events-none select-none"
                  style={{ display: "block" }}
                  draggable={false}
                />
              )
            ) : (
              modifiedChildren
            )}
          </div>

          {/* {isSelected && !isEditMode && (
            <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-cyan-500" />
          )} */}
        </div>

        {isSelected && (
          <ResizeHandles
            setMovingState={setMovingState}
            setIsCenteredH={setIsCenteredH}
            setIsCenteredV={setIsCenteredV}
          />
        )}
      </div>

      {renderCenterGuides()}

      {isSelected && (
        <RenderControls
          type={type}
          id={element.id}
          isSelected={true}
          onUpdateTexture={onUpdateTexture}
          textareaRef={textareaRef}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rotation={element.rotation || 0}
          showCopyButton={true}
          openPopup={triggerPopup}
        />
      )}
    </>
  );
}

export default InteractiveElement;
