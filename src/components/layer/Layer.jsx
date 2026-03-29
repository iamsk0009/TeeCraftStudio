import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp,
  // faFileExport,
  faTShirt,
  faFont,
  // faMagicWandSparkles,
  faPalette,
} from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ToolRenderer from "./ToolRenderer";
import { setSelectedTool } from "../../redux/loadingSlice";
import {
  addTextbox,
  setSelectedTextbox,
  setSelectedElement,
} from "../../redux/uploadSlice";
import { constrainElementToPath, getPathBoundingBox } from "../utils/elementConstraints";
import { measureTextDimensions } from "../utils/textMetrics";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";

function Layer() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const selectedTool = useSelector((state) => state.loading.selectedTool);
  const selectedPath = useSelector((state) => state.color.selectedPathId);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleAddTextbox = () => {
    if (!selectedPath) {
      // SweetAlert2
      Swal.fire({
        icon: "error",
        title: "Region Not Selected",
        text: "Click on a region of the product to add text.",
        confirmButtonText: "OK",
        confirmButtonColor: "#DC2626",
        background: "#FFFFFF",
        customClass: {
          container: "swal-mobile-container",
          popup: "swal-mobile-popup",
          title: "text-red-600",
          htmlContainer: "text-red-700",
        },
        width: isMobile ? "80%" : "32rem",
      });
      return;
    }

    const svgElement = document.querySelector("svg");
    const svgBounds = svgElement.getBoundingClientRect();

    // Get the bounds of the selected path to find its center
    const pathBounds = getPathBoundingBox(selectedPath);
    
    // Use path center if available, otherwise fall back to canvas center
    const centerX = pathBounds ? pathBounds.left + pathBounds.width / 2 : svgBounds.width / 2;
    let centerY = pathBounds ? pathBounds.top + pathBounds.height / 2 : svgBounds.height / 2;
    // Move slightly up (subtract 30 pixels from Y)
    centerY = centerY - 70;

    const fontSize = 60;
    const textMetrics = measureTextDimensions({
      text: "Text",
      fontSize,
      fontFamily: "Arial",
      fontWeight: "normal",
      fontStyle: "normal",
      lineHeight: 1.2,
      letterSpacing: 0,
    });

    const initialWidth = Math.max(20, Math.ceil(textMetrics.width));
    const initialHeight = Math.max(20, Math.ceil(textMetrics.height));

    const initialPosition = {
      x: centerX - initialWidth / 2,
      y: centerY - initialHeight / 2,
    };

    const initialSize = {
      width: initialWidth,
      height: initialHeight,
    };

    const { position, size } = constrainElementToPath(
      { ...initialPosition, ...initialSize },
      initialPosition,
      initialSize,
      selectedPath
    );

    const newTextbox = {
      id: Date.now(),
      text: "Text",
      ...position,
      ...size,
      fontSize: fontSize,
      fontFamily: "Arial",
      fontColor: "#ff0000",
      textDecoration: "none",
      textAlign: "center",
      textStroke: "none",
      onCanvas: true,
      rotation: 0,
      targetElement: selectedPath,
    };

    dispatch(addTextbox(newTextbox));
    dispatch(setSelectedTextbox(newTextbox));
    dispatch(setSelectedElement({ type: "textbox", id: newTextbox.id }));
  };

  const handleToolClick = (tool) => {
    if (tool.action) {
      tool.action();
    } else {
      dispatch(setSelectedTool(tool.id));
    }
  };

  const tools = [
    {
      id: "products",
      icon: faTShirt,
      label: t("layers.products"),
      iconStyle: { height: "28px", width: "28px", marginLeft: "0px" },
    },
    {
      id: "uploads",
      icon: faCloudArrowUp,
      label: t("layers.uploads"),
      iconStyle: { height: "25px", width: "25px" },
    },
    {
      id: "elements",
      icon: faFont,
      label: t("layers.texts"),
      iconStyle: { height: "25px", width: "25px" },
      action: handleAddTextbox,
    },
    // {
    //   id: "aigeneration",
    //   icon: faMagicWandSparkles,
    //   label: t('layers.aiGeneration'),
    //   iconStyle: { height: "25px", width: "25px", marginLeft: "10px" },
    // },
    {
      id: "mydesigns",
      icon: faPalette,
      label: t("layers.myDesigns"),
      iconStyle: { height: "28px", width: "28px", marginLeft: "0px" },
    },
    // {
    //   id: "fileexport",
    //   icon: faFileExport,
    //   label: t('layers.export'),
    //   iconStyle: { height: "25px", width: "25px", marginLeft: "10px" },
    // },
  ];

  return (
    <div className="layer-controls">
      {/* Tool Panel */}
      <div className="absolute rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.1)] overflow-hidden bg-white  z-30 border border-gray-200 md:top-1/2 md:bottom-auto bottom-1.5  -translate-y-1/2 md:left-[2%] left-[8%]">
        <div className="flex h-full">
          <div className="flex flex-raw md:flex-col md:py-1 py-2 shadow-md">
            {tools.map((tool, index) => (
              <div key={tool.id}>
                <div
                  className={`flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors px-2.5 py-0.5 md:py-2
                                        ${
                                          selectedTool === tool.id
                                            ? "text-[#10196A]"
                                            : "text-[#10196A] hover:text-[#A074DB]"
                                        }`}
                  onClick={() => handleToolClick(tool)}>
                  <FontAwesomeIcon icon={tool.icon} style={tool.iconStyle} />
                  <p className="hidden md:block  text-xs text-center md:text-sm">
                    {tool.label}
                  </p>
                </div>
                {index < tools.length - 1 && (
                  <div className="mx-4 my-2 hidden md:block md:border-t md:border-[#10196A]"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tool Renderer Modal */}
      {selectedTool && selectedTool !== "elements" && (
        <div className="absolute inset-0 w-full h-full bg-black/70 z-30 flex justify-center items-center p-6 layer-controls">
          <ToolRenderer
            selectedTool={selectedTool}
            onClose={() => dispatch(setSelectedTool(""))}
          />
        </div>
      )}
    </div>
  );
}

export default Layer;
