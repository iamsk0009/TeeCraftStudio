import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";

// Check for API key
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey || apiKey === "your_gemini_api_key_here") {
  console.warn(
    "Gemini AI API key not found. Please set VITE_GEMINI_API_KEY in your .env file."
  );
}

// Initialize the Google Generative AI with your API key
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Initialize the Google GenAI for image generation (Imagen)
const genAI_imagen = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Generate an image based on a prompt using Gemini AI with Imagen
 * @param {string} prompt - The text prompt for image generation
 * @returns {Promise<string>} - Generated image as base64 data URL
 */
export async function generateImageWithSelectedRegion(prompt) {
  try {
    // console.log("🎨 Generating image for prompt:", prompt);

    if (!genAI_imagen) {
      console.warn("Gemini API not available, using fallback");
      // Return a placeholder image URL for development/testing
      return generateFallbackImage(prompt);
    }

    // Use Gemini AI to create a detailed description for better image generation
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const enhancedPrompt = `Create a detailed visual description for generating an image of: "${prompt}". 
    Describe the colors, shapes, composition, style, and visual elements in detail. 
    Focus on creating a vivid, artistic description that would help generate a clear and appealing image.
    Keep the description under 200 words.`;

    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    const aiDescription = response.text();

    // console.log("🤖 AI Enhanced Description:", aiDescription);

    // Generate image using Imagen
    const imageResponse = await genAI_imagen.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: aiDescription,
      config: {
        numberOfImages: 1,
        aspectRatio: "1:1",
        sampleImageSize: "1K"
      },
    });

    if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
      const generatedImage = imageResponse.generatedImages[0];
      const imageBytes = generatedImage.image.imageBytes;
      
      // Convert base64 image bytes to data URL
      const dataUrl = `data:image/png;base64,${imageBytes}`;
      
      // console.log("✅ Image generated successfully");
      return dataUrl;
    } else {
      throw new Error("No image was generated");
    }

  } catch (error) {
    console.error("Error generating image:", error);
    
    // Fallback to simple generation if AI fails
    return generateFallbackImage(prompt);
  }
}

/**
 * Generate a fallback placeholder image when AI generation fails
 * @param {string} prompt - The original prompt
 * @returns {Promise<string>} - Placeholder image as data URL
 */
function generateFallbackImage(prompt) {
  return new Promise((resolve) => {
    // Create a simple canvas with text as fallback
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 512;
    canvas.height = 512;
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('AI Generated', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '16px Arial';
    const words = prompt.split(' ');
    const maxWordsPerLine = 3;
    for (let i = 0; i < words.length; i += maxWordsPerLine) {
      const line = words.slice(i, i + maxWordsPerLine).join(' ');
      ctx.fillText(line, canvas.width / 2, canvas.height / 2 + 20 + (i / maxWordsPerLine) * 25);
    }
    
    resolve(canvas.toDataURL('image/png'));
  });
}

/**
 * Generate design suggestions based on a base prompt using Gemini AI
 * @param {string} basePrompt - The base prompt to expand upon
 * @returns {Promise<string[]>} - Array of suggestion strings
 */
export async function generateDesignSuggestions(basePrompt) {
  try {
    // console.log("💡 Generating design suggestions for:", basePrompt);

    if (!genAI) {
      console.warn("Gemini API not available, using default suggestions");
      return getDefaultSuggestions(basePrompt);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const suggestionPrompt = `Based on the design idea "${basePrompt}", generate 5 creative variations and improvements that would work well for textile/sock design patterns. 
    Focus on:
    - Color combinations and schemes
    - Pattern styles (geometric, organic, abstract, etc.)
    - Visual effects and textures
    - Artistic styles or themes
    
    Return only the suggestions as a simple list, one per line, without numbering or bullet points. Each suggestion should be concise (under 15 words).`;

    const result = await model.generateContent(suggestionPrompt);
    const response = await result.response;
    const suggestionsText = response.text();

    // Parse suggestions from the response
    const suggestions = suggestionsText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^\d+\.?/)) // Remove empty lines and numbered items
      .slice(0, 5); // Limit to 5 suggestions

    // console.log("✅ Generated suggestions:", suggestions);
    return suggestions.length > 0 ? suggestions : getDefaultSuggestions(basePrompt);

  } catch (error) {
    console.error("Error generating suggestions:", error);
    return getDefaultSuggestions(basePrompt);
  }
}

/**
 * Get default suggestions when AI is not available
 * @param {string} basePrompt - The base prompt
 * @returns {string[]} - Array of default suggestions
 */
function getDefaultSuggestions(basePrompt) {
  const defaultSuggestions = [
    `${basePrompt} with vibrant colors`,
    `Minimalist ${basePrompt} design`,
    `${basePrompt} in vintage style`,
    `Abstract ${basePrompt} pattern`,
    `${basePrompt} with geometric elements`
  ];
  
  return defaultSuggestions.slice(0, 5);
}
