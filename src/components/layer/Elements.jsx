import { useDispatch, useSelector } from 'react-redux';
import { addTextbox, setSelectedTextbox, setSelectedElement } from '../../redux/uploadSlice';
import { constrainElementToPath } from '../utils/elementConstraints';
import { setSelectedTool } from '../../redux/loadingSlice';

function Elements() {
  const dispatch = useDispatch();
  const selectedPath = useSelector(state => state.color.selectedPathId);

  const handleAddTextbox = () => {
    const svgElement = document.querySelector('svg');
    const svgBounds = svgElement.getBoundingClientRect();

    const positionXPercent = 49;
    const positionYPercent = 28;

    const targetX = svgBounds.width * (positionXPercent / 100);
    const targetY = svgBounds.height * (positionYPercent / 100);

    const baseWidth = 200;
    const initialWidth = baseWidth;
    const fontSize = 24;
    const lineHeight = fontSize * 1.2;

    const initialPosition = {
      x: ((targetX - (initialWidth / 2))),
      y: ((targetY - (lineHeight / 2)))
    };

    const initialSize = {
      width: initialWidth,
      height: lineHeight
    };

    // Constrain initial position and size to the selected path
    const { position, size } = constrainElementToPath(
      { ...initialPosition, ...initialSize },
      initialPosition,
      initialSize,
      selectedPath,
    );

    const newTextbox = {
      id: Date.now(),
      text: '',
      ...position,
      ...size,
      fontSize: fontSize,
      fontFamily: 'Arial',
      fontColor: '#000000',
      textDecoration: 'none',
      textAlign: 'center',
      textStroke: 'none',
      onCanvas: true,
      rotation: 0,
      targetElement: selectedPath
    };

    dispatch(addTextbox(newTextbox));
    dispatch(setSelectedTextbox(newTextbox));
    dispatch(setSelectedElement({ type: 'textbox', id: newTextbox.id }));
    dispatch(setSelectedTool(''));
  };

  return (
    <div className="relative w-full h-full ">
      {selectedPath && (
      <>
          <div
            className="absolute cursor-pointer inset-0 bg-[#acabac]/60 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100 rounded-lg w-full"
            onClick={handleAddTextbox}
          >
            <span className="text-white font-medium">Add</span>
          </div>
          <button
            className="py-8 px-1 cursor-pointer rounded-xl bg-[#f6f5f7] font-medium transition-colors w-full"
          >
            Add text
          </button>
       </>
      )}
      {!selectedPath && (
        <div className="text-sm text-gray-500 mt-2">
          Click on a region of the product to add text
        </div>
      )}
    </div>
  );
}

export default Elements;