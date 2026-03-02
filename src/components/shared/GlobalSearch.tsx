import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, ArrowRight } from 'lucide-react';
import { globalSearch, getSearchSuggestions, getRecentSearches, GlobalSearchResult } from '../../api/shared/globalSearchApi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

interface GlobalSearchProps {
  onResultClick?: (item: any) => void;
  placeholder?: string;
}

export function GlobalSearch({ onResultClick, placeholder = 'Search across all modules...' }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      const timer = setTimeout(() => {
        performSearch();
        loadSuggestions();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults(null);
      setSuggestions([]);
    }
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadRecentSearches = async () => {
    try {
      const recent = await getRecentSearches();
      setRecentSearches(recent);
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const performSearch = async () => {
    if (query.length < 2) return;

    setLoading(true);
    try {
      const searchResults = await globalSearch(query);
      setResults(searchResults);
      setIsOpen(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (query.length < 2) return;

    try {
      const sugg = await getSearchSuggestions(query);
      setSuggestions(sugg.map((s) => s.text));
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleResultClick = (item: any) => {
    if (onResultClick) {
      onResultClick(item);
    }
    setIsOpen(false);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      order: 'bg-blue-100 text-blue-800',
      product: 'bg-green-100 text-green-800',
      user: 'bg-purple-100 text-purple-800',
      vendor: 'bg-orange-100 text-orange-800',
      rider: 'bg-yellow-100 text-yellow-800',
      inventory: 'bg-cyan-100 text-cyan-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {isOpen && (
        <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {loading && (
              <div className="p-4 text-center text-gray-500">Searching...</div>
            )}

            {!loading && query.length < 2 && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock size={14} /> Recent Searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setQuery(search);
                        performSearch();
                      }}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!loading && suggestions.length > 0 && query.length >= 2 && (
              <div className="p-4 border-b">
                <div className="text-sm font-medium text-gray-700 mb-2">Suggestions</div>
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-2 hover:bg-gray-50 cursor-pointer rounded flex items-center justify-between"
                    onClick={() => {
                      setQuery(suggestion);
                      performSearch();
                    }}
                  >
                    <span className="text-sm">{suggestion}</span>
                    <ArrowRight size={14} className="text-gray-400" />
                  </div>
                ))}
              </div>
            )}

            {!loading && results && results.total > 0 && (
              <div className="p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">
                  Found {results.total} results in {results.took}ms
                </div>

                {Object.entries(results.results).map(([type, items]) => {
                  if (items.length === 0) return null;

                  return (
                    <div key={type} className="mb-4">
                      <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                        {type} ({items.length})
                      </div>
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 hover:bg-gray-50 cursor-pointer rounded border-b last:border-b-0"
                          onClick={() => handleResultClick(item)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{item.title}</span>
                                <Badge className={getTypeColor(item.type)} variant="outline">
                                  {item.type}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500">{item.subtitle}</div>
                              {item.metadata && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {Object.entries(item.metadata)
                                    .slice(0, 2)
                                    .map(([key, value]) => (
                                      <span key={key} className="mr-3">
                                        {key}: {String(value)}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                            <ArrowRight size={14} className="text-gray-400 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && results && results.total === 0 && query.length >= 2 && (
              <div className="p-8 text-center text-gray-500">
                <div className="mb-2">No results found for "{query}"</div>
                <div className="text-sm">Try a different search term</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
