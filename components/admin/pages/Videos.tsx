import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { supabase } from '../../../services/supabaseClient';
import DataTable from '../components/DataTable';
import SearchInput from '../components/SearchInput';

const Videos: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-videos', page, pageSize, sorting, search],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const sortCol = sorting[0]?.id || 'created_at';
      const sortAsc = sorting[0] ? !sorting[0].desc : false;

      let query = supabase
        .from('creations')
        .select('*, profiles!creations_user_id_fkey(first_name, last_name, email)', { count: 'exact' })
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
        return <span className="text-slate-600">{p.email || '-'}</span>;
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
    </div>
  );
};

export default Videos;
