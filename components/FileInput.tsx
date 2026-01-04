import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileInputProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  className?: string;
}

const FileInput: React.FC<FileInputProps> = ({ 
  onFilesSelected, 
  multiple = false, 
  accept = "application/pdf",
  className = ""
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      // Reset value so same file can be selected again if needed
      e.target.value = '';
    }
  };

  return (
    <div 
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-8 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center group ${className}`}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        multiple={multiple}
        accept={accept}
        className="hidden"
      />
      <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
        <Upload className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {multiple ? 'فایل‌های PDF را انتخاب کنید' : 'فایل PDF را انتخاب کنید'}
      </h3>
      <p className="text-sm text-gray-500">
        برای انتخاب فایل کلیک کنید
      </p>
    </div>
  );
};

export default FileInput;