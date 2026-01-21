import React, { useState, useEffect } from 'react';
import {
  getCreations,
  getCreation,
  deleteCreation,
  canSaveCreation,
  Creation,
  CreationWithSignedUrls,
} from '../services/creationsService';

interface MyCreationsProps {
  userId: string;
  onBack: () => void;
  onOpenCreation: (creation: CreationWithSignedUrls) => void;
  onStartCreation: () => void;
}

const MyCreations: React.FC<MyCreationsProps> = ({ userId, onBack, onOpenCreation, onStartCreation }) => {
  console.log('[MyCreations] Component rendered, userId:', userId);

  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ savesUsed: number; limit: number } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingCreationId, setLoadingCreationId] = useState<string | null>(null);

  // Fetch creations on mount
  useEffect(() => {
    console.log('[MyCreations] useEffect running...');

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('[MyCreations] About to call getCreations...');
        const [creationsData, statusData] = await Promise.all([
          getCreations(userId),
          canSaveCreation(userId),
        ]);
        console.log('[MyCreations] getCreations returned:', creationsData);
        console.log('[MyCreations] statusData returned:', statusData);

        setCreations(creationsData);
        setSaveStatus({ savesUsed: statusData.savesUsed, limit: statusData.limit });
        console.log('[MyCreations] State updated, about to exit try block');
      } catch (err) {
        console.error('[MyCreations] Caught error:', err);
        setError('Failed to load your creations. Please try again.');
      } finally {
        console.log('[MyCreations] Finally block - setting isLoading to false');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

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

  const handleDeleteClick = (e: React.MouseEvent, creationId: string) => {
    e.stopPropagation();
    setDeleteConfirm(creationId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      const success = await deleteCreation(userId, deleteConfirm);
      if (success) {
        setCreations(prev => prev.filter(c => c.id !== deleteConfirm));
        setSaveStatus(prev =>
          prev ? { ...prev, savesUsed: Math.max(0, prev.savesUsed - 1) } : null
        );
        setToast({ type: 'success', text: 'Creation deleted' });
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({ type: 'error', text: 'Failed to delete creation' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to delete creation:', err);
      setToast({ type: 'error', text: 'Failed to delete creation' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
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

  const creationToDelete = creations.find(c => c.id === deleteConfirm);
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
            <h1 className="text-2xl font-black text-gunmetal">My Creations</h1>
          </div>

          {/* Save count badge */}
          {saveStatus && (
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${
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
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin" />
                    </div>
                  )}

                  {/* Action icons overlay at bottom */}
                  {!creation.is_locked && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-8 pb-2 px-3">
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-lg text-white/90" title="View Storybook">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </span>
                        <span className="text-lg text-white/90" title="Watch Video">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                          </svg>
                        </span>
                        <span className="text-lg text-white/90" title="Share">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                          </svg>
                        </span>
                      </div>
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

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteClick(e, creation.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/90 hover:bg-red-500 text-blue-slate hover:text-white shadow-md opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {deleteConfirm && creationToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDeleteConfirm(null)}
        >
          <div className="absolute inset-0 bg-gunmetal/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-black text-gunmetal text-center mb-2">
                Delete Creation?
              </h3>
              <p className="text-blue-slate text-center text-sm mb-6">
                Delete "<span className="font-bold text-gunmetal">{creationToDelete.title}</span>"?
                {!isPremium && ' This will free up a save slot.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-silver/20 hover:bg-silver/40 text-gunmetal rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
