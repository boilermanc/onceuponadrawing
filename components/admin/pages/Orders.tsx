import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../../services/supabaseClient';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SearchInput from '../components/SearchInput';
import FilterDropdown from '../components/FilterDropdown';
import OrderDetailModal from '../components/OrderDetailModal';

const statusOptions = [
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'generating_pdf', label: 'Generating PDF' },
  { value: 'pdf_ready', label: 'PDF Ready' },
  { value: 'submitted_to_printer', label: 'Sent to Printer' },
  { value: 'in_production', label: 'In Production' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const Orders: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, pageSize, sorting, search, statusFilter],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const sortCol = sorting[0]?.id || 'created_at';
      const sortAsc = sorting[0] ? !sorting[0].desc : false;

      // Only select fields needed for the table - avoid heavy data
      let query = supabase
        .from('book_orders')
        .select('id, order_type, amount_paid, status, created_at, tracking_number, shipping_name, shipping_email, profiles!book_orders_user_id_profiles_fkey(first_name, last_name)', { count: 'exact' })
        .order(sortCol, { ascending: sortAsc })
        .range(from, to);

      if (search) {
        query = query.or(`shipping_name.ilike.%${search}%,shipping_email.ilike.%${search}%`);
      }

      const statuses = Array.isArray(statusFilter) ? statusFilter : statusFilter ? [statusFilter] : [];
      if (statuses.length > 0) {
        query = query.in('status', statuses);
      }

      const { data: orders, count } = await query;
      return { orders: orders || [], count: count || 0 };
    },
    staleTime: 30_000,
  });

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Order',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-slate-500">
          {(getValue() as string).slice(0, 8)}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => {
        const p = row.original.profiles;
        const name = p?.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : row.original.shipping_name || '-';
        return <span className="text-slate-900">{name}</span>;
      },
      enableSorting: false,
    },
    {
      accessorKey: 'order_type',
      header: 'Product',
      cell: ({ getValue }) => (
        <span className="capitalize">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'amount_paid',
      header: 'Amount',
      cell: ({ getValue }) => `$${((getValue() as number || 0) / 100).toFixed(2)}`,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
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
      accessorKey: 'tracking_number',
      header: 'Tracking',
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        return v ? <span className="font-mono text-xs">{v}</span> : <span className="text-slate-300">-</span>;
      },
      enableSorting: false,
    },
  ], []);

  const handleExportCSV = () => {
    if (!data?.orders.length) return;
    const headers = ['Order ID', 'Customer', 'Type', 'Amount', 'Status', 'Created', 'Tracking'];
    const rows = data.orders.map((o: any) => [
      o.id,
      o.shipping_name || '',
      o.order_type,
      ((o.amount_paid || 0) / 100).toFixed(2),
      o.status,
      o.created_at,
      o.tracking_number || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search orders..." />
          <FilterDropdown
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            multiple
          />
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data?.orders || []}
        totalCount={data?.count || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
        onRowClick={setSelectedOrder}
      />

      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
};

export default Orders;
