import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/firebaseConfig';

const convertPNGtoSVG = async (pngUrl) => {
    try {
        // Fetch the PNG image
        const response = await fetch(pngUrl);
        const blob = await response.blob();

        // Create an image element to load the PNG
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;

                // Draw the image on canvas
                ctx.drawImage(img, 0, 0);

                // Create SVG
                const svgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
                    <svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">
                        <image href="${canvas.toDataURL('image/png')}" width="${img.width}" height="${img.height}"/>
                    </svg>`;

                // Convert SVG string to Blob
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                resolve(svgBlob);
            };
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(blob);
        });
    } catch (error) {
        console.error('Error converting PNG to SVG:', error);
        return null;
    }
};

export const convertToPrintFiles = async (textureUrl, designId) => {
    if (!textureUrl) return null;

    try {
        // Convert texture to SVG
        const svgBlob = await convertPNGtoSVG(textureUrl);
        if (!svgBlob) return null;

        // Create a reference for the print files in Firebase Storage
        const printFilesRef = ref(storage, `designs/${designId}/printfiles/print_${Date.now()}.svg`);

        // Upload the SVG blob to Firebase Storage
        await uploadBytes(printFilesRef, svgBlob, {
            contentType: 'image/svg+xml;charset=utf-8'
        });
        
        // Get the download URL
        const printFilesUrl = await getDownloadURL(printFilesRef);
        return printFilesUrl;
    } catch (error) {
        console.error("Error converting to print files:", error);
        return null;
    }
};
