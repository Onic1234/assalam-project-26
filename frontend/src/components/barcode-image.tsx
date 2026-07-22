'use client';

import React, { useEffect, useState } from 'react';

// Standard Code128 pattern definitions (0 to 106)
const CODE128_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","411112","134111","111242",
  "121142","121241","114212","124112","124211","411212","421112","421211","212141","214121",
  "412121","111143","111341","131141","114113","114311","411113","411311","113141","114131",
  "311141","411131","211412","211214","211232","2331112"
];

export function encodeCode128B(text: string): string[] {
  const codes: number[] = [104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const code = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
    codes.push(code);
    checksum += code * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(105); // Stop Code

  return codes.map((c) => CODE128_PATTERNS[c] || CODE128_PATTERNS[0]);
}

export function generateCode128Svg(
  text: string,
  options?: { width?: number; height?: number; displayValue?: boolean; fontSize?: number }
): string {
  const patterns = encodeCode128B(text || '');
  const moduleWidth = options?.width || 2;
  const height = options?.height || 50;
  const displayValue = options?.displayValue ?? false;
  const fontSize = options?.fontSize || 12;
  const textExtraHeight = displayValue ? fontSize + 4 : 0;
  const quietZone = 10;

  let totalModules = 0;
  patterns.forEach((pattern) => {
    for (let i = 0; i < pattern.length; i++) {
      totalModules += parseInt(pattern[i], 10);
    }
  });

  const totalWidth = totalModules * moduleWidth + quietZone * 2;
  const totalHeight = height + textExtraHeight;

  let currentX = quietZone;
  let rectsSvg = '';

  patterns.forEach((pattern) => {
    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const w = parseInt(pattern[i], 10) * moduleWidth;
      if (isBar) {
        rectsSvg += `<rect x="${currentX}" y="0" width="${w}" height="${height}" fill="#000000" />`;
      }
      currentX += w;
      isBar = !isBar;
    }
  });

  let textSvg = '';
  if (displayValue) {
    textSvg = `<text x="${totalWidth / 2}" y="${height + fontSize}" font-family="monospace" font-size="${fontSize}" text-anchor="middle" fill="#000000">${text}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" style="display:block; max-height:100%;">${rectsSvg}${textSvg}</svg>`;
}

export function generateBarcodeDataUrl(
  text: string,
  options?: { width?: number; height?: number; displayValue?: boolean }
): string {
  const svgString = generateCode128Svg(text, options);
  if (typeof window !== 'undefined' && window.btoa) {
    return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgString)))}`;
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

interface BarcodeProps {
  value: string;
  className?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}

export function BarcodeImage({
  value,
  className = '',
  width = 1.8,
  height = 40,
  displayValue = false,
  fontSize = 12,
}: BarcodeProps) {
  const [svgHtml, setSvgHtml] = useState<string>('');

  useEffect(() => {
    if (value) {
      const svg = generateCode128Svg(value, { width, height, displayValue, fontSize });
      setSvgHtml(svg);
    }
  }, [value, width, height, displayValue, fontSize]);

  if (!svgHtml) return <div className={className} />;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
