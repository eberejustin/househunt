import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, MapPin } from 'lucide-react';

interface AutocompleteOption {
  id: string;
  displayName: string;
  customLabel: string;
}

interface AutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onOptionSelect: (option: AutocompleteOption) => void;
  onSearch: (query: string, callback: (options: AutocompleteOption[]) => void, errorCallback: (error: Error) => void) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

export function Autocomplete({
  value,
  onValueChange,
  onOptionSelect,
  onSearch,
  placeholder = "Search addresses...",
  className,
  disabled,
  'data-testid': testId,
}: AutocompleteProps) {
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Handle input changes
  const handleInputChange = (newValue: string) => {
    onValueChange(newValue);
    setError(null);

    if (newValue.trim().length < 3) {
      setOptions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    onSearch(
      newValue,
      (results) => {
        setOptions(results);
        setIsLoading(false);
        setHighlightedIndex(-1);
      },
      (searchError) => {
        setError(searchError.message);
        setOptions([]);
        setIsLoading(false);
        setHighlightedIndex(-1);
      }
    );
  };

  // Handle option selection
  const selectOption = (option: AutocompleteOption) => {
    onOptionSelect(option);
    setIsOpen(false);
    setOptions([]);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || options.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          selectOption(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputRef.current && 
        !inputRef.current.contains(target) &&
        optionsRef.current &&
        !optionsRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current) {
      const highlightedElement = optionsRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (options.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        data-testid={testId}
      />

      {isOpen && (
        <Card 
          ref={optionsRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto border shadow-lg bg-white"
        >
          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-neutral-600">Searching addresses...</span>
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-600 border-b">
              {error}
            </div>
          )}

          {!isLoading && !error && options.length === 0 && value.trim().length >= 3 && (
            <div className="p-4 text-sm text-neutral-600 text-center">
              No addresses found. Try a different search.
            </div>
          )}

          {!isLoading && options.length > 0 && (
            <div>
              {options.map((option, index) => (
                <div
                  key={option.id}
                  className={`p-3 cursor-pointer border-b last:border-b-0 hover:bg-neutral-50 ${
                    index === highlightedIndex ? 'bg-neutral-100' : ''
                  }`}
                  onClick={() => selectOption(option)}
                  data-testid={`autocomplete-option-${index}`}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-neutral-900 truncate">
                        {option.customLabel}
                      </div>
                      <div className="text-xs text-neutral-600 truncate">
                        {option.displayName}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Attribution for OpenStreetMap */}
          {!isLoading && options.length > 0 && (
            <div className="p-2 text-xs text-neutral-500 bg-neutral-50 border-t">
              Powered by OpenStreetMap
            </div>
          )}
        </Card>
      )}
    </div>
  );
}