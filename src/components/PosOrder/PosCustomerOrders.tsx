'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import TableSkeleton from '@/components/Common/TableSkeleton';
import { PaginationControl } from '@/components/Common/Pagination';
import { ArrowLeft, Phone, ChevronDown, Package } from 'lucide-react';
import {
  usePosCustomer,
  usePosCustomerOrders,
  type PosCustomerOrderSummary,
  type PosCustomerOrderItem,
} from '@/hooks/pos-customer.api';

export default function PosCustomerOrders() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [page, setPage] = React.useState(1);
  const limit = 10;
  const [expandedOrders, setExpandedOrders] = React.useState<Set<string>>(
    new Set(),
  );

  const toggleExpand = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { data: customer, isLoading: customerLoading } =
    usePosCustomer(customerId);
  const { data: ordersData, isLoading: ordersLoading } = usePosCustomerOrders(
    customerId,
    { page, limit },
  );

  const orders = ordersData?.data ?? [];
  const meta = ordersData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const totalItems = meta?.total ?? 0;

  if (customerLoading) {
    return (
      <div className='p-6'>
        <TableSkeleton columns={3} rowCount={1} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className='p-6 text-center text-red-500'>Customer not found.</div>
    );
  }

  return (
    <div className='p-4 md:p-6'>
      {/* Back button + Customer info header */}
      <div className='mb-6'>
        <button
          onClick={() => router.push('/dashboard/pos-customer/manage')}
          className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors'
        >
          <ArrowLeft className='size-4' />
          Back to Customers
        </button>

        <div className='flex items-center gap-4'>
          <div className='size-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-sm'>
            <span className='text-xl font-bold text-white'>
              {(customer.name || 'C').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>{customer.name}</h2>
            <div className='flex items-center gap-4 mt-1 text-sm text-gray-500'>
              <span className='flex items-center gap-1'>
                <Phone className='size-3.5' />
                {customer.phone}
              </span>
            </div>
          </div>
          <div className='ml-auto'>
            <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800'>
              {customer._count?.posOrders ?? customer.posOrderIds?.length ?? 0}{' '}
              Total Orders
            </span>
          </div>
        </div>
      </div>

      {/* Orders table */}
      <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
        <div className='px-5 py-4 border-b border-gray-100'>
          <h3 className='text-base font-bold text-gray-800'>Order History</h3>
        </div>

        {ordersLoading ? (
          <TableSkeleton />
        ) : orders.length === 0 ? (
          <div className='p-12 text-center'>
            <p className='text-gray-400 font-medium'>No orders found</p>
            <p className='text-sm text-gray-400 mt-1'>
              This customer has not placed any orders yet.
            </p>
          </div>
        ) : (
          <div>
            {/* Custom expandable table */}
            <div className='overflow-x-auto'>
              <table className='w-full table-fixed border-collapse'>
                <thead>
                  <tr className='bg-gray-50 border-b border-gray-200'>
                    <th className='w-10 py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      #
                    </th>
                    <th className='w-[18%] py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Invoice
                    </th>
                    <th className='w-[10%] py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Items
                    </th>
                    <th className='w-[14%] py-3 px-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Amount
                    </th>
                    <th className='w-[12%] py-3 px-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Paid
                    </th>
                    <th className='w-[12%] py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='w-[18%] py-3 px-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Date
                    </th>
                    <th className='w-[6%] py-3 px-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider' />
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {orders.map((order, idx) => {
                    const isExpanded = expandedOrders.has(order.id);
                    const statusColors: Record<string, string> = {
                      PAID: 'bg-green-100 text-green-700',
                      PENDING: 'bg-yellow-100 text-yellow-700',
                      DUE: 'bg-red-100 text-red-700',
                    };

                    return (
                      <React.Fragment key={order.id}>
                        {/* Main row */}
                        <tr
                          onClick={() => toggleExpand(order.id)}
                          className='hover:bg-gray-50/50 cursor-pointer transition-colors group'
                        >
                          <td className='py-3 px-2 text-center text-sm text-gray-500'>
                            {(page - 1) * limit + idx + 1}
                          </td>
                          <td className='py-3 px-3'>
                            <span className='font-semibold text-sm text-gray-900'>
                              #{order.invoiceNumber}
                            </span>
                          </td>
                          <td className='py-3 px-2 text-center'>
                            <span className='text-sm text-gray-600'>
                              {order.totalQuantity}
                            </span>
                          </td>
                          <td className='py-3 px-2 text-right'>
                            <span className='font-bold text-sm text-gray-900'>
                              ৳{order.totalAmount.toFixed(2)}
                            </span>
                          </td>
                          <td className='py-3 px-2 text-right'>
                            <span className='text-sm text-gray-600'>
                              ৳{order.paidAmount.toFixed(2)}
                            </span>
                          </td>
                          <td className='py-3 px-2 text-center'>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                statusColors[order.paymentStatus] ||
                                'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className='py-3 px-3 text-right'>
                            <span className='text-xs text-gray-500'>
                              {new Date(order.createdAt).toLocaleDateString(
                                'en-US',
                                {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </span>
                          </td>
                          <td className='py-3 px-2 text-center'>
                            <ChevronDown
                              className={`size-4 text-gray-400 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </td>
                        </tr>

                        {/* Expanded items row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className='bg-gray-50/80 px-4 py-0'>
                              <div className='py-3 border-t border-gray-200'>
                                <div className='grid grid-cols-1 gap-2'>
                                  {order.items?.map((item) => (
                                    <div
                                      key={item.id}
                                      className='flex items-center gap-3 bg-white rounded-lg border border-gray-150 px-3 py-2.5 shadow-sm'
                                    >
                                      {/* Product thumbnail */}
                                      <div className='size-10 rounded-md bg-gray-100 border border-gray-200 shrink-0 overflow-hidden relative'>
                                        {item.productImage ? (
                                          <Image
                                            src={item.productImage}
                                            alt={item.productName}
                                            fill
                                            className='object-cover'
                                          />
                                        ) : (
                                          <div className='size-full flex items-center justify-center'>
                                            <Package className='size-4 text-gray-300' />
                                          </div>
                                        )}
                                      </div>
                                      {/* Item details */}
                                      <div className='flex-1 min-w-0'>
                                        <p className='text-sm font-semibold text-gray-900 truncate'>
                                          {item.productName}
                                        </p>
                                        <p className='text-[11px] text-gray-400 mt-0.5'>
                                          SKU: {item.productSku}
                                          {item.variations?.length > 0 &&
                                            ` · ${item.variations
                                              .map((v) => v.attributeValue)
                                              .join(', ')}`}
                                        </p>
                                      </div>
                                      {/* Price x Qty + Total */}
                                      <div className='text-right shrink-0'>
                                        <p className='text-[11px] text-gray-400'>
                                          ৳{item.unitPrice.toFixed(2)} ×{' '}
                                          {item.quantity}
                                        </p>
                                        <p className='text-sm font-bold text-gray-900'>
                                          ৳{item.lineTotal.toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className='px-4 py-3 border-t border-gray-100'>
              <PaginationControl
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={totalItems}
                itemsPerPage={limit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
