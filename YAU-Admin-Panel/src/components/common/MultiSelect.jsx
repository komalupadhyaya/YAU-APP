import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';

const MultiSelect = ({ 
  options = [], 
  value = [], 
  onChange, 
  placeholder = 'Select options...', 
  className = '',
  searchable = true 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = options.filter(option => {
    const label = option.label || option;
    return label?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleOption = (optionValue) => {
    const option = typeof optionValue === 'string' ? { value: optionValue, label: optionValue } : optionValue;
    setSearchTerm('');
    onChange?.(value.includes(option.value)
      ? value.filter(val => val !== option.value)
      : [...value, option.value]
    );
  };

  const removeTag = (optionValue) => {
    onChange?.(value.filter(val => val !== optionValue));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHoveredIndex((prev) => (prev + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHoveredIndex((prev) => prev === -1 ? filteredOptions.length - 1 : (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter' && hoveredIndex >= 0) {
      e.preventDefault();
      toggleOption(filteredOptions[hoveredIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = value.map(val => {
    const option = options.find(opt => (opt.value || opt) === val);
    return option?.label || option || val;
  }).join(', ');

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Main Input/Container */}
      <div 
        className="w-full p-3 border-2 border-gray-200 rounded-xl focus-within:border-primary-500 focus-within:outline-none min-h-[56px] cursor-pointer hover:border-primary-300 transition-all duration-200 flex flex-wrap items-center gap-1.5"
        onClick={() => setIsOpen(true)}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Selected Tags */}
        {value.length > 0 ? (
          value.slice(0, 3).map((val, index) => {
            const label = displayValue.split(', ')[index];
            return (
              <div key={val} className="inline-flex items-center bg-blue-400/10 border border-blue-600/50 text-yellow-900 px-2.5 py-1 rounded-full text-sm font-medium max-w-[120px] truncate">
                {label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(val);
                  }}
                  className="ml-1 hover:bg-yellow-600 hover:text-white rounded-full p-0.5 -mr-0.5 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })
        ) : (
          <span className="text-black text-md select-none">{placeholder}</span>
        )}
        {value.length > 3 && (
          <span className="text-xs text-yellow-800/50">+{value.length - 3} more</span>
        )}
        <div className="ml-auto flex items-center">
          {searchable && isOpen && (
            <Search size={16} className="text-yellow-800/50 mr-1" />
          )}
          {isOpen ? (
            <ChevronUp size={18} className="text-yellow-800/70" />
          ) : (
            <ChevronDown size={18} className="text-yellow-800/70" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-auto">
          {/* Search Input */}
          {searchable && (
            <div className="sticky top-0 bg-white p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search grades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  autoFocus
                />
              </div>
            </div>
          )}
          
          {/* Options */}
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const optionValue = option.value || option;
                const optionLabel = option.label || option || optionValue;
                const isSelected = value.includes(optionValue);
                const isHovered = hoveredIndex === index;
                
                return (
                  <div
                    key={optionValue}
                    onClick={() => toggleOption(optionValue)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    className={`px-4 py-3 text-sm cursor-pointer transition-colors flex items-center gap-3 hover:bg-primary-50 ${
                      isSelected 
                        ? 'bg-primary-100 border-r-4 border-primary-500 text-primary-900 font-medium' 
                        : isHovered 
                          ? 'bg-gray-50 text-gray-900' 
                          : 'text-gray-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected 
                        ? 'border-primary-500 bg-primary-500 text-white shadow-sm' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && '✓'}
                    </div>
                    <span className="truncate">{optionLabel}</span>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No grades found
              </div>
            )}
          </div>
          
          {/* Selected Count Footer */}
          {value.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
              {value.length} grade{value.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;

