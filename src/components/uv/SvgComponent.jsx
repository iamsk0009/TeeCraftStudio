import { useEffect, useCallback, useState, useMemo, forwardRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedPath } from '../../redux/colorSlice';
import { setSelectedElement,setSelectedImage,setSelectedTextbox } from '../../redux/uploadSlice';
import { setSvgLoaded } from "../../redux/loadingSlice";

// Function to convert a selected SVG path to base64 PNG
const convertPathToBase64PNG = async (pathElement, pathId) => {
    try {        
        // Get the SVG element containing the path
        const svgElement = pathElement.closest('svg');
        if (!svgElement) {
            console.error('Could not find parent SVG element');
            return;
        }

        // Clone the SVG to avoid modifying the original
        const svgClone = svgElement.cloneNode(true);
        
        // Hide all paths except the selected one
        const allPaths = svgClone.querySelectorAll('path');
        allPaths.forEach(path => {
            if (path.id !== pathId) {
                path.style.display = 'none';
            } else {
                path.style.display = 'block';
                path.style.fill = path.getAttribute('fill') || '#ffffff';
                path.style.stroke = 'none';
            }
        });

        // Get SVG dimensions
        const svgRect = svgElement.getBoundingClientRect();
        const width = Math.max(svgRect.width, 512);
        const height = Math.max(svgRect.height, 512);

        // Create a canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Create a data URL from the modified SVG
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        // Create an image and draw it to canvas
        const img = new Image();
        img.onload = () => {
            // Clear canvas with white background (better for AI generation)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            
            // Draw the SVG image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 PNG with high quality
            const base64PNG = canvas.toDataURL('image/png', 1.0);

            
            // Store it in a global variable for use as base image
            window.selectedPathBase64PNG = base64PNG;
            window.selectedPathId = pathId;
            
            // Clean up
            URL.revokeObjectURL(svgUrl);
        };
        
        img.onerror = (error) => {
            console.error('Error loading SVG image:', error);
            URL.revokeObjectURL(svgUrl);
        };
        
        img.src = svgUrl;
        
    } catch (error) {
        console.error('Error converting path to base64 PNG:', error);
    }
};

const useSvgInteractions = (ref, dispatch) => {
    const [hoveredPath, setHoveredPath] = useState(null);

    const handlePathInteraction = useCallback((id, type, event) => {
        switch (type) {
            case 'enter': {
                setHoveredPath(id);
                break;
            }
            case 'leave': {
                setHoveredPath(null);
                break;
            }
            case 'click': {
                console.log('Path clicked:', id);
                event.stopPropagation();
                if (!ref.current) return;

                const currentSelected = ref.current.querySelector('.selected-fill');
                if (currentSelected) {
                    currentSelected.classList.remove('selected-fill');
                }
                
                if (event.target instanceof SVGPathElement) {
                    event.target.classList.add('selected-fill');
                }

                // Convert selected path to base64 PNG
                convertPathToBase64PNG(event.target, id);

                const colorPickerHeight = 350;
                const shouldPositionAbove = (event.clientY + colorPickerHeight) > window.innerHeight;
                const position = {
                    x: event.clientX + 20,
                    y: event.clientY + (shouldPositionAbove ? -colorPickerHeight - 10 : 20)
                    };
                dispatch(setSelectedPath({ pathId: id, position }));
                break;
            }
        }
    }, [ref, dispatch]);

    return { hoveredPath, handlePathInteraction };
};

