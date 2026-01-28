import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import SearchInput from '../components/SearchInput';

interface Creation {
  id: string;
  title: string;
  artist_name: string;
  age: string | null;
  page_images?: string[];
  is_featured?: boolean;
  featured_at?: string;
  featured_thumbnail_url?: string;
  featured_page_url?: string;
  featured_pages?: { url: string; text: string }[];
  thumbnail_url?: string;
  analysis_json?: {
    pages?: { text: string; imageUrl?: string }[];
  };
  created_at: string;
}

type SortField = 'created_at' | 'title' | 'artist_name';

const Gallery: React.FC = () => {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featureLoading, setFeatureLoading] = useState<string | null>(null);
  const [featureMessage, setFeatureMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchCreations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('creations')
        .select('*, is_featured, featured_at, featured_thumbnail_url, featured_page_url, featured_pages, analysis_json')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const withThumbnails = (data || []).map((creation) => {
        if (creation.page_images && creation.page_images.length > 0) {
          const { data: { publicUrl } } = supabase.storage
            .from('outputs')
            .getPublicUrl(creation.page_images[0]);
          return { ...creation, thumbnail_url: publicUrl };
        }
        return creation;
      });

      setCreations(withThumbnails);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch creations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreations();
  }, [fetchCreations]);

  const handleFeature = async (creation: Creation) => {
    setFeatureLoading(creation.id);
    setFeatureMessage(null);
    await new Promise((r) => setTimeout(r, 50));

    try {
      if (!creation.page_images || creation.page_images.length === 0) {
        throw new Error('No page images available for this creation');
      }

      const pagesToUpload = creation.page_images.slice(0, 4);
      const featuredPages: { url: string; text: string }[] = [];

      for (let i = 0; i < pagesToUpload.length; i++) {
        const pagePath = pagesToUpload[i];
        try {
          const { data: imageData, error: downloadError } = await supabase.storage
            .from('page-images')
            .download(pagePath);

          if (downloadError || !imageData) continue;

          const fileName = `${creation.id}-page-${i}.webp`;
          const { error: uploadError } = await supabase.storage
            .from('public-gallery')
            .upload(fileName, imageData, {
              contentType: imageData.type || 'image/webp',
              upsert: true,
            });

          if (uploadError) continue;

          const { data: { publicUrl } } = supabase.storage
            .from('public-gallery')
            .getPublicUrl(fileName);

          const pageText = creation.analysis_json?.pages?.[i]?.text || '';
          featuredPages.push({ url: publicUrl, text: pageText });
        } catch {
          continue;
        }
      }

      if (featuredPages.length === 0) {
        throw new Error('Failed to upload any page images');
      }

      const { error: updateError } = await supabase
        .from('creations')
        .update({
          is_featured: true,
          featured_at: new Date().toISOString(),
          featured_thumbnail_url: featuredPages[0].url,
          featured_page_url: featuredPages[0].url,
          featured_pages: featuredPages,
        })
        .eq('id', creation.id);

      if (updateError) throw updateError;

      await fetchCreations();
      setFeatureMessage({ type: 'success', text: `"${creation.title}" featured with ${featuredPages.length} pages` });
      setTimeout(() => setFeatureMessage(null), 3000);
    } catch (err: any) {
      setFeatureMessage({ type: 'error', text: err.message || 'Failed to feature creation' });
      setTimeout(() => setFeatureMessage(null), 5000);
    } finally {
      setFeatureLoading(null);
    }
  };

  const handleUnfeature = async (creation: Creation) => {
    setFeatureLoading(creation.id);
    setFeatureMessage(null);
    await new Promise((r) => setTimeout(r, 50));

    try {
      const filesToDelete = Array.from({ length: 4 }, (_, i) => `${creation.id}-page-${i}.webp`);
      await supabase.storage.from('public-gallery').remove(filesToDelete);

      const { error: updateError } = await supabase
        .from('creations')
        .update({
          is_featured: false,
          featured_thumbnail_url: null,
          featured_page_url: null,
          featured_pages: null,
        })
        .eq('id', creation.id);

      if (updateError) throw updateError;

      await fetchCreations();
      setFeatureMessage({ type: 'success', text: `"${creation.title}" removed from gallery` });
      setTimeout(() => setFeatureMessage(null), 3000);
    } catch (err: any) {
      setFeatureMessage({ type: 'error', text: err.message || 'Failed to unfeature creation' });
      setTimeout(() => setFeatureMessage(null), 5000);
    } finally {
      setFeatureLoading(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredCreations = creations
    .filter((c) => {
      if (!c.thumbnail_url) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return c.title?.toLowerCase().includes(s) || c.artist_name?.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortBy) {
        case 'title': aVal = a.title || ''; bVal = b.title || ''; break;
        case 'artist_name': aVal = a.artist_name || ''; bVal = b.artist_name || ''; break;
        default: aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime();
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const featuredCount = creations.filter((c) => c.is_featured).length;

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <span className="text-slate-300 ml-1">&#8597;</span>;
    return <span className="ml-1">{sortOrder === 'asc' ? '\u2191' : '\u2193'}</span>;
  };

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Message */}
      <AnimatePresence>
        {featureMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`px-4 py-3 rounded-lg text-sm font-medium ${
              featureMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {featureMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by title or artist..." />
          <button
            onClick={fetchCreations}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Star size={16} className="text-amber-500" />
          <span className="text-sm font-medium text-slate-700">{featuredCount} Featured</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-slate-400 mb-3" />
            <p className="text-sm text-slate-500">Loading creations...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-red-600 mb-1">Error loading creations</p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        ) : filteredCreations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {search ? `No creations matching "${search}"` : 'No creations with thumbnails found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {search && (
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                Showing {filteredCreations.length} of {creations.filter((c) => c.thumbnail_url).length} creations
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Thumbnail</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 cursor-pointer hover:text-slate-700" onClick={() => handleSort('title')}>
                    Title <SortIndicator field="title" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 cursor-pointer hover:text-slate-700" onClick={() => handleSort('artist_name')}>
                    Artist <SortIndicator field="artist_name" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Age</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 cursor-pointer hover:text-slate-700" onClick={() => handleSort('created_at')}>
                    Created <SortIndicator field="created_at" />
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Featured</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreations.map((creation, i) => {
                  const isFeatured = creation.is_featured;
                  const isProcessing = featureLoading === creation.id;
                  return (
                    <motion.tr
                      key={creation.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${isFeatured ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="w-14 h-14 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                          {creation.thumbnail_url ? (
                            <img
                              src={creation.thumbnail_url}
                              alt={creation.title || 'Untitled'}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">N/A</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{creation.title || 'Untitled'}</td>
                      <td className="px-4 py-3 text-slate-600">{creation.artist_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-slate-500">{creation.age || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(creation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isFeatured ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                            <Star size={10} fill="currentColor" /> Featured
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => isFeatured ? handleUnfeature(creation) : handleFeature(creation)}
                          disabled={isProcessing || !creation.thumbnail_url}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            isProcessing
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : !creation.thumbnail_url
                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                              : isFeatured
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-amber-500 text-white hover:bg-amber-600'
                          }`}
                        >
                          {isProcessing ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 size={12} className="animate-spin" /> Processing
                            </span>
                          ) : isFeatured ? 'Unfeature' : 'Feature'}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
