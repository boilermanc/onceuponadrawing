import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Video } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import DataTable from '../components/DataTable';
import SearchInput from '../components/SearchInput';
import FilterDropdown from '../components/FilterDropdown';

const Stories: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [search, setSearch] = useState('');
  const [videoFilter, setVideoFilter] = useState<string | string[]>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stories', page, pageSize, sorting, search, videoFilter],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const sortCol = sorting[0]?.id || 'created_at';
      const sortAsc = sorting[0] ? !sorting[0].desc : false;

      // Only select fields needed for the table - avoid heavy data
      let query = supabase
        .from('creations')
        .select('id, title, artist_name, created_at, video_path, is_featured, profiles!creations_user_id_profiles_fkey(first_name, last_name, email)', { count: 'exact' })
        .eq('is_deleted', false)
        .order(sortCol, { ascending: sortAsc })
        .range(from, to);

      if (search) {
        query = query.or(`title.ilike.%${search}%,artist_name.ilike.%${search}%`);
      }

      if (videoFilter === 'has_video') {
        query = query.not('video_path', 'is', null);
      } else if (videoFilter === 'no_video') {
        query = query.is('video_path', null);
      }

      const { data: stories, count } = await query;
      return { stories: stories || [], count: count || 0 };
    },
    staleTime: 30_000,
  });

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
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
        const name = p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : p.email || '-';
        return <span className="text-slate-600">{name}</span>;
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
      id: 'video',
      header: 'Video',
      cell: ({ row }) => (
        row.original.video_path
          ? <Video size={16} className="text-emerald-500" />
          : <span className="text-slate-300">-</span>
      ),
      enableSorting: false,
    },
    {
      id: 'featured',
      header: 'Featured',
      cell: ({ row }) => (
        row.original.is_featured
          ? <span className="text-xs font-medium text-orange-600">Featured</span>
          : <span className="text-slate-300">-</span>
      ),
      enableSorting: false,
    },
  ], []);

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by title or artist..." />
        <FilterDropdown
          label="Video"
          options={[
            { value: 'has_video', label: 'Has Video' },
            { value: 'no_video', label: 'No Video' },
          ]}
          value={videoFilter}
          onChange={setVideoFilter}
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.stories || []}
        totalCount={data?.count || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
      />
    </div>
  );
};

export default Stories;
