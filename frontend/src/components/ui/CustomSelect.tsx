'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = '선택하세요',
  className,
  disabled = false,
  color = '#3db88a',
  size = 'md',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sizeClasses = {
    sm: 'px-2 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  return (
    <div ref={selectRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full glass-input flex items-center justify-between gap-2',
          sizeClasses[size],
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{ color: 'var(--text-primary)' }}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 transition-transform',
            isOpen && 'rotate-180'
          )}
          style={{ color: 'var(--text-secondary)' }}
        />
      </button>
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 py-1 rounded-xl shadow-lg border overflow-hidden max-h-60 overflow-y-auto"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2 text-left transition-colors flex items-center justify-between',
                sizeClasses[size],
                option.value === value
                  ? 'font-medium'
                  : 'hover:bg-[var(--bg-secondary)]'
              )}
              style={{
                color: option.value === value ? color : 'var(--text-primary)',
                background: option.value === value ? `${color}15` : undefined,
              }}
            >
              <div className="flex flex-col">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {option.description}
                  </span>
                )}
              </div>
              {option.value === value && (
                <Check className="w-4 h-4 shrink-0" style={{ color }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
