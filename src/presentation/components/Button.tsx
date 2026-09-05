import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading,
  variant = 'primary',
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'w-full py-2.5 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500 disabled:bg-slate-300 disabled:cursor-not-allowed',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300 disabled:cursor-not-allowed',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          جاري التحميل...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
