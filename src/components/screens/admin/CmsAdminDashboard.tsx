import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fetchCmsOverview,
  uploadSkuMaster,
  uploadCmsPages,
  type AdminCmsOverview,
  type AdminCmsUploadResult,
} from '@/api/cmsAdminApi';
import { CmsPagesScreen } from './CmsPagesScreen';
import { CollectionsScreen } from './CollectionsScreen';
import { HomeConfigScreen } from './HomeConfigScreen';
import { toast } from 'sonner';
import { Loader2, UploadCloud, FileSpreadsheet, BarChart3 } from 'lucide-react';

type CmsTab = 'overview' | 'upload' | 'pages' | 'collections' | 'home-config';

interface UploadState {
  uploading: boolean;
  result: AdminCmsUploadResult | null;
}

export function CmsAdminDashboard() {
  const [tab, setTab] = useState<CmsTab>('overview');
  const [overview, setOverview] = useState<AdminCmsOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overwrite, setOverwrite] = useState(true);
  const [skuUpload, setSkuUpload] = useState<UploadState>({ uploading: false, result: null });
  const [cmsUpload, setCmsUpload] = useState<UploadState>({ uploading: false, result: null });

  useEffect(() => {
    const load = async () => {
      setLoadingOverview(true);
      try {
        const data = await fetchCmsOverview();
        setOverview(data);
      } catch {
        toast.error('Failed to load CMS overview');
      } finally {
        setLoadingOverview(false);
      }
    };
    load();
  }, []);

  const handleUpload = async (
    kind: 'sku' | 'cms',
    file: File | null,
  ) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Only .xlsx files are allowed');
      return;
    }
    const setState = kind === 'sku' ? setSkuUpload : setCmsUpload;
    setState({ uploading: true, result: null });
    try {
      const result =
        kind === 'sku'
          ? await uploadSkuMaster(file, overwrite)
          : await uploadCmsPages(file);
      setState({ uploading: false, result });
      if (result.success) {
        toast.success('Import complete');
      } else {
        toast.error('Import completed with issues');
      }
    } catch (e: any) {
      const msg = e?.message || 'Upload failed';
      setState({
        uploading: false,
        result: { success: false, counts: {}, errors: [{ message: msg }] },
      });
      toast.error(msg);
    }
  };

  const renderUploadResult = (state: UploadState) => {
    if (!state.result) return null;
    const { success, counts, errors } = state.result;
    const errorCount = Array.isArray(errors) ? errors.length : 0;

    return (
      <div className="mt-3 space-y-3">
        <div
          className={
            success
              ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800'
              : 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'
          }
        >
          {success
            ? `Import complete — ${errorCount} issue${errorCount === 1 ? '' : 's'}`
            : `Import finished with ${errorCount} issue${errorCount === 1 ? '' : 's'}`}
        </div>

        {counts && Object.keys(counts).length > 0 && (
          <div className="overflow-hidden rounded-md border border-[#e4e4e7] bg-white">
            <div className="flex items-center bg-[#f4f4f5] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#52525b]">
              <span className="flex-1">Sheet</span>
              <span className="w-24 text-right">Records</span>
            </div>
            {Object.entries(counts).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center border-t border-[#f4f4f5] px-3 py-1.5 text-[11px] text-[#18181b]"
              >
                <span className="flex-1 truncate">{key}</span>
                <span className="w-24 text-right font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {Array.isArray(errors) && errors.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <p className="font-semibold mb-1">{errors.length} issue(s):</p>
            <ul className="space-y-0.5">
              {errors.slice(0, 5).map((e, idx) => (
                <li key={idx}>
                  • {e.sheet || 'Sheet'}
                  {e.row ? ` row ${e.row}` : ''}: {e.message}
                </li>
              ))}
              {errors.length > 5 && (
                <li className="italic">+ {errors.length - 5} more…</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const counts = overview?.counts ?? { skus: 0, pages: 0, banners: 0, collections: 0 };
  const issues = overview?.issues ?? {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[#18181b] flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          CMS Admin – Customer App
        </h1>
        <p className="text-sm text-[#71717a]">
          Manage content for the customer app homepage and landing pages. Excel uploads write into the
          same models used by existing Home Config, Collections, and CMS Pages tools.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CmsTab)}>
        <div className="sticky top-0 z-10 -mx-1 mb-4 border-b border-[#e4e4e7] bg-[#fcfcfc] px-1 pt-1 pb-2">
          <TabsList className="bg-[#f4f4f5] p-1 rounded-lg flex flex-wrap gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="upload">Excel Uploads</TabsTrigger>
            <TabsTrigger value="pages">CMS Pages</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="home-config">Home Config</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0">
          <div className="space-y-4">
            {loadingOverview ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-[#71717a]" />
              </div>
            ) : !overview ? (
              <p className="text-sm text-[#71717a]">
                Unable to load overview. Try again later or check API connectivity.
              </p>
            ) : (
              <>
                {(issues.missingPrice || issues.inactiveProducts) && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {issues.missingPrice ? `${issues.missingPrice} products missing price` : ''}
                    {issues.missingPrice && issues.inactiveProducts ? ' · ' : ''}
                    {issues.inactiveProducts
                      ? `${issues.inactiveProducts} products inactive/draft`
                      : ''}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Total SKUs', value: counts.skus, sub: 'From SKU master import' },
                    { label: 'CMS Pages', value: counts.pages, sub: 'Published/draft pages' },
                    { label: 'Banners', value: counts.banners, sub: 'Hero / mid banners' },
                    { label: 'Collections', value: counts.collections, sub: 'Manual / rule-based' },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-xl border border-[#e4e4e7] bg-white px-4 py-3"
                    >
                      <div className="text-xs text-[#71717a]">{m.label}</div>
                      <div className="mt-1 text-2xl font-bold text-[#18181b]">
                        {m.value ?? 0}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#a1a1aa]">{m.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[#e4e4e7] bg-white p-4 space-y-2">
                  <h2 className="text-sm font-semibold text-[#18181b]">Next steps</h2>
                  <p className="text-xs text-[#71717a]">
                    Use the tabs above to upload mastersheets, edit CMS pages (blocks), configure
                    collections, and manage home config. The customer app reads from these models via
                    the bootstrap API.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Button size="sm" variant="outline" onClick={() => setTab('upload')}>
                      Open Excel uploads
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTab('pages')}>
                      Manage CMS pages
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTab('collections')}>
                      Manage collections
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTab('home-config')}>
                      Edit home config
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-0">
          <div className="space-y-4">
            <div className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-xs text-[#1d4ed8]">
              Both mastersheets upload separately. SKU Mastersheet updates products/categories/banners;
              CMS Pages Mastersheet updates pages, embedded blocks, and collections. Imports write into
              the same collections used by the other CMS tools here.
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#e4e4e7] bg-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="h-4 w-4 text-[#18181b]" />
                  <h2 className="text-sm font-semibold text-[#18181b]">
                    1 — SKU Mastersheet (.xlsx)
                  </h2>
                </div>
                <p className="text-xs text-[#71717a] mb-3">
                  Imports products, categories, and hero/mid banners.
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#d4d4d8] px-4 py-6 text-center hover:border-[#a1a1aa]">
                  <UploadCloud className="mb-1 h-6 w-6 text-[#a1a1aa]" />
                  <span className="text-sm font-medium text-[#18181b]">
                    {skuUpload.uploading ? 'Uploading…' : 'Click to choose .xlsx file'}
                  </span>
                  <span className="text-[11px] text-[#71717a]">.xlsx only · Max 20MB</span>
                  <Input
                    type="file"
                    accept=".xlsx"
                    className="mt-2 hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handleUpload('sku', file);
                      // reset so same file can be re-selected
                      e.target.value = '';
                    }}
                    disabled={skuUpload.uploading}
                  />
                </label>
                {skuUpload.uploading && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#71717a]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading…
                  </div>
                )}
                {renderUploadResult(skuUpload)}
              </div>

              <div className="rounded-xl border border-[#e4e4e7] bg-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="h-4 w-4 text-[#18181b]" />
                  <h2 className="text-sm font-semibold text-[#18181b]">
                    2 — CMS Pages Mastersheet (.xlsx)
                  </h2>
                </div>
                <p className="text-xs text-[#71717a] mb-3">
                  Imports CMS pages, page blocks, and collections.
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#d4d4d8] px-4 py-6 text-center hover:border-[#a1a1aa]">
                  <UploadCloud className="mb-1 h-6 w-6 text-[#a1a1aa]" />
                  <span className="text-sm font-medium text-[#18181b]">
                    {cmsUpload.uploading ? 'Uploading…' : 'Click to choose .xlsx file'}
                  </span>
                  <span className="text-[11px] text-[#71717a]">.xlsx only · Max 10MB</span>
                  <Input
                    type="file"
                    accept=".xlsx"
                    className="mt-2 hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handleUpload('cms', file);
                      e.target.value = '';
                    }}
                    disabled={cmsUpload.uploading}
                  />
                </label>
                {cmsUpload.uploading && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#71717a]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading…
                  </div>
                )}
                {renderUploadResult(cmsUpload)}
              </div>
            </div>

            <div className="rounded-xl border border-[#e4e4e7] bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-[#18181b]">Import rules</h2>
              <div className="flex items-center justify-between border-t border-[#f4f4f5] pt-3">
                <div>
                  <p className="text-sm text-[#18181b]">Overwrite existing products</p>
                  <p className="text-xs text-[#71717a]">
                    If the SKU already exists, replace it with new data from the mastersheet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOverwrite((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    overwrite ? 'bg-[#16a34a]' : 'bg-[#e4e4e7]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      overwrite ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                  <span className="sr-only">Toggle overwrite existing products</span>
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pages" className="mt-0">
          <CmsPagesScreen />
        </TabsContent>

        <TabsContent value="collections" className="mt-0">
          <CollectionsScreen />
        </TabsContent>

        <TabsContent value="home-config" className="mt-0">
          <HomeConfigScreen />
        </TabsContent>
      </Tabs>
    </div>
  );
}

