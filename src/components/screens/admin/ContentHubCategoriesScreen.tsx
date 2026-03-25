import React from 'react';
import { CategoryTaxonomyManager } from './CategoryTaxonomyManager';
import { FolderTree } from 'lucide-react';

interface ContentHubCategoriesScreenProps {
  onBackToHub?: () => void;
}

/**
 * CMS entry point for category / subcategory CRUD.
 * Backed by the same customer admin category API used elsewhere (`catalogApi.fetchCategories`).
 */
export function ContentHubCategoriesScreen(_props: ContentHubCategoriesScreenProps) {
  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#f4f4f5] flex items-center justify-center">
              <FolderTree size={22} className="text-[#52525b]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#18181b]">Categories &amp; Subcategories</h1>
              <p className="text-sm text-[#71717a] mt-0.5 max-w-2xl">
                Maintain the product taxonomy here (full CRUD).{' '}
                <span className="font-medium text-[#52525b]">Products Introduction</span> loads these same records for
                category and subcategory fields.
              </p>
            </div>
          </div>
        </div>
      </div>

      <CategoryTaxonomyManager showInlineRefresh />
    </div>
  );
}
