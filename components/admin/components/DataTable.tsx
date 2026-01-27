import React from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  isLoading: boolean;
  onRowClick?: (row: T) => void;
}

function DataTable<T>({
  columns,
  data,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sorting,
  onSortingChange,
  isLoading,
  onRowClick,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  const totalPages = Math.ceil(totalCount / pageSize);
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-200">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 ${
                        canSort ? 'cursor-pointer select-none hover:text-slate-700' : ''
                      }`}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-slate-400">
                            {sorted === 'asc' ? (
                              <ChevronUp size={14} />
                            ) : sorted === 'desc' ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronsUpDown size={12} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  No results found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`border-b border-slate-100 ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''
                  }`}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            {totalCount > 0 ? `${from}-${to} of ${totalCount}` : '0 results'}
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(0);
            }}
            className="text-sm border border-slate-200 rounded px-2 py-1 bg-white text-slate-700"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i;
            } else if (page < 3) {
              pageNum = i;
            } else if (page > totalPages - 4) {
              pageNum = totalPages - 5 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded text-sm ${
                  pageNum === page
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
