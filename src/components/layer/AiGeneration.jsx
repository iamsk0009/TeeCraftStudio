import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { addImage, setSelectedImage, setSelectedElement } from '../../redux/uploadSlice';
import { addGeneratedImage } from '../../redux/aiSlices';
import { generateImageWithSelectedRegion, generateDesignSuggestions } from '../../services/geminiApi';
import { setSelectedTool } from '../../redux/loadingSlice';
import { v4 as uuidv4 } from 'uuid';
import { constrainElementToPath } from '../utils/elementConstraints';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagicWandSparkles,
  faSpinner,
  faLightbulb,
  faTimes,
  faCheck
} from '@fortawesome/free-solid-svg-icons';

const PromptInput = ({ prompt, setPrompt, isGenerating, handleGetSuggestions, loadingSuggestions }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label htmlFor="ai-prompt" className="block md:text-sm text-xs font-medium text-gray-700">
        {t('aiGeneration.describeIdea')}
      </label>
      <div className="relative">
        <textarea
          id="ai-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('aiGeneration.placeholder')}
          className="w-full p-3 md:text-base text-xs border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          rows="3"
          disabled={isGenerating}
        />
        <button
          onClick={handleGetSuggestions}
          disabled={!prompt.trim() || loadingSuggestions || isGenerating}
          className="absolute bottom-2 right-2 p-1.5 text-gray-500 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={t('aiGeneration.getSuggestions')}
        >
          {loadingSuggestions ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faLightbulb} />
          )}
        </button>
      </div>
      {!prompt.trim() && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">{t('aiGeneration.tryIdeas')}</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {['geometric patterns', 'floral design', 'abstract art', 'vintage stripes'].map((example) => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                className="px-2 py-1 bg-gray-100 rounded text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function AiGeneration() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const selectedProduct = useSelector((state) => state.products.selectedProduct);
  const selectedPath = useSelector((state) => state.color.selectedPathId);
  const zoomLevel = useSelector((state) => state.bottomControls.zoomLevel);
  const generatedImages = useSelector((state) => state.aiImages.generatedImages);
  const images = useSelector((state) => state.upload.images);
  const textboxes = useSelector((state) => state.upload.textboxes);
  const layerOrder = useSelector((state) => state.upload.layerOrder);
  const color = useSelector((state) => state.color.color);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [applyingIds, setApplyingIds] = useState(new Set());

  const textureUrl = selectedProduct?.textureUrl;

  const handleGenerateImage = async () => {
    if (!prompt.trim() || !selectedPath || !textureUrl) {
      setError(!prompt.trim() ? 'Please enter a prompt for AI generation' :
        !selectedPath ? 'Please select a region first' :
          'No texture found for AI generation');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const containerRef = { current: document.querySelector('.content') };
      const svgRef = { current: document.querySelector('svg') };
      const textureCanvasRef = { current: document.createElement('canvas') };
      const refs = { containerRef, svgRef, textureCanvasRef };

      const imageUrl = await generateImageWithSelectedRegion(
        prompt, selectedPath, refs, images, textboxes, color, zoomLevel, layerOrder
      );

      const imageId = uuidv4();
      // For local-only, we just use the data URL directly in the redux state
      dispatch(addGeneratedImage({ id: imageId, url: imageUrl, prompt }));
      setPrompt('');
    } catch (err) {
      console.error('AI Generation error:', err);
      setError(err.message || 'Failed to generate AI design. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToCanvas = async (image) => {
    if (!selectedPath || applyingIds.has(image.id)) return;

    setApplyingIds(prev => new Set([...prev, image.id]));

    try {
      const img = new Image();
      img.src = image.url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const aspectRatio = img.width / img.height;
      const baseWidth = 200;
      const initialWidth = baseWidth * (100 / zoomLevel);
      const initialHeight = initialWidth / aspectRatio;

      const svgElement = document.querySelector('svg');
      const svgBounds = svgElement.getBoundingClientRect();
      const centerX = svgBounds.left + (svgBounds.width * -53);
      const centerY = svgBounds.top + (svgBounds.height * 15);

      const initialPosition = {
        x: (centerX - (initialWidth / 2)) / (zoomLevel / 100),
        y: (centerY - (initialHeight / 2)) / (zoomLevel / 100)
      };

      const initialSize = { width: initialWidth, height: initialHeight };

      const { position, size } = constrainElementToPath(
        { ...initialPosition, ...initialSize },
        initialPosition,
        initialSize,
        selectedPath,
        zoomLevel
      );

      const newImage = {
        id: Date.now(),
        src: image.url,
        ...position,
        ...size,
        rotation: 0,
        onCanvas: true,
        targetElement: selectedPath,
      };

      dispatch(addImage(newImage));
      dispatch(setSelectedImage(newImage));
      dispatch(setSelectedElement({ type: 'image', id: newImage.id }));
      dispatch(setSelectedTool(null));
      setPrompt('');
    } catch (err) {
      console.error('Error adding image to canvas:', err);
      setError('Failed to add image to canvas.');
    } finally {
      setApplyingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(image.id);
        return newSet;
      });
    }
  };

  const handleGetSuggestions = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to get suggestions');
      return;
    }

    setLoadingSuggestions(true);
    setError('');

    try {
      const generatedSuggestions = await generateDesignSuggestions(prompt);
      setSuggestions(generatedSuggestions);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Suggestions error:', err);
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion) => {
    setPrompt(suggestion);
    setShowSuggestions(false);
  };

  const isDisabled = !selectedPath || !textureUrl || isGenerating;

  const SuggestionsPanel = () => showSuggestions && suggestions.length > 0 && (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-purple-800">{t('aiGeneration.suggestionsTitle')}</p>
        <button
          onClick={() => setShowSuggestions(false)}
          className="text-purple-600 hover:text-purple-800"
        >
          <FontAwesomeIcon icon={faTimes} size="sm" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => applySuggestion(suggestion)}
            className="px-3 py-1 bg-white border border-purple-300 rounded-full text-sm text-purple-700 hover:bg-purple-100 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );

  const ErrorMessage = () => error && (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
      <p className="text-red-800 text-sm">{error}</p>
    </div>
  );

  const GenerateButton = () => (
    <button
      onClick={handleGenerateImage}
      disabled={isDisabled || !prompt.trim()}
      className={`flex items-center md:text-base text-sm justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${isDisabled || !prompt.trim()
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
        }`}
    >
      {isGenerating ? (
        <>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          {t('aiGeneration.generatingButton')}
        </>
      ) : (
        <>
          <FontAwesomeIcon icon={faMagicWandSparkles} />
          {t('aiGeneration.generateButton')}
        </>
      )}
    </button>
  );

  const GeneratedImagesPreview = () => generatedImages.length > 0 && (
    <div className="mt-4">
      <h4 className="md:text-sm text-xs font-medium text-gray-700 mb-2">{t('aiGeneration.generatedDesigns')}</h4>
      <div className="flex flex-wrap gap-2">
        {generatedImages.map(image => (
          <div key={image.id} className="relative group">
            <div className={`relative border-2 border-purple-300 md:h-[120px] md:w-[120px] h-[60px] w-[60px]  rounded-lg overflow-hidden inline-block ${!selectedPath ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} >
              <img
                src={image.url}
                alt={`${t('aiGeneration.title')}: ${image.prompt}`}
                className="w-full h-full object-cover"
              />
              {selectedPath && !applyingIds.has(image.id) && (
                <div
                  className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleAddToCanvas(image)}
                >
                  <div className="text-white flex flex-col items-center">
                    <FontAwesomeIcon icon={faCheck} className="text-lg mb-1" />
                    <span className="text-xs">{t('aiGeneration.addButton')}</span>
                  </div>
                </div>
              )}
              {applyingIds.has(image.id) && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-white text-lg" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const InfoPanel = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <p className="text-blue-800 md:text-xs text-[10px] ">
        <FontAwesomeIcon icon={faCheck} className="mr-1" />
        {t('aiGeneration.infoMessage')}
      </p>
      {!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY === 'your_gemini_api_key_here' ? (
        <p className="text-amber-700 md:text-xs text-[10px] mt-1">
          ⚠️ {t('aiGeneration.demoMode')}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <FontAwesomeIcon icon={faMagicWandSparkles} className="text-purple-600" />
        <h3 className="font-semibold text-gray-800">{t('aiGeneration.title')}</h3>
      </div >

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 pb-4">
          {!selectedPath && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 md:text-sm text-[10px]">{t('aiGeneration.selectRegion')}</p>
            </div>
          )}

          {!textureUrl && selectedPath && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 md:text-sm text-[10px]">{t('aiGeneration.noTexture')}</p>
            </div>
          )}

          <PromptInput
            prompt={prompt}
            setPrompt={setPrompt}
            isGenerating={isGenerating}
            handleGetSuggestions={handleGetSuggestions}
            loadingSuggestions={loadingSuggestions} />
          <SuggestionsPanel />
          <ErrorMessage />
          <GenerateButton />
          <GeneratedImagesPreview />
          <InfoPanel />
        </div>
      </div>
    </div>
  );
}

export default AiGeneration;