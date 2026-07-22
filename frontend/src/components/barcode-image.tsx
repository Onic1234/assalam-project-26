'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  className?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
}

export function BarcodeImage({
  value,
  className = '',
  width = 1.8,
  height = 40,
  displayValue = false,
  fontSize = 12,
  margin = 2,
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (e) {
        console.error('JsBarcode rendering error:', e);
      }
    }
  }, [value, width, height, displayValue, fontSize, margin]);

  return <svg ref={svgRef} className={className} />;
}

export function generateBarcodeDataUrl(text: string, options?: { width?: number; height?: number; displayValue?: boolean }): string {
  if (typeof window === 'undefined') {
    return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(text)}&scale=2&includetext`;
  }
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: options?.width || 2,
      height: options?.height || 50,
      displayValue: options?.displayValue ?? true,
      fontSize: 12,
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error generating barcode data URL:', err);
    return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(text)}&scale=2&includetext`;
  }
}
