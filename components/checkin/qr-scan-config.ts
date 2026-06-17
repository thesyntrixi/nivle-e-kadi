/** QR scan overlay: 80% of the smaller viewfinder edge (responsive on mobile + desktop). */
export const checkinQrScanConfig = {
  fps: 10,
  qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
    const size = Math.floor(minEdge * 0.8);
    return { width: size, height: size };
  },
  aspectRatio: 1.0,
  videoConstraints: {
    width: { min: 640, ideal: 1280 },
    height: { min: 480, ideal: 720 },
    facingMode: 'environment' as const,
  },
};
