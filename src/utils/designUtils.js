import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../components/firebase/firebaseConfig';

export const saveDesignData = async (designId, uploadState, textureState, colorState, onSuccess, onError) => {
    try {
        // Find the document with the matching designId
        const designsRef = collection(db, 'designs');
        const q = query(designsRef, where('designId', '==', designId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error('Design not found');
        }

        const docRef = doc(db, 'designs', querySnapshot.docs[0].id);
        
        // Update the document with design states
        await updateDoc(docRef, {
            designState: {
                upload: uploadState,
                texture: textureState,
                color: colorState,
                lastUpdated: new Date()
            }
        });

        if (onSuccess) {
            onSuccess();
        }
    } catch (error) {
        console.error('Error saving design:', error);
        if (onError) {
            onError(error);
        }
    }
};

export const loadDesignData = async (designDoc) => {
    if (!designDoc.designState) return null;

    return {
        upload: designDoc.designState.upload,
        texture: designDoc.designState.texture,
        color: designDoc.designState.color
    };
};
