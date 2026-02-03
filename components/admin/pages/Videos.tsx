import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Loader2 } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import DataTable from '../components/DataTable';
import SearchInput from '../components/SearchInput';

interface VideoCreation {
  id: string;
  title: string;
  artist_name: string;
  video_path: string;
  created_at: string;
  profiles?: { first_name?: string; last_name?: string; email?: string };
}

const Videos: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [search, setSearch] = useState('');
  const [viewingVideo, setViewingVideo] = useState<VideoCreation | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  const handlePlayVideo = async (video: VideoCreation) => {
    setViewingVideo(video);
    setVideoLoading(true);
    setVideoUrl(null);

    // Strip bucket prefix if present (video_path may include "videos/")
    const stripBucketPrefix = (path: string) => path.replace(/^videos\//, '');
    const cleanPath = stripBucketPrefix(video.video_path);

    try {
      // Use signed URL since bucket may be private
      const { data, error } = await supabase.storage
        .from('videos')
        .createSignedUrl(cleanPath, 3600); // 1 hour expiry

      if (!error && data) {
        setVideoUrl(data.signedUrl);
      }
    } catch {
      // Fallback to public URL if signed URL fails
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(cleanPath);
      setVideoUrl(publicUrl);
    } finally {
      setVideoLoading(false);
    }
  };

  const closeVideoModal = () => {
    setViewingVideo(null);
    setVideoUrl(null);
    setVideoLoading(false);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-videos', page, pageSize, sorting, search],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const sortCol = sorting[0]?.id || 'created_at';
      const sortAsc = sorting[0] ? !sorting[0].desc : false;

      // Only select fields needed for the table - avoid heavy data
      let query = supabase
        .from('creations')
        .select('id, title, artist_name, created_at, video_path, profiles!creations_user_id_profiles_fkey(first_name, last_name, email)', { count: 'exact' })
        .eq('is_deleted', false)
        .not('video_path', 'is', null)
        .order(sortCol, { ascending: sortAsc })
        .range(from, to);

      if (search) {
        query = query.or(`title.ilike.%${search}%,artist_name.ilike.%${search}%`);
      }

      const { data: videos, count } = await query;
      return { videos: videos || [], count: count || 0 };
    },
    staleTime: 30_000,
  });

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'play',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => handlePlayVideo(row.original)}
          className="p-2 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          title="Play Video"
        >
          <Play size={18} fill="currentColor" />
        </button>
      ),
      enableSorting: false,
      size: 50,
    },
    {
      accessorKey: 'title',
      header: 'Story Title',
      cell: ({ getValue }) => (
        <span className="text-slate-900 font-medium">{(getValue() as string) || 'Untitled'}</span>
      ),
    },
    {
      accessorKey: 'artist_name',
      header: 'Artist',
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => {
        const p = row.original.profiles;
        if (!p) return <span className="text-slate-400">-</span>;
        const name = p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : null;
        return (
          <div className="text-slate-600">
            {name && <div className="font-medium text-slate-900">{name}</div>}
            <div className="text-xs text-slate-500">{p.email || '-'}</div>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return v ? format(new Date(v), 'MMM d, yyyy') : '-';
      },
    },
    {
      accessorKey: 'video_path',
      header: 'Path',
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return v ? (
          <span className="font-mono text-xs text-slate-500 truncate max-w-[200px] block">
            {v.split('/').pop()}
          </span>
        ) : '-';
      },
      enableSorting: false,
    },
  ], []);

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by title or artist..." />
      </div>

      <DataTable
        columns={columns}
        data={data?.videos || []}
        totalCount={data?.count || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
      />

      {/* Video Player Modal */}
      <AnimatePresence>
        {viewingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={closeVideoModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl max-w-4xl w-full overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{viewingVideo.title || 'Untitled'}</h3>
                  <p className="text-sm text-slate-500">by {viewingVideo.artist_name || 'Unknown'}</p>
                </div>
                <button
                  onClick={closeVideoModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Video Player */}
              <div className="bg-black">
                {videoLoading ? (
                  <div className="flex items-center justify-center py-32" style={{ aspectRatio: '16/9' }}>
                    <Loader2 size={48} className="animate-spin text-white" />
                  </div>
                ) : videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    className="w-full max-h-[70vh]"
                    style={{ aspectRatio: '16/9' }}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="flex items-center justify-center py-32 text-white" style={{ aspectRatio: '16/9' }}>
                    Failed to load video
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

export default Videos;
