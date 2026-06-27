# Quick Fix Reference - Inventory Module

## Common Issues & Solutions

### Issue 1: Product List Not Loading
**Error:** Products dropdown empty or showing wrong data

**Root Cause:** Using wrong API endpoint `/products/get-all-paginated?limit=100`

**Fix:**
```typescript
// ❌ WRONG
const response = await apiClient.get('/products/get-all-paginated?limit=100');
return response.data.data?.data || [];

// ✅ CORRECT
const response = await apiClient.get('/products/get-all');
const data = response.data.data;
return Array.isArray(data) ? data : (data as any)?.data || [];
```

---

### Issue 2: Edit Button Throws "Cannot read properties of undefined"
**Error:** `Cannot read properties of undefined (reading 'map')`

**Root Cause:** Not handling null/undefined items array when loading edit form

**Fix:**
```typescript
// ❌ WRONG
setValue('items', editingData.items.map(item => ({...})));

// ✅ CORRECT
setValue('items', (editingData.items || []).map(item => ({
  productId: item.productId,
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  taxRate: item.taxRate || 0,
  discountAmount: item.discountAmount || 0,
})));
```

---

### Issue 3: Payment Summary Not Calculating
**Error:** Total shows NaN or 0 when adding items

**Root Cause:** Not watching form fields or improper calculation logic

**Fix:**
```typescript
const watchedItems = watch('items');

const calculatedTotals = React.useMemo(() => {
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  
  watchedItems?.forEach(item => {
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const itemSubtotal = qty * price;
    subtotal += itemSubtotal;
    totalTax += (itemSubtotal * (item.taxRate || 0)) / 100;
    totalDiscount += item.discountAmount || 0;
  });
  
  const grandTotal = subtotal + totalTax - totalDiscount;
  return { subtotal, totalTax, totalDiscount, grandTotal };
}, [watchedItems]);
```

---

### Issue 4: Wrong Button Labels (Delete shows as Approve)
**Error:** Button shows wrong label after clicking

**Root Cause:** Event propagation or incorrect conditional rendering

**Fix:**
```typescript
// ❌ WRONG
<Button onClick={handleApprove}>
  {isPending ? 'Approving...' : 'Delete'}
</Button>

// ✅ CORRECT
<Button 
  onClick={(e) => { 
    e.stopPropagation(); 
    handleApprove(id); 
  }}
  disabled={status === 'APPROVED' || approveMutation.isPending}
>
  {approveMutation.isPending && approveMutation.variables === id 
    ? <LuRefreshCw className="animate-spin" /> 
    : <LuCheck />}
</Button>
```

---

### Issue 5: Can't Delete/Edit Approved Records
**Error:** Can delete or edit records that should be locked

**Root Cause:** Missing status checks in button disabled state

**Fix:**
```typescript
// ✅ CORRECT
<Button
  onClick={() => handleEdit(record)}
  disabled={record.status === 'APPROVED' || record.status === 'CANCELLED'}
>
  Edit
</Button>

<Button
  onClick={() => handleDelete(record.id)}
  disabled={record.status === 'APPROVED'}
>
  Delete
</Button>
```

---

### Issue 6: Auto-fill Price Not Working
**Error:** Unit price doesn't auto-fill when selecting product

**Root Cause:** Not handling product selection change event

**Fix:**
```typescript
const handleProductSelect = (index: number, productId: string) => {
  const selectedProd = productsRes?.find((p: any) => p.id === productId);
  if (selectedProd) {
    setValue(`items.${index}.unitPrice`, selectedProd.basePrice || 0);
  }
};

// In the select element
<select
  {...register(`items.${index}.productId`)}
  onChange={(e) => handleProductSelect(index, e.target.value)}
>
  {/* options */}
</select>
```

---

### Issue 7: Pagination Not Working
**Error:** Can't navigate to other pages

**Root Cause:** API response structure inconsistency

**Fix:**
```typescript
const { data: itemsRes } = useQuery({
  queryKey: ['items', page, filters],
  queryFn: async () => {
    const response = await apiClient.get('/items/get-all-paginated', {
      params: { page, limit, ...filters }
    });
    const payload = response.data.data;
    
    // Handle both array and paginated response
    if (Array.isArray(payload)) {
      return { 
        data: payload, 
        meta: { page: 1, totalPages: 1, total: payload.length, limit: 10 }
      };
    }
    return payload; // { data: [...], meta: {...} }
  }
});

const items = itemsRes?.data || [];
const meta = itemsRes?.meta || { page: 1, totalPages: 1, total: 0, limit: 10 };
```

---

### Issue 8: Form Doesn't Reset After Submit
**Error:** Old data remains in form after creating/editing

**Root Cause:** Not calling reset() after successful mutation

**Fix:**
```typescript
const createMutation = useMutation({
  mutationFn: async (data) => {
    return await apiClient.post('/endpoint', data);
  },
  onSuccess: () => {
    toast.success('Created successfully');
    reset(); // Reset form to default values
    setFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['items'] });
  }
});
```

---

## Backend API Response Patterns

### Standard Paginated Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "data": [...items...],
    "meta": {
      "page": 1,
      "totalPages": 5,
      "total": 50,
      "limit": 10
    }
  }
}
```

### Standard List Response (All)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": [...items...]
}
```

### Standard Create/Update Response
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Created successfully",
  "data": {...created item...}
}
```

---

## Testing Commands

### Build Check
```bash
npm run build
```

### Type Check
```bash
npm run type-check
# or
npx tsc --noEmit
```

### Lint Check
```bash
npm run lint
```

### Run Dev Server
```bash
npm run dev
```

---

## File Change Checklist

When modifying inventory pages:

- [ ] Update API endpoint to `/products/get-all`
- [ ] Add response data handling for array/object format
- [ ] Add null checks for items array in edit form
- [ ] Implement proper event handlers (stopPropagation)
- [ ] Add status-based button disabled states
- [ ] Implement watch() for reactive calculations
- [ ] Add useMemo for heavy calculations
- [ ] Add proper loading states (isPending checks)
- [ ] Add success/error toast notifications
- [ ] Invalidate queries after mutations
- [ ] Reset form after successful create/update
- [ ] Add proper TypeScript types
- [ ] Test with empty data states
- [ ] Test pagination if applicable
- [ ] Test all CRUD operations
- [ ] Check responsive design on mobile

---

## Common Backend Validation Errors

### Error: "Product not found"
- Ensure productId is a valid UUID string
- Check product hasn't been soft-deleted

### Error: "Location not found"  
- Ensure locationId is valid
- Check location status is ACTIVE

### Error: "Insufficient stock"
- Check stock quantity at the location
- Cannot deduct more than available stock

### Error: "Cannot delete approved record"
- Only DRAFT/PENDING records can be deleted
- Approved records are locked

### Error: "Supplier not found"
- Ensure supplierId is valid (number type)
- Check supplier hasn't been soft-deleted

---

## Debugging Tips

### 1. Check Network Tab
Look for:
- 404: Wrong endpoint URL
- 400: Validation error (check request body)
- 500: Server error (check backend logs)

### 2. Console Errors
```typescript
// Add debug logging
console.log('Response:', response);
console.log('Data:', response.data.data);
console.log('Watched Items:', watchedItems);
```

### 3. React Query Devtools
Enable React Query Devtools to see:
- Query states
- Cache data
- Refetch status

```typescript
// In your layout or main component
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

### 4. Form State Debugging
```typescript
// Watch all form values
const allValues = watch();
console.log('Form Values:', allValues);
console.log('Form Errors:', errors);
```

---

**Last Updated:** 2026-06-24
