export enum ToolType {
  HOME = 'HOME',
  MERGE = 'MERGE',
  SPLIT = 'SPLIT',
  ROTATE = 'ROTATE',
  EXTRACT_TEXT = 'EXTRACT_TEXT',
  WATERMARK = 'WATERMARK',
  IMAGES_TO_PDF = 'IMAGES_TO_PDF',
  PDF_TO_IMAGES = 'PDF_TO_IMAGES',
  COMPRESS = 'COMPRESS',
  PAGE_NUMBERS = 'PAGE_NUMBERS',
  TEXT_TO_PDF = 'TEXT_TO_PDF',
}

export interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
  preview?: string; // URL for blob
}

export interface ProcessingStatus {
  isProcessing: boolean;
  message: string;
  error?: string;
  success?: boolean;
}
