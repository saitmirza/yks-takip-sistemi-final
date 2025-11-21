import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  // 3 Saniye sonra otomatik kapan
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />
  };

  const styles = {
    success: 'border-l-4 border-green-500 bg-white',
    error: 'border-l-4 border-red-500 bg-white',
    info: 'border-l-4 border-blue-500 bg-white'
  };

  return (
    <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl toast-enter min-w-[300px] ${styles[type]}`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1 font-medium text-slate-700 text-sm">{message}</div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
        <X size={16} />
      </button>
    </div>
  );
}