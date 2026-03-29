import { useCallback, useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import localData from '../../data/localData.json';

import { useDispatch, useSelector } from 'react-redux';
import { fetchDesignFromLocalStorage } from '../utils/save';
import { resetColorState, setColor } from '../../redux/colorSlice';
import {
    addImage,
    addTextbox,
    resetUploadState,
} from '../../redux/uploadSlice';
import { setSelectedProduct } from '../../redux/productsSlice';
import { setDesignId } from '../../redux/designSlice';
import { setLoading, setSvgLoaded } from '../../redux/loadingSlice';
import { setGeneratedImages } from '../../redux/aiSlices';
import CanvasJs from '../threeScene/CanvasJs';
import UvPath from '../uv/UvPath';
import Layer from '../layer/Layer';
import ColorPicker from '../uv/ColorPicker';
import AddtoCart from '../cart/AddtoCart';
import LoadingScreen from '../loading/LoadingScreen';

function DesignLoader() {
    const { productName, designId } = useParams();
    const dispatch = useDispatch();
    const [error, setError] = useState(null);
    const selectedProduct = useSelector((state) => state.products.selectedProduct);
    const existingDesignId = useSelector((state) => state.design.designId);
    const isLoading = useSelector((state) => state.loading.isLoading);
    const [hasLoaded, setHasLoaded] = useState(false);
    
    // Function to set Redux state
    const setReduxState = useCallback((design, product, aiImages) => {
        dispatch(setSelectedProduct(null));
        dispatch(setDesignId({ designId: null }));
        dispatch(resetColorState());
        dispatch(resetUploadState());

        if (product) {
            dispatch(setSelectedProduct(product));
        }
        dispatch(setDesignId({
            designId: design.designId
        }));

        if (design.images && Array.isArray(design.images)) {
            design.images.forEach(image => {
                const isSvg = image.isSvg || image.src?.toLowerCase().split('?')[0].endsWith('.svg');
                const processedImage = {
                    ...image,
                    isSvg,
                    originalSrc: isSvg ? (image.originalSrc || image.src) : undefined,
                    svgColor: isSvg ? (image.svgColor || '#000000') : undefined,
                    svgStrokeColor: isSvg ? (image.svgStrokeColor || 'none') : undefined
                };
                dispatch(addImage(processedImage));
            });
        }

        if (design.textboxes && Array.isArray(design.textboxes)) {
            design.textboxes.forEach(textbox => {
                dispatch(addTextbox(textbox));
            });
        }
        if (design.color) {
            dispatch(setColor({ color: design.color }));
        }

        if (aiImages && Array.isArray(aiImages)) {
            dispatch(setGeneratedImages(aiImages));
        }
    }, [dispatch]);

    useEffect(() => {
        const fetchDesign = async () => {
            try {
                dispatch(setSvgLoaded(false));
                dispatch(setLoading(true));
                
                // 1. Try to fetch from local storage
                const designData = await fetchDesignFromLocalStorage(designId);
                
                if (designData && designData.design && designData.product) {
                    setReduxState(designData.design, designData.product, designData.aiImages);
                    setHasLoaded(true);
                } else {
                    // 2. Fallback: Try to recover product from URL slug (for new designs)
                    const { products } = localData;
                    const matchedProduct = products.find(p => {
                        const slug = p.name.toLowerCase().replace(/\s+/g, '-');
                        return slug === productName;
                    });

                    if (matchedProduct) {
                        console.log(`Recovered product from URL slug: ${productName}`);
                        // Initialize a fresh design state for this product
                        dispatch(setSelectedProduct(matchedProduct));
                        dispatch(setDesignId({ designId }));
                        setHasLoaded(true);
                    } else if (designId) {
                        // 3. Final failure: Redirect to home
                        console.warn(`Redirecting: Product slug '${productName}' or Design ID '${designId}' not found.`);
                        setError('Design not found');
                        setHasLoaded(true);
                    }
                }
            } catch (error) {
                console.error('Error in DesignLoader initialization:', error);
                setError(error.message || 'Failed to load design');
                setHasLoaded(true);
            } 
        };

        if (!hasLoaded) {
            // If we have a designId and either no product is selected OR we swapped design IDs
            if (designId && (!selectedProduct || designId !== existingDesignId)) {
                fetchDesign();
            } else if (selectedProduct && designId === existingDesignId) {
                // Already have correct state in Redux (e.g. came from overlay)
                setHasLoaded(true);
            }
        }
    }, [designId, productName, dispatch, existingDesignId, hasLoaded, selectedProduct, setReduxState]);

    if (error) {
        return <Navigate to="/" replace />;
    }

    return (
        <>
            {isLoading && <LoadingScreen />}
            <UvPath />
            <Layer />
            <ColorPicker />
            <AddtoCart />
            <CanvasJs />
        </>
    );
}

export default DesignLoader;