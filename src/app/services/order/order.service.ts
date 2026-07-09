/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Injectable } from '@angular/core';
import { ApiService } from '../common/api.service';
import { base64ToBlob } from '../common/blob.util';
import { Observable, map } from 'rxjs';
import {
  FacilityLookupItem,
  OrderDetailResponse,
  OrderDisplayInfoResponse,
  OrderIdentificationSummary,
  OrderHeaderSummary,
  OrderItemQuantityPayload,
  OrderListResponse,
  OrderNotePayload,
  VendorLookupItem,
} from '@ofbiz/models/order.model';
import type { CompanyProductStore } from '../company/company.service';

export interface OrderListFilters {
  statusId?: string;
  productStoreId?: string;
  facilityId?: string;
  orderDatePreset?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  constructor(private apiService: ApiService) { }

  getOrdersByType(
    pageIndex: number,
    keyword: string,
    orderTypeId: string,
    pageSize: number = 10,
    sortBy?: string,
    sortDirection?: string,
    filters?: OrderListFilters
  ): Observable<OrderListResponse> {
    return this.fetchOrderList(
      pageIndex,
      pageSize,
      keyword,
      orderTypeId,
      sortBy,
      sortDirection,
      filters
    );
  }

  getOrders(pageIndex: number, keyword: string, sortBy?: string, sortDirection?: string, filters?: OrderListFilters): Observable<OrderListResponse> {
    return this.getOrdersByType(pageIndex, keyword, 'SALES_ORDER', 10, sortBy, sortDirection, filters);
  }

  getQuotes(pageIndex: number, keyword: string, sortBy?: string, sortDirection?: string, filters?: OrderListFilters): Observable<OrderListResponse> {
    return this.getOrdersByType(pageIndex, keyword, 'SALES_QUOTE', 10, sortBy, sortDirection, filters);
  }

  getPOs(
    pageIndex: number,
    pageSize: number,
    keyword: string,
    sortBy?: string,
    sortDirection?: string,
    filters?: OrderListFilters
  ): Observable<OrderListResponse> {
    return this.fetchOrderList(
      pageIndex,
      pageSize,
      keyword,
      'PURCHASE_ORDER',
      sortBy,
      sortDirection,
      filters
    );
  }

  getPurchaseQuotes(
    pageIndex: number,
    pageSize: number,
    keyword: string,
    sortBy?: string,
    sortDirection?: string,
    filters?: OrderListFilters
  ): Observable<OrderListResponse> {
    return this.fetchOrderList(
      pageIndex,
      pageSize,
      keyword,
      'PURCHASE_QUOTE',
      sortBy,
      sortDirection,
      filters
    );
  }

  private fetchOrderList(
    pageIndex: number,
    pageSize: number,
    keyword: string,
    orderTypeId: string,
    sortBy?: string,
    sortDirection?: string,
    filters?: OrderListFilters
  ): Observable<OrderListResponse> {
    const params = new URLSearchParams();
    params.append('page', pageIndex.toString());
    params.append('size', pageSize.toString());
    params.append('queryString', keyword || '');
    params.append('orderTypeId', orderTypeId);
    if (filters?.statusId) {
      params.append('statusId', filters.statusId);
    }
    if (filters?.productStoreId) {
      params.append('productStoreId', filters.productStoreId);
    }
    if (filters?.facilityId) {
      params.append('facilityId', filters.facilityId);
    }
    if (filters?.orderDatePreset) {
      params.append('orderDatePreset', filters.orderDatePreset);
    }
    if (sortBy) {
      params.append('sortBy', sortBy);
    }
    if (sortDirection) {
      params.append('sortDirection', sortDirection);
    }

    const url = `/common/orders?${params.toString()}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => {
        return this.normalizeOrderListResponse(response);
      })
    );
  }

  createCustomer(params: Record<string, unknown>): Observable<unknown> {
    const url = '/common/customers';
    return this.apiService.post<any>(url, params).pipe(map((res) => res?.data ?? res));
  }

  getCustomer(partyId: string): Observable<unknown> {
    const url = `/common/customers/${encodeURIComponent(partyId)}`;
    return this.apiService.get<any>(url).pipe(map((res) => res?.data ?? res));
  }

  getOrder(orderId: string): Observable<OrderDetailResponse> {
    const url = `/common/orders/${encodeURIComponent(orderId)}`;
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapResponse(res) as OrderDetailResponse));
  }

  getOrderById(id: number | string): Observable<OrderDetailResponse> {
    const url = `/common/orders/by-id/${encodeURIComponent(String(id))}`;
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapResponse(res) as OrderDetailResponse));
  }

  getPODisplayInfo(orderId: string): Observable<OrderDisplayInfoResponse> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/display-info`;
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapResponse(res) as OrderDisplayInfoResponse));
  }

  getOrderDisplayInfoById(id: number | string): Observable<OrderDisplayInfoResponse> {
    const url = `/common/orders/by-id/${encodeURIComponent(String(id))}/display-info`;
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapResponse(res) as OrderDisplayInfoResponse));
  }

  getOrderIdentifications(orderId: string): Observable<OrderIdentificationSummary[]> {
    const url = `/common/order-identifications?orderId=${encodeURIComponent(orderId)}`;
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapList<OrderIdentificationSummary>(res)));
  }

  createOrder(params: Record<string, unknown>): Observable<unknown> {
    return this.apiService.post<any>('/common/orders', params).pipe(map((res) => this.unwrapResponse(res)));
  }

  reorderOrder(orderId: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/reorder`;
    return this.apiService.post<any>(url, {}).pipe(map((res) => this.unwrapResponse(res)));
  }

  convertQuoteToOrder(orderId: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/convert-to-order`;
    return this.apiService.post<any>(url, {}).pipe(map((res) => this.unwrapResponse(res)));
  }

  convertPurchaseQuoteToOrder(orderId: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/convert-to-po`;
    return this.apiService.post<any>(url, {}).pipe(map((res) => this.unwrapResponse(res)));
  }

  approvePurchaseOrder(orderId: string): Observable<unknown> {
    return this.updateOrderStatus(orderId, 'ORDER_APPROVED');
  }

  approveSalesOrder(orderId: string): Observable<unknown> {
    return this.updateOrderStatus(orderId, 'ORDER_APPROVED');
  }

  receivePurchaseOrder(orderId: string, payload: Record<string, unknown>): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/receive`;
    return this.apiService.post<any>(url, payload).pipe(map((res) => this.unwrapResponse(res)));
  }

  apportionLandedCosts(payload: Record<string, unknown>): Observable<unknown> {
    return this.apiService.post<any>('/common/services/apportionLandedCosts', payload)
      .pipe(map((res) => this.unwrapResponse(res)));
  }

  getTransferOrders(pageIndex: number, keyword: string, pageSize: number = 20, sortBy?: string, sortDirection?: string, filters?: OrderListFilters): Observable<OrderListResponse> {
    return this.getOrdersByType(pageIndex, keyword, 'TRANSFER_ORDER', pageSize, sortBy, sortDirection, filters);
  }

  receiveTransferOrder(orderId: string, payload: Record<string, unknown>): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/receive-transfer`;
    return this.apiService.post<any>(url, payload).pipe(map((res) => this.unwrapResponse(res)));
  }

  createTransferShipment(orderId: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/transfer-shipment`;
    return this.apiService.post<any>(url, {}).pipe(map((res) => this.unwrapResponse(res)));
  }

  getPicklistableOrders(orderTypeId?: string): Observable<unknown> {
    const params = orderTypeId ? `?orderTypeId=${encodeURIComponent(orderTypeId)}` : '';
    return this.apiService.get<any>(`/common/orders/picklistable${params}`).pipe(map((res) => this.unwrapList(res)));
  }

  getOrderInvoices(orderId: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/invoices`;
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapList(res)));
  }

  getOrderShipments(orderId: string): Observable<unknown> {
    const url = `/common/shipments/by-order/${encodeURIComponent(orderId)}`;
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapResponse(res)));
  }

  createBulkPicklist(orderIds: string[], facilityId?: string): Observable<unknown> {
    const url = '/common/orders/picklist/bulk';
    const payload: any = { orderIds };
    if (facilityId) {
      payload.facilityId = facilityId;
    }
    return this.apiService.post<any>(url, payload).pipe(map((res) => this.unwrapResponse(res)));
  }

  getOrderPdf(orderId: string): Observable<Blob> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/pdf`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => base64ToBlob(response?.data?.pdfBytes, 'application/pdf'))
    );
  }

  getOrderPicklists(orderId: string): Observable<unknown> {
    const url = `/common/picklists/by-order/${encodeURIComponent(orderId)}`;
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapResponse(res)));
  }

  getOrderShortages(facilityId?: string): Observable<any[]> {
    const url = facilityId
      ? `/common/orders/shortages?facilityId=${encodeURIComponent(facilityId)}`
      : '/common/orders/shortages';
    return this.apiService.get<any>(url).pipe(
      map((res: any) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  getReservationStatus(orderId: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/reservation-status`;
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapResponse(res)));
  }

  getReservedOrders(): Observable<unknown> {
    const url = '/common/orders/reserved';
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapResponse(res)));
  }

  getReservedOrderItems(orderId: string): Observable<any[]> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/reserved-items`;
    return this.apiService.get<any>(url).pipe(map((res) => this.unwrapList<any>(res)));
  }

  createPicklist(orderId: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/picklist`;
    return this.apiService.post<any>(url, {}).pipe(map((res) => this.unwrapResponse(res)));
  }

  markPicklistPicked(picklistId: string): Observable<unknown> {
    const url = `/common/picklists/${encodeURIComponent(picklistId)}/mark-picked`;
    return this.apiService.post<any>(url, {}).pipe(map((res) => res?.data ?? res));
  }

  shipShipment(shipmentId: string): Observable<unknown> {
    const url = `/common/shipments/${encodeURIComponent(shipmentId)}/ship`;
    return this.apiService.post<any>(url, {}).pipe(map((res) => res?.data ?? res));
  }

  addOrderAddress(orderId: string, payload: Record<string, unknown>): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/addresses`;
    return this.apiService.post<any>(url, payload).pipe(map((res) => this.unwrapResponse(res)));
  }

  updateOrderAddress(orderId: string, contactMechId: string, payload: Record<string, unknown>): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/addresses/${encodeURIComponent(contactMechId)}`;
    return this.apiService.put<any>(url, payload).pipe(map((res) => this.unwrapResponse(res)));
  }

  upsertOrderShippingPhone(orderId: string, payload: Record<string, unknown>): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/shipping-phone`;
    return this.apiService.put<any>(url, payload).pipe(map((res) => this.unwrapResponse(res)));
  }

  addItem(params: { orderId: string } & Record<string, unknown>): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(params.orderId)}/items`;
    return this.apiService.post<any>(url, params).pipe(map((res) => this.unwrapResponse(res)));
  }

  updateOrderStatus(orderId: string, statusId: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/status`;
    return this.apiService.post<any>(url, { statusId }).pipe(map((res) => this.unwrapResponse(res)));
  }

  updateOrderItemQuantity(
    orderId: string,
    orderItemSeqId: string,
    quantity: number,
    unitAmount?: number,
    requiredByDate?: Date | string
  ): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(orderItemSeqId)}/quantity`;
    const payload: OrderItemQuantityPayload = { quantity };
    if (unitAmount !== undefined) {
      payload.unitAmount = unitAmount;
    }
    if (requiredByDate) {
      payload.requiredByDate = requiredByDate;
    }
    return this.apiService.put<any>(url, payload).pipe(map((res) => this.unwrapResponse(res)));
  }

  cancelOrderItem(orderId: string, orderItemSeqId: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(orderItemSeqId)}/cancel`;
    return this.apiService.post<any>(url, {}).pipe(map((res) => this.unwrapResponse(res)));
  }

  completeOrderItem(orderId: string, orderItemSeqId: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(orderItemSeqId)}/complete`;
    return this.apiService.post<any>(url, {}).pipe(map((res) => this.unwrapResponse(res)));
  }

  updateShippingInstructions(orderId: string, shipGroupSeqId: string, shippingInstructions: string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/ship-groups/${encodeURIComponent(shipGroupSeqId)}/shipping-instructions`;
    return this.apiService.put<any>(url, { shippingInstructions }).pipe(map((res) => this.unwrapResponse(res)));
  }

  updateShipGroupShipBeforeDate(orderId: string, shipGroupSeqId: string, shipBeforeDate: Date | string): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/ship-groups/${encodeURIComponent(shipGroupSeqId)}/ship-before-date`;
    return this.apiService.put<any>(url, { shipBeforeDate }).pipe(map((res) => this.unwrapResponse(res)));
  }

  getProductStores(): Observable<CompanyProductStore[]> {
    const url = '/common/company/product-stores';
    return this.apiService.get<any>(url).pipe(
      map((res) => this.unwrapList<CompanyProductStore>(res))
    );
  }

  getVendorParties(productStoreId: string): Observable<VendorLookupItem[]> {
    const params = new URLSearchParams();
    if (productStoreId) {
      params.append('query', productStoreId);
    }
    const url = `/common/suppliers?${params.toString()}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) =>
        this.unwrapList(response).map((supplier: any) => ({
          partyId: supplier.partyId,
          groupName: supplier.groupName,
          value: supplier.partyId,
          label: supplier.groupName || supplier.partyId,
        }))
      )
    );
  }

  getFacilities(): Observable<FacilityLookupItem[]> {
    const url = '/common/facilities';
    return this.apiService.get<any>(url).pipe(
      map((response: any) => {
        const facilities = this.unwrapList(response);
        return facilities.map((facility: any) => ({
          ...facility,
          label: facility.facilityName || facility.facilityId,
        }));
      })
    );
  }

  getPurchaseOrders(pageIndex: number, keyword: string): Observable<OrderListResponse> {
    const params = new URLSearchParams({
      page: pageIndex.toString(),
      size: '10',
      queryString: keyword,
      orderTypeId: 'PURCHASE_ORDER',
    });

    const url = `/common/orders?${params.toString()}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => this.normalizeOrderListResponse(response))
    );
  }

  createOrderNote(params: OrderNotePayload): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(params.orderId ?? '')}/notes`;
    return this.apiService.post<any>(url, params).pipe(map((res) => this.unwrapResponse(res)));
  }

  updateOrderNote(params: OrderNotePayload): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(params.orderId ?? '')}/notes/${encodeURIComponent(params.noteId ?? '')}`;
    return this.apiService.put<any>(url, params).pipe(map((res) => this.unwrapResponse(res)));
  }

  deleteOrderNote(params: OrderNotePayload): Observable<unknown> {
    const url = `/common/orders/${encodeURIComponent(params.orderId ?? '')}/notes/${encodeURIComponent(params.noteId ?? '')}`;
    return this.apiService.delete<any>(url).pipe(map((res) => this.unwrapResponse(res)));
  }

  getCustomerParties(): Observable<VendorLookupItem[]> {
    const url = '/common/customers';
    return this.apiService.get<any>(url).pipe(
      map((response: any) =>
        this.unwrapList(response).map((customer: any) => ({
          partyId: customer.partyId,
          value: customer.partyId,
          label: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.partyId,
        }))
      )
    );
  }

  createOrderContent(params: FormData): Observable<unknown> {
    const orderId = params.get('orderId') as string;
    const url = `/common/orders/${encodeURIComponent(orderId)}/contents`;
    return this.apiService.postOmsFormData(url, params).pipe(map((res) => this.unwrapResponse(res)));
  }

  downloadOrderContent(orderId: string, contentId: string): Observable<Blob> {
    const url = `/common/orders/${encodeURIComponent(orderId)}/contents/${encodeURIComponent(contentId)}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => base64ToBlob(
        response?.data?.fileBytes,
        response?.data?.mimeType || 'application/octet-stream'
      ))
    );
  }

  addOrderAdjustment(orderId: string, payload: { orderAdjustmentTypeId: string; amount: number; comments?: string }): Observable<any> {
    return this.apiService.post<any>(
      `/common/orders/${encodeURIComponent(orderId)}/adjustments`,
      payload
    ).pipe(map((res) => res?.data ?? res));
  }

  deleteOrderAdjustment(orderId: string, orderAdjustmentId: string): Observable<any> {
    return this.apiService.delete<any>(
      `/common/orders/${encodeURIComponent(orderId)}/adjustments/${encodeURIComponent(orderAdjustmentId)}`
    ).pipe(map((res) => res?.data ?? res));
  }

  getOrderReceipts(orderId: string): Observable<any[]> {
    return this.apiService.get<any>(`/common/orders/${encodeURIComponent(orderId)}/receipts`).pipe(
      map((res) => {
        const data = res?.data ?? res;
        return Array.isArray(data?.receipts) ? data.receipts : [];
      })
    );
  }

  private unwrapResponse<T>(response: any): T {
    return (response?.data ?? response?.responseMap ?? response) as T;
  }

  private unwrapList<T>(response: any): T[] {
    const body = this.unwrapResponse<any>(response);
    if (Array.isArray(body)) {
      return body as T[];
    }
    if (Array.isArray(body?.resultList)) {
      return body.resultList as T[];
    }
    if (Array.isArray(body?.documentList)) {
      return body.documentList as T[];
    }
    if (Array.isArray(body?.orderList)) {
      return body.orderList as T[];
    }
    if (Array.isArray(body?.stores)) {
      return body.stores as T[];
    }
    return [];
  }

  private unwrapCount(response: any, fallback: number = 0): number {
    const body = this.unwrapResponse<any>(response);
    const raw = body?.orderListCount ?? body?.documentListCount ?? body?.totalCount ?? body?.total ?? fallback;
    const count = Number(raw);
    return Number.isFinite(count) ? count : fallback;
  }

  private normalizeOrderListResponse(response: any): OrderListResponse {
    const list = this.unwrapList<OrderHeaderSummary>(response);
    const count = this.unwrapCount(response, list.length);
    return {
      resultList: list,
      documentList: list,
      totalCount: count,
      documentListCount: count,
      orderList: list,
      orderListCount: count,
    };
  }
}
