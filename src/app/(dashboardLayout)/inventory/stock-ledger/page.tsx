'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/auth';
import { 
  LuSearch, LuCalendar, LuFilter, LuUser, LuLink
} from 'react-icons/lu';
import Loader from '@/components/Common/Loader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaginationControl } from '@/components/Common/Pagination';

interface StockMovement {
  id: string;
  productId: string;
  locationId: string;
  movementType: 'PURCHASE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'SALE' | 'CUSTOMER_RETURN' | 'SUPPLIER_RETURN' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'EXPIRED';
  previousQuantity: number;
  quantityChanged: number;
  currentQuantity: number;
  referenceType: string;
  referenceId: string;
  notes?: string;
  createdAt: string;
  product: {
    name: string;
    sku: string;
  };
  location: {
    name: string;
    code: string;
  };
  performer: {
    email: string;
  };
}

export default function StockLedgerPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Queries
  const { data: movementsRes, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['ledger', 'list', page, selectedLocation, selectedProduct, selectedType, startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<any>>('/stocks/reports/movements', {
        params: {
          page,
          limit,
          locationId: selectedLocation || undefined,
          productId: selectedProduct || undefined,
          movementType: selectedType || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }
      });
      const payload = response.data.data;
      if (Array.isArray(payload)) return { data: payload, meta: { page: 1, totalPages: 1, total: payload.length, limit: 15 } };
      return payload;
    }
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['ledger', 'locations'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<any[]>>('/stocks/locations/get-all');
      return response.data.data;
    }
  });

  const { data: productsRes } = useQuery({
    queryKey: ['ledger', 'products'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<any>>('/products/get-all');
      const data = response.data.data;
      return Array.isArray(data) ? data : (data as any)?.data || [];
    }
  });

  const handleClearFilters = () => {
    setSelectedLocation('');
    setSelectedProduct('');
    setSelectedType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const getMovementTypeBadge = (type: string) => {
    const configs: Record<string, string> = {
      PURCHASE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      TRANSFER_IN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      TRANSFER_OUT: 'bg-blue-50 text-blue-700 border-blue-200',
      SALE: 'bg-sky-50 text-sky-700 border-sky-200',
      CUSTOMER_RETURN: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      SUPPLIER_RETURN: 'bg-purple-50 text-purple-700 border-purple-200',
      ADJUSTMENT_IN: 'bg-teal-50 text-teal-700 border-teal-200',
      ADJUSTMENT_OUT: 'bg-orange-50 text-orange-700 border-orange-200',
      DAMAGE: 'bg-rose-50 text-rose-700 border-rose-200',
      EXPIRED: 'bg-red-50 text-red-700 border-red-200',
    };

    return (
      <Badge variant="outline" className={`font-semibold py-0.5 px-2 text-[10px] uppercase rounded-full ${configs[type] || 'bg-slate-50 text-slate-700'}`}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  const itemsList = movementsRes?.data || [];
  const meta = movementsRes?.meta || { page: 1, totalPages: 1, total: 0, limit: 15 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Stock Ledger</h1>
          <p className="text-xs text-slate-500">Historical timeline audit of all inventory movements including purchases, sales, transfers, and adjustments.</p>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <Card className="p-5 border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2 text-slate-700 font-semibold text-sm">
          <LuFilter className="h-4 w-4" /> Filter Audit Log
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => { setSelectedProduct(e.target.value); setPage(1); }}
              className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
            >
              <option value="">All Products</option>
              {productsRes?.map((prod: any) => (
                <option key={prod.id} value={prod.id}>{prod.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => { setSelectedLocation(e.target.value); setPage(1); }}
              className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
            >
              <option value="">All Locations</option>
              {locationsRes?.map((loc: any) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Movement Type</label>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
              className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
            >
              <option value="">All Types</option>
              <option value="PURCHASE">Purchase</option>
              <option value="SALE">Sale</option>
              <option value="TRANSFER_IN">Transfer In</option>
              <option value="TRANSFER_OUT">Transfer Out</option>
              <option value="ADJUSTMENT_IN">Adjustment In</option>
              <option value="ADJUSTMENT_OUT">Adjustment Out</option>
              <option value="DAMAGE">Damage</option>
              <option value="CUSTOMER_RETURN">Customer Return</option>
              <option value="SUPPLIER_RETURN">Supplier Return</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full bg-[#f8fafc] border-slate-200 text-slate-800 text-sm h-10 rounded-xl outline-none border px-3"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="ghost" onClick={handleClearFilters} className="text-xs border">
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Ledger Table */}
      <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
        {isLoadingLedger ? (
          <div className="flex h-64 items-center justify-center">
            <Loader />
          </div>
        ) : itemsList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-medium">No ledger entries found matching the criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase font-sans">
                  <th className="p-4 w-44">Timestamp</th>
                  <th className="p-4">Product details</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Movement Type</th>
                  <th className="p-4 text-right">Prev Balance</th>
                  <th className="p-4 text-center">Change Qty</th>
                  <th className="p-4 text-right">New Balance</th>
                  <th className="p-4">Details/Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {itemsList.map((mv: any) => (
                  <tr key={mv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-500 whitespace-nowrap">
                      {new Date(mv.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{mv.product?.name}</div>
                    </td>
                    <td className="p-4 font-mono font-semibold text-[11px]">{mv.product?.sku}</td>
                    <td className="p-4 font-medium text-slate-800">{mv.location?.name}</td>
                    <td className="p-4">{getMovementTypeBadge(mv.movementType)}</td>
                    <td className="p-4 text-right font-medium text-slate-500">{mv.previousQuantity}</td>
                    <td className="p-4 text-center font-bold text-sm">
                      <span className={mv.quantityChanged > 0 ? 'text-green-600' : 'text-red-500'}>
                        {mv.quantityChanged > 0 ? `+${mv.quantityChanged}` : mv.quantityChanged}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">{mv.currentQuantity}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-800 leading-normal font-medium">{mv.notes || 'System transaction'}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <LuUser className="h-3 w-3" /> Performed by: {mv.performer?.email}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <LuLink className="h-3 w-3" /> Ref: {mv.referenceType} ({mv.referenceId.substring(0,8)})
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">Showing page {meta.page} of {meta.totalPages} ({meta.total} entries)</p>
                <PaginationControl
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
