import { useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faRotate,
  faUpRightAndDownLeftFromCenter,
  faCopy,
} from '@fortawesome/free-solid-svg-icons';
import {
  deleteTextbox,
  updateImagePosition,
  updateTextboxPosition,
  updateTextboxStyle,
  duplicateImage,
  duplicateTextbox,
} from '../../redux/uploadSlice';
import { constrainElementToPath, getPathBoundingBox } from '../utils/elementConstraints';
import { deleteImageSafe } from '../../utils/deleteImageSafe';
import { CANVAS_SIZE, MIN_TEXTBOX_FONT_SIZE } from '../utils/constants';

function ResizeHandles({ setMovingState, setIsCenteredH, setIsCenteredV }) {
  const dispatch = useDispatch();
  const selectedElement = useSelector((state) => state.upload.selectedElement);

  const textbox = useSelector((state) =>
    selectedElement?.type === 'textbox'
      ? state.upload.textboxes.find((tb) => tb.id === selectedElement.id)
      : null
  );
  const image = useSelector((state) =>
    selectedElement?.type === 'image'
      ? state.upload.images.find((img) => img.id === selectedElement.id)
      : null
  );

  const [isMoving, setIsMoving] = useState(false);
  const [rotationSnapLabel, setRotationSnapLabel] = useState(null); // ← NEW

  const isMovingRef = useRef(false);
  const isScalingRef = useRef(false);
  const isRotatingRef = useRef(false);

  const moveData = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const scaleData = useRef({
    startX: 0,
    startY: 0,
    initialWidth: 0,
    initialHeight: 0,
    initialX: 0,
    initialY: 0,
    initialFontSize: 0,
    direction: 'br',
    proportional: false,
    aspectRatio: 1,
  });

  const rotateData = useRef({
    centerX: 0,
    centerY: 0,
    startAngle: 0,
    initialRotation: 0,
  });

  const currentElement = textbox || image;

  // ────── Unified coordinate getter (mouse + touch) ──────
  const getEventCoordinates = (e) => {
    if (e.touches?.length)
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    if (e.changedTouches?.length)
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    return { clientX: e.clientX, clientY: e.clientY };
  };

  /* --------------------------------------------------------------
     ACTION HANDLES (duplicate / rotate / delete / proportional scale)
     -------------------------------------------------------------- */
  const actionHandles = [
    { key: 'duplicate', position: 'top-left', x: '-12px', y: '-12px', action: 'duplicate' },
    { key: 'rotate', position: 'top-right', x: 'calc(100% - 12px)', y: '-12px', action: 'rotate' },
    { key: 'delete', position: 'bottom-left', x: '-12px', y: 'calc(100% - 12px)', action: 'delete' },
    { key: 'scale', position: 'bottom-right', x: 'calc(100% - 12px)', y: 'calc(100% - 12px)', action: 'scale' },
  ];

  const cornerResizeHandles = [
    { key: 'resize-tl', left: '-4px', top: '-4px', direction: 'tl', cursor: 'nw-resize', translate: '' },
    { key: 'resize-tr', left: 'calc(100% - 4px)', top: '-4px', direction: 'tr', cursor: 'ne-resize', translate: '' },
    { key: 'resize-bl', left: '-4px', top: 'calc(100% - 4px)', direction: 'bl', cursor: 'sw-resize', translate: '' },
    { key: 'resize-br', left: 'calc(100% - 4px)', top: 'calc(100% - 4px)', direction: 'br', cursor: 'se-resize', translate: '' },
  ];

  const sideResizeHandles = [
    { key: 'resize-t', left: '50%', top: '-4px', direction: 't', cursor: 'n-resize', translate: 'translateX(-50%)' },
    { key: 'resize-b', left: '50%', top: 'calc(100% - 4px)', direction: 'b', cursor: 's-resize', translate: 'translateX(-50%)' },
    { key: 'resize-l', left: '-4px', top: '50%', direction: 'l', cursor: 'w-resize', translate: 'translateY(-50%)' },
    { key: 'resize-r', left: 'calc(100% - 4px)', top: '50%', direction: 'r', cursor: 'e-resize', translate: 'translateY(-50%)' },
  ];

  /* --------------------------------------------------------------
     MOVE (drag) – mouse + touch
     -------------------------------------------------------------- */
  const handleMoveMove = useCallback(
    (e) => {
      if (!isMovingRef.current) return;
      if (e.cancelable) e.preventDefault();

      const { clientX, clientY } = getEventCoordinates(e);
      const dx = clientX - moveData.current.startX;
      const dy = clientY - moveData.current.startY;

      const el = selectedElement?.type === 'textbox' ? textbox : image;
      if (!el) return;

      let newPos = { x: moveData.current.initialX + dx, y: moveData.current.initialY + dy };
      const pathBounds = el.targetElement ? getPathBoundingBox(el.targetElement) : null;
      let boundsLeft = 0,
        boundsTop = 0,
        boundsRight = CANVAS_SIZE,
        boundsBottom = CANVAS_SIZE,
        centerX = CANVAS_SIZE / 2,
        centerY = CANVAS_SIZE / 2;

      if (pathBounds) {
        ({ left: boundsLeft, top: boundsTop, right: boundsRight, bottom: boundsBottom } = pathBounds);
        centerX = pathBounds.left + pathBounds.width / 2;
        centerY = pathBounds.top + pathBounds.height / 2;
      }

      const snap = 10;
      newPos.x = Math.max(boundsLeft, Math.min(boundsRight - el.width, newPos.x));
      newPos.y = Math.max(boundsTop, Math.min(boundsBottom - el.height, newPos.y));

      const elCenterX = newPos.x + el.width / 2;
      const elCenterY = newPos.y + el.height / 2;
      const hSnap = Math.abs(elCenterX - centerX) <= snap;
      const vSnap = Math.abs(elCenterY - centerY) <= snap;
      setIsCenteredH(hSnap);
      setIsCenteredV(vSnap);
      if (hSnap) newPos.x = centerX - el.width / 2;
      if (vSnap) newPos.y = centerY - el.height / 2;

      const { position, size } = constrainElementToPath(
        el,
        newPos,
        { width: el.width, height: el.height },
        el.targetElement
      );

      requestAnimationFrame(() => {
        if (selectedElement?.type === 'textbox')
          dispatch(
            updateTextboxPosition({
              id: selectedElement.id,
              ...position,
              ...size,
              onCanvas: textbox.onCanvas,
            })
          );
        else if (selectedElement?.type === 'image')
          dispatch(
            updateImagePosition({
              id: selectedElement.id,
              ...position,
              ...size,
              onCanvas: image.onCanvas,
            })
          );
      });
    },
    [selectedElement, textbox, image, dispatch, setIsCenteredH, setIsCenteredV]
  );

  const handleMoveEnd = useCallback(() => {
    if (!isMovingRef.current) return;
    setIsMoving(false);
    isMovingRef.current = false;
    if (setMovingState) setMovingState(false);
    setIsCenteredH(false);
    setIsCenteredV(false);

    document.removeEventListener('mousemove', handleMoveMove);
    document.removeEventListener('mouseup', handleMoveEnd);
    document.removeEventListener('touchmove', handleMoveMove);
    document.removeEventListener('touchend', handleMoveEnd);

    document.body.style.cursor = 'default';
  }, [handleMoveMove, setMovingState, setIsCenteredH, setIsCenteredV]);

  const handleMoveStart = useCallback(
    (e) => {
      e.stopPropagation();
      if (!currentElement || isScalingRef.current || isRotatingRef.current) return;

      setIsMoving(true);
      isMovingRef.current = true;
      if (setMovingState) setMovingState(true);

      const { clientX, clientY } = getEventCoordinates(e);
      moveData.current = {
        startX: clientX,
        startY: clientY,
        initialX: currentElement.x || 0,
        initialY: currentElement.y || 0,
      };

      document.addEventListener('mousemove', handleMoveMove, { passive: false });
      document.addEventListener('mouseup', handleMoveEnd);
      document.addEventListener('touchmove', handleMoveMove, { passive: false });
      document.addEventListener('touchend', handleMoveEnd);

      document.body.style.cursor = 'grabbing';
    },
    [currentElement, setMovingState, handleMoveMove, handleMoveEnd]
  );

  /* --------------------------------------------------------------
     SCALE – mouse + touch (with proportional support)
     -------------------------------------------------------------- */
  const handleScaleMove = useCallback(
    (e) => {
      if (!isScalingRef.current) return;
      if (e.cancelable) e.preventDefault();

      const { clientX, clientY } = getEventCoordinates(e);
      const dx = clientX - scaleData.current.startX;
      const dy = clientY - scaleData.current.startY;

      const el = selectedElement?.type === 'textbox' ? textbox : image;
      if (!el) return;

      let newX = scaleData.current.initialX;
      let newY = scaleData.current.initialY;
      let newW = scaleData.current.initialWidth;
      let newH = scaleData.current.initialHeight;

      const {
        direction,
        proportional,
        aspectRatio,
        initialWidth,
        initialHeight,
        initialFontSize,
      } = scaleData.current;

      if (proportional && direction === 'br') {
        const scale = 1 + dx / scaleData.current.initialWidth;
        const constrainedScale = Math.max(20 / scaleData.current.initialWidth, scale);

        newW = scaleData.current.initialWidth * constrainedScale;
        newH = newW / aspectRatio;

        if (newW < 20 || newH < 20) {
          const minScale =
            20 /
            Math.max(
              scaleData.current.initialWidth,
              scaleData.current.initialHeight * aspectRatio
            );
          newW = scaleData.current.initialWidth * minScale;
          newH = newW / aspectRatio;
        }
      } else {
        switch (direction) {
          case 'br':
            newW += dx;
            newH += dy;
            break;
          case 'tl':
            newW -= dx;
            newH -= dy;
            newX += dx;
            newY += dy;
            break;
          case 'tr':
            newW += dx;
            newH -= dy;
            newY += dy;
            break;
          case 'bl':
            newW -= dx;
            newH += dy;
            newX += dx;
            break;
          case 't':
            newH -= dy;
            newY += dy;
            break;
          case 'b':
            newH += dy;
            break;
          case 'l':
            newW -= dx;
            newX += dx;
            break;
          case 'r':
            newW += dx;
            break;
          default:
            return;
        }

        newW = Math.max(20, newW);
        newH = Math.max(20, newH);
      }

      // For side handles, lock the opposite edge position
      const pathBounds = el.targetElement ? getPathBoundingBox(el.targetElement) : null;
      if (pathBounds) {
        // Store original opposite edge positions
        const originalBottom = scaleData.current.initialY + scaleData.current.initialHeight;
        const originalRight = scaleData.current.initialX + scaleData.current.initialWidth;
        
        switch (direction) {
          case 't':
            // Top edge: lock bottom position
            if (newY < pathBounds.top) {
              newY = pathBounds.top;
              newH = originalBottom - newY;
            }
            if (newH < 20) {
              newH = 20;
              newY = originalBottom - newH;
            }
            break;
          case 'b':
            // Bottom edge: lock top position (newY should stay as initialY)
            if (newY + newH > pathBounds.bottom) {
              newH = pathBounds.bottom - newY;
            }
            newH = Math.max(20, newH);
            break;
          case 'l':
            // Left edge: lock right position
            if (newX < pathBounds.left) {
              newX = pathBounds.left;
              newW = originalRight - newX;
            }
            if (newW < 20) {
              newW = 20;
              newX = originalRight - newW;
            }
            break;
          case 'r':
            // Right edge: lock left position (newX should stay as initialX)
            if (newX + newW > pathBounds.right) {
              newW = pathBounds.right - newX;
            }
            newW = Math.max(20, newW);
            break;
        }
      }

      // When proportional scaling is enabled we preserve aspect ratio;
      // for side/corner non-proportional scaling, allow independent axis clamping.
      const preserveAspect = !!proportional;
      const { position, size } = constrainElementToPath(
        el,
        { x: newX, y: newY },
        { width: newW, height: newH },
        el.targetElement,
        preserveAspect
      );

      requestAnimationFrame(() => {
        if (selectedElement?.type === 'textbox') {
          dispatch(
            updateTextboxPosition({
              id: selectedElement.id,
              ...position,
              width: size.width,
              height: size.height,
              onCanvas: textbox.onCanvas,
            })
          );

          const isCornerHandle =
            proportional || ['tl', 'tr', 'bl', 'br'].includes(direction);
          if (isCornerHandle && initialFontSize && initialWidth && initialHeight) {
            const widthRatio = size.width / initialWidth;
            const heightRatio = size.height / initialHeight;
            const appliedRatio = Math.min(widthRatio, heightRatio);
            const nextFontSize = Math.max(
              MIN_TEXTBOX_FONT_SIZE,
              Math.round(initialFontSize * appliedRatio)
            );
            dispatch(
              updateTextboxStyle({
                id: selectedElement.id,
                fontSize: nextFontSize,
              })
            );
          }
        } else if (selectedElement?.type === 'image') {
          dispatch(
            updateImagePosition({
              id: selectedElement.id,
              ...position,
              ...size,
              onCanvas: image.onCanvas,
            })
          );
        }
      });
    },
    [selectedElement, textbox, image, dispatch]
  );

  const handleScaleEnd = useCallback(() => {
    if (!isScalingRef.current) return;
    isScalingRef.current = false;

    document.removeEventListener('mousemove', handleScaleMove);
    document.removeEventListener('mouseup', handleScaleEnd);
    document.removeEventListener('touchmove', handleScaleMove);
    document.removeEventListener('touchend', handleScaleEnd);

    document.body.style.cursor = 'default';
  }, [handleScaleMove]);

  const handleScaleStart = useCallback(
    (e, direction = 'br', proportional = false) => {
      e.stopPropagation();
      if (!currentElement || isMovingRef.current || isRotatingRef.current) return;

      isScalingRef.current = true;

      const { clientX, clientY } = getEventCoordinates(e);
      const width = currentElement.width || 100;
      const height = currentElement.height || 50;

      scaleData.current = {
        startX: clientX,
        startY: clientY,
        initialWidth: width,
        initialHeight: height,
        initialX: currentElement.x || 0,
        initialY: currentElement.y || 0,
        initialFontSize: currentElement.fontSize || 24,
        direction,
        proportional,
        aspectRatio: width / height,
      };

      document.addEventListener('mousemove', handleScaleMove, { passive: false });
      document.addEventListener('mouseup', handleScaleEnd);
      document.addEventListener('touchmove', handleScaleMove, { passive: false });
      document.addEventListener('touchend', handleScaleEnd);

      const cursors = {
        tl: 'nw-resize',
        tr: 'ne-resize',
        bl: 'sw-resize',
        br: 'se-resize',
        t: 'n-resize',
        b: 's-resize',
        l: 'w-resize',
        r: 'e-resize',
      };
      document.body.style.cursor = proportional
        ? 'se-resize'
        : cursors[direction] || 'se-resize';
    },
    [currentElement, handleScaleMove, handleScaleEnd]
  );

  /* --------------------------------------------------------------
     ROTATE – drag rotate icon (smooth / continuous)
     -------------------------------------------------------------- */
  const handleRotateMove = useCallback(
    (e) => {
      if (!isRotatingRef.current) return;
      if (e.cancelable) e.preventDefault();

      const el = currentElement;
      if (!el || !selectedElement) return;

      const { clientX, clientY } = getEventCoordinates(e);
      const { centerX, centerY, startAngle, initialRotation } = rotateData.current;

      const currentAngle = Math.atan2(clientY - centerY, clientX - centerX);
      const deltaAngle = currentAngle - startAngle;
      let newRotation = initialRotation + (deltaAngle * 180) / Math.PI;

      // Normalize to [0, 360)
      newRotation = ((newRotation % 360) + 360) % 360;

      // --- show label when near 45 / 90 / 180 / 360 ---
      // --- show current rotation (rounded) ---
      const label = Math.round(newRotation);
      setRotationSnapLabel(label);
      // ---------------------------------------

      // -------------------------------------------------

      requestAnimationFrame(() => {
        if (selectedElement.type === 'textbox') {
          dispatch(
            updateTextboxPosition({
              id: el.id,
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              rotation: newRotation,
              onCanvas: el.onCanvas,
            })
          );
        } else if (selectedElement.type === 'image') {
          dispatch(
            updateImagePosition({
              id: el.id,
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              rotation: newRotation,
              onCanvas: el.onCanvas,
            })
          );
        }
      });
    },
    [currentElement, selectedElement, dispatch]
  );

  const handleRotateEnd = useCallback(() => {
    if (!isRotatingRef.current) return;
    isRotatingRef.current = false;

    document.removeEventListener('mousemove', handleRotateMove);
    document.removeEventListener('mouseup', handleRotateEnd);
    document.removeEventListener('touchmove', handleRotateMove);
    document.removeEventListener('touchend', handleRotateEnd);

    document.body.style.cursor = 'default';
    setRotationSnapLabel(null); // ← clear label
  }, [handleRotateMove]);

  const handleRotateStart = useCallback(
    (e) => {
      e.stopPropagation();
      if (!currentElement || isMovingRef.current || isScalingRef.current) return;

      isRotatingRef.current = true;

      const { clientX, clientY } = getEventCoordinates(e);

      // Find the absolute center of the element on screen
      const container = e.currentTarget.closest('.layer-controls');
      if (!container) {
        isRotatingRef.current = false;
        return;
      }
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const startAngle = Math.atan2(clientY - centerY, clientX - centerX);
      const initialRotation = currentElement.rotation || 0;

      rotateData.current = {
        centerX,
        centerY,
        startAngle,
        initialRotation,
      };

      document.addEventListener('mousemove', handleRotateMove, { passive: false });
      document.addEventListener('mouseup', handleRotateEnd);
      document.addEventListener('touchmove', handleRotateMove, { passive: false });
      document.addEventListener('touchend', handleRotateEnd);

      document.body.style.cursor = 'grab';
    },
    [currentElement, handleRotateMove, handleRotateEnd]
  );

  /* --------------------------------------------------------------
     DELETE / DUPLICATE / ACTION ROUTER
     -------------------------------------------------------------- */
  const handleAction = useCallback(
    (action, e) => {
      if (isMovingRef.current || isScalingRef.current || isRotatingRef.current) return;

      switch (action) {
        case 'duplicate':
          e.stopPropagation();
          if (!selectedElement) return;
          if (selectedElement.type === 'image') {
            dispatch(duplicateImage({ id: selectedElement.id }));
          } else if (selectedElement.type === 'textbox') {
            dispatch(duplicateTextbox({ id: selectedElement.id }));
          }
          break;
        case 'scale':
          handleScaleStart(e, 'br', true);
          break;
        case 'rotate':
          handleRotateStart(e);
          break;
        case 'delete': {
          e.stopPropagation();
          if (!selectedElement) return;

          if (isMovingRef.current) handleMoveEnd();
          if (isScalingRef.current) handleScaleEnd();
          if (isRotatingRef.current) handleRotateEnd();

          const { type, id } = selectedElement;
          if (type === 'image') {
            dispatch(deleteImageSafe(id));
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';
          } else if (type === 'textbox') {
            dispatch(deleteTextbox(id));
          }
          break;
        }
        default:
          console.warn('Unknown action:', action);
      }
    },
    [
      selectedElement,
      dispatch,
      handleScaleStart,
      handleMoveEnd,
      handleScaleEnd,
      handleRotateStart,
      handleRotateEnd,
    ]
  );

  const getCursorStyle = (action) =>
    action === 'duplicate'
      ? 'pointer'
      : action === 'scale'
        ? 'se-resize'
        : action === 'rotate'
          ? 'grab'
          : 'pointer';

  if (!selectedElement || !currentElement) return null;

  return (
    <>
      {/* ---- BIG GRAB AREA ---- */}
      <div
        className="absolute top-0 left-0 w-full h-full z-30"
        style={{
          border: '2px dashed #2196f3',
          cursor: isMoving ? 'move' : 'grab',
          touchAction: 'none',
        }}
        onMouseDown={handleMoveStart}
        onTouchStart={handleMoveStart}
      />

      {/* ---- CORNER RESIZE DOTS ---- */}
      {cornerResizeHandles.map(({ key, left, top, direction, cursor, translate }) => (
        <div
          key={key}
          className="absolute rounded-full z-35 bg-blue-500 border-2 border-white shadow-sm opacity-80 select-none"
          style={{
            width: '12px',
            height: '12px',
            left,
            top,
            cursor,
            transform: translate,
          }}
          onMouseDown={(e) => handleScaleStart(e, direction, false)}
          onTouchStart={(e) => handleScaleStart(e, direction, false)}
        />
      ))}

      {/* ---- SIDE RESIZE DOTS ---- */}
      {sideResizeHandles.map(({ key, left, top, direction, cursor, translate }) => (
        <div
          key={key}
          className="absolute rounded-full z-35 bg-blue-500 border-2 border-white shadow-sm opacity-80 select-none"
          style={{
            width: '14px',
            height: '14px',
            left,
            top,
            cursor,
            transform: translate,
          }}
          onMouseDown={(e) => handleScaleStart(e, direction, false)}
          onTouchStart={(e) => handleScaleStart(e, direction, false)}
        />
      ))}

      {/* ---- ACTION ICONS ---- */}
      {actionHandles.map(({ key, x, y, action }) => (
        <div
          key={key}
          className="absolute rounded-full z-40 shadow-lg bg-white border-2 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer select-none "
          style={{
            width: '36px',
            height: '36px',
            left: x,
            top: y,
            cursor: getCursorStyle(action),
          }}
          onMouseDown={(e) => handleAction(action, e)}
          onTouchStart={(e) => handleAction(action, e)}
        >
          {action === 'delete' ? (
            <FontAwesomeIcon icon={faTrash} className="text-black text-xl" />
          ) : action === 'duplicate' ? (
            <FontAwesomeIcon icon={faCopy} className="text-black text-xl" />
          ) : action === 'scale' ? (
            <FontAwesomeIcon
              icon={faUpRightAndDownLeftFromCenter}
              className="text-black rotate-90 text-lg"
              title="Proportional Scale"
            />
          ) : (
            <>
              <FontAwesomeIcon
                icon={faRotate}
                className="text-black text-xl"
                title="Rotate (drag)"
              />
              {rotationSnapLabel !== null && (
                <div className="absolute left-1/2 top-[110%] -translate-x-1/2 bg-black text-white text-xs px-2 py-0.5 rounded shadow whitespace-nowrap">
                  {rotationSnapLabel}°
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </>
  );
}

export default ResizeHandles;
