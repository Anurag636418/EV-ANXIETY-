"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { searchPlaces } from "@/lib/api";
import type { Place } from "@/lib/types";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type PlaceSearchProps = {
  label: string;
  placeholder?: string;
  onPlaceSelect: (place: Place | null) => void;
  selectedPlace: Place | null;
  name: string;
};

function formatShortName(displayName: string): string {
  return displayName
    .split(",")
    .slice(0, 2)
    .map((s) => s.trim())
    .join(", ");
}

export function PlaceSearch({
  label,
  placeholder,
  onPlaceSelect,
  selectedPlace,
  name,
}: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Responsive 300ms debounce instead of 1000ms
  const debouncedQuery = useDebounce(query, 300);

  // Sync display string if selectedPlace changes from outside or from selection
  useEffect(() => {
    if (selectedPlace) {
      setQuery(formatShortName(selectedPlace.display_name));
    } else {
      setQuery("");
    }
  }, [selectedPlace]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch results when debounced query changes
  useEffect(() => {
    // If the query matches the currently selected place, don't search again
    if (
      selectedPlace &&
      (debouncedQuery === selectedPlace.display_name ||
        debouncedQuery === formatShortName(selectedPlace.display_name))
    ) {
      return;
    }

    if (debouncedQuery.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);

    searchPlaces(debouncedQuery, abortController.signal)
      .then((data) => {
        setResults(data);
        setIsOpen(true);
        setSelectedIndex(-1);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Place search error:", err);
          setResults([]);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [debouncedQuery, selectedPlace]);

  const handleSelect = (place: Place) => {
    setQuery(formatShortName(place.display_name));
    setIsOpen(false);
    onPlaceSelect(place);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (selectedPlace) {
      // If user starts typing, clear the actual selection
      onPlaceSelect(null);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onPlaceSelect(null);
    inputRef.current?.focus();
  };

  const inputId = `${name}-search-input`;

  return (
    <div className="relative" ref={containerRef}>
      <label htmlFor={inputId} className="block">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="relative mt-1">
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            name={name}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            placeholder={placeholder}
            className={`h-11 w-full rounded-lg border bg-white pl-3 pr-9 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 ${
              selectedPlace
                ? "border-emerald-500 bg-emerald-50/30"
                : "border-slate-300"
            }`}
            autoComplete="off"
            suppressHydrationWarning={true}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={`${name}-listbox`}
            aria-activedescendant={
              selectedIndex >= 0 ? `${name}-option-${selectedIndex}` : undefined
            }
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"></div>
            </div>
          )}
          {!isLoading && query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={`Clear ${label}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          {selectedPlace && !isLoading && (
            <div className="absolute right-9 top-1/2 -translate-y-1/2 text-emerald-600">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>
      </label>

      {/* Dropdown with results */}
      {isOpen && results.length > 0 && (
        <ul
          id={`${name}-listbox`}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.map((place, index) => {
            const isActive = index === selectedIndex;
            const locationParts = [
              place.city,
              place.state,
              place.country,
            ].filter(Boolean);

            return (
              <li
                id={`${name}-option-${index}`}
                role="option"
                aria-selected={isActive}
                key={place.osm_id || index}
                onClick={() => handleSelect(place)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`cursor-pointer px-4 py-2.5 text-sm transition-colors flex items-start gap-2.5 ${
                  isActive ? "bg-emerald-50" : "hover:bg-slate-50"
                }`}
              >
                <span
                  className="text-emerald-600 mt-0.5 text-base"
                  aria-hidden="true"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className={`font-medium truncate ${
                      isActive ? "text-emerald-900" : "text-slate-900"
                    }`}
                  >
                    {place.display_name.split(",")[0]}
                  </span>
                  <span
                    className={`text-xs truncate mt-0.5 ${
                      isActive ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {locationParts.join(", ")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* No results indicator */}
      {isOpen &&
        results.length === 0 &&
        !isLoading &&
        debouncedQuery.trim().length >= 3 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white py-3 px-4 shadow-lg text-sm text-slate-500">
            No places found for &quot;{debouncedQuery}&quot;
          </div>
        )}
    </div>
  );
}
