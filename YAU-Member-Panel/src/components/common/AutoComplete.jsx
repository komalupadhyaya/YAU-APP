import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export const Autocomplete = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option...',
  label = '',
  required = false,
  multiple = false,
  disabled = false,
  allowCustomInput = false,
  getOptionLabel = (option) => (typeof option === 'string' ? option : option.label || option.name || option),
  getOptionValue = (option) => (typeof option === 'string' ? option : option.id || option),
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const wrapperRef = useRef(null);

  // Initialize input value with current selection
  useEffect(() => {
    if (!multiple && value) {
      if (allowCustomInput) {
        // For custom input, check if value matches any option
        const selectedOption = options.find(opt => getOptionValue(opt) === value);
        setInputValue(selectedOption ? getOptionLabel(selectedOption) : value);
      } else {
        const selectedOption = options.find(opt => getOptionValue(opt) === value);
        setInputValue(selectedOption ? getOptionLabel(selectedOption) : '');
      }
    } else if (!value) {
      setInputValue('');
    }
  }, [value, options, allowCustomInput, multiple, getOptionLabel, getOptionValue]);

  // Filter options based on input
  useEffect(() => {
    setFilteredOptions(
      options.filter((option) =>
        getOptionLabel(option).toLowerCase().includes(inputValue.toLowerCase())
      )
    );
  }, [inputValue, options, getOptionLabel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // For custom input, save the typed value
        if (allowCustomInput && !multiple && inputValue.trim() && inputValue !== value) {
          onChange(inputValue.trim());
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [allowCustomInput, inputValue, multiple, onChange, value]);

  const handleSelect = (option) => {
    if (multiple) {
      const newValue = Array.isArray(value) ? [...value] : [];
      const optionValue = getOptionValue(option);
      if (!newValue.includes(optionValue)) {
        onChange([...newValue, optionValue]);
      }
    } else {
      const selectedValue = getOptionValue(option);
      const selectedLabel = getOptionLabel(option);
      onChange(selectedValue);
      setInputValue(selectedLabel);
      setIsOpen(false);
    }
  };

  const handleRemove = (valToRemove) => {
    if (multiple) {
      onChange(value.filter((val) => val !== valToRemove));
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    
    // For custom input mode, update the value in real-time
    if (allowCustomInput && !multiple) {
      onChange(newValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (allowCustomInput && inputValue.trim()) {
        onChange(inputValue.trim());
        setIsOpen(false);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      }
    }
  };

  const handleClear = () => {
    setInputValue('');
    if (!multiple) {
      onChange('');
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay to allow click on dropdown options
            setTimeout(() => {
              if (allowCustomInput && !multiple && inputValue.trim() && inputValue !== value) {
                onChange(inputValue.trim());
              }
            }, 150);
          }}
          placeholder={multiple && value.length > 0 ? '' : placeholder}
          className="w-full p-3 pl-10 pr-10 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={disabled}
        />
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        {(inputValue || (multiple && value.length > 0)) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Help text for custom input */}
      {allowCustomInput && (
        <p className="mt-1 text-xs text-gray-500">
          Type to search options or enter custom text
        </p>
      )}

      {/* Selected Values (for multiple selection) */}
      {multiple && Array.isArray(value) && value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((val) => {
            const selectedOption = options.find(
              (opt) => getOptionValue(opt) === val
            );
            return (
              <div
                key={val}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"
              >
                {selectedOption ? getOptionLabel(selectedOption) : val}
                <button
                  type="button"
                  onClick={() => handleRemove(val)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => handleSelect(option)}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
              >
                {getOptionLabel(option)}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              {allowCustomInput ? (
                inputValue.trim() ? (
                  <span>No matching options found. Press Enter to use "<strong>{inputValue}</strong>"</span>
                ) : (
                  <span>Type to search or enter custom text</span>
                )
              ) : (
                <span>No options found</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};