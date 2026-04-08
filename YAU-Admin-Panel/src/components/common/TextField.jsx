import React from 'react';

const TextField = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error = null,
  className = "",
  ...props
}) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        type={type}
        className='w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors'
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};

export default TextField;