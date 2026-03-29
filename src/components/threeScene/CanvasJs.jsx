import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Suspense } from "react";
import { OrbitControls } from "@react-three/drei";
import ErrorBoundary from "./ErrorBoundary";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedTool } from "../../redux/loadingSlice";
import Lights from "./Lights";
import Scene from "./Scene";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import interact from "interactjs";
import {
  faUpRightAndDownLeftFromCenter,
  faMinus,
  faPlus,
  faMinimize,
} from "@fortawesome/free-solid-svg-icons";
import ViewCubeControls from "../utils/viewCubeController";
import { useTranslation } from "react-i18next";

const cameraPositions = {
  front: { position: [0, 0, 1.5], rotation: [0, 0, 0] },
  back: { position: [0, 0, -1.5], rotation: [0, Math.PI, 0] },
  right: { position: [1.5, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  left: { position: [-1.5, 0, 0], rotation: [0, Math.PI / 2, 0] },
};

function CubeView({ mainCamera, viewCubeControlsRef, controlsRef }) {
  const { gl, scene, camera: cubeCamera } = useThree();
  const localViewCubeRef = useRef(null);

  useEffect(() => {
    const cubeCanvas = gl.domElement;

    cubeCamera.lookAt(0, 0, 0);

    const viewCube = new ViewCubeControls(cubeCamera, 30, 5, cubeCanvas);
    scene.add(viewCube.getObject());

    const handleAngleChange = (event) => {
      if (mainCamera && controlsRef.current) {
        const invertedQuaternion = event.quaternion.clone().invert();
        const distance = mainCamera.position.length();
        const newPosition = new THREE.Vector3(0, 0, distance);
        newPosition.applyQuaternion(invertedQuaternion);
        mainCamera.position.copy(newPosition);
        mainCamera.lookAt(controlsRef.current.target);
        controlsRef.current.update();
      }
    };

    viewCube.addEventListener("angle-change", handleAngleChange);
    localViewCubeRef.current = viewCube;
    viewCubeControlsRef.current = viewCube;

    return () => {
      viewCube.removeEventListener("angle-change", handleAngleChange);
      if (viewCube._handleMouseMove) {
        cubeCanvas.removeEventListener("mousemove", viewCube._handleMouseMove);
      }
      if (viewCube._handleMouseClick) {
        cubeCanvas.removeEventListener("click", viewCube._handleMouseClick);
      }
      scene.remove(viewCube.getObject());
    };
  }, [cubeCamera, gl, mainCamera, scene, controlsRef, viewCubeControlsRef]);

  useFrame(() => {
    if (localViewCubeRef.current) {
      localViewCubeRef.current.update();
    }
  });

  return null;
}

// Hook to access scene and renderer for off-screen rendering
function useOffscreenRenderer() {
  const { gl, scene } = useThree();

  const renderOffscreen = useCallback(
    (camera, width, height) => {
      // Balanced resolution: 3x DPR for high quality with reasonable performance
      const dpr = 3; // Balanced between quality and speed
      const renderWidth = width * dpr;
      const renderHeight = height * dpr;

      // Create off-screen render target WITHOUT encoding to avoid double conversion
      const renderTarget = new THREE.WebGLRenderTarget(
        renderWidth,
        renderHeight,
        {
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
          colorSpace: THREE.SRGBColorSpace, // Use colorSpace instead of encoding
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          generateMipmaps: false, // Disable mipmaps for performance
        }
      );

      // Store ALL original renderer settings to ensure perfect restoration
      const originalRenderTarget = gl.getRenderTarget();
      const originalToneMapping = gl.toneMapping;
      const originalToneMappingExposure = gl.toneMappingExposure;
      const originalOutputColorSpace = gl.outputColorSpace;
      const originalClearColor = gl.getClearColor(new THREE.Color());
      const originalClearAlpha = gl.getClearAlpha();

      // Copy exact settings from main canvas renderer
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.0;
      gl.outputColorSpace = THREE.SRGBColorSpace;

      // Set transparent background or match viewport background
      gl.setClearColor(0x000000, 0); // Transparent black

      // Render to off-screen target
      gl.setRenderTarget(renderTarget);
      gl.clear(); // Clear before rendering
      gl.render(scene, camera);

      // Read pixels - they're already in correct color space
      const pixels = new Uint8Array(renderWidth * renderHeight * 4);
      gl.readRenderTargetPixels(
        renderTarget,
        0,
        0,
        renderWidth,
        renderHeight,
        pixels
      );

      // Restore ALL original renderer settings
      gl.setRenderTarget(originalRenderTarget);
      gl.toneMapping = originalToneMapping;
      gl.toneMappingExposure = originalToneMappingExposure;
      gl.outputColorSpace = originalOutputColorSpace;
      gl.setClearColor(originalClearColor, originalClearAlpha);

      // Create canvas and flip Y in one optimized pass
      const canvas = document.createElement("canvas");
      canvas.width = renderWidth;
      canvas.height = renderHeight;
      const ctx = canvas.getContext("2d", {
        alpha: true,
        willReadFrequently: false,
      });
      const imageData = ctx.createImageData(renderWidth, renderHeight);

      // Optimized Y-flip: Copy row by row instead of pixel by pixel
      const rowSize = renderWidth * 4;
      for (let y = 0; y < renderHeight; y++) {
        const srcOffset = (renderHeight - y - 1) * rowSize;
        const dstOffset = y * rowSize;
        imageData.data.set(
          pixels.subarray(srcOffset, srcOffset + rowSize),
          dstOffset
        );
      }

      ctx.putImageData(imageData, 0, 0);

      // Cleanup
      renderTarget.dispose();

      // Use 1.0 quality for best quality
      return canvas.toDataURL("image/png", 1.0);
    },
    [gl, scene]
  );

  return renderOffscreen;
}

function ScreenshotManager({ onRenderOffscreen }) {
  const renderOffscreen = useOffscreenRenderer();

  useEffect(() => {
    onRenderOffscreen(renderOffscreen);
  }, [renderOffscreen, onRenderOffscreen]);

  return null;
}

function CanvasJs() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const controlsRef = useRef(null);
  const [currentView, setCurrentView] = useState("front");
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  // const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin;
  const camera = useRef(
    new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
  );
  const [zoom, setZoom] = useState(100);
  const viewCubeControlsRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showCanvas, setShowCanvas] = useState(false);
  const offscreenRenderRef = useRef(null);

  // Get selected product from Redux store
  const selectedProduct = useSelector(
    (state) => state.products.selectedProduct
  );

  const handleOrbitChange = useCallback(() => {
    if (viewCubeControlsRef.current && camera.current && controlsRef.current) {
      const direction = new THREE.Vector3();
      camera.current.getWorldDirection(direction);
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      const matrix = new THREE.Matrix4();
      matrix.lookAt(camera.current.position, controlsRef.current.target, up);
      quaternion.setFromRotationMatrix(matrix);
      viewCubeControlsRef.current.setQuaternion(quaternion.invert());
    }
  }, []);

  const handleZoom = (direction) => {
    if (!controlsRef.current || !camera.current) return;
    const controls = controlsRef.current;
    const cam = camera.current;
    const target = controls.target;
    const camPos = cam.position.clone();
    const dirVec = target.clone().sub(camPos).normalize();
    const distance = camPos.distanceTo(target);
    let newDistance = direction === "in" ? distance * 0.9 : distance * 1.1;
    newDistance = Math.max(
      controls.minDistance || 0.5,
      Math.min(controls.maxDistance || 10, newDistance)
    );
    const newCamPos = target.clone().add(dirVec.multiplyScalar(-newDistance));
    cam.position.copy(newCamPos);
    cam.updateProjectionMatrix();
    controls.update();
    setZoom(Math.round((1 / newDistance) * 100));
  };

  const takeScreenshot = useCallback(async () => {
    if (!window.selectedViews?.length || !offscreenRenderRef.current) return [];

    const previews = [];

    try {
      // Use 2x instead of 3x for faster rendering
      const width = canvasRef.current.width * 2;
      const height = canvasRef.current.height * 2;

      // Reuse camera instead of creating new ones
      const tempCamera = camera.current.clone();

      for (const view of window.selectedViews) {
        const viewConfig = cameraPositions[view];
        if (!viewConfig) continue;

        tempCamera.position.set(...viewConfig.position);
        tempCamera.lookAt(0, 0, 0);
        tempCamera.aspect = width / height;
        tempCamera.updateProjectionMatrix();

        // Render with reduced quality for speed
        const screenshotDataUrl = offscreenRenderRef.current(
          tempCamera,
          width,
          height
        );
        previews.push({ view, screenshotDataUrl });
      }

      return previews;
    } catch (error) {
      console.error("Error taking screenshots:", error);
      return [];
    } finally {
      dispatch(setSelectedTool(null));
    }
  }, [dispatch]);

  const initializeResize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialSize = {
      width: isMobile ? 200 : 250,
      height: isMobile ? 200 : 250,
    };

    const maxSize = {
      width: isMobile ? 320 : 600,
      height: isMobile ? 320 : 600,
    };

    interact(container).resizable({
      edges: { left: true, bottom: true },
      inertia: false,
      listeners: {
        start: (event) => {
          setOrbitEnabled(false);
          event.preventDefault();
        },
        move: (event) => {
          let { width, height } = event.rect;
          const size = Math.min(
            Math.max(Math.max(width, height), initialSize.width),
            maxSize.width
          );
          container.style.width = `${size}px`;
          container.style.height = `${size}px`;
        },
        end: () => {
          setOrbitEnabled(true);
        },
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: initialSize.width, height: initialSize.height },
          max: { width: maxSize.width, height: maxSize.height },
        }),
        interact.modifiers.restrictEdges({
          outer: "parent",
          endOnly: true,
        }),
      ],
    });
  }, [isMobile]);

  useEffect(() => {
    initializeResize();
  }, [initializeResize]);

  useEffect(() => {
    if (camera.current) {
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
      const { position, rotation } = cameraPositions[currentView];
      camera.current.position.set(...position);
      camera.current.rotation.set(...rotation);
    }
  }, [currentView]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initializeResize]);

  useEffect(() => {
    window.takeCanvasScreenshot = async () => {
      const previews = await takeScreenshot();
      return previews;
    };
    window.setCanvasView = (view) => {
      setOrbitEnabled(false);
      setCurrentView(view);
      setTimeout(() => {
        setOrbitEnabled(true);
      }, 300);
    };
    window.getCurrentView = () => currentView;
  }, [currentView, takeScreenshot]);

  const handleOffscreenRender = useCallback((renderFn) => {
    offscreenRenderRef.current = renderFn;
  }, []);

  return (
    <>
      <button
        className="absolute top-4 left-4 md:top-6 md:left-10 bg-[#10196A] hover:bg-[#A074DB] text-white  text-sm rounded-full md:rounded-md p-3 shadow-lg z-10"
        onClick={() => {
          setShowSizeChart(true);
          setImageLoading(true);
        }}>
        {t("common.sizeChart")}
      </button>
      {showSizeChart && (
        <div className="absolute inset-0 bg-black/70  flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg p-4 md:max-w-3xl md:h-[85vh] w-[80vw] h-[40vh] overflow-auto flex items-center justify-center">
            <button
              className="absolute top-2 right-3 text-black text-2xl font-bold hover:text-[#A074DB] cursor-pointer z-10"
              onClick={() => {
                setShowSizeChart(false);
                setImageLoading(false);
              }}>
              ✕
            </button>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#10196A] border-t-transparent"></div>
              </div>
            )}
            <img
              src={selectedProduct.sizeChartUrl}
              alt="Size Chart"
              className="w-full h-auto"
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
              style={{ display: imageLoading ? "none" : "block" }}
            />
          </div>
        </div>
      )}
      {isMobile && !showCanvas && (
        <button
          className="absolute top-4 right-4 bg-[#10196A] text-white text-sm rounded-full p-3 shadow-lg z-40"
          onClick={() => setShowCanvas(true)}>
          {t("canvas.viewin3d")}
        </button>
      )}
      <div
        ref={containerRef}
        className="absolute md:top-[5%] top-[2%] right-[2%] bg-linear-to-b from-[#c7c8ca] to-white rounded-2xl shadow-lg z-20 select-none group"
        style={{
          width: isMobile ? "200px" : "250px",
          height: isMobile ? "200px" : "250px",
          pointerEvents: "auto",
          touchAction: "pinch-zoom",
          visibility: isMobile && !showCanvas ? "hidden" : "visible",
        }}>
        <button
          className="absolute top-2 right-2 flex items-center justify-center w-10 h-10 rounded-full bg-[#10196A] text-white z-50 hover:bg-[#A074DB]"
          onClick={() => {
            if (containerRef.current) {
              const initialSize = isMobile ? "200px" : "250px";
              containerRef.current.style.width = initialSize;
              containerRef.current.style.height = initialSize;
            }
            if (isMobile) {
              setShowCanvas(false);
            }
          }}>
          {isMobile ? (
            "✕"
          ) : (
            <FontAwesomeIcon icon={faMinimize} className="text-lg" />
          )}
        </button>
        <div
          className="absolute left-2 bottom-0 w-6 h-6 cursor-sw-resize touch-pinch-zoom z-45"
          data-resize="true">
          <FontAwesomeIcon
            icon={faUpRightAndDownLeftFromCenter}
            className="text-xl"
          />
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-0 flex justify-center w-auto z-30"
          style={{ pointerEvents: "auto" }}>
          <div
            className="flex items-center z-40 rounded-lg px-2 py-1"
            style={{ pointerEvents: "auto" }}>
            <button
              className="group relative p-2 hover:bg-gray-100 rounded-xl cursor-pointer z-40"
              style={{ pointerEvents: "auto" }}
              onClick={() => handleZoom("out")}>
              <FontAwesomeIcon
                icon={faMinus}
                className="text-[#10196A] hover:text-[#A074DB]"
              />
            </button>
            <span className="w-16 text-center text-sm text-[#10196A] font-medium select-none">
              {zoom}%
            </span>
            <button
              className="group relative p-2 hover:bg-gray-100 rounded-lg cursor-pointer z-40"
              style={{ pointerEvents: "auto" }}
              onClick={() => handleZoom("in")}>
              <FontAwesomeIcon
                icon={faPlus}
                className="text-[#10196A] hover:text-[#A074DB]"
              />
            </button>
          </div>
        </div>

        <Canvas
          ref={canvasRef}
          shadows
          camera={camera.current}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
            alpha: true,
            physicallyCorrectLights: true,
          }}
          dpr={[1, Math.min(2, window.devicePixelRatio)]}>
          <ErrorBoundary>
            <Suspense fallback={null}>
              <Scene />
              <ScreenshotManager onRenderOffscreen={handleOffscreenRender} />
              {orbitEnabled && (
                <OrbitControls
                  ref={controlsRef}
                  minDistance={0.5}
                  maxDistance={10}
                  makeDefault
                  onChange={handleOrbitChange}
                />
              )}
            </Suspense>
          </ErrorBoundary>
          <Lights />
        </Canvas>

        <div className="absolute top-2 left-2 w-[60px] h-[60px] md:w-[80px] md:h-[80px]">
          <Canvas
            camera={{
              fov: 50,
              aspect: 1,
              near: 0.1,
              far: 1000,
              position: [0, 0, 70],
            }}
            gl={{ alpha: true }}
            style={{ pointerEvents: "auto", touchAction: "pinch-zoom" }}>
            <CubeView
              mainCamera={camera.current}
              controlsRef={controlsRef}
              viewCubeControlsRef={viewCubeControlsRef}
            />
          </Canvas>
        </div>
      </div>
    </>
  );
}

export default CanvasJs;
