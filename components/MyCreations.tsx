import React, { useState, useEffect } from 'react';
import {
  getCreations,
  getCreation,
  canSaveCreation,
  getEbookDownloads,
  Creation,
  CreationWithSignedUrls,
  EbookDownload,
} from '../services/creationsService';
import { useVisibilityRefresh, isAbortError } from '../hooks/useVisibilityRefresh';

interface MyCreationsProps {
  userId: string;
  onBack: () => void;
  onOpenCreation: (creation: CreationWithSignedUrls) => void;
  onStartCreation: () => void;
  onGetCredits: () => void;
  onOrderBook: (creationId: string, isGift: boolean) => void;
  orderBookLoading?: boolean;
}

const MyCreations: React.FC<MyCreationsProps> = ({ userId, onBack, onOpenCreation, onStartCreation, onGetCredits, onOrderBook, orderBookLoading }) => {
  console.log('[MyCreations] Component rendered, userId:', userId);

  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ savesUsed: number; limit: number } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingCreationId, setLoadingCreationId] = useState<string | null>(null);
  const [ebookDownloads, setEbookDownloads] = useState<Map<string, EbookDownload>>(new Map());

  // Visibility refresh hook for handling stale connections
  const { refreshKey, getSignal } = useVisibilityRefresh();

  // Fetch creations on mount and when tab becomes visible
  useEffect(() => {
    console.log('[MyCreations] useEffect running...');
    let isCancelled = false;
    const signal = getSignal();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('[MyCreations] About to call getCreations...');
        const [creationsData, statusData, ebookData] = await Promise.all([
          getCreations(userId, signal),
          canSaveCreation(userId, signal),
          getEbookDownloads(userId),
        ]);

        if (isCancelled) return;

        console.log('[MyCreations] getCreations returned:', creationsData);
        console.log('[MyCreations] statusData returned:', statusData);
        console.log('[MyCreations] ebookDownloads returned:', ebookData.size, 'ebooks');

        setCreations(creationsData);
        setSaveStatus({ savesUsed: statusData.savesUsed, limit: statusData.limit });
        setEbookDownloads(ebookData);
        console.log('[MyCreations] State updated, about to exit try block');
      } catch (err) {
        if (isCancelled) return;
        if (err instanceof Error && err.message.toLowerCase().includes('abort')) {
          console.log('[MyCreations] Request aborted');
          return;
        }
        if (isAbortError(err)) {
          console.log('[MyCreations] Request aborted');
          return;
        }
        console.error('[MyCreations] Caught error:', err);
        setError('Failed to load your creations. Please try again.');
      } finally {
        if (!isCancelled) {
          console.log('[MyCreations] Finally block - setting isLoading to false');
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [userId, refreshKey, getSignal]);

  const handleCardClick = async (creation: Creation) => {
    if (creation.is_locked) {
      // Show upgrade prompt for locked creations
      setToast({ type: 'error', text: 'Upgrade to Premium to access this creation' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Fetch the creation with signed URLs
    setLoadingCreationId(creation.id);
    try {
      const fullCreation = await getCreation(userId, creation.id);
      if (fullCreation) {
        onOpenCreation(fullCreation);
      } else {
        setToast({ type: 'error', text: 'Failed to load creation' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to fetch creation:', err);
      setToast({ type: 'error', text: 'Failed to load creation' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoadingCreationId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleBookClick = (e: React.MouseEvent, creation: Creation, isGift: boolean = false) => {
    e.stopPropagation();
    onOrderBook(creation.id, isGift);
  };

  const handleDownloadVideo = async (e: React.MouseEvent, creation: Creation) => {
    e.stopPropagation();
    // Fetch full creation to get video URL, then trigger download
    try {
      setToast({ type: 'success', text: 'Preparing download...' });
      const fullCreation = await getCreation(userId, creation.id);
      if (fullCreation?.video_url) {
        const link = document.createElement('a');
        link.href = fullCreation.video_url;
        link.download = `${creation.title.replace(/[^a-z0-9]/gi, '-')}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToast({ type: 'success', text: 'Download started!' });
      } else {
        setToast({ type: 'error', text: 'Video not available' });
      }
    } catch (err) {
      console.error('Failed to download video:', err);
      setToast({ type: 'error', text: 'Download failed' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleDownloadEbook = (e: React.MouseEvent, creation: Creation) => {
    e.stopPropagation();
    const ebookInfo = ebookDownloads.get(creation.id);
    if (ebookInfo?.downloadUrl) {
      const link = document.createElement('a');
      link.href = ebookInfo.downloadUrl;
      link.download = `${creation.title.replace(/[^a-z0-9]/gi, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ type: 'success', text: 'Ebook download started!' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const isPremium = saveStatus?.limit === Infinity;

  return (
    <div className="min-h-screen bg-off-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-off-white/80 backdrop-blur-lg border-b border-silver/30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-silver/20 hover:bg-silver/40 flex items-center justify-center text-gunmetal transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-bold text-pacific-cyan uppercase tracking-wider">Once Upon A Drawing</p>
              <h1 className="text-xl md:text-2xl font-black text-gunmetal">My Creations</h1>
            </div>
          </div>

          {/* Save count and purchase button */}
          {saveStatus && (
            <div className="flex items-center gap-2">
              <div className={`px-3 py-2 rounded-full text-sm font-bold ${
                isPremium
                  ? 'bg-gradient-to-r from-soft-gold/20 to-soft-gold/10 text-soft-gold border border-soft-gold/30'
                  : 'bg-pacific-cyan/10 text-pacific-cyan border border-pacific-cyan/30'
              }`}>
                {isPremium ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Premium
                  </span>
                ) : (
                  <span>{saveStatus.savesUsed} of {saveStatus.limit} saved</span>
                )}
              </div>
              {!isPremium && (
                <button
                  onClick={onGetCredits}
                  className="px-3 py-2 bg-soft-gold hover:bg-soft-gold/90 text-gunmetal rounded-full text-sm font-bold transition-colors shadow-sm"
                >
                  Save More
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin mb-4" />
            <p className="text-blue-slate font-medium">Loading your creations...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-pacific-cyan text-white rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && creations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pacific-cyan/20 to-soft-gold/20 flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-pacific-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-gunmetal mb-2">No creations yet</h2>
            <p className="text-blue-slate text-center mb-6 max-w-sm">
              Your saved storybooks will appear here. Create your first magical story!
            </p>
            <button
              onClick={onStartCreation}
              className="px-8 py-4 bg-pacific-cyan text-white rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pacific-cyan/30 border-b-4 border-blue-slate"
            >
              Create Your First Story
            </button>
          </div>
        )}

        {/* Creations grid */}
        {!isLoading && !error && creations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creations.map((creation, index) => (
              <div
                key={creation.id}
                onClick={() => handleCardClick(creation)}
                className={`group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer animate-in fade-in slide-in-from-bottom-4 ${
                  creation.is_locked ? 'opacity-80' : 'hover:-translate-y-1'
                }`}
                style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] overflow-hidden bg-silver/20">
                  <div className={`w-full h-full bg-gradient-to-br from-pacific-cyan/10 to-soft-gold/10 flex items-center justify-center ${
                    creation.is_locked ? 'grayscale opacity-60 blur-[2px]' : ''
                  }`}>
                    {creation.thumbnail_url ? (
                      <img
                        src={creation.thumbnail_url}
                        alt={creation.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <svg className="w-16 h-16 text-pacific-cyan/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    )}
                  </div>

                  {/* Locked overlay */}
                  {creation.is_locked && (
                    <div className="absolute inset-0 bg-gunmetal/60 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <span className="text-white text-sm font-bold">Upgrade to view</span>
                    </div>
                  )}

                  {/* Loading overlay */}
                  {loadingCreationId === creation.id && (
                    <div className="absolute inset-0 bg-gunmetal/70 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3" />
                      <span className="text-white font-bold text-sm">Loading Story...</span>
                    </div>
                  )}

                  {/* Hover overlay - "View Story" */}
                  {!creation.is_locked && loadingCreationId !== creation.id && (
                    <div className="absolute inset-0 bg-gunmetal/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-white font-bold text-sm">View Story</span>
                    </div>
                  )}
                </div>

                {/* Card content */}
                <div className="p-4">
                  <h3 className="font-black text-gunmetal text-lg mb-1 truncate">
                    {creation.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-blue-slate">
                    <span className="truncate">
                      {creation.artist_name || 'Unknown Artist'}
                    </span>
                    <span className="text-xs opacity-70 flex-shrink-0 ml-2">
                      {formatDate(creation.created_at)}
                    </span>
                  </div>

                  {/* Action buttons - only for unlocked creations */}
                  {!creation.is_locked && (
                    <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-gray-100">
                      {/* Book order buttons - side by side on desktop, stacked on mobile */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={(e) => handleBookClick(e, creation, false)}
                          disabled={orderBookLoading}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-semibold text-sm transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {orderBookLoading ? (
                            <div className="w-4 h-4 border-2 border-amber-900/30 border-t-amber-900 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          )}
                          {orderBookLoading ? 'Loading...' : 'Order Book'}
                        </button>
                        <button
                          onClick={(e) => handleBookClick(e, creation, true)}
                          disabled={orderBookLoading}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-100 to-purple-100 hover:from-pink-200 hover:to-purple-200 text-purple-900 rounded-lg font-semibold text-sm transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="text-base">🎁</span>
                          Order Gift
                        </button>
                      </div>
                      {/* Download buttons - separate row */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={(e) => handleDownloadVideo(e, creation)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors flex-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Download Movie
                        </button>
                        {ebookDownloads.has(creation.id) && (
                          <button
                            onClick={(e) => handleDownloadEbook(e, creation)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-pacific-cyan/10 hover:bg-pacific-cyan/20 text-pacific-cyan rounded-lg font-semibold text-sm transition-colors flex-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Download Ebook
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl font-bold text-sm shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success'
            ? 'bg-pacific-cyan text-white'
            : 'bg-red-500 text-white'
        }`}>
          {toast.text}
        </div>
      )}

    </div>
  );
};

export default MyCreations;
