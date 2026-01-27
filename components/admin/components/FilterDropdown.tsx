import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  multiple = false,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const displayLabel = selectedValues.length > 0
    ? `${label}: ${selectedValues.length}`
    : label;

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const current = selectedValues;
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      onChange(next);
    } else {
      onChange(optionValue === value ? '' : optionValue);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md transition-colors ${
          selectedValues.length > 0
            ? 'border-slate-300 bg-slate-50 text-slate-900'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        {displayLabel}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50 py-1">
          {options.map((opt) => {
            const isSelected = selectedValues.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
              >
                {multiple && (
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                  }`}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </span>
                )}
                {!multiple && isSelected && <Check size={14} className="text-slate-900" />}
                {!multiple && !isSelected && <span className="w-3.5" />}
                {opt.label}
              </button>
            );
          })}
          {selectedValues.length > 0 && (
            <>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => { onChange(multiple ? [] : ''); setOpen(false); }}
                className="w-full px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 text-left"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
