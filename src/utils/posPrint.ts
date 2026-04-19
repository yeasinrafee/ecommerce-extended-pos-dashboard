import { PosBillDetail } from "@/hooks/pos.api";
import { POS_CONFIG } from "@/config/pos.config";

export const printPosReceipt = (bill: PosBillDetail) => {
  const printWindow = document.createElement("iframe");
  printWindow.style.position = "absolute";
  printWindow.style.top = "-1000px";
  printWindow.style.left = "-1000px";
  printWindow.style.width = "58mm"; // Standard mini POS Thermal printer width
  document.body.appendChild(printWindow);

  const doc = printWindow.contentWindow?.document;
  if (!doc) return;

  const dateStr = new Date(bill.createdAt).toLocaleString();

  // Format Items
  const itemsHtml = bill.items
    .map((item) => {
      let variantHtml = "";
      if (item.variations && item.variations.length > 0) {
        const variantsInfo = item.variations
          .map((v) => v.attributeValue)
          .join(", ");
        variantHtml = `<div class="item-variant">(${variantsInfo})</div>`;
      }

      return `
      <tr>
        <td class="col-name">${item.productName}${variantHtml}</td>
        <td class="col-qty">${item.quantity}</td>
        <td class="col-price">${item.unitFinalPrice.toFixed(0)}</td>
        <td class="col-total">${item.lineFinalTotal.toFixed(0)}</td>
      </tr>
    `;
    })
    .join("");

  const lineFinalTotalSum = bill.items.reduce(
    (sum, item) => sum + item.lineFinalTotal,
    0,
  );
  const orderDiscountAmount = lineFinalTotalSum - bill.finalAmount;

  // Defensive Payment Calculations
  const paymentsPool = bill.payments || (bill as any).globalPayments || [];
  const totalPaidFromPayments = paymentsPool.reduce(
    (sum: number, p: any) => sum + (p.amount || 0),
    0,
  );

  // Trust the higher value (handles async background processing vs re-fetched data)
  const displayPaid = Math.max(bill.totalPaid || 0, totalPaidFromPayments);

  // Due is strictly what's left after displayPaid
  const displayDue = Math.max(0, bill.finalAmount - displayPaid);

  const methods = Array.from(
    new Set(paymentsPool.map((p: any) => p.paymentMethod)),
  ).filter(Boolean);
  const methodStr = methods.length > 0 ? methods.join(", ") : "CASH";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>POS Receipt</title>
        <style>
          @page { margin: 6px; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 58mm;
            margin: 0;
            padding: 4px;
            box-sizing: border-box;
            font-size: 11px;
            color: #000;
            background: #fff;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .mb-1 { margin-bottom: 2px; }
          .mb-2 { margin-bottom: 5px; }
          .mt-2 { margin-top: 5px; }
          .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
          .border-top { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
          
          .company-name { font-size: 14px; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 2px; }
          .company-info { text-align: center; font-size: 10px; margin-bottom: 2px; white-space: pre-wrap; }
          
          .receipt-header { margin-top: 5px; font-size: 10px; }
          .receipt-header div { display: flex; justify-content: space-between; margin-bottom: 2px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 10px; }
          th { text-align: left; border-bottom: 1px dashed #000; padding-bottom: 2px; }
          th.col-qty, td.col-qty { text-align: center; width: 15%; }
          th.col-price, td.col-price { text-align: right; width: 22%; }
          th.col-total, td.col-total { text-align: right; width: 25%; }
          td { vertical-align: top; padding-top: 3px; }
          .col-name { width: 38%; }
          .item-variant { font-size: 9px; color: #333; line-height: 1.2; margin-top: 1px; }
          .item-discount { font-size: 9px; color: #d32f2f; line-height: 1.2; margin-top: 1px; }

          .totals { margin-top: 5px; padding-top: 5px; border-top: 1px dashed #000; }
          .totals-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
          
          .footer { text-align: center; margin-top: 10px; font-size: 10px; }
          .footer div { margin-bottom: 2px; }
          
          /* Print specific adjustments */
          @media print {
            body { width: 58mm; margin: 0; padding: 4px; box-sizing: border-box; }
          }
        </style>
      </head>
      <body>
        <div class="company-name">${POS_CONFIG.companyName}</div>
        <div class="company-info">${POS_CONFIG.companyAddress}</div>
        <div class="company-info">Tel: ${POS_CONFIG.companyPhone}</div>
        
        <div class="border-bottom"></div>
        
        <div class="receipt-header">
          <div><span>Invoice:</span> <b>${bill.invoiceNumber}</b></div>
          <div><span>Date:</span> <span>${dateStr}</span></div>
          <div><span>Cashier:</span> <span>${bill.cashier?.name || "Admin"}</span></div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="col-name">Item</th>
              <th class="col-qty">Qty</th>
              <th class="col-price">Rate</th>
              <th class="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="totals border-top">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>Tk ${lineFinalTotalSum.toFixed(2)}</span>
          </div>
          ${
            orderDiscountAmount > 0.01
              ? `
          <div class="totals-row">
            <span>Order Discount:</span>
            <span>-Tk ${orderDiscountAmount.toFixed(2)}</span>
          </div>
          `
              : ""
          }
          <div class="totals-row font-bold" style="font-size: 13px; margin-top: 3px;">
            <span>Total:</span>
            <span>Tk ${bill.finalAmount.toFixed(2)}</span>
          </div>

          <div class="border-top mt-2 mb-1"></div>
          
          <div class="totals-row">
            <span>Paid Amount:</span>
            <span>Tk ${displayPaid.toFixed(2)}</span>
          </div>
          ${
            displayDue > 0.01
              ? `
          <div class="totals-row font-bold">
            <span>Due Balance:</span>
            <span>Tk ${displayDue.toFixed(2)}</span>
          </div>
          `
              : ""
          }
          <div class="totals-row" style="font-size: 9px; margin-top: 2px;">
            <span>Method:</span>
            <span>${methodStr}</span>
          </div>
        </div>
        
        <div class="border-top mb-2"></div>
        
        <div class="footer">
          <div>Thank You for Shopping!</div>
          <div style="font-size: 8px; margin-top: 5px; color: #555;">Powered by YES Global Tech</div>
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for fonts to load briefly then print
  setTimeout(() => {
    printWindow.contentWindow?.focus();
    printWindow.contentWindow?.print();

    // Automatically remove iframe after print dialog finishes/closes
    setTimeout(() => {
      document.body.removeChild(printWindow);
    }, 1000);
  }, 500);
};
