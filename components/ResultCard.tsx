import React from 'react';
import { Download, CheckCircle, ArrowRight, Share2 } from 'lucide-react';
import Button from './Button';

interface ResultCardProps {
  onDownload: () => void;
  onShare?: () => void;
  onReset: () => void;
  fileName?: string;
  canShare?: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({ onDownload, onShare, onReset, fileName, canShare }) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center animate-fade-in">
      <div className="flex justify-center mb-4">
        <CheckCircle className="w-12 h-12 text-green-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">عملیات با موفقیت انجام شد!</h3>
      <p className="text-gray-600 mb-6">
        فایل پردازش شده {fileName ? `(${fileName})` : ''} آماده است.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onDownload} variant="primary" className="bg-green-600 hover:bg-green-700">
          <Download className="ml-2 w-4 h-4" />
          دانلود فایل
        </Button>
        
        {canShare && onShare && (
           <Button onClick={onShare} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
             <Share2 className="ml-2 w-4 h-4" />
             اشتراک‌گذاری
           </Button>
        )}

        <Button onClick={onReset} variant="ghost">
          <ArrowRight className="ml-2 w-4 h-4" />
          بازگشت به ابزارها
        </Button>
      </div>
    </div>
  );
};

export default ResultCard;