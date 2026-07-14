declare module 'imagetracerjs' {
  interface ImageTracerOptions {
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    numberofcolors?: number;
    colorsampling?: number;
    scale?: number;
    roundcoords?: number;
    rightangleenhance?: boolean;
    blurradius?: number;
    blurdelta?: number;
    [key: string]: unknown;
  }

  interface ImageDataLike {
    data: Uint8ClampedArray | number[];
    width: number;
    height: number;
  }

  const ImageTracer: {
    imagedataToSVG(
      imagedata: ImageDataLike,
      options?: ImageTracerOptions | string,
    ): string;
    imageToSVG(
      url: string,
      callback: (svgstr: string) => void,
      options?: ImageTracerOptions | string,
    ): void;
    appendSVGString(svgstr: string, parentid: string): void;
  };

  export default ImageTracer;
}
