import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Loader2, RefreshCw, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import SearchInput from '../components/SearchInput';

interface StoryPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  imageUrl?: string;
}

interface Creation {
  id: string;
  title: string;
  artist_name: string;
  artist_age: string | null;
  page_images?: string[];
  is_featured?: boolean;
  featured_at?: string;
  featured_thumbnail_url?: string;
  featured_pages?: { url: string; text: string }[];
  thumbnail_url?: string;
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
  const [viewingCreation, setViewingCreation] = useState<Creation | null>(null);
  const [viewPageUrls, setViewPageUrls] = useState<string[]>([]);
  const [viewPageTexts, setViewPageTexts] = useState<string[]>([]);
  const [viewCurrentPage, setViewCurrentPage] = useState(0);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchCreations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Only fetch fields needed for the list view - avoid heavy data like analysis_json
      const { data, error: fetchError } = await supabase
        .from('creations')
        .select('id, title, artist_name, artist_age, created_at, is_featured, featured_at, featured_thumbnail_url, featured_pages, page_images')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      // Generate signed URLs for thumbnails (bucket is private)
      const withThumbnails = await Promise.all(
        (data || []).map(async (creation) => {
          if (creation.page_images && creation.page_images.length > 0) {
            const { data: signedData, error } = await supabase.storage
              .from('page-images')
              .createSignedUrl(creation.page_images[0], 3600);
            if (!error && signedData) {
              return { ...creation, thumbnail_url: signedData.signedUrl };
            }
          }
          return creation;
        })
      );

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

      // Fetch analysis_json only when featuring (not in list view)
      const { data: fullCreation } = await supabase
        .from('creations')
        .select('analysis_json')
        .eq('id', creation.id)
        .single();

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

          const pageText = fullCreation?.analysis_json?.pages?.[i]?.text || '';
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

  const handleView = async (creation: Creation) => {
    setViewingCreation(creation);
    setViewCurrentPage(0);
    setViewLoading(true);
    setViewPageUrls([]);
    setViewPageTexts([]);

    try {
      // Fetch analysis_json to get page texts
      const { data: fullCreation } = await supabase
        .from('creations')
        .select('analysis_json')
        .eq('id', creation.id)
        .single();

      const pages: StoryPage[] = fullCreation?.analysis_json?.pages || [];
      setViewPageTexts(pages.map((p) => p.text || ''));

      // Generate signed URLs for all page images (bucket is private)
      if (creation.page_images && creation.page_images.length > 0) {
        const urlPromises = creation.page_images.map(async (path) => {
          const { data, error } = await supabase.storage
            .from('page-images')
            .createSignedUrl(path, 3600); // 1 hour expiry
          return error ? null : data.signedUrl;
        });
        const urls = (await Promise.all(urlPromises)).filter((url): url is string => url !== null);
        setViewPageUrls(urls);
      }
    } catch {
      setViewPageUrls([]);
      setViewPageTexts([]);
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewingCreation(null);
    setViewPageUrls([]);
    setViewPageTexts([]);
    setViewCurrentPage(0);
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
                      <td className="px-4 py-3 text-slate-500">{creation.artist_age || '-'}</td>
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(creation)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="View Story"
                          >
                            <Eye size={16} />
                          </button>
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
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Story Modal */}
      <AnimatePresence>
        {viewingCreation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={closeViewModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{viewingCreation.title || 'Untitled'}</h3>
                  <p className="text-sm text-slate-500">by {viewingCreation.artist_name || 'Unknown'}</p>
                </div>
                <button
                  onClick={closeViewModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content - Book Layout */}
              <div className="flex-1 overflow-hidden">
                {viewLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-slate-400" />
                  </div>
                ) : viewPageUrls.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    No pages available for this story
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    {/* Book spread - Image left, Text right */}
                    <div className="flex-1 flex flex-col md:flex-row min-h-0">
                      {/* Left page - Image */}
                      <div className="w-full md:w-1/2 h-64 md:h-auto bg-slate-100 relative">
                        <img
                          src={viewPageUrls[viewCurrentPage]}
                          alt={`Page ${viewCurrentPage + 1}`}
                          className="w-full h-full object-contain"
                        />
                        {/* Navigation arrows */}
                        <button
                          onClick={() => setViewCurrentPage((p) => Math.max(0, p - 1))}
                          disabled={viewCurrentPage === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={() => setViewCurrentPage((p) => Math.min(viewPageUrls.length - 1, p + 1))}
                          disabled={viewCurrentPage === viewPageUrls.length - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>

                      {/* Right page - Text */}
                      <div className="w-full md:w-1/2 bg-[#fffdf9] p-6 md:p-10 flex flex-col justify-center items-center text-center relative overflow-y-auto">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
                        <div className="relative z-10 max-w-md">
                          <div className="text-slate-300 text-4xl font-serif mb-4">"</div>
                          <p className="text-lg md:text-xl font-medium text-slate-800 leading-relaxed font-serif italic">
                            {viewPageTexts[viewCurrentPage] || 'No text for this page'}
                          </p>
                          <div className="text-slate-300 text-4xl font-serif mt-4 rotate-180">"</div>
                        </div>
                      </div>
                    </div>

                    {/* Footer with page indicator and thumbnails */}
                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                      {/* Page indicator */}
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="text-sm text-slate-600">
                          Page {viewCurrentPage + 1} of {viewPageUrls.length}
                        </span>
                      </div>

                      {/* Thumbnail navigation */}
                      {viewPageUrls.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
                          {viewPageUrls.map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => setViewCurrentPage(idx)}
                              className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                                idx === viewCurrentPage ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;
