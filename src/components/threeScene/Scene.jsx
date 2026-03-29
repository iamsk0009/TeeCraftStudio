import React, { useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { useSelector, useDispatch } from "react-redux";
import * as THREE from "three";
import { setLoading } from "../../redux/loadingSlice";

function Scene() {
  const dispatch = useDispatch();
  const materialRef = useRef(null);
  const blackPartMaterialRef = useRef(null);
  const [blankTextureUrl, setBlankTextureUrl] = useState(null);
  const textureUrl = useSelector((state) => state.texture.textureUrl);
  const selectedProduct = useSelector(
    (state) => state.products.selectedProduct
  );
  const categories = useSelector((state) => state.products.categories);
  const model = useGLTF(
    selectedProduct?.modelUrl || `/models/BigTshirt.glb`
  );
  const currentTextureUrl = textureUrl;

  // Generate blank texture for Black_Part mesh (socks only)
  useEffect(() => {
    // Find socks category by checking category name
    const socksCategory = categories.find((cat) =>
      cat.name?.toLowerCase().includes("socks")
    );

    // Check if current product belongs to socks category
    const isSocksProduct =
      socksCategory && selectedProduct?.category === socksCategory.id;

    if (isSocksProduct) {
      // Create a blank white texture
      const canvas = document.createElement("canvas");
      canvas.width = 2048;
      canvas.height = 2048;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Generate data URL for blank texture
      const blankUrl = canvas.toDataURL("image/png");
      setBlankTextureUrl(blankUrl);
    } else {
      setBlankTextureUrl(null);
    }
  }, [selectedProduct, categories]);

  useEffect(() => {
    if (currentTextureUrl && model.scene) {
      const loader = new THREE.TextureLoader();

      const loadTexture = new Promise((resolve, reject) => {
        loader.load(
          currentTextureUrl,
          (loadedTexture) => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = loadedTexture.image.width;
            canvas.height = loadedTexture.image.height;
            ctx.drawImage(loadedTexture.image, 0, 0);
            loadedTexture.flipY = false;
            loadedTexture.colorSpace = THREE.SRGBColorSpace;
            loadedTexture.magFilter = THREE.LinearFilter;
            loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
            loadedTexture.anisotropy = 8;
            loadedTexture.needsUpdate = true;
            resolve(loadedTexture);
          },
          undefined,
          (error) => {
            console.error(
              "Error loading texture from:",
              currentTextureUrl,
              error
            );
            reject(error);
          }
        );
      });

      loadTexture
        .then((loadedTexture) => {
          // Check if this is a socks product by category ID
          const socksCategory = categories.find((cat) =>
            cat.name?.toLowerCase().includes("socks")
          );
          const isSocksProduct =
            socksCategory && selectedProduct?.category === socksCategory.id;

          if (!materialRef.current) {
            // Get the original material from the model to preserve normal maps and other properties
            let originalMaterial = null;
            model.scene.traverse((child) => {
              if (child.isMesh && !originalMaterial) {
                if (isSocksProduct && child.name === "Black_Part") {
                  return;
                }
                originalMaterial = child.material;
              }
            });

            // Clone the original material to preserve all maps (normal, roughness, etc.)
            if (originalMaterial) {
              materialRef.current = originalMaterial.clone();
            } else {
              // Fallback if no original material found
              materialRef.current = new THREE.MeshStandardMaterial({
                side: THREE.DoubleSide,
                transparent: true,
                alphaTest: 0.1,
                metalness: 0.1,
                roughness: 0.8,
              });
            }

            // Only update the base color map
            materialRef.current.map = loadedTexture;
            materialRef.current.needsUpdate = true;

            // Apply material to all mesh children (only on first creation)
            model.scene.traverse((child) => {
              if (child.isMesh) {
                // For socks products, skip Black_Part mesh
                if (isSocksProduct && child.name === "Black_Part") {
                  return;
                }
                child.material = materialRef.current;
              }
            });
          } else {
            // Dispose previous map to avoid memory leaks (if different)
            if (
              materialRef.current.map &&
              materialRef.current.map !== loadedTexture
            ) {
              try {
                materialRef.current.map.dispose();
              } catch (e) {
                /* ignore */
                console.error(e);
                
              }
            }

            // Only update the base color map, leave normal map and other maps untouched
            materialRef.current.map = loadedTexture;
            materialRef.current.needsUpdate = true;

            // Re-apply material to all meshes in the *current* model scene (important when product/model changes)
            model.scene.traverse((child) => {
              if (child.isMesh) {
                // For socks products, skip Black_Part mesh
                if (isSocksProduct && child.name === "Black_Part") {
                  return;
                }
                child.material = materialRef.current;
                if (child.material) child.material.needsUpdate = true;
              }
            });
          }

          // Wait for next frame to ensure material is applied
          requestAnimationFrame(() => {
            dispatch(setLoading(false));
          });
        })
        .catch((error) => {
          console.error("Texture processing error:", error);
          dispatch(setLoading(false));
        });

      return () => {
        if (materialRef.current?.map) {
          materialRef.current.map.dispose();
          materialRef.current.dispose();
        }
      };
    }
  }, [currentTextureUrl, model.scene, dispatch, selectedProduct, categories]);

  // Apply blank texture to Black_Part mesh for socks products
  useEffect(() => {
    if (!blankTextureUrl || !model.scene) return;

    const loader = new THREE.TextureLoader();

    loader.load(
      blankTextureUrl,
      (loadedTexture) => {
        loadedTexture.flipY = false;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.needsUpdate = true;

        if (!blackPartMaterialRef.current) {
          blackPartMaterialRef.current = new THREE.MeshStandardMaterial({
            map: loadedTexture,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.1,
            metalness: 0.1,
            roughness: 0.8,
          });
        } else {
          blackPartMaterialRef.current.map = loadedTexture;
          blackPartMaterialRef.current.needsUpdate = true;
        }

        // Find and apply material to Black_Part mesh only
        model.scene.traverse((child) => {
          if (child.isMesh && child.name === "Black_Part") {
            child.material = blackPartMaterialRef.current;
            child.material.needsUpdate = true;
          }
        });
      },
      undefined,
      (error) => {
        console.error("Error loading blank texture for Black_Part:", error);
      }
    );

    return () => {
      if (blackPartMaterialRef.current?.map) {
        blackPartMaterialRef.current.map.dispose();
        blackPartMaterialRef.current.dispose();
      }
    };
  }, [blankTextureUrl, model.scene]);

  // Don't render if we don't have a selected product
  if (!selectedProduct?.modelUrl) {
    return null;
  }

  return <primitive object={model.scene} scale={4} />;
}

export default Scene;
