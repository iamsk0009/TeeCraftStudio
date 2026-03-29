import { useEffect } from 'react';
import Upload from './Upload';
import FileExport1 from './FileExport1';
import Products from './Products';
import AiGeneration from './AiGeneration';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose } from '@fortawesome/free-solid-svg-icons';
import { setUploadCategories, setUploadImages, setUploadsLoaded } from '../../redux/productsSlice';
import MyDesigns from './MyDesigns';
import localData from '../../data/localData.json';

const toolComponents = {
  uploads: Upload,
  fileexport: FileExport1,
  products: Products,
  mydesigns: MyDesigns,
  aigeneration: AiGeneration
};

function ToolRenderer({ selectedTool, onClose }) {
  const SelectedComponent = toolComponents[selectedTool.toLowerCase()] || Upload;
  const uploadsLoaded = useSelector(state => state.products.uploadsLoaded);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!uploadsLoaded) {
      const fetchData = async () => {
        try {
          const categories = [...(localData.uploadCategories || [])];
          // Add synthetic "Images" category for user uploads
          categories.push({ id: 'images', name: 'Images', enabled: true });
          dispatch(setUploadCategories(categories));

          const images = localData.uploadImages || [];
          dispatch(setUploadImages(images));

          dispatch(setUploadsLoaded(true));
        } catch (err) {
          console.error("Error loading local uploads data:", err);
        }
      };

      fetchData();
    }
  }, [dispatch, uploadsLoaded]);


  return (
    <div className="relative w-4/5 h-4/5 bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.1)] select-none">
      <button
        onClick={onClose}
        className="absolute top-2.5 right-2.5 hover:text-[#823AEC] transition cursor-pointer z-10"
      >
        <FontAwesomeIcon
          icon={faClose}
          style={{ height: "20px", width: "20px" }}
        />
      </button>
      <div className="p-6 h-full overflow-y-auto scroll-container">
        <div className="pt-6 h-full w-full">
          <SelectedComponent />
        </div>
      </div>
    </div>
  );
}

export default ToolRenderer;