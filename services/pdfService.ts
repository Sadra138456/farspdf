import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import fontkit from '@pdf-lib/fontkit';
import JSZip from 'jszip';

// Handle ES module default export inconsistency for pdfjs-dist in Vite
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Configure worker for PDF.js v4.x
// IMPORTANT: The worker version must match the installed 'pdfjs-dist' version (4.8.69)
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`;
}

// Helper to load font
const loadVazirFont = async () => {
  const response = await fetch('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/ttf/Vazirmatn-Bold.ttf');
  if (!response.ok) throw new Error('Failed to load font');
  return response.arrayBuffer();
};

export const mergePdfs = async (files: File[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return mergedPdf.save();
};

export const splitPdf = async (file: File, pageIndices: number[]): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  
  const copiedPages = await newPdf.copyPages(pdf, pageIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));
  
  return newPdf.save();
};

export const rotatePdf = async (file: File, rotation: number): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const pages = pdf.getPages();
  
  pages.forEach((page) => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + rotation));
  });
  
  return pdf.save();
};

export const extractTextFromPdf = async (file: File, pageNumbers?: number[]): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  // Using Uint8Array is standard for pdfjs to avoid potential issues
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  // Determine which pages to process
  let pagesToProcess: number[] = [];
  if (pageNumbers && pageNumbers.length > 0) {
      // Filter pages to be within valid range (1 to totalPages)
      pagesToProcess = pageNumbers.filter(p => p >= 1 && p <= pdf.numPages);
  } else {
      // If no pages specified, fallback to all
      for (let i = 1; i <= pdf.numPages; i++) pagesToProcess.push(i);
  }

  // Process selected pages sequentially
  for (const i of pagesToProcess) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `--- صفحه ${i} ---\n${pageText}\n\n`;
      
      // Critical: Release page resources immediately after processing
      page.cleanup();
    } catch (e) {
      console.error(`Error processing page ${i}:`, e);
      fullText += `--- صفحه ${i} (خطا در پردازش) ---\n\n`;
    }
  }
  
  // Clean up the document
  if (pdf.destroy) {
      pdf.destroy();
  }
  
  return fullText;
};

export const addWatermark = async (file: File, text: string): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  pdf.registerFontkit((fontkit as any).default || fontkit);
  const fontBytes = await loadVazirFont();
  const customFont = await pdf.embedFont(fontBytes);
  
  const pages = pdf.getPages();
  
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const fontSize = 50;
    const textWidth = customFont.widthOfTextAtSize(text, fontSize);
    
    page.drawText(text, {
      x: width / 2 - textWidth / 2, 
      y: height / 2,
      size: fontSize,
      font: customFont,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.3,
      rotate: degrees(45),
    });
  });
  
  return pdf.save();
};

export const imagesToPdf = async (files: File[]): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    let image;
    
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      image = await pdf.embedJpg(arrayBuffer);
    } else if (file.type === 'image/png') {
      image = await pdf.embedPng(arrayBuffer);
    } else {
      continue; // Skip unsupported
    }
    
    if (image) {
      const page = pdf.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }
  }

  return pdf.save();
};

export const pdfToImages = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const zip = new JSZip();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // High res
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context!,
      viewport: viewport
    }).promise;

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (blob) {
      zip.file(`page-${i}.jpg`, blob);
    }
    
    // Cleanup page to save memory
    page.cleanup();
  }

  return zip.generateAsync({ type: 'uint8array' });
};

export const compressPdf = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  // Saving with object streams reduces file size by compacting internal objects
  return pdf.save({ useObjectStreams: true });
};

export const addPageNumbers = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  // Use Vazir if possible for Persian numbers, or fallback to standard
  let font;
  try {
     pdf.registerFontkit((fontkit as any).default || fontkit);
     const fontBytes = await loadVazirFont();
     font = await pdf.embedFont(fontBytes);
  } catch (e) {
     font = await pdf.embedFont(StandardFonts.Helvetica);
  }

  const pages = pdf.getPages();
  const totalPages = pages.length;

  pages.forEach((page, idx) => {
    const { width } = page.getSize();
    const text = `${idx + 1} از ${totalPages}`;
    const fontSize = 12;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: 20,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });
  });

  return pdf.save();
};

export const getPageCount = async (file: File): Promise<number> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    return pdf.getPageCount();
}