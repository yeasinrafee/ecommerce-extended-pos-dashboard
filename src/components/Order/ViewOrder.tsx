"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useOrder, type Order } from "@/hooks/order.api";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import CustomButton from "@/components/Common/CustomButton";
import {
  ChevronLeft,
  Download,
  Package,
  Truck,
  User,
  MapPin,
  Calendar,
  CreditCard,
} from "lucide-react";
import Image from "next/image";
import { generateInvoice } from "@/utils/generateInvoice";
import { useCompanyInformation } from "@/hooks/web.api";

interface ViewOrderProps {
  orderId: string;
}

type SelectedAttribute = {
  attributeName: string;
  attributeValue: string;
};

const getSelectedAttributes = (item: any): SelectedAttribute[] => {
  if (
    Array.isArray(item.selectedAttributes) &&
    item.selectedAttributes.length > 0
  ) {
    return item.selectedAttributes as SelectedAttribute[];
  }

  return Array.isArray(item.variations)
    ? item.variations
        .map((variation: any) => {
          const attributeName = variation.productVariation?.attribute?.name;
          const attributeValue = variation.productVariation?.attributeValue;

          if (!attributeName || !attributeValue) {
            return null;
          }

          return { attributeName, attributeValue };
        })
        .filter(Boolean)
    : [];
};