const SvgComponent = forwardRef((props, ref) => {
    const dispatch = useDispatch();
    const selectedProduct = useSelector((state) => state.products.selectedProduct);
    const color = useSelector((state) => state.color.color);
    const selectedPathId = useSelector((state) => state.color.selectedPathId);
    const svgUrl = useMemo(() => selectedProduct?.textureUrl, [selectedProduct]);
    const textureIds = useMemo(() => selectedProduct?.selectedSvgIds || [], [selectedProduct]);
    const { hoveredPath, handlePathInteraction } = useSvgInteractions(ref, dispatch);


    // click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                // Only handle click outside if not clicking on upload or other control elements
                const isClickingControls = event.target.closest('.layer-controls') || event.target.closest('.color-picker') || event.target.closest('.render-controls')
                if (!isClickingControls) {
                    handlePathInteraction(null, 'leave');
                    dispatch(setSelectedPath({ pathId: null }));
                    dispatch(setSelectedElement(null));
                    dispatch(setSelectedImage(null));
                    dispatch(setSelectedTextbox(null));
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dispatch, ref, handlePathInteraction]);

    const attachEventListeners = useCallback((element, id) => {
        const handlers = {
            mouseenter: () => handlePathInteraction(id, 'enter'),
            mouseleave: () => handlePathInteraction(id, 'leave'),
            click: (e) => handlePathInteraction(id, 'click', e)
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            element.addEventListener(event, handler);
        });

        return () => {
            Object.entries(handlers).forEach(([event, handler]) => {
                element.removeEventListener(event, handler);
            });
        };
    }, [handlePathInteraction]);

    const loadSvg = useCallback(async (currentRef) => {
        if (!svgUrl) return;

        try {
            // Clear existing content
            while (currentRef.firstChild) {
                currentRef.removeChild(currentRef.firstChild);
            }

            const response = await fetch(svgUrl);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'image/svg+xml');
            const svgFromFile = doc.documentElement;

            // Copy SVG structure
            Array.from(svgFromFile.attributes).forEach(attr => {
                currentRef.setAttribute(attr.name, attr.value);
            });
            Array.from(svgFromFile.children).forEach(child => {
                currentRef.appendChild(child);
            });

            // Set default selected path
            if (textureIds.length > 0) {                
                const defaultPathId = textureIds[1] || textureIds[0];
                const pathElement = currentRef.querySelector(`#${defaultPathId}`);
                if (pathElement) {
                    dispatch(setSelectedPath({ pathId: defaultPathId }));
                }
            }

            return true;
        } catch (error) {
            console.error('Error loading SVG:', error);
            return false;
        }
    }, [svgUrl, textureIds, dispatch]);

    useEffect(() => {
        if (!ref.current) return;

        const currentRef = ref.current;
        const cleanupFunctions = new Set();

        loadSvg(currentRef).then(success => {
            if (!success) return;

            dispatch(setSvgLoaded(true))
            // Attach event listeners to paths
            textureIds.forEach(id => {
                const path = currentRef.querySelector(`#${id}`);
                if (path) {
                    const cleanup = attachEventListeners(path, id);
                    cleanupFunctions.add(cleanup);
                }
            });

        });

        return () => {
            cleanupFunctions.forEach(cleanup => cleanup());
            cleanupFunctions.clear();
        };
    }, [ref, loadSvg, textureIds, attachEventListeners, dispatch]);

    // Manage path styles
    const updatePathStyle = useCallback((path, id) => {
        if (!path) return;

        const isSelected = selectedPathId === id;
        const isHovered = hoveredPath === id;

        Object.assign(path.style, {
            fill: color || '#ffffff',
            cursor: 'pointer',
            transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
            ...(path.hasAttribute('data-for-texture') ? {} : {
                stroke: isSelected || isHovered ? "#B6F03F" : "#000000",
                strokeWidth: isSelected || isHovered ? "15" : "1"
            })
        });
    }, [color, selectedPathId, hoveredPath]);

    // Update path styles and observe changes
    useEffect(() => {
        const currentRef = ref.current;
        if (!currentRef) return;

        // Update initial styles
        const paths = textureIds
            .map(id => ({ id, element: currentRef.querySelector(`#${id}`) }))
            .filter(({ element }) => element);

        paths.forEach(({ id, element }) => updatePathStyle(element, id));

        // Observe texture attribute changes
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' &&
                    mutation.attributeName === 'data-for-texture') {
                    updatePathStyle(mutation.target, mutation.target.id);
                }
            });
        });

        paths.forEach(({ element }) => observer.observe(element, { attributes: true }));
        return () => observer.disconnect();
    }, [ref, textureIds, updatePathStyle]);

    return useMemo(() => (
        <svg
            ref={ref}
            height="100%"
            className="svg-component"
            {...props}
        />
    ), [props, ref]);
});

export default SvgComponent;