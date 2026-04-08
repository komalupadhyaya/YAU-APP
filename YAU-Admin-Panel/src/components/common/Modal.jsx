import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`
        relative bg-white rounded-2xl w-full ${sizes[size]} 
        max-h-[90vh] overflow-y-auto
        mx-4 shadow-2xl
        animate-in slide-in-from-bottom-4 duration-300
      `}>
        {/* Modal Header - Sticky on mobile */}
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 border-b border-gray-100">
          <div className="flex justify-between items-center p-4 lg:p-6">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-800 truncate pr-4">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Modal Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;