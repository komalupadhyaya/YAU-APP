import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { TextField, styled } from '@mui/material';


const CustomDatePicker = ({
    label,
    value,
    onChange,
    placeholder = "mm-dd-yyyy",
    required = false,
    disabled = false,
    minDate = null,
    maxDate = null,
    className = "",
    error = null,
    helperText = null,
    format = "MM-DD-YYYY",
    textpadding = "11px" // Default padding
}) => {
    const formatValueToDate = (val) => {
        if (!val) return null;
        if (dayjs.isDayjs(val)) return val;

        if (typeof val === 'string' && val.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const [month, day, year] = val.split('-');
            return dayjs(`${year}-${month}-${day}`);
        }

        const parsed = dayjs(val);
        return parsed.isValid() ? parsed : null;
    };

    const formatDateToValue = (date) => {
        if (!date || !dayjs.isDayjs(date) || !date.isValid()) return '';
        return date.format('MM-DD-YYYY');
    };

    const handleDateChange = (newDate) => {
        console.log('DatePicker onChange called with:', newDate);
        const formattedValue = formatDateToValue(newDate);
        console.log('Formatted value:', formattedValue);
        onChange(formattedValue);
    };

    const dateValue = formatValueToDate(value);

    // Create the styled component with the textpadding prop
    const StyledTextField = styled(TextField)(({ theme, error, disabled }) => ({
        width: '100%',
        '& .MuiOutlinedInput-root': {
            padding: '0',
            borderRadius: '12px',
            border: `2px solid ${error ? '#fca5a5' : '#e5e7eb'}`,
            backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
            fontSize: '14px',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s ease-in-out',
            cursor: 'pointer',

            '&:hover': {
                borderColor: error ? '#f87171' : '#d1d5db',
            },

            '&.Mui-focused': {
                borderColor: error ? '#ef4444' : '#3b82f6',
                boxShadow: 'none',
            },

            '& fieldset': {
                border: 'none',
            },

            '&.Mui-disabled': {
                backgroundColor: '#f3f4f6',
                opacity: '0.5',
                cursor: 'not-allowed',
            },
        },

        '& .MuiOutlinedInput-input': {
            padding: `${textpadding} !important`,
            paddingRight: '40px !important',
            fontSize: '14px',
            fontFamily: 'inherit',
            color: disabled ? '#9ca3af' : '#111827',
            cursor: 'pointer',

            '&::placeholder': {
                color: '#9ca3af',
                opacity: 1,
            },
        },

        '& .MuiInputAdornment-root': {
            position: 'absolute',
            right: '12px',
            color: disabled ? '#9ca3af' : '#6b7280',
            pointerEvents: 'auto',
            margin: '0',

            '& .MuiIconButton-root': {
                position: 'static',
                transform: 'none',
                padding: '4px',
                color: 'inherit',
                cursor: 'pointer',
                pointerEvents: 'auto',

                '&:hover': {
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                },
            },
        },
    }));

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className={`w-full ${className}`}>
                {label && (
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}

                <div className="relative">
                    <DatePicker
                        label=""
                        value={dateValue}
                        onChange={handleDateChange}
                        format={format}
                        disabled={disabled}
                        className="w-full"
                        enableAccessibleFieldDOMStructure={false}
                        slots={{
                            textField: StyledTextField, // Use the properly styled component
                        }}
                        slotProps={{
                            textField: {
                                placeholder: placeholder,
                                error: !!error,
                                fullWidth: true,
                                variant: "outlined",
                                disabled: disabled,
                                inputProps: {
                                    style: { cursor: 'pointer' }
                                },
                                InputProps: {
                                    style: { cursor: 'pointer' }
                                }
                            },
                            // ... rest of your popper styling remains the same
                            popper: {
                                sx: {
                                    zIndex: 9999,
                                    // ... keep all your existing popper styles
                                }
                            },
                        }}
                    />
                </div>

                {error && (
                    <div className="mt-2 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                )}

                {helperText && !error && (
                    <p className="mt-2 text-sm text-gray-500">{helperText}</p>
                )}

                {value && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg border border-blue-200">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Selected: {value}
                    </div>
                )}
            </div>
        </LocalizationProvider>
    );
};

export default CustomDatePicker;