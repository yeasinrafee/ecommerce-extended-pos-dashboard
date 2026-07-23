'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Table, { type Column } from '@/components/Common/Table';
import TableSkeleton from '@/components/Common/TableSkeleton';
import SearchBar from '@/components/FormFields/SearchBar';
import {
  usePosCustomers,
  useUpdatePosCustomer,
} from '@/hooks/pos-customer.api';
import type { PosCustomer } from '@/hooks/pos-customer.api';
import { Eye, Phone, Pencil, X } from 'lucide-react';

export default function ManagePosCustomer() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const limit = 10;

  const [searchInput, setSearchInput] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState<string | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim() || undefined);
    }, 500);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = usePosCustomers({
    page,
    limit,
    searchTerm,
  });
  const updateMutation = useUpdatePosCustomer();

  const items = data?.data ?? [];
  const meta = data?.meta;

  /* ── Edit modal state ── */
  const [editCustomer, setEditCustomer] = React.useState<PosCustomer | null>(
    null,
  );
  const [editName, setEditName] = React.useState('');

  const openEdit = (customer: PosCustomer) => {
    setEditCustomer(customer);
    setEditName(customer.name);
  };

  const closeEdit = () => {
    setEditCustomer(null);
    setEditName('');
  };

  const handleSaveEdit = () => {
    if (!editCustomer || !editName.trim()) return;
    updateMutation.mutate(
      { id: editCustomer.id, name: editName.trim() },
      { onSuccess: () => closeEdit() },
    );
  };

  const columns = React.useMemo<Column<PosCustomer>[]>(
    () => [
      {
        header: 'Customer',
        cell: (row) => (
          <div className='flex items-center gap-3'>
            <div className='size-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0'>
              <span className='text-sm font-bold text-primary'>
                {(row.name || 'C').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className='flex flex-col text-left min-w-0'>
              <span className='font-semibold text-sm text-gray-900 truncate'>
                {row.name}
              </span>
              <span className='flex items-center gap-0.5 text-xs text-gray-500'>
                <Phone className='size-3' />
                {row.phone}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: 'Total Orders',
        cell: (row) => (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800'>
            {row._count?.posOrders ?? row.posOrderIds?.length ?? 0}
          </span>
        ),
        align: 'center',
        className: 'w-28',
      },
      {
        header: 'Joined',
        cell: (row) => (
          <span className='text-sm text-gray-600'>
            {new Date(row.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ),
        className: 'w-32',
      },
      {
        header: 'Actions',
        cell: (row) => (
          <div className='flex items-center justify-center gap-2'>
            <button
              onClick={() => openEdit(row)}
              className='inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'
              title='Edit name'
            >
              <Pencil className='size-3' />
              Edit
            </button>
            <button
              onClick={() =>
                router.push(`/dashboard/pos-customer/${row.id}/orders`)
              }
              className='inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors'
            >
              <Eye className='size-3' />
              Orders
            </button>
          </div>
        ),
        align: 'center',
        className: 'w-44',
      },
    ],
    [page, limit, router],
  );

  return (
    <div className='p-4 md:p-6'>
      <div className='mb-6'>
        <h2 className='text-xl font-bold text-gray-900'>POS Customers</h2>
        <p className='text-sm text-gray-500 mt-1'>
          Manage walk-in customers and track their purchase history
        </p>
      </div>

      <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
        {/* Search bar */}
        <div className='px-5 py-4 border-b border-gray-100'>
          <SearchBar
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            clearSearch={() => setSearchInput('')}
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <div className='p-8 text-center text-red-500'>
            Failed to load customers. Please try again.
          </div>
        ) : items.length === 0 ? (
          <div className='p-12 text-center'>
            <p className='text-gray-400 font-medium'>No customers found</p>
            <p className='text-sm text-gray-400 mt-1'>
              {searchTerm
                ? 'Try adjusting your search'
                : 'Customers will appear here when orders are placed'}
            </p>
          </div>
        ) : (
          <Table<PosCustomer>
            columns={columns}
            data={items}
            rowKey='id'
            pageSize={limit}
            serverSide
            currentPage={page}
            totalItems={Number(meta?.total ?? 0)}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* ── Edit Name Modal ── */}
      {editCustomer && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200'>
            {/* Header */}
            <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
              <h3 className='text-base font-bold text-gray-900'>
                Edit Customer Name
              </h3>
              <button
                onClick={closeEdit}
                className='p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors'
              >
                <X className='size-4' />
              </button>
            </div>

            {/* Body */}
            <div className='px-5 py-4'>
              <div className='flex items-center gap-3 mb-4 pb-4 border-b border-gray-100'>
                <div className='size-10 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0'>
                  <span className='text-sm font-bold text-primary'>
                    {editCustomer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className='text-xs text-gray-400'>Phone</p>
                  <p className='text-sm font-semibold text-gray-700'>
                    {editCustomer.phone}
                  </p>
                </div>
              </div>

              <label className='block text-xs font-semibold text-gray-500 mb-1.5'>
                Customer Name
              </label>
              <input
                type='text'
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                }}
                autoFocus
                className='w-full h-10 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 px-3 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all'
              />
            </div>

            {/* Footer */}
            <div className='flex gap-2 px-5 py-4 bg-gray-50 border-t border-gray-100'>
              <button
                onClick={closeEdit}
                className='flex-1 h-10 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim() || updateMutation.isPending}
                className='flex-1 h-10 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
              >
                {updateMutation.isPending && (
                  <span className='size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin' />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
