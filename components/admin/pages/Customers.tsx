import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { supabase } from '../../../services/supabaseClient';
import DataTable from '../components/DataTable';
import SearchInput from '../components/SearchInput';
import CustomerModal from '../components/CustomerModal';

const Customers: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, pageSize, sorting, search],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const sortCol = sorting[0]?.id || 'created_at';
      const sortAsc = sorting[0] ? !sorting[0].desc : false;

      // Only select fields needed for the table
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at, credit_balance', { count: 'exact' })
        .order(sortCol, { ascending: sortAsc })
        .range(from, to);

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: profiles, count } = await query;

      // Enrich with creation and order counts
      const enriched = await Promise.all(
        (profiles || []).map(async (p) => {
          const [{ count: storyCount }, { count: orderCount }, { data: orderData }] = await Promise.all([
            supabase.from('creations').select('id', { count: 'exact', head: true }).eq('user_id', p.id).eq('is_deleted', false),
            supabase.from('book_orders').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
            supabase.from('book_orders').select('amount_paid').eq('user_id', p.id),
          ]);
          const totalSpent = (orderData || []).reduce((s, o) => s + (o.amount_paid || 0), 0);
          return { ...p, storyCount: storyCount || 0, orderCount: orderCount || 0, totalSpent };
        })
      );

      return { customers: enriched, count: count || 0 };
    },
    staleTime: 30_000,
  });

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'avatar',
      header: '',
      cell: ({ row }) => {
        const name = row.original.first_name
          ? `${row.original.first_name} ${row.original.last_name || ''}`.trim()
          : '?';
        const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        return (
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
            {initials}
          </div>
        );
      },
      enableSorting: false,
      size: 40,
    },
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const name = row.original.first_name
          ? `${row.original.first_name} ${row.original.last_name || ''}`.trim()
          : '-';
        return <span className="text-slate-900 font-medium">{name}</span>;
      },
      enableSorting: false,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => <span className="text-slate-600">{(getValue() as string) || '-'}</span>,
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return v ? format(new Date(v), 'MMM d, yyyy') : '-';
      },
    },
    {
      id: 'stories',
      header: 'Stories',
      cell: ({ row }) => row.original.storyCount,
      enableSorting: false,
    },
    {
      id: 'orders',
      header: 'Orders',
      cell: ({ row }) => row.original.orderCount,
      enableSorting: false,
    },
    {
      id: 'totalSpent',
      header: 'Total Spent',
      cell: ({ row }) => `$${(row.original.totalSpent / 100).toFixed(2)}`,
      enableSorting: false,
    },
    {
      accessorKey: 'credit_balance',
      header: 'Credits',
      cell: ({ getValue }) => getValue() as number || 0,
    },
  ], []);

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." />
      </div>

      <DataTable
        columns={columns}
        data={data?.customers || []}
        totalCount={data?.count || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
        onRowClick={setSelectedCustomer}
      />

      <CustomerModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
    </div>
  );
};

export default Customers;
