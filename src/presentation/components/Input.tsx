import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  id,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full text-right" dir="rtl">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-md text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-800 ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200'
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="block mt-1 text-xs text-red-600 font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