export default function ViewOrder({ orderId }: ViewOrderProps) {
  const router = useRouter();
  const { data: order, isLoading, error } = useOrder(orderId);

  const { data: companyInfo } = useCompanyInformation();

  const handleDownloadInvoice = (row: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    generateInvoice(row, { download: true }, companyInfo);
    // console.log("Generating invoice for:", order.id);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center bg-background rounded-lg border border-destructive/20 border-dashed">
        <h2 className="text-xl font-semibold text-destructive">
          Error Loading Order
        </h2>
        <p className="text-muted-foreground mt-2">
          Could not find the requested order or there was a network error.
        </p>
        <CustomButton
          onClick={() => router.back()}
          className="mt-4"
          variant="outline"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
        </CustomButton>
      </div>
    );
  }

  const getStatusColor = (status: Order["orderStatus"]) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "SHIPPED":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "DELIVERED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2 lg:space-y-0">
        <div className="flex justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="-ml-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </CustomButton>
              <h1 className="text-2xl font-bold tracking-tight">
                Order Details
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={`px-3 py-1 text-sm font-semibold border ${getStatusColor(order.orderStatus)}`}
            >
              {order.orderStatus}
            </Badge>
            <CustomButton
              variant="primary"
              size="sm"
              className="hidden sm:flex py-2"
              onClick={(e) => handleDownloadInvoice(order, e)}
            >
              <Download className="mr-2 h-4 w-4" /> Invoice
            </CustomButton>
          </div>
        </div>
        <p className="lg:text-sm text-xs text-muted-foreground">
          Order ID:{" "}
          <span className="font-mono font-medium text-foreground">
            {order.id}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="overflow-hidden border border-slate-200 rounded-lg shadow-sm bg-white">
            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Items for Order</h3>
              </div>
            </div>
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50/30">
                    <TableHead className="w-20 px-6">Image</TableHead>
                    <TableHead className="px-6">Product</TableHead>
                    <TableHead className="px-6 text-center">
                      Attribute
                    </TableHead>
                    <TableHead className="px-6 text-center">Qty</TableHead>
                    <TableHead className="px-6 text-right">Price</TableHead>
                    <TableHead className="px-6 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.orderItems?.map((item: any) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="px-6">
                        <div className="relative aspect-square w-14 h-14 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                          <Image
                            src={
                              item.product?.image || "/images/placeholder.svg"
                            }
                            alt={item.product?.name || "Product"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm line-clamp-1">
                            {item.product?.name}
                          </p>
                          <div className="flex gap-2 items-center">
                            {item.discountAmount > 0 ? (
                              <span className="text-xs text-muted-foreground line-through">
                                ${item.Baseprice?.toFixed(2)}
                              </span>
                            ) : null}
                            <span className="text-xs font-medium text-primary">
                              ${item.finalPrice?.toFixed(2)}
                            </span>
                            {item.discountAmount > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-4 text-green-600 border-green-200 bg-green-50"
                              >
                                -${item.discountAmount.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        {getSelectedAttributes(item).length > 0 ? (
                          <div className="flex gap-1 flex-wrap justify-center">
                            {getSelectedAttributes(item).map((attribute) => (
                              <Badge
                                key={`${item.id}-${attribute.attributeName}-${attribute.attributeValue}`}
                                variant="secondary"
                                className="text-sm p-2 h-4 mr-1"
                              >
                                {attribute.attributeName}:{" "}
                                {attribute.attributeValue}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 text-center font-medium">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="px-6 text-right text-sm">
                        ${item.finalPrice?.toFixed(2)}
                      </TableCell>
                      <TableCell className="px-6 text-right font-semibold">
                        ${(item.finalPrice * item.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="lg:hidden">
            <PricingSummary order={order} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="border py-4 border-slate-200 rounded-lg shadow-sm bg-white">
            <div className="border-b border-slate-50 bg-slate-50/30 rounded-t-lg px-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h4 className="text-base uppercase tracking-wider font-bold">
                  Customer Info
                </h4>
              </div>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">
                  Full Name
                </span>
                <span className="font-medium text-slate-900">
                  {order.customerName}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">
                  Email Address
                </span>
                <span className="font-medium text-slate-900 break-all">
                  {order.customerEmail || "N/A"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">
                  Phone Number
                </span>
                <span className="font-medium text-slate-900">
                  {order.customerPhone || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg shadow-sm bg-white py-4">
            <div className="border-b border-slate-50 bg-slate-50/30 rounded-t-lg px-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h4 className="text-base uppercase tracking-wider font-bold">
                  Delivery Address
                </h4>
              </div>
            </div>
            <div className="pt-5 space-y-4 px-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">
                  Street Address
                </span>
                <span className="font-medium text-slate-900">
                  {order.address?.streetAddress}{" "}
                  {order.address?.flatNumber
                    ? `, Flat ${order.address.flatNumber}`
                    : ""}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">
                  Post Code / City
                </span>
                <span className="font-medium text-slate-900">
                  {order.address?.postCode}
                </span>
              </div>
              {order.address?.zone?.name && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">
                    Zone
                  </span>
                  <span className="font-medium text-slate-900">
                    {order.address.zone.name}
                  </span>
                </div>
              )}
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">
                    Order Placed
                  </span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-slate-900">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString(
                            undefined,
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">
                    Expected Delivery
                  </span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {order.expectedDeliveryDate ? (
                      <span className="font-semibold text-slate-900">
                        {new Date(
                          order.expectedDeliveryDate,
                        ).toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    ) : order.address?.zone?.zonePolicies?.[0]?.zonePolicy
                        ?.deliveryTime ? (
                      (() => {
                        const days =
                          order.address.zone.zonePolicies[0].zonePolicy
                            .deliveryTime;
                        const est = new Date(order.createdAt);
                        est.setDate(est.getDate() + Math.ceil(days || 0));
                        return (
                          <span className="font-semibold text-slate-900">
                            Estimated: {est.toLocaleDateString("en-US")} (
                            {Math.ceil(days || 0)} days from order)
                          </span>
                        );
                      })()
                    ) : (
                      <span className="font-medium text-muted-foreground">
                        Calculating...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <PricingSummary order={order} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingSummary({ order }: { order: any }) {
  const itemTotalDiscount =
    order.orderItems?.reduce((acc: number, item: any) => {
      return acc + (item.Baseprice - item.finalPrice) * item.quantity;
    }, 0) || 0;

  return (
    <div className="border py-4 border-slate-200 rounded-lg shadow-sm overflow-hidden sticky top-6 bg-white">
      <div className="border-b border-slate-50 bg-slate-50/30 px-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h4 className="text-base uppercase tracking-wider font-bold text-slate-950">
            Order Summary
          </h4>
        </div>
      </div>
      <div className="pt-6 space-y-4 px-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Subtotal (Original)</span>
          <span className="font-medium">
            ${(order.baseAmount + itemTotalDiscount).toFixed(2)}
          </span>
        </div>

        {itemTotalDiscount > 0 && (
          <div className="flex justify-between items-center text-sm text-green-600 font-medium">
            <span className="flex items-center gap-1">Product Discounts</span>
            <span>-${itemTotalDiscount.toFixed(2)}</span>
          </div>
        )}

        {order.promo && (
          <div className="flex justify-between items-center text-sm bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-md">
                <Package className="h-4 w-4 text-blue-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">
                  Promo Code Used
                </span>
                <span className="text-blue-800 font-black">
                  {order.promo.code}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-blue-600 font-semibold uppercase block">
                Discount Received
              </span>
              <span className="font-black text-blue-700">
                -${order.discountAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-1 group">
            Shipping
            <Truck className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </span>
          <div className="flex flex-col items-end">
            <span className="font-medium">
              ${order.finalShippingCharge?.toFixed(2)}
            </span>
            {order.extraShippingCharge > 0 && (
              <span className="text-[10px] text-muted-foreground">
                Incl. extra weight/vol fees
              </span>
            )}
          </div>
        </div>

        {order.tax > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">${order.tax?.toFixed(2)}</span>
          </div>
        )}

        <Separator className="my-2 bg-slate-100" />

        <div className="flex justify-between items-center">
          <span className="text-base font-semibold text-slate-950">
            Total Amount
          </span>
          <span className="text-xl font-semibold">
            ${order.finalAmount?.toFixed(2)}
          </span>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-50 text-[10px] text-center text-muted-foreground italic">
          Placed on {new Date(order.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
