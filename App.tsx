import React, { useState, useEffect } from 'react';
import { 
  FileText, Layers, Scissors, FileOutput, X, RotateCw, Trash2, Home, Stamp,
  Image as ImageIcon, Images, FileDigit, Shield, Minimize2, Timer, Globe, Fingerprint, Lock,
  Type
} from 'lucide-react';

import { ToolType, PdfFile, ProcessingStatus } from './types';
import * as pdfService from './services/pdfService';
import FileInput from './components/FileInput';
import Button from './components/Button';
import ResultCard from './components/ResultCard';

// Helper for SHA256
const generateHash = async () => {
  const msg = Date.now().toString() + Math.random().toString();
  const msgBuffer = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

function App() {
  // Global State
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.HOME);
  
  // Privacy Mode State
  const [privacyMode, setPrivacyMode] = useState(false); // Toggle
  const [privacyActive, setPrivacyActive] = useState(false); // Session Active
  const [privacyName, setPrivacyName] = useState('');
  const [privacyDuration, setPrivacyDuration] = useState(10); // Minutes
  const [timeLeft, setTimeLeft] = useState(0); // Seconds
  const [sessionToken, setSessionToken] = useState('در حال تولید...');
  const [userIp, setUserIp] = useState('...');

  // File State
  const [selectedFiles, setSelectedFiles] = useState<PdfFile[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '' });
  const [resultPdf, setResultPdf] = useState<Uint8Array | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  
  // Tool Specific State
  const [splitPages, setSplitPages] = useState<string>('');
  const [extractPageNumber, setExtractPageNumber] = useState<string>('');
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  
  // Privacy Session Logic
  useEffect(() => {
    let timerInterval: any;
    let tokenInterval: any;

    if (privacyActive) {
      // 1. Fetch IP
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => setUserIp(data.ip))
        .catch(() => setUserIp('127.0.0.1 (Local)'));

      // 2. Initial Token
      generateHash().then(setSessionToken);

      // 3. Token Rotation (every 10s)
      tokenInterval = setInterval(() => {
        generateHash().then(setSessionToken);
      }, 10000);

      // 4. Timer Countdown
      timerInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setPrivacyActive(false);
            setPrivacyMode(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(timerInterval);
      clearInterval(tokenInterval);
    };
  }, [privacyActive]);

  const startPrivacySession = () => {
    if (!privacyName.trim()) {
      alert('لطفا نام خود را وارد کنید');
      return;
    }
    setTimeLeft(privacyDuration * 60);
    setPrivacyActive(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFilesSelected = (files: File[]) => {
    const newFiles = files.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      name: f.name,
      size: f.size
    }));
    
    if (activeTool === ToolType.MERGE || activeTool === ToolType.IMAGES_TO_PDF) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
    } else if (activeTool === ToolType.TEXT_TO_PDF) {
       // Read text file content
       const file = newFiles[0].file;
       const reader = new FileReader();
       reader.onload = (e) => {
          if (e.target?.result) {
             setTextInput(e.target.result as string);
          }
       };
       reader.readAsText(file);
    } else {
      setSelectedFiles(newFiles.slice(0, 1));
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const resetTool = () => {
    setResultPdf(null);
    setSelectedFiles([]);
    setExtractedText('');
    setStatus({ isProcessing: false, message: '' });
    setSplitPages('');
    setExtractPageNumber('');
    setWatermarkText('');
    setTextInput('');
  };

  const getFileName = () => {
    const prefix = privacyActive ? `secure-${privacyName}` : 'farspdf';
    const timestamp = Date.now();
    if (activeTool === ToolType.PDF_TO_IMAGES) return `${prefix}-images-${timestamp}.zip`;
    return `${prefix}-result-${timestamp}.pdf`;
  };

  const downloadResult = (fileName: string) => {
    if (!resultPdf && !extractedText) return;

    if (activeTool === ToolType.EXTRACT_TEXT) {
      const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `extracted-text-${Date.now()}.txt`;
      link.click();
    } else if (resultPdf) {
      const type = activeTool === ToolType.PDF_TO_IMAGES ? 'application/zip' : 'application/pdf';
      const blob = new Blob([resultPdf], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    }
  };

  const handleShare = async () => {
     if (!resultPdf || !navigator.share) return;
     try {
       const type = activeTool === ToolType.PDF_TO_IMAGES ? 'application/zip' : 'application/pdf';
       const file = new File([resultPdf], getFileName(), { type });
       if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
             files: [file],
             title: 'FarsPDF Document',
             text: 'این فایل با FarsPDF ویرایش شده است.'
          });
       } else {
         alert('مرورگر شما از اشتراک‌گذاری فایل پشتیبانی نمی‌کند.');
       }
     } catch (e) {
       console.error('Share failed:', e);
     }
  };

  const processFile = async () => {
    setStatus({ isProcessing: true, message: 'در حال پردازش...' });
    try {
      let result: Uint8Array | null = null;
      let textResult = '';

      switch (activeTool) {
        case ToolType.MERGE:
          if (selectedFiles.length < 2) throw new Error("لطفا حداقل دو فایل انتخاب کنید");
          result = await pdfService.mergePdfs(selectedFiles.map(f => f.file));
          break;
          
        case ToolType.SPLIT:
          if (selectedFiles.length === 0) throw new Error("فایل انتخاب نشده");
          const pages: number[] = [];
          const parts = splitPages.split(',');
          for (const part of parts) {
             if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (isNaN(start) || isNaN(end)) throw new Error("فرمت صفحات اشتباه است");
                for (let i = start; i <= end; i++) pages.push(i - 1);
             } else {
                const p = Number(part);
                if (isNaN(p)) throw new Error("فرمت صفحات اشتباه است");
                pages.push(p - 1);
             }
          }
          result = await pdfService.splitPdf(selectedFiles[0].file, pages);
          break;
          
        case ToolType.ROTATE:
          if (selectedFiles.length === 0) throw new Error("فایل انتخاب نشده");
          result = await pdfService.rotatePdf(selectedFiles[0].file, 90);
          break;
          
        case ToolType.EXTRACT_TEXT:
          if (selectedFiles.length === 0) throw new Error("فایل انتخاب نشده");
          if (!extractPageNumber.trim()) throw new Error("لطفا شماره صفحه مورد نظر را وارد کنید");
          
          // Parse pages
          const extractPages: number[] = [];
          const extractParts = extractPageNumber.split(',');
          for (const part of extractParts) {
               if (part.includes('-')) {
                  const [start, end] = part.split('-').map(Number);
                  if (!isNaN(start) && !isNaN(end)) {
                      for (let i = start; i <= end; i++) extractPages.push(i);
                  }
               } else {
                  const p = Number(part);
                  if (!isNaN(p)) extractPages.push(p);
               }
          }
          
          if (extractPages.length === 0) throw new Error("شماره صفحه نامعتبر است");

          textResult = await pdfService.extractTextFromPdf(selectedFiles[0].file, extractPages);
          setExtractedText(textResult);
          break;
          
        case ToolType.WATERMARK:
           if (selectedFiles.length === 0) throw new Error("فایل انتخاب نشده");
           if (!watermarkText.trim()) throw new Error("لطفا متن واترمارک را وارد کنید");
           result = await pdfService.addWatermark(selectedFiles[0].file, watermarkText);
           break;

        case ToolType.IMAGES_TO_PDF:
           if (selectedFiles.length === 0) throw new Error("لطفا حداقل یک تصویر انتخاب کنید");
           result = await pdfService.imagesToPdf(selectedFiles.map(f => f.file));
           break;

        case ToolType.PDF_TO_IMAGES:
           if (selectedFiles.length === 0) throw new Error("فایل انتخاب نشده");
           result = await pdfService.pdfToImages(selectedFiles[0].file);
           break;

        case ToolType.COMPRESS:
           if (selectedFiles.length === 0) throw new Error("فایل انتخاب نشده");
           result = await pdfService.compressPdf(selectedFiles[0].file);
           break;

        case ToolType.PAGE_NUMBERS:
           if (selectedFiles.length === 0) throw new Error("فایل انتخاب نشده");
           result = await pdfService.addPageNumbers(selectedFiles[0].file);
           break;

        case ToolType.TEXT_TO_PDF:
           if (!textInput.trim()) throw new Error("متنی برای تبدیل وارد نشده است");
           result = await pdfService.textToPdf(textInput);
           break;
      }
      
      setResultPdf(result);
      setStatus({ isProcessing: false, message: '', success: true });
    } catch (e: any) {
      console.error(e);
      setStatus({ isProcessing: false, message: e.message, error: e.message });
    }
  };

  // --- Views ---

  const renderHome = () => (
    <>
      <div className="text-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white rounded-3xl mb-12 shadow-sm relative overflow-hidden">
        <div className="flex justify-center mb-6 relative z-10">
          <div className="bg-blue-100 p-4 rounded-full">
            <Layers className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight relative z-10">
          ابزار PDF ایرانی، <span className="text-blue-600">خصوصی و رایگان</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed relative z-10">
          تبدیل، ویرایش و مدیریت فایل‌های PDF خودت رو کاملاً رایگان و بدون آپلود به هیچ سروری انجام بده!
        </p>
        
        {/* Privacy Toggle / Dashboard */}
        <div className="max-w-xl mx-auto relative z-10">
          {!privacyActive ? (
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 transition-all">
               <div className="flex items-center justify-between cursor-pointer mb-4" onClick={() => setPrivacyMode(!privacyMode)}>
                  <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${privacyMode ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {privacyMode ? <Lock className="w-6 h-6 text-green-600" /> : <Shield className="w-6 h-6 text-gray-500" />}
                     </div>
                     <div className="text-right">
                       <span className="block font-bold text-gray-800">حالت حفاظت شخصی (Secure Session)</span>
                       <span className="text-xs text-gray-500">{privacyMode ? 'پیکربندی نشست امن' : 'برای فعال‌سازی کلیک کنید'}</span>
                     </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${privacyMode ? 'bg-green-500' : 'bg-gray-300'}`}>
                     <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${privacyMode ? '-translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
               </div>

               {privacyMode && (
                  <div className="space-y-4 animate-fade-in border-t pt-4 border-gray-100">
                     <div>
                       <label className="block text-right text-sm font-medium text-gray-700 mb-1">نام کاربری موقت</label>
                       <input 
                          type="text" 
                          placeholder="نام خود را وارد کنید"
                          value={privacyName}
                          onChange={(e) => setPrivacyName(e.target.value)}
                          className="w-full text-right p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                       />
                     </div>
                     <div>
                       <label className="block text-right text-sm font-medium text-gray-700 mb-1">مدت زمان نشست (دقیقه)</label>
                       <select 
                          value={privacyDuration}
                          onChange={(e) => setPrivacyDuration(Number(e.target.value))}
                          className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                       >
                          <option value={1}>1 دقیقه (تست)</option>
                          <option value={5}>5 دقیقه</option>
                          <option value={10}>10 دقیقه</option>
                          <option value={30}>30 دقیقه</option>
                          <option value={60}>1 ساعت</option>
                       </select>
                     </div>
                     <Button onClick={startPrivacySession} className="w-full bg-green-600 hover:bg-green-700">
                        شروع نشست امن
                     </Button>
                  </div>
               )}
            </div>
          ) : (
            <div className="bg-gray-900 text-green-400 p-6 rounded-2xl shadow-xl border border-green-500/50 font-mono text-left animate-pulse-slow relative overflow-hidden">
               {/* Matrix background effect simulation */}
               <div className="absolute inset-0 opacity-10 pointer-events-none" 
                    style={{backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(32, 255, 77, .3) 25%, rgba(32, 255, 77, .3) 26%, transparent 27%, transparent 74%, rgba(32, 255, 77, .3) 75%, rgba(32, 255, 77, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(32, 255, 77, .3) 25%, rgba(32, 255, 77, .3) 26%, transparent 27%, transparent 74%, rgba(32, 255, 77, .3) 75%, rgba(32, 255, 77, .3) 76%, transparent 77%, transparent)', backgroundSize: '30px 30px'}}>
               </div>
               
               <div className="relative z-10 space-y-4">
                 <div className="flex justify-between items-center border-b border-green-500/30 pb-2">
                    <div className="flex items-center gap-2">
                       <Shield className="w-5 h-5 animate-pulse" />
                       <span className="font-bold text-lg">SECURE SESSION ACTIVE</span>
                    </div>
                    <button onClick={() => setPrivacyActive(false)} className="text-xs border border-green-500 px-2 py-1 rounded hover:bg-green-900/50">End Session</button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div>
                       <span className="block text-gray-500 uppercase text-[10px]">User Identity</span>
                       <span className="font-bold text-white">{privacyName}</span>
                    </div>
                    <div>
                       <span className="block text-gray-500 uppercase text-[10px] flex items-center gap-1"><Globe className="w-3 h-3"/> Public IP</span>
                       <span className="font-bold text-white">{userIp}</span>
                    </div>
                 </div>

                 <div className="bg-black/30 p-3 rounded border border-green-500/20">
                    <span className="block text-gray-500 uppercase text-[10px] mb-1 flex items-center gap-1"><Fingerprint className="w-3 h-3"/> Rolling Security Token (SHA256)</span>
                    <div className="truncate text-xs text-green-300 font-mono">{sessionToken}</div>
                    <div className="text-[10px] text-gray-500 text-right mt-1">Refreshes every 10s</div>
                 </div>

                 <div className="flex items-center justify-center gap-2 text-xl font-bold bg-green-900/20 py-2 rounded">
                    <Timer className="w-5 h-5" />
                    <span>{formatTime(timeLeft)}</span>
                 </div>
                 
                 <div className="text-center text-xs text-green-300 font-bold border-t border-green-500/30 pt-2">
                    شما در حفاظت کامل هستید
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Tool Grid - Disabled if no privacy session */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 px-4 transition-all duration-300 ${!privacyActive ? 'opacity-50 pointer-events-none filter blur-[2px] select-none' : ''}`}>
        {[
          { id: ToolType.MERGE, icon: Layers, title: 'ترکیب PDF', desc: 'چند فایل رو به هم بچسبون' },
          { id: ToolType.SPLIT, icon: Scissors, title: 'جدا کردن', desc: 'صفحات دلخواه رو جدا کن' },
          { id: ToolType.IMAGES_TO_PDF, icon: Images, title: 'تصویر به PDF', desc: 'تبدیل عکس‌ها به یک فایل PDF' },
          { id: ToolType.TEXT_TO_PDF, icon: Type, title: 'متن به PDF', desc: 'تبدیل متن ساده به PDF' },
          { id: ToolType.PDF_TO_IMAGES, icon: ImageIcon, title: 'PDF به تصویر', desc: 'تبدیل صفحات PDF به عکس' },
          { id: ToolType.COMPRESS, icon: Minimize2, title: 'کاهش حجم', desc: 'بهینه‌سازی فایل PDF' },
          { id: ToolType.PAGE_NUMBERS, icon: FileDigit, title: 'شماره صفحه', desc: 'افزودن شماره به صفحات' },
          { id: ToolType.WATERMARK, icon: Stamp, title: 'واترمارک', desc: 'افزودن متن به پس‌زمینه' },
          { id: ToolType.ROTATE, icon: RotateCw, title: 'چرخش صفحات', desc: 'اصلاح جهت صفحات' },
          { id: ToolType.EXTRACT_TEXT, icon: FileText, title: 'استخراج متن', desc: 'متن داخل PDF رو کپی کن' },
        ].map(tool => (
          <div 
            key={tool.id} 
            onClick={() => { setActiveTool(tool.id); resetTool(); }}
            className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer text-right"
          >
            <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
              <tool.icon className="w-7 h-7 text-blue-600 group-hover:text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{tool.title}</h3>
            <p className="text-gray-500 text-sm">{tool.desc}</p>
          </div>
        ))}
      </div>
      
      {!privacyActive && (
         <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl font-medium shadow-sm animate-bounce-short">
                <Lock className="w-5 h-5"/>
                <span>برای دسترسی به ابزارها، لطفاً ابتدا «حالت حفاظت شخصی» را فعال کنید.</span>
            </div>
         </div>
      )}
    </>
  );

  const renderToolInterface = () => {
    if (activeTool === ToolType.HOME) return null;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button onClick={() => setActiveTool(ToolType.HOME)} variant="ghost" className="mb-6">
          <Home className="ml-2 w-4 h-4" />
          بازگشت به خانه
        </Button>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
               {activeTool === ToolType.MERGE && 'ترکیب فایل‌های PDF'}
               {activeTool === ToolType.SPLIT && 'جدا کردن صفحات PDF'}
               {activeTool === ToolType.ROTATE && 'چرخش فایل PDF'}
               {activeTool === ToolType.EXTRACT_TEXT && 'استخراج متن از PDF'}
               {activeTool === ToolType.WATERMARK && 'افزودن واترمارک به PDF'}
               {activeTool === ToolType.IMAGES_TO_PDF && 'تبدیل تصویر به PDF'}
               {activeTool === ToolType.PDF_TO_IMAGES && 'تبدیل PDF به تصویر'}
               {activeTool === ToolType.COMPRESS && 'کاهش حجم PDF'}
               {activeTool === ToolType.PAGE_NUMBERS && 'افزودن شماره صفحه'}
               {activeTool === ToolType.TEXT_TO_PDF && 'تبدیل متن به PDF'}
            </h2>
            {privacyActive && (
                <span className="bg-gray-900 text-green-400 border border-green-500 px-3 py-1 rounded-full text-xs font-mono flex items-center animate-pulse">
                    <Shield className="w-3 h-3 ml-1" />
                    SECURE: {formatTime(timeLeft)}
                </span>
            )}
          </div>

          <div className="p-8">
            {/* Step 1: Upload (if no result yet) */}
            {!status.success && (
              <>
                {/* Special Case for Text to PDF: Show Textarea and File Input */}
                {activeTool === ToolType.TEXT_TO_PDF ? (
                   <div className="mb-8">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">متن خود را تایپ کنید یا فایل متنی (.txt) آپلود کنید</label>
                        <textarea 
                           value={textInput}
                           onChange={(e) => setTextInput(e.target.value)}
                           placeholder="متن خود را اینجا بنویسید... (پشتیبانی خودکار از فارسی و انگلیسی)"
                           className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed text-gray-900"
                           dir="auto"
                        />
                      </div>
                      
                      <div className="flex items-center gap-4">
                          <FileInput 
                            onFilesSelected={handleFilesSelected} 
                            multiple={false}
                            accept=".txt"
                            className="flex-1 py-4"
                          />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">نکته: پاراگراف‌های فارسی به طور خودکار راست‌چین و انگلیسی‌ها چپ‌چین خواهند شد.</p>
                   </div>
                ) : (
                    <div className="mb-8">
                      <FileInput 
                        onFilesSelected={handleFilesSelected} 
                        multiple={activeTool === ToolType.MERGE || activeTool === ToolType.IMAGES_TO_PDF}
                        accept={activeTool === ToolType.IMAGES_TO_PDF ? "image/png, image/jpeg" : "application/pdf"}
                        className={selectedFiles.length > 0 ? "border-blue-300 bg-blue-50" : ""}
                      />
                    </div>
                )}

                {/* File List (For non-text tools) */}
                {activeTool !== ToolType.TEXT_TO_PDF && selectedFiles.length > 0 && (
                  <div className="mb-8 space-y-3">
                    <h4 className="font-semibold text-gray-700 mb-2">فایل‌های انتخاب شده:</h4>
                    {selectedFiles.map((f, idx) => (
                      <div key={f.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center truncate">
                          {activeTool === ToolType.IMAGES_TO_PDF ? (
                             <ImageIcon className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
                          ) : (
                             <FileText className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
                          )}
                          <span className="text-sm text-gray-700 truncate">{f.name}</span>
                          <span className="text-xs text-gray-400 mr-2">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <button onClick={() => removeFile(f.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tool Specific Controls */}
                {(selectedFiles.length > 0 || activeTool === ToolType.TEXT_TO_PDF) && (
                   <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                      {activeTool === ToolType.SPLIT && (
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                               شماره صفحات را وارد کنید (مثال: 1,3,5-7)
                            </label>
                            <input 
                               type="text" 
                               value={splitPages}
                               onChange={(e) => setSplitPages(e.target.value)}
                               placeholder="مثال: 1-3, 5"
                               className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left ltr" 
                            />
                         </div>
                      )}
                      
                      {activeTool === ToolType.EXTRACT_TEXT && (
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                               شماره صفحات برای استخراج متن (الزامی)
                            </label>
                            <input 
                               type="text" 
                               value={extractPageNumber}
                               onChange={(e) => setExtractPageNumber(e.target.value)}
                               placeholder="مثال: 1, 3-5 (برای جلوگیری از هنگی مرورگر، محدود وارد کنید)"
                               className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left ltr" 
                            />
                            <p className="text-xs text-gray-500 mt-2 text-right">فقط صفحات وارد شده پردازش خواهند شد.</p>
                         </div>
                      )}

                      {activeTool === ToolType.WATERMARK && (
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                               متن واترمارک را وارد کنید
                            </label>
                            <input 
                               type="text" 
                               value={watermarkText}
                               onChange={(e) => setWatermarkText(e.target.value)}
                               placeholder="مثال: محرمانه، کپی ممنوع..."
                               className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center" 
                            />
                         </div>
                      )}

                      {activeTool === ToolType.ROTATE && (
                          <div className="text-center text-gray-600">
                              <p>تمام صفحات ۹۰ درجه ساعت‌گرد خواهند چرخید.</p>
                          </div>
                      )}

                      {activeTool === ToolType.COMPRESS && (
                          <div className="text-center text-gray-600">
                              <p>فایل PDF شما بازسازی و بهینه‌سازی خواهد شد. این عملیات ممکن است حجم فایل را کاهش دهد.</p>
                          </div>
                      )}
                      
                      {activeTool === ToolType.MERGE && (
                          <div className="text-center text-gray-600">
                              <p>فایل‌ها به ترتیبی که در لیست بالا هستند ترکیب می‌شوند.</p>
                          </div>
                      )}

                      {activeTool === ToolType.IMAGES_TO_PDF && (
                          <div className="text-center text-gray-600">
                              <p>تصاویر به ترتیب لیست بالا در PDF قرار می‌گیرند.</p>
                          </div>
                      )}

                      {activeTool === ToolType.PDF_TO_IMAGES && (
                          <div className="text-center text-gray-600">
                              <p>صفحات PDF به صورت فایل‌های جداگانه در یک فایل ZIP دانلود می‌شوند.</p>
                          </div>
                      )}
                      
                      {activeTool === ToolType.PAGE_NUMBERS && (
                          <div className="text-center text-gray-600">
                              <p>شماره صفحه در پایین وسط تمام صفحات درج می‌شود.</p>
                          </div>
                      )}

                      {activeTool === ToolType.TEXT_TO_PDF && (
                          <div className="text-center text-gray-600">
                              <p>فایل PDF با فونت استاندارد فارسی (وزیرمتن) ایجاد خواهد شد.</p>
                          </div>
                      )}
                   </div>
                )}

                {/* Action Button */}
                {(selectedFiles.length > 0 || (activeTool === ToolType.TEXT_TO_PDF && textInput.trim().length > 0)) && (
                   <div className="flex justify-end">
                      <Button onClick={processFile} isLoading={status.isProcessing} className="w-full sm:w-auto">
                         {activeTool === ToolType.MERGE && 'ترکیب فایل‌های PDF'}
                         {activeTool === ToolType.SPLIT && 'جدا کردن'}
                         {activeTool === ToolType.ROTATE && 'چرخاندن'}
                         {activeTool === ToolType.EXTRACT_TEXT && 'استخراج متن'}
                         {activeTool === ToolType.WATERMARK && 'اعمال واترمارک'}
                         {activeTool === ToolType.IMAGES_TO_PDF && 'تبدیل به PDF'}
                         {activeTool === ToolType.PDF_TO_IMAGES && 'تبدیل به تصاویر'}
                         {activeTool === ToolType.COMPRESS && 'کاهش حجم'}
                         {activeTool === ToolType.PAGE_NUMBERS && 'افزودن شماره'}
                         {activeTool === ToolType.TEXT_TO_PDF && 'تبدیل به PDF'}
                      </Button>
                   </div>
                )}
              </>
            )}

            {/* Error Message */}
            {status.error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
                 <X className="w-5 h-5 ml-2" />
                 {status.error}
              </div>
            )}

            {/* Success Result */}
            {status.success && (
               <div>
                  {activeTool === ToolType.EXTRACT_TEXT ? (
                     <div className="animate-fade-in">
                        <label className="block text-sm font-medium text-gray-700 mb-2">متن استخراج شده:</label>
                        <textarea 
                           className="w-full h-64 p-4 border border-gray-300 rounded-lg bg-white mb-4 focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed text-gray-900 direction-rtl"
                           value={extractedText}
                           readOnly
                           dir="rtl"
                        />
                        <div className="flex gap-3">
                           <Button onClick={() => downloadResult('text.txt')}>دانلود متن (.txt)</Button>
                           <Button onClick={() => {navigator.clipboard.writeText(extractedText)}} variant="secondary">کپی در کلیپ‌بورد</Button>
                           <Button onClick={resetTool} variant="ghost">شروع مجدد</Button>
                        </div>
                     </div>
                  ) : (
                     <ResultCard 
                        onDownload={() => downloadResult(getFileName())}
                        onReset={resetTool}
                        fileName={getFileName()}
                        canShare={!!navigator.share}
                        onShare={handleShare}
                     />
                  )}
               </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-12 flex flex-col">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer" onClick={() => setActiveTool(ToolType.HOME)}>
              <div className="bg-blue-600 p-1.5 rounded-lg ml-2">
                 <FileOutput className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tighter">FarsPDF</span>
            </div>
            <div className="flex items-center gap-4">
                {/* Links removed as requested */}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto mt-8 flex-grow w-full">
        {activeTool === ToolType.HOME ? renderHome() : renderToolInterface()}
      </main>
      
      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 pt-8 pb-8 text-center bg-white">
         <p className="text-gray-500 text-sm mb-2 font-bold">با عشق shadowk</p>
         <p className="text-gray-400 text-xs">امنیت شما اولویت ماست. فایل‌ها هرگز از دستگاه شما خارج نمی‌شوند.</p>
      </footer>
    </div>
  );
}

export default App;
