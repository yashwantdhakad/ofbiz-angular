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
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderService } from './order.service';
import { ApiService } from '../common/api.service';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),OrderService, ApiService]
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch orders', () => {
    const mockData = { data: { resultList: [], totalCount: 0 } };
    const keyword = 'test';
    const pageIndex = 1;

    service.getOrders(pageIndex, keyword).subscribe(data => {
      expect((data as any).resultList).toEqual([]);
      expect((data as any).totalCount).toBe(0);
    });

    const req = httpMock.expectOne((request) =>
      request.url.includes('/orders')
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('should create an order', () => {
    const mockOrder = { id: 'ORD1001' };
    const params = { customerId: 'C100' };

    service.createOrder(params).subscribe(data => {
      expect(data).toEqual(mockOrder);
    });

    const req = httpMock.expectOne((request) => request.url.includes('/orders'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(params);
    req.flush(mockOrder);
  });

  it('should fetch customer detail', () => {
    const mockCustomer = { partyId: 'P100' };

    service.getCustomer('P100').subscribe(data => {
      expect(data).toEqual(mockCustomer);
    });

    const req = httpMock.expectOne((request) => request.url.includes('/customers/P100'));
    expect(req.request.method).toBe('GET');
    req.flush(mockCustomer);
  });

  it('should fetch purchase orders', () => {
    const mockPOs = { data: { resultList: [], totalCount: 0 } };

    service.getPurchaseOrders(0, 'sample').subscribe(data => {
      expect((data as any).resultList).toEqual([]);
      expect((data as any).totalCount).toBe(0);
    });

    const req = httpMock.expectOne((r) =>
      r.url.includes('/orders') &&
      r.method === 'GET'
    );
    req.flush(mockPOs);
  });

  it('should delete order note', () => {
    const mockRes = { success: true };
    const params = { orderId: 'O1', noteId: 'N123' };

    service.deleteOrderNote(params).subscribe(data => {
      expect(data).toEqual(mockRes);
    });

    const req = httpMock.expectOne((request) => request.url.includes('/orders/O1/notes/N123'));
    expect(req.request.method).toBe('DELETE');
    req.flush(mockRes);
  });

  it('should complete order item', () => {
    const mockRes = { success: true };

    service.completeOrderItem('O1', '00001').subscribe(data => {
      expect(data).toEqual(mockRes);
    });

    const req = httpMock.expectOne((request) => request.url.includes('/orders/O1/items/00001/complete'));
    expect(req.request.method).toBe('POST');
    req.flush(mockRes);
  });

  it('should fetch purchase order list using getPOs', () => {
    const response = { data: { resultList: [] } };

    service.getPOs(1, 10, 'test').subscribe(data => {
      expect((data as any).resultList).toEqual([]);
    });

    const req = httpMock.expectOne(r => r.url.includes('/orders'));
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('should create customer', () => {
    const params = { name: 'c' };
    const res = { partyId: '1' };
    service.createCustomer(params).subscribe(d => expect(d).toEqual(res));
    const req = httpMock.expectOne((request) => request.url.includes('/customers'));
    expect(req.request.method).toBe('POST');
    req.flush(res);
  });

  it('should get order detail', () => {
    const res = { orderId: 'O1' };
    service.getOrder('O1').subscribe(d => expect(d).toEqual(res));
    const req = httpMock.expectOne((request) => request.url.includes('/orders/O1'));
    expect(req.request.method).toBe('GET');
    req.flush(res);
  });

  it('should get PO display info', () => {
    const res = { info: true };
    service.getPODisplayInfo('PO1').subscribe(d => expect(d).toEqual(res));
    const req = httpMock.expectOne((request) => request.url.includes('/orders/PO1/display-info'));
    expect(req.request.method).toBe('GET');
    req.flush(res);
  });

  it('should add item to order', () => {
    const params = { orderId: 'O1', qty: 1 };
    const res = { ok: true };
    service.addItem(params).subscribe(d => expect(d).toEqual(res));
    const req = httpMock.expectOne((request) => request.url.includes('/orders/O1/items'));
    expect(req.request.method).toBe('POST');
    req.flush(res);
  });

  it('should fetch product stores', () => {
    const res = [{ id: '1' }];
    service.getProductStores().subscribe(d => expect(d).toEqual(res));
    const req = httpMock.expectOne((request) => request.url.includes('/product-stores'));
    expect(req.request.method).toBe('GET');
    req.flush(res);
  });

  it('should fetch vendor parties', () => {
    const res = [{ partyId: 'v1', groupName: 'Vendor 1' }];
    service.getVendorParties('PS1').subscribe(d => expect(d).toEqual([
      { partyId: 'v1', groupName: 'Vendor 1', value: 'v1', label: 'Vendor 1' }
    ]));
    const req = httpMock.expectOne((request) => request.url.includes('/suppliers'));
    expect(req.request.method).toBe('GET');
    req.flush({ resultList: res });
  });

  it('should fetch facilities', () => {
    const res = [{ facilityId: 'f1', facilityName: 'Main' }];
    service.getFacilities().subscribe(d => expect(d).toEqual([
      { facilityId: 'f1', facilityName: 'Main', label: 'Main' }
    ]));
    const req = httpMock.expectOne((request) => request.url.includes('/facilities'));
    expect(req.request.method).toBe('GET');
    req.flush(res);
  });

  it('should create order note', () => {
    const params = { orderId: 'O1', note: 'n' };
    const res = { ok: true };
    service.createOrderNote(params).subscribe(d => expect(d).toEqual(res));
    const req = httpMock.expectOne((request) => request.url.includes('/orders/O1/notes'));
    expect(req.request.method).toBe('POST');
    req.flush(res);
  });

  it('should update order note', () => {
    const params = { orderId: 'O1', noteId: 'N1', note: 'n' };
    const res = { ok: true };
    service.updateOrderNote(params).subscribe(d => expect(d).toEqual(res));
    const req = httpMock.expectOne((request) => request.url.includes('/orders/O1/notes/N1'));
    expect(req.request.method).toBe('PUT');
    req.flush(res);
  });

  it('should fetch customer parties', () => {
    const res = [{ partyId: 'c1', firstName: 'Customer', lastName: 'One' }];
    service.getCustomerParties().subscribe(d => expect(d).toEqual([
      { partyId: 'c1', value: 'c1', label: 'Customer One' }
    ]));
    const req = httpMock.expectOne((request) => request.url.includes('/customers'));
    expect(req.request.method).toBe('GET');
    req.flush({ resultList: res });
  });

  it('should create order content', () => {
    const form = new FormData();
    form.append('orderId', 'O1');
    const res = { ok: true };
    service.createOrderContent(form).subscribe(d => expect(d).toEqual(res));
    const req = httpMock.expectOne((request) => request.url.includes('/orders/O1/contents'));
    expect(req.request.method).toBe('POST');
    req.flush(res);
  });

  it('builds filtered order list queries for quotes and purchase quotes', () => {
    service.getQuotes(2, 'quote', 'orderDate', 'DESC', {
      statusId: 'ORDER_APPROVED',
      productStoreId: 'STORE1',
      facilityId: 'FAC1',
      orderDatePreset: 'LAST_30_DAYS',
    }).subscribe();

    const quoteReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams.includes('/orders?')
      && request.urlWithParams.includes('orderTypeId=SALES_QUOTE')
    );
    expect(quoteReq.request.urlWithParams).toContain('page=2');
    expect(quoteReq.request.urlWithParams).toContain('size=10');
    expect(quoteReq.request.urlWithParams).toContain('queryString=quote');
    expect(quoteReq.request.urlWithParams).toContain('sortBy=orderDate');
    expect(quoteReq.request.urlWithParams).toContain('sortDirection=DESC');
    expect(quoteReq.request.urlWithParams).toContain('statusId=ORDER_APPROVED');
    expect(quoteReq.request.urlWithParams).toContain('productStoreId=STORE1');
    expect(quoteReq.request.urlWithParams).toContain('facilityId=FAC1');
    expect(quoteReq.request.urlWithParams).toContain('orderDatePreset=LAST_30_DAYS');
    quoteReq.flush({ list: [] });

    service.getPurchaseQuotes(1, 25, 'vendor', 'entryDate', 'ASC', {
      statusId: 'ORDER_CREATED',
    }).subscribe();

    const purchaseQuoteReq = httpMock.expectOne((request) =>
      request.method === 'GET'
      && request.urlWithParams.includes('/orders?')
      && request.urlWithParams.includes('orderTypeId=PURCHASE_QUOTE')
    );
    expect(purchaseQuoteReq.request.urlWithParams).toContain('size=25');
    expect(purchaseQuoteReq.request.urlWithParams).toContain('queryString=vendor');
    expect(purchaseQuoteReq.request.urlWithParams).toContain('sortBy=entryDate');
    expect(purchaseQuoteReq.request.urlWithParams).toContain('sortDirection=ASC');
    expect(purchaseQuoteReq.request.urlWithParams).toContain('statusId=ORDER_CREATED');
    purchaseQuoteReq.flush({ list: [] });
  });

  it('covers order detail lookups by id and display info variants', () => {
    service.getOrderById(42).subscribe((data) => expect(data).toEqual({ id: 42 }));
    const orderByIdReq = httpMock.expectOne((request) => request.url.includes('/orders/by-id/42'));
    expect(orderByIdReq.request.method).toBe('GET');
    orderByIdReq.flush({ id: 42 });

    service.getOrderDisplayInfoById('43').subscribe((data) => expect(data).toEqual({ id: 43 }));
    const displayByIdReq = httpMock.expectOne((request) => request.url.includes('/orders/by-id/43/display-info'));
    expect(displayByIdReq.request.method).toBe('GET');
    displayByIdReq.flush({ id: 43 });
  });

  it('covers order workflow mutations and transfer flows', () => {
    service.reorderOrder('SO-1').subscribe((data) => expect(data).toEqual({ ok: true }));
    let req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/reorder'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ ok: true });

    service.convertQuoteToOrder('Q-1').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/Q-1/convert-to-order'));
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });

    service.convertPurchaseQuoteToOrder('PQ-1').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/PQ-1/convert-to-po'));
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });

    service.approvePurchaseOrder('PO-1').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/PO-1/status'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ statusId: 'ORDER_APPROVED' });
    req.flush({ ok: true });

    service.approveSalesOrder('SO-2').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-2/status'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ statusId: 'ORDER_APPROVED' });
    req.flush({ ok: true });

    service.receivePurchaseOrder('PO-2', { qty: 2 }).subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/PO-2/receive'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ qty: 2 });
    req.flush({ ok: true });

    service.getTransferOrders(3, 'transfer', 15, 'orderDate', 'DESC').subscribe((data) => expect((data as any).resultList).toEqual([]));
    req = httpMock.expectOne((request) =>
      request.urlWithParams.includes('/orders?')
      && request.urlWithParams.includes('orderTypeId=TRANSFER_ORDER')
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toContain('size=15');
    req.flush({ data: { resultList: [] } });

    service.receiveTransferOrder('TO-1', { receiptId: 'R-1' }).subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/TO-1/receive-transfer'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ receiptId: 'R-1' });
    req.flush({ ok: true });

    service.createTransferShipment('TO-2').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/TO-2/transfer-shipment'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ ok: true });
  });

  it('covers picklist, shipment, reservation, and invoice endpoints', () => {
    service.getPicklistableOrders('SALES_ORDER').subscribe((data) => expect(data).toEqual([]));
    let req = httpMock.expectOne((request) => request.url.includes('/orders/picklistable'));
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toContain('orderTypeId=SALES_ORDER');
    req.flush({ data: { resultList: [] } });

    service.getOrderInvoices('SO-1').subscribe((data) => expect(data).toEqual([]));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/invoices'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { resultList: [] } });

    service.getOrderShipments('SO-1').subscribe((data) => expect(data).toEqual({ list: [] }));
    req = httpMock.expectOne((request) => request.url.includes('/shipments/by-order/SO-1'));
    expect(req.request.method).toBe('GET');
    req.flush({ list: [] });

    service.createBulkPicklist(['SO-1', 'SO-2']).subscribe((data) => expect(data).toEqual({ picklistId: 'P1' }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/picklist/bulk'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ orderIds: ['SO-1', 'SO-2'] });
    req.flush({ picklistId: 'P1' });

    service.getOrderPdf('SO-1').subscribe((data) => {
      expect(data).toBeInstanceOf(Blob);
      expect(data.type).toBe('application/pdf');
    });
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/pdf'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { pdfBytes: btoa('pdf') } });

    service.getOrderPicklists('SO-1').subscribe((data) => expect(data).toEqual({ list: [] }));
    req = httpMock.expectOne((request) => request.url.includes('/picklists/by-order/SO-1'));
    expect(req.request.method).toBe('GET');
    req.flush({ list: [] });

    service.getReservationStatus('SO-1').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/reservation-status'));
    expect(req.request.method).toBe('GET');
    req.flush({ ok: true });

    service.getReservedOrders().subscribe((data) => expect(data).toEqual({ list: [] }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/reserved'));
    expect(req.request.method).toBe('GET');
    req.flush({ list: [] });

    service.getReservedOrderItems('SO-1').subscribe((data) => expect(data).toEqual([]));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/reserved-items'));
    expect(req.request.method).toBe('GET');
    req.flush({ list: [] });

    service.createPicklist('SO-1').subscribe((data) => expect(data).toEqual({ picklistId: 'PK-1' }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/picklist'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ picklistId: 'PK-1' });

    service.markPicklistPicked('PK-1').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/picklists/PK-1/mark-picked'));
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });

    service.shipShipment('SHIP-1').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/shipments/SHIP-1/ship'));
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });
  });

  it('covers order address, phone, quantity, cancel, and shipping helpers', () => {
    service.addOrderAddress('SO-1', { city: 'Pune' }).subscribe((data) => expect(data).toEqual({ ok: true }));
    let req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/addresses'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ city: 'Pune' });
    req.flush({ ok: true });

    service.updateOrderAddress('SO-1', 'CM-1', { city: 'Mumbai' }).subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/addresses/CM-1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ city: 'Mumbai' });
    req.flush({ ok: true });

    service.upsertOrderShippingPhone('SO-1', { contactNumber: '123' }).subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/shipping-phone'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ contactNumber: '123' });
    req.flush({ ok: true });

    service.updateOrderStatus('SO-1', 'ORDER_COMPLETED').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/status'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ statusId: 'ORDER_COMPLETED' });
    req.flush({ ok: true });

    service.updateOrderItemQuantity('SO-1', '0001', 5, 11.5, '2026-04-08').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/items/0001/quantity'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ quantity: 5, unitAmount: 11.5, requiredByDate: '2026-04-08' });
    req.flush({ ok: true });

    service.cancelOrderItem('SO-1', '0001').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/items/0001/cancel'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ ok: true });

    service.updateShippingInstructions('SO-1', '00001', 'Handle with care').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/ship-groups/00001/shipping-instructions'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ shippingInstructions: 'Handle with care' });
    req.flush({ ok: true });

    service.updateShipGroupShipBeforeDate('SO-1', '00001', '2026-04-08').subscribe((data) => expect(data).toEqual({ ok: true }));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/ship-groups/00001/ship-before-date'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ shipBeforeDate: '2026-04-08' });
    req.flush({ ok: true });
  });

  it('covers content download and picklistable orders without a type filter', () => {
    service.getPicklistableOrders().subscribe((data) => expect(data).toEqual([]));
    let req = httpMock.expectOne((request) => request.url.endsWith('/orders/picklistable'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { resultList: [] } });

    service.downloadOrderContent('SO-1', 'CNT-1').subscribe((data) => expect(data).toBeInstanceOf(Blob));
    req = httpMock.expectOne((request) => request.url.includes('/orders/SO-1/contents/CNT-1'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { fileBytes: btoa('file'), mimeType: 'application/octet-stream' } });
  });


});
