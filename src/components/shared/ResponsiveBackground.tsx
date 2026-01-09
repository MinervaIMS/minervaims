import { useEffect } from 'react';

interface ResponsiveBackgroundProps {
  src: string;
  className?: string;
  priority?: boolean;
}

/**
 * Optimized background image component with preloading.
 * Use priority=true for above-the-fold hero images.
 */
export function ResponsiveBackground({ 
  src, 
  className = '', 
  priority = false 
}: ResponsiveBackgroundProps) {
  useEffect(() => {
    if (priority) {
      // Preload high-priority images
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [src, priority]);

  return (
    <div 
      className={`absolute inset-0 bg-cover bg-center ${className}`}
      style={{ 
        backgroundImage: `url(${src})`,
        willChange: priority ? 'auto' : 'transform',
      }}
    />
  );
}
