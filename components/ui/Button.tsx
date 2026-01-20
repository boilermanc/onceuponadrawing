
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl";
  
  const variants = {
    primary: "bg-pacific-cyan text-white shadow-lg shadow-pacific-cyan/30 hover:scale-105 border-b-4 border-blue-slate",
    secondary: "bg-soft-gold text-gunmetal shadow-lg shadow-soft-gold/30 hover:scale-105 border-b-4 border-gunmetal",
    outline: "border-4 border-silver text-gunmetal hover:border-pacific-cyan bg-white",
    ghost: "text-blue-slate hover:bg-silver/10"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-10 py-4 text-lg",
    xl: "px-12 py-5 text-xl"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
