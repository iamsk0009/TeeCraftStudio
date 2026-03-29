// =============================================
// UvPath.jsx
// =============================================
import { useRef, useEffect, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setTextureUrl } from "../../redux/textureSlice";
import { setSelectedElement } from "../../redux/uploadSlice";
import { generateTexture } from "../utils/generateTexture";
import BottomControls from "./BottomControls";
import SvgComponent from "./SvgComponent";
import InteractiveElement from "./InteractiveElement";
import { useProductElementTransformer } from "../hooks/useProductElementTransformer";

function UvPath() {
  const dispatch = useDispatch();
  const color = useSelector((state) => state.color.color);
  const images = useSelector((state) => state.upload.images);
  const textboxes = useSelector((state) => state.upload.textboxes);
  const layerOrder = useSelector((state) => state.upload.layerOrder);
  const { svgLoaded } = useSelector((state) => state.loading);
  // const selectedElement = useSelector((state) => state.upload.selectedElement);
  const { showColorPicker } = useSelector((state) => state.color);
  const { selectedProduct } = useSelector((state) => state.products);
  const zoomLevel = useSelector((state) => state.bottomControls.zoomLevel);

  // Use the product element transformer hook to handle element transformation on product switch
  useProductElementTransformer();

  const textureCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const textureUpdateTimeoutRef = useRef(null);
  const svgContainerRef = useRef(null);

  // Dynamic canvas size based on SVG dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });

  // Create a Map to store individual refs for each textbox
  const textareaRefsMap = useRef(new Map());

  const getTextareaRef = useCallback((textboxId) => {
    if (!textareaRefsMap.current.has(textboxId)) {
      textareaRefsMap.current.set(textboxId, { current: null });
    }
    return textareaRefsMap.current.get(textboxId);
  }, []);

  useEffect(() => {
    const currentTextboxIds = new Set(textboxes.map((tb) => tb.id));
    const refsToDelete = [];
    textareaRefsMap.current.forEach((ref, id) => {
      if (!currentTextboxIds.has(id)) refsToDelete.push(id);
    });
    refsToDelete.forEach((id) => textareaRefsMap.current.delete(id));
  }, [textboxes]);

  const updateTextureWithDebounce = useCallback(() => {
    if (!selectedProduct || !svgLoaded) return;
    if (!containerRef.current || !svgRef.current || !textureCanvasRef.current)
      return;
    if (textureUpdateTimeoutRef.current)
      clearTimeout(textureUpdateTimeoutRef.current);
    const delay = 100;
    textureUpdateTimeoutRef.current = setTimeout(() => {
      generateTexture(
        containerRef,
        svgRef,
        textureCanvasRef,
        images,
        textboxes,
        color,
        selectedProduct,
        layerOrder
      )
        .then((textureUrl) => {
          dispatch(setTextureUrl(textureUrl));
        })
        .catch((err) => console.error("Error generating texture:", err));
    }, delay);
  }, [
    images,
    textboxes,
    color,
    selectedProduct,
    dispatch,
    layerOrder,
    svgLoaded,
  ]);

  useEffect(() => {
    if (svgRef.current) {
      if (selectedProduct?.selectedSvgIds?.length > 0) {
        selectedProduct.selectedSvgIds.forEach((id) => {
          const element = svgRef.current.querySelector(`#${id}`);
          if (element) element.setAttribute("fill", color);
        });
      }
      updateTextureWithDebounce();
    }
  }, [color, selectedProduct, updateTextureWithDebounce]);

  // Trigger texture update when images or textboxes change
  useEffect(() => {
    if (svgLoaded) {
      updateTextureWithDebounce();
    }
  }, [images, textboxes, svgLoaded, updateTextureWithDebounce]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        event.target.closest(".color-picker-container") ||
        event.target.closest(".render-controls")
      )
        return;
      if (showColorPicker) return;
      const clickedOnElement = event.target.closest("[data-element-type]");
      if (!clickedOnElement) dispatch(setSelectedElement(null));
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dispatch, showColorPicker]);

  // Update canvas size based on SVG dimensions
  useEffect(() => {
    if (!svgRef.current || !svgLoaded) return;

    const updateCanvasSize = () => {
      const svg = svgRef.current;
      if (!svg) return;

      // Get SVG dimensions from viewBox or natural size
      const viewBox = svg.getAttribute('viewBox');
      let width, height;

      if (viewBox) {
        const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
        width = vbWidth;
        height = vbHeight;
      } else {
        // Fallback to width/height attributes or bounding box
        width = parseFloat(svg.getAttribute('width')) || svg.getBBox().width;
        height = parseFloat(svg.getAttribute('height')) || svg.getBBox().height;
      }

      // Apply responsive scaling
      const isMobile = window.innerWidth <= 768;
      const maxSize = isMobile ? 300 : 500;
      const aspectRatio = width / height;

      let scaledWidth, scaledHeight;
      if (width > height) {
        scaledWidth = Math.min(width, maxSize);
        scaledHeight = scaledWidth / aspectRatio;
      } else {
        scaledHeight = Math.min(height, maxSize);
        scaledWidth = scaledHeight * aspectRatio;
      }

      setCanvasSize({ width: scaledWidth, height: scaledHeight });
      updateTextureWithDebounce();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [svgLoaded, updateTextureWithDebounce]);

  // const isElementSelected = (type, id) =>
  // selectedElement?.type === type && selectedElement?.id === id;

  const sortedElements = layerOrder
    .map((layerItem) =>
      layerItem.type === "image"
        ? images.find((img) => img.id === layerItem.id)
        : textboxes.find((tb) => tb.id === layerItem.id)
    )
    .filter(Boolean)
    .map((element, index) => ({
      ...element,
      layerType: layerOrder[index].type,
      zIndex: index + 10,
    }));

    // console.log(svgRef);
    

  return (
    <>
      <div ref={containerRef} className="relative w-screen h-full">
        <div
          className="content"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            position: "relative",
            width: "100%",
            height: "100%",
          }}>
          <canvas ref={textureCanvasRef} style={{ display: "none" }} />

          {/* container that centers and holds both SVG and elements */}
          <div
            ref={svgContainerRef}
            className="absolute left-1/2 top-[40%] md:top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ 
              width: `${canvasSize.width}px`, 
              height: `${canvasSize.height}px`,
              position: 'relative'
            }}>
            <SvgComponent ref={svgRef} />

            {sortedElements.map((element) => {
              const currentTextareaRef =
                element.layerType === "textbox"
                  ? getTextareaRef(element.id)
                  : null;
              return (
                <InteractiveElement
                  key={`${element.layerType}-${element.id}`}
                  type={element.layerType}
                  element={element}
                  onUpdateTexture={updateTextureWithDebounce}
                  textareaRef={currentTextareaRef}
                  canvasSize={canvasSize}
                  style={{ zIndex: element.zIndex }}
                  data-element-type={element.layerType}>
                  {element.layerType === "image" ? (
                    <img
                      src={element.src}
                      alt="uploaded"
                      className="w-full h-full object-fill pointer-events-none select-none"
                      draggable="false"
                    />
                  ) : (
                    <span
                      ref={currentTextareaRef}
                      style={{
                        fontSize: `${element.fontSize || 24}px`,
                        fontFamily: element.fontFamily || "Arial",
                        fontWeight: element.fontWeight || "normal",
                        fontStyle: element.fontStyle || "normal",
                        color: element.fontColor || "black",
                        letterSpacing: `${element.letterSpacing || 0}px`,
                        lineHeight: element.lineHeight
                          ? String(element.lineHeight)
                          : "1.2",
                        whiteSpace: "pre", // ← render \n as new lines (no auto-wrap)
                        textAlign: element.textAlign || "left",
                        display: "inline-block",
                      }}
                      onClick={(e) => e.stopPropagation()}>
                      {element.text || "Enter your text"}
                    </span>
                  )}
                </InteractiveElement>
              );
            })}
          </div>
        </div>
      </div>
      <BottomControls />
    </>
  );
}

export default UvPath;
