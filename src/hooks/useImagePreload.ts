import { useState, useEffect } from 'react';

export function useImagePreload(imageSrcs: string[]): boolean {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    if (imageSrcs.length === 0) {
      setImagesLoaded(true);
      return;
    }

    let loadedCount = 0;
    const totalImages = imageSrcs.length;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        setImagesLoaded(true);
      }
    };

    imageSrcs.forEach((src) => {
      const img = new Image();
      img.onload = checkAllLoaded;
      img.onerror = checkAllLoaded; // Don't block on errors
      img.src = src;
    });
  }, [imageSrcs.join(',')]);

  return imagesLoaded;
}
