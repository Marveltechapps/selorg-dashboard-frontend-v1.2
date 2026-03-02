import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, Clock, Package, Layers } from 'lucide-react';
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Badge } from "../../../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import { Checkbox } from "../../../ui/checkbox";
import { Label } from "../../../ui/label";
import { RadioGroup, RadioGroupItem } from "../../../ui/radio-group";
import { Collection, SKU, CollectionStatus, CollectionType } from './types';

interface SearchFilterBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: FilterState) => void;
  recentSearches: string[];
  allCollections: Collection[];
  allSkus: SKU[];
  onSelectCollection: (col: Collection) => void;
  onSelectSKU: (sku: SKU) => void;
}

export interface FilterState {
  collectionStatus: CollectionStatus | 'All';
  collectionType: CollectionType | 'All';
  skuVisibility: 'All' | 'Visible' | 'Hidden';
}

export function SearchFilterBar({ 
  onSearch, 
  onFilterChange, 
  recentSearches, 
  allCollections, 
  allSkus,
  onSelectCollection,
  onSelectSKU
}: SearchFilterBarProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    collectionStatus: 'All',
    collectionType: 'All',
    skuVisibility: 'All'
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCollections = query ? allCollections.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 3) : [];

  const filteredSkus = query ? allSkus.filter(s => 
    s.name.toLowerCase().includes(query.toLowerCase()) || 
    s.code.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3) : [];

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-[#E0E0E0] mb-6 relative z-30">
      <div className="relative flex-1" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
        <Input 
          type="text" 
          placeholder="Search SKUs, collections, tags..." 
          className="w-full pl-9 pr-4 bg-[#F5F5F5] border-transparent focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-0"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
        />
        
        {/* Autocomplete Dropdown */}
        {showSuggestions && (query || recentSearches.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-[#E0E0E0] shadow-lg overflow-hidden z-50">
            {query === '' && recentSearches.length > 0 && (
              <div className="p-2">
                <h4 className="text-xs font-semibold text-[#9E9E9E] px-2 py-1 uppercase">Recent</h4>
                {recentSearches.map((s, i) => (
                  <button key={i} className="w-full text-left flex items-center gap-2 px-2 py-2 hover:bg-[#F5F5F5] rounded text-sm text-[#616161]" onClick={() => setQuery(s)}>
                    <Clock size={14} />
                    {s}
                  </button>
                ))}
              </div>
            )}

            {query !== '' && (
              <>
                {filteredCollections.length > 0 && (
                  <div className="p-2 border-b border-[#E0E0E0]">
                    <h4 className="text-xs font-semibold text-[#9E9E9E] px-2 py-1 uppercase flex items-center gap-2">
                      <Layers size={12} /> Collections
                    </h4>
                    {filteredCollections.map(col => (
                      <div 
                        key={col.id} 
                        className="flex items-center justify-between px-2 py-2 hover:bg-[#F5F5F5] rounded cursor-pointer group"
                        onClick={() => {
                          onSelectCollection(col);
                          setShowSuggestions(false);
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium text-[#212121] group-hover:text-[#7C3AED]">{col.name}</p>
                          <p className="text-xs text-[#757575]">{col.skus.length} SKUs • {col.type}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${
                          col.status === 'Live' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600'
                        }`}>{col.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {filteredSkus.length > 0 && (
                  <div className="p-2">
                     <h4 className="text-xs font-semibold text-[#9E9E9E] px-2 py-1 uppercase flex items-center gap-2">
                      <Package size={12} /> SKUs
                    </h4>
                    {filteredSkus.map(sku => (
                      <div 
                        key={sku.id} 
                        className="flex items-center justify-between px-2 py-2 hover:bg-[#F5F5F5] rounded cursor-pointer group"
                        onClick={() => {
                          onSelectSKU(sku);
                          setShowSuggestions(false);
                        }}
                      >
                         <div>
                          <p className="text-sm font-medium text-[#212121] group-hover:text-[#7C3AED]">{sku.name}</p>
                          <p className="text-xs text-[#757575]">{sku.code}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {filteredCollections.length === 0 && filteredSkus.length === 0 && (
                  <div className="p-4 text-center text-sm text-[#9E9E9E]">No results found</div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 text-[#757575]">
            <Filter size={16} /> Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Collection Status</h4>
              <div className="flex flex-wrap gap-2">
                {['All', 'Live', 'Draft', 'Archived'].map(status => (
                   <Badge 
                    key={status} 
                    variant={filters.collectionStatus === status ? 'default' : 'outline'}
                    className={`cursor-pointer ${filters.collectionStatus === status ? 'bg-[#7C3AED] hover:bg-[#6D28D9]' : 'hover:bg-[#F5F5F5]'}`}
                    onClick={() => handleFilterChange('collectionStatus', status)}
                   >
                     {status}
                   </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Collection Type</h4>
              <div className="grid grid-cols-2 gap-2">
                {['Seasonal', 'Thematic', 'Bundle/Combo', 'Brand'].map(type => (
                   <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`type-${type}`} 
                        checked={filters.collectionType === type}
                        onCheckedChange={(checked) => handleFilterChange('collectionType', checked ? type : 'All')}
                      />
                      <label
                        htmlFor={`type-${type}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {type}
                      </label>
                    </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">SKU Visibility</h4>
               <RadioGroup value={filters.skuVisibility} onValueChange={(val) => handleFilterChange('skuVisibility', val)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="All" id="vis-all" />
                    <Label htmlFor="vis-all">All</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Visible" id="vis-visible" />
                    <Label htmlFor="vis-visible">Visible only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Hidden" id="vis-hidden" />
                    <Label htmlFor="vis-hidden">Hidden only</Label>
                  </div>
                </RadioGroup>
            </div>
            
             <Button 
              variant="ghost" 
              className="w-full text-xs text-[#7C3AED]"
              onClick={() => {
                const reset = { collectionStatus: 'All', collectionType: 'All', skuVisibility: 'All' } as FilterState;
                setFilters(reset);
                onFilterChange(reset);
              }}
            >
              Reset Filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
