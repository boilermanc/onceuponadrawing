import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Download, FileText, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { usePrices } from '../../../contexts/PricesContext';

interface PreviewResult {
  success: boolean;
  // New format from n8n/PDF generator
  interiorUrl?: string;
  coverUrl?: string;
  interiorPath?: string;
  coverPath?: string;
  pageCount?: number;
  isPreview?: boolean;
  creationId?: string;
  // Legacy format (kept for compatibility)
  creation?: { id: string; title: string; artistName: string };
  pdfs?: {
    interior: { url: string; sizeMB: number };
    cover: { url: string; sizeMB: number };
  };
  specs?: {
    pageCount: number;
    format: string;
    binding: string;
    interior: { dimensions: string; resolution: string; dpi: number; bleed: string };
    cover: { dimensions: string; resolution: string; dpi: number; spineWidth: string; layout: string };
  };
  expiresAt?: string;
  error?: string;
  details?: string;
}

interface Creation {
  id: string;
  title: string;
  artist_name: string;
  created_at: string;
  page_images?: string[];
}

const Preview: React.FC = () => {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<Map<string, PreviewResult>>(new Map());
  const [selectedBookTypes, setSelectedBookTypes] = useState<Map<string, string>>(new Map());

  // Get book prices from context
  const { prices: contextPrices } = usePrices();
  const bookPrices = {
    softcover: contextPrices?.softcover,
    hardcover: contextPrices?.hardcover,
  };

  const fetchCreations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('creations')
        .select('id, title, artist_name, created_at, page_images')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (fetchError) throw fetchError;
      setCreations(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch creations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreations();
  }, [fetchCreations]);

  const generatePreview = async (creationId: string) => {
    setPreviewLoading(creationId);
    // Clear any previous result for this creation
    setPreviewResults((prev) => {
      const next = new Map(prev);
      next.delete(creationId);
      return next;
    });
    try {
      const bookType = selectedBookTypes.get(creationId) || 'softcover';

      // Use n8n webhook for PDF generation (same endpoint as ebook processing)
      const response = await fetch('https://n8n.sproutify.app/webhook/74539b5d-b1cb-4ff9-8083-d4f34cce5866', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creationId,
          bookType,
          isPreview: true, // Flag to indicate this is a preview request
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setPreviewResults((prev) => new Map(prev).set(creationId, {
          success: false,
          error: 'Failed to generate preview',
          details: errorText || `HTTP ${response.status}`,
        }));
        return;
      }

      const rawData = await response.json();
      // n8n returns an array, extract the first element
      const data = Array.isArray(rawData) ? rawData[0] : rawData;

      if (!data || data.success === false) {
        setPreviewResults((prev) => new Map(prev).set(creationId, {
          success: false,
          error: data?.error || 'Unknown error',
          details: data?.details || '',
        }));
        return;
      }

      setPreviewResults((prev) => new Map(prev).set(creationId, data));
    } catch (err: any) {
      setPreviewResults((prev) => new Map(prev).set(creationId, {
        success: false,
        error: err.message || 'Failed to generate preview',
        details: err.details || err.toString(),
      }));
    } finally {
      setPreviewLoading(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-4 max-w-5xl">
      <p className="text-sm text-slate-500">
        Generate print-ready PDFs for testing without submitting orders to Lulu.
      </p>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <Loader2 size={24} className="animate-spin mx-auto text-slate-400 mb-3" />
          <p className="text-sm text-slate-500">Loading creations...</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <p className="text-sm text-red-600 mb-1">Error loading creations</p>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      ) : creations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-sm text-slate-400">
          No creations found
        </div>
      ) : (
        <div className="space-y-3">
          {creations.map((creation) => {
            const result = previewResults.get(creation.id);
            const isGenerating = previewLoading === creation.id;

            return (
              <motion.div
                key={creation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-lg p-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{creation.title || 'Untitled Story'}</h3>
                    <p className="text-sm text-slate-500">by {creation.artist_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(creation.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={selectedBookTypes.get(creation.id) || 'softcover'}
                      onChange={(e) => {
                        const m = new Map(selectedBookTypes);
                        m.set(creation.id, e.target.value);
                        setSelectedBookTypes(m);
                      }}
                      disabled={isGenerating}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 disabled:opacity-50"
                    >
                      <option value="softcover">
                        Softcover {bookPrices.softcover?.displayPrice ? `(${bookPrices.softcover.displayPrice})` : ''}
                      </option>
                      <option value="hardcover">
                        Hardcover {bookPrices.hardcover?.displayPrice ? `(${bookPrices.hardcover.displayPrice})` : ''}
                      </option>
                    </select>
                    <button
                      onClick={() => generatePreview(creation.id)}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText size={14} />
                          Generate Preview
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Result */}
                {result && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    {result.success && (result.interiorUrl || result.pdfs) ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                          PDFs generated successfully
                        </div>

                        {/* Download links */}
                        <div className="grid grid-cols-2 gap-3">
                          <a
                            href={result.interiorUrl || result.pdfs?.interior.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <div>
                              <div className="text-sm font-medium text-slate-900">Interior PDF</div>
                              {result.pdfs?.interior.sizeMB && (
                                <div className="text-xs text-slate-500">{result.pdfs.interior.sizeMB} MB</div>
                              )}
                            </div>
                            <Download size={16} className="text-slate-400" />
                          </a>
                          <a
                            href={result.coverUrl || result.pdfs?.cover.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <div>
                              <div className="text-sm font-medium text-slate-900">Cover PDF</div>
                              {result.pdfs?.cover.sizeMB && (
                                <div className="text-xs text-slate-500">{result.pdfs.cover.sizeMB} MB</div>
                              )}
                            </div>
                            <Download size={16} className="text-slate-400" />
                          </a>
                        </div>

                        {/* Page count from new format */}
                        {result.pageCount && (
                          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                            <div className="text-sm">
                              <span className="text-slate-400">Pages: </span>
                              <span className="text-slate-900 font-mono">{result.pageCount}</span>
                            </div>
                          </div>
                        )}

                        {/* Specs from legacy format */}
                        {result.specs && (
                          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Print Specifications</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div><span className="text-slate-400">Format</span><p className="text-slate-900">{result.specs.format}</p></div>
                              <div><span className="text-slate-400">Binding</span><p className="text-slate-900">{result.specs.binding}</p></div>
                              <div><span className="text-slate-400">Pages</span><p className="text-slate-900 font-mono">{result.specs.pageCount}</p></div>
                              <div><span className="text-slate-400">Spine Width</span><p className="text-slate-900 font-mono">{result.specs.cover.spineWidth}</p></div>
                              <div><span className="text-slate-400">Interior Size</span><p className="text-slate-900 font-mono">{result.specs.interior.dimensions}</p></div>
                              <div><span className="text-slate-400">Cover Size</span><p className="text-slate-900 font-mono">{result.specs.cover.dimensions}</p></div>
                              <div><span className="text-slate-400">DPI</span><p className="text-slate-900 font-mono">{result.specs.interior.dpi}</p></div>
                              <div><span className="text-slate-400">Bleed</span><p className="text-slate-900 font-mono">{result.specs.interior.bleed}</p></div>
                            </div>
                            {result.expiresAt && (
                              <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200">
                                Links expire: {formatDate(result.expiresAt)}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex items-start gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                          <Info size={14} className="mt-0.5 flex-shrink-0" />
                          <span>Preview only. No order submitted to Lulu.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p>{result.error || 'Unknown error'}</p>
                          {result.details && <p className="text-xs text-red-500 font-mono mt-1">{result.details}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Preview;
