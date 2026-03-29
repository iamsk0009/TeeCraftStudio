import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateAllImages, updateAllTextboxes } from '../../redux/uploadSlice';
import { transformAllElementsForNewProduct } from '../../utils/productElementTransformer';

/**
 * Hook that handles transforming elements when product changes
 * Waits for SVG to be loaded before attempting transformation
 */
export const useProductElementTransformer = () => {
  const dispatch = useDispatch();
  const { selectedProduct } = useSelector((state) => state.products);
  const { svgLoaded } = useSelector((state) => state.loading);
  const images = useSelector((state) => state.upload.images);
  const textboxes = useSelector((state) => state.upload.textboxes);
  
  const previousProductRef = useRef(null);
  const pendingTransformRef = useRef(null);
  const hasInitializedRef = useRef(false);

  // On initial mount, if elements exist without targetElement, assign them to the first path
  useEffect(() => {
    if (!selectedProduct || !svgLoaded || hasInitializedRef.current) return;

    const defaultPath = selectedProduct.selectedSvgIds?.[0];
    if (!defaultPath) return;

    const needsUpdate = images.some(img => !img.targetElement) || 
                        textboxes.some(tb => !tb.targetElement);

    if (needsUpdate) {
      const updatedImages = images.map(img => 
        img.targetElement ? img : { ...img, targetElement: defaultPath }
      );
      
      const updatedTextboxes = textboxes.map(tb => 
        tb.targetElement ? tb : { ...tb, targetElement: defaultPath }
      );

      dispatch(updateAllImages(updatedImages));
      dispatch(updateAllTextboxes(updatedTextboxes));
    }

    hasInitializedRef.current = true;
  }, [selectedProduct, svgLoaded, images, textboxes, dispatch]);

  // When product changes, store the pending transformation
  useEffect(() => {
    if (!selectedProduct) return;

    const hasElements = images.length > 0 || textboxes.length > 0;
    const isProductChange = previousProductRef.current && 
                           previousProductRef.current.id !== selectedProduct.id;

    if (isProductChange && hasElements) {
      // Store pending transformation data
      pendingTransformRef.current = {
        images: [...images],
        textboxes: [...textboxes],
        oldProduct: previousProductRef.current,
        newProduct: selectedProduct,
      };
      // Reset initialization flag to allow re-initialization with new product
      hasInitializedRef.current = false;
    }

    previousProductRef.current = selectedProduct;
  }, [selectedProduct, images, textboxes]);

  // When SVG is loaded and we have a pending transformation, execute it
  useEffect(() => {
    if (!svgLoaded || !pendingTransformRef.current) return;

    const { images: oldImages, textboxes: oldTextboxes, oldProduct, newProduct } = pendingTransformRef.current;

    // Give the SVG a moment to render in the DOM
    const timeoutId = setTimeout(() => {
      try {
        // Verify SVG paths exist in DOM before transforming
        const newPathIds = newProduct.selectedSvgIds || [];
        const firstPathExists = newPathIds.length > 0 && document.getElementById(newPathIds[0]);
        
        if (!firstPathExists) {
          // Retry after a longer delay
          setTimeout(() => {
            const { transformedImages, transformedTextboxes } = transformAllElementsForNewProduct(
              oldImages,
              oldTextboxes,
              oldProduct,
              newProduct
            );

            dispatch(updateAllImages(transformedImages));
            dispatch(updateAllTextboxes(transformedTextboxes));
            pendingTransformRef.current = null;
          }, 200);
          return;
        }

        const { transformedImages, transformedTextboxes } = transformAllElementsForNewProduct(
          oldImages,
          oldTextboxes,
          oldProduct,
          newProduct
        );

        // Update with transformed elements
        dispatch(updateAllImages(transformedImages));
        dispatch(updateAllTextboxes(transformedTextboxes));

        // Clear the pending transformation
        pendingTransformRef.current = null;
      } catch (error) {
        console.error('Error transforming elements for new product:', error);
        pendingTransformRef.current = null;
      }
    }, 200); // Increased delay to ensure DOM is ready

    return () => clearTimeout(timeoutId);
  }, [svgLoaded, dispatch]);
};
