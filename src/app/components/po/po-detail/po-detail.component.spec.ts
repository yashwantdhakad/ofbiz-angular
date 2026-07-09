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
import { DatePipe } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { PODetailComponent } from './po-detail.component';
import { OrderService } from '@ofbiz/services/order/order.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { ContentComponent } from '../../order/content/content.component';
import { NoteComponent } from '../../order/note/note.component';
import { ProductItemComponent } from '../../order/product-item/product-item.component';
import { ShippingInstructionDialogComponent } from '../../order/shipping-instruction-dialog/shipping-instruction-dialog.component';
import { DateUpdateDialogComponent } from '../../common/date-update-dialog/date-update-dialog.component';
import { AddEditAddressComponent } from '@ofbiz/components/party/add-edit-address/add-edit-address.component';

describe('PODetailComponent', () => {
  const translationMap: Record<string, string> = {
    'PO.APPROVAL_PERMISSION_REQUIRED': 'You do not have approval permission for this purchase order amount.',
    'COMMON.CONFIRM': 'Confirm',
    'COMMON.CONFIRM_DELETE': 'Delete?',
    'COMMON.CONFIRMATION': 'Confirmation',
    'COMMON.STATUS_CHANGE_CONFIRMATION': 'Change to {{status}}?',
    'PO.APPROVE_QUOTE': 'Approve Quote',
    'COMMON.APPROVE': 'Approve',
  };

  let component: PODetailComponent;
  let fixture: ComponentFixture<PODetailComponent>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;

  const displayInfoResponse = {
    orderHeader: { orderId: 'PO-123', entryDate: '2024-01-01T00:00:00Z', currencyUomId: 'USD' },
    statusItem: { statusId: 'ORDER_CREATED', description: 'Created' },
    orderStatusList: [
      { statusId: 'ORDER_CREATED', statusDatetime: '2024-01-01T00:00:00Z', statusUserLogin: 'creator', changeReason: 'Created' },
      { statusId: 'ITEM_CREATED', orderItemSeqId: '0001', statusDatetime: '2024-01-01T01:00:00Z', statusUserLogin: 'creator' },
      { statusId: 'ORDER_APPROVED', statusDatetime: '2024-01-02T00:00:00Z', statusUserLogin: 'approver', changeReason: 'Approved' },
    ],
    orderNoteList: [{ id: 'NOTE-1', noteText: 'Urgent' }],
    orderTermList: [{ termTypeId: 'NET_30', termValue: '30', termDays: 30 }],
    orderPaymentPreferenceList: [{ paymentMethodTypeId: 'CREDIT_CARD', statusId: 'PAYMENT_NOT_AUTH' }],
    orderAdjustmentList: [
      { orderAdjustmentTypeId: 'SHIPPING_CHARGES', amount: 5 },
      { orderAdjustmentTypeId: 'DISCOUNT_ADJUSTMENT', amount: -2 },
    ],
    firstPart: { vendorPartyId: 'VENDOR-1' },
    orderContactMechList: [
      { contactMechPurposeTypeId: 'SHIPPING_LOCATION', postalAddress: { contactMechId: 'SHIP-1', address1: 'Ship Address' } },
    ],
    shipments: [{ shipmentId: 'S1', shipmentTypeId: 'SHIPMENT_STANDARD', statusId: 'SHIPMENT_CREATED', createdDate: '2024-01-03' }],
    invoices: [{ id: 'I1', invoiceId: 'INV-1', currencyUomId: 'USD', items: [{ productId: 'P1', quantity: 1, amount: 25 }] }],
    returns: [{ returnId: 'R1', returnType: 'RETURN', status: 'RETURN_CREATED', entryDate: '2024-01-04', totalAmount: 10 }],
    facilityAddress: { contactMechId: 'FAC-1', address1: 'Facility Address' },
  } as any;

  function mockDialogClose(result: any): void {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as any);
  }

  function createAndInitComponent(): void {
    fixture = TestBed.createComponent(PODetailComponent);
    component = fixture.componentInstance;
  }

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj<OrderService>('OrderService', [
      'getOrderById',
      'getOrder',
      'getOrderDisplayInfoById',
      'getOrderIdentifications',
      'getOrderReceipts',
      'getPODisplayInfo',
      'deleteOrderNote',
      'cancelOrderItem',
      'downloadOrderContent',
      'approvePurchaseOrder',
      'updateOrderStatus',
      'updateShippingInstructions',
      'updateShipGroupShipBeforeDate',
      'convertPurchaseQuoteToOrder',
      'reorderOrder',
      'getOrderPdf',
    ]);
    partyServiceSpy = jasmine.createSpyObj<PartyService>('PartyService', ['getSupplier']);
    commonServiceSpy = jasmine.createSpyObj<CommonService>('CommonService', [
      'getAllStatusItems',
      'getShipmentTypes',
      'getOrderItemTypes',
      'getValidStatusChanges',
    ]);
    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    snackbarSpy = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showError', 'showSuccess']);
    renderSchedulerSpy = jasmine.createSpyObj<RenderSchedulerService>('RenderSchedulerService', ['defer', 'markForCheck']);
    productServiceSpy = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsByIds']);

    renderSchedulerSpy.defer.and.callFake((task: () => void) => task());
    renderSchedulerSpy.markForCheck.and.stub();

    orderServiceSpy.getOrderById.and.returnValue(of({ parts: [], contents: [] } as any));
    orderServiceSpy.getOrder.and.returnValue(of({
      parts: [{ items: [{ productId: 'P1' }] }],
      contents: [],
    } as any));
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of(displayInfoResponse));
    orderServiceSpy.getOrderIdentifications.and.returnValue(of([]));
    orderServiceSpy.getOrderReceipts.and.returnValue(of([]));
    orderServiceSpy.getPODisplayInfo.and.returnValue(of(displayInfoResponse));
    orderServiceSpy.deleteOrderNote.and.returnValue(of({}));
    orderServiceSpy.cancelOrderItem.and.returnValue(of({}));
    orderServiceSpy.downloadOrderContent.and.returnValue(of(new Blob(['test'], { type: 'text/plain' })));
    orderServiceSpy.approvePurchaseOrder.and.returnValue(of({}));
    orderServiceSpy.updateOrderStatus.and.returnValue(of({}));
    orderServiceSpy.updateShippingInstructions.and.returnValue(of({}));
    orderServiceSpy.updateShipGroupShipBeforeDate.and.returnValue(of({}));
    orderServiceSpy.convertPurchaseQuoteToOrder.and.returnValue(of({ id: 99 }));
    orderServiceSpy.reorderOrder.and.returnValue(of({ id: 88 }));
    orderServiceSpy.getOrderPdf.and.returnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));

    partyServiceSpy.getSupplier.and.returnValue(of({
      supplierDetail: {
        party: { partyId: 'VENDOR-1', groupName: 'Vendor 1' },
        postalAddressList: [{ contactMechPurposeId: 'PRIMARY_LOCATION', address1: '123 Main St' }],
      },
    } as any));

    commonServiceSpy.getAllStatusItems.and.returnValue(of([
      { statusId: 'ORDER_CREATED', description: 'Order Created' },
      { statusId: 'SHIPMENT_CREATED', description: 'Shipment Created' },
    ] as any));
    commonServiceSpy.getShipmentTypes.and.returnValue(of([
      { shipmentTypeId: 'SHIPMENT_STANDARD', description: 'Standard Shipment' },
    ] as any));
    commonServiceSpy.getOrderItemTypes.and.returnValue(of([
      { orderItemTypeId: 'PRODUCT_ORDER_ITEM', description: 'Product Item' },
    ] as any));
    commonServiceSpy.getValidStatusChanges.and.returnValue(of([
      { statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve' },
      { statusIdTo: 'ORDER_HOLD', transitionName: 'Hold' },
      { statusIdTo: 'ORDER_CANCELLED', transitionName: 'Cancel' },
      { statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve Duplicate' },
    ] as any));

    productServiceSpy.getProductsByIds.and.returnValue(of([
      { productId: 'P1', productName: 'Product One' },
    ] as any));

    await TestBed.configureTestingModule({
      declarations: [PODetailComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        DatePipe,
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: CommonService, useValue: commonServiceSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: Router, useValue: routerSpy },
        { provide: Store, useValue: jasmine.createSpyObj('Store', ['dispatch', 'pipe']) },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ isQuoteMode: false }),
            paramMap: of(convertToParamMap({ id: 'PO-123' })),
            snapshot: { data: { isQuoteMode: false }, paramMap: convertToParamMap({ id: 'PO-123' }) },
          },
        },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string, params?: Record<string, unknown>) => {
              if (key === 'COMMON.STATUS_CHANGE_CONFIRMATION') {
                return `Change to ${params?.['status'] ?? ''}?`;
              }
              return translationMap[key] ?? key;
            },
            get: (key: string) => of(translationMap[key] ?? key),
            stream: (key: string) => of(translationMap[key] ?? key),
            onLangChange: of({}),
            onTranslationChange: of({}),
            onDefaultLangChange: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(PODetailComponent, { set: { template: '' } })
      .compileComponents();

    createAndInitComponent();
  });

  it('loads PO detail, maps status history, and computes helper values', () => {
    component.ngOnInit();
    component.getOrderById('PO-123').subscribe();

    expect(orderServiceSpy.getOrder).toHaveBeenCalledWith('PO-123');
    expect(orderServiceSpy.getPODisplayInfo).toHaveBeenCalledWith('PO-123');
    expect(commonServiceSpy.getAllStatusItems).toHaveBeenCalled();
    expect(component.orderHeader()?.orderId).toBe('PO-123');
    expect(component.statusHistoryEntries()).toHaveSize(2);
    expect(component.statusHistoryEntries()[0]).toEqual(jasmine.objectContaining({
      statusId: 'ORDER_CREATED',
      statusLabel: 'Order Created',
      changedBy: 'creator',
      reason: 'Created',
    }));
    expect(component.canApprove()).toBeTrue();
    expect(component.canReceive()).toBeFalse();
    expect(component.canEditItems()).toBeTrue();
    expect(component.shipments()).toHaveSize(1);
    expect(component.invoiceItems()).toHaveSize(1);
    expect(component.returnItems()).toHaveSize(1);
    expect(component.getProductName({ productId: 'P1' } as any)).toBe('Product One');
    expect(component.getStatusDescription('ORDER_CREATED')).toBe('Order Created');
    expect(component.getStatusDescription('INV_INSP_PENDING')).toBe('Inspection Pending');
    expect(component.getShipmentTypeDescription('SHIPMENT_STANDARD')).toBe('Standard Shipment');
    expect(component.getOrderItemTypeDescription('PRODUCT_ORDER_ITEM')).toBe('Product Item');
    expect(component.getCurrencyUom()).toBe('USD');
  });

  it('clears state on order lookup failure and hides quote-only collections', () => {
    orderServiceSpy.getOrder.and.returnValue(throwError(() => new Error('boom')));
    component.getOrderById('PO-123').subscribe();
    expect(component.orderHeader()).toBeNull();
    expect(component.parts()).toEqual([]);
    expect(component.canApprove()).toBeFalse();

    component.isQuoteMode = true;
    component.getOrderById('PO-123').subscribe();
    expect(component.shipments()).toEqual([]);
    expect(component.invoiceItems()).toEqual([]);
    expect(component.returnItems()).toEqual([]);
  });

  it('filters valid status changes and exposes action labels', () => {
    component.statusItem.set({ statusId: 'ORDER_CREATED' } as any);
    component.loadValidStatusChanges();
    expect(component.validStatusChanges().map((item: any) => item.statusIdTo)).toEqual([
      'ORDER_APPROVED',
      'ORDER_HOLD',
      'ORDER_CANCELLED',
    ]);
    expect(component.getStatusActionLabel({ statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve' })).toBe('Approve');
    expect(component.getFallbackApproveLabel()).toBe('Approve');

    component.isQuoteMode = true;
    component.statusItem.set({ statusId: 'ORDER_CREATED' } as any);
    component.loadValidStatusChanges();
    expect(component.validStatusChanges().map((item: any) => item.statusIdTo)).toEqual(['ORDER_APPROVED']);
    expect(component.getStatusActionLabel({ statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve' })).toBe('Approve Quote');
    expect(component.getFallbackApproveLabel()).toBe('Approve Quote');
    expect(component.getRelatedOrderRouteBase()).toBe('/pos');
  });

  it('covers item dialogs, note/content actions, and return navigation', () => {
    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    component.canEditItems.set(true);
    component.orderHeader.set({ orderId: 'PO-123', entryDate: '2024-01-01T00:00:00Z', currencyUomId: 'USD' } as any);
    component.statusItem.set({ statusId: 'ORDER_COMPLETED' } as any);
    spyOn<any>(component, 'silentRefresh').and.stub();

    mockDialogClose({ id: 'ITEM-1' });
    component.addItemDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(ProductItemComponent, jasmine.anything());

    const addItemDialogSpy = spyOn(component, 'addItemDialog').and.stub();
    component.editItem({ orderItemSeqId: '0001', statusId: 'ITEM_CREATED' } as any);
    expect(addItemDialogSpy).toHaveBeenCalledWith(jasmine.objectContaining({ updateExisting: true }));

    addItemDialogSpy.calls.reset();
    component.editItem({ orderItemSeqId: '0002', statusId: 'ITEM_COMPLETED' } as any);
    expect(addItemDialogSpy).not.toHaveBeenCalled();

    mockDialogClose({ id: 'NOTE-2', noteText: 'Fresh note' });
    component.addUpdateNoteDialog({ id: 'NOTE-2' } as any);
    expect(dialogSpy.open).toHaveBeenCalledWith(NoteComponent, jasmine.anything());
    expect(orderServiceSpy.getOrderDisplayInfoById).toHaveBeenCalledWith('PO-123');

    mockDialogClose(true);
    component.deleteNote({ id: 'NOTE-2' } as any);
    expect(orderServiceSpy.deleteOrderNote).toHaveBeenCalledWith({ orderId: 'PO-123', noteId: 'NOTE-2' });

    mockDialogClose({ id: 'CONTENT-1' });
    component.addUpdateContentDialog({ id: 'CONTENT-1' } as any);
    expect(dialogSpy.open).toHaveBeenCalledWith(ContentComponent, jasmine.anything());

    mockDialogClose(true);
    component.deleteNote({ id: 'NOTE-1' } as any);
    expect(orderServiceSpy.deleteOrderNote).toHaveBeenCalled();

    mockDialogClose('new instructions');
    component.editShippingInstructions({ orderPartSeqId: '0001', shippingInstructions: 'Old' } as any);
    expect(dialogSpy.open).toHaveBeenCalledWith(ShippingInstructionDialogComponent, jasmine.anything());

    mockDialogClose('2024-02-01');
    component.updateShipBeforeDate({ orderPartSeqId: '0001', shipBeforeDate: '2024-01-01' } as any);
    expect(dialogSpy.open).toHaveBeenCalledWith(DateUpdateDialogComponent, jasmine.anything());

    const openSpy = spyOn(window, 'open').and.stub();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:po');
    spyOn(URL, 'revokeObjectURL').and.stub();
    spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);
    component.openOrderContent({ contentId: 'CONTENT-1' } as any);
    expect(orderServiceSpy.downloadOrderContent).toHaveBeenCalledWith('PO-123', 'CONTENT-1');
    expect(openSpy).toHaveBeenCalledWith('blob:po', '_blank', 'noopener');

    component.isQuoteMode = false;
    expect(component.canCreateReturn()).toBeTrue();
    component.goToCreateReturn();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/returns/create'], {
      queryParams: { orderId: 'PO-123', orderTypeId: 'PURCHASE_ORDER' },
    });
  });

  it('covers approval, quote conversion, reorder, and status change branches', () => {
    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    component.statusItem.set({ statusId: 'ORDER_APPROVED' } as any);
    component.isQuoteMode = true;
    component.relatedOrderPrimaryId = null;
    spyOn<any>(component, 'silentRefresh').and.stub();

    component.approveOrder();
    expect(orderServiceSpy.approvePurchaseOrder).toHaveBeenCalledWith('PO-123');

    orderServiceSpy.approvePurchaseOrder.and.returnValue(throwError(() => ({ error: { message: 'approval limit' } })));
    component.approveOrder();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('You do not have approval permission for this purchase order amount.');

    mockDialogClose(true);
    component.rejectQuote();
    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, jasmine.anything());
    expect(orderServiceSpy.updateOrderStatus).toHaveBeenCalledWith('PO-123', 'ORDER_REJECTED');

    component.convertQuoteToPo();
    expect(orderServiceSpy.convertPurchaseQuoteToOrder).toHaveBeenCalledWith('PO-123');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/pos/99']);

    component.reorderOrder();
    expect(orderServiceSpy.reorderOrder).toHaveBeenCalledWith('PO-123');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/pos/88']);

    mockDialogClose(true);
    component.changeOrderStatus('ORDER_HOLD');
    expect(orderServiceSpy.updateOrderStatus).toHaveBeenCalledWith('PO-123', 'ORDER_HOLD');

    mockDialogClose(true);
    component.changeOrderStatus('ORDER_CANCELLED');
    expect(orderServiceSpy.updateOrderStatus).toHaveBeenCalledWith('PO-123', 'ORDER_CANCELLED');

    component.relatedOrderPrimaryId = 10;
    expect(component.canRejectQuote()).toBeFalse();
    expect(component.canConvertQuoteToPo()).toBeFalse();
  });

  it('covers PO helpers, vendor flows, and guard exits', () => {
    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    component.canEditItems.set(true);
    component.orderHeader.set({ orderId: 'PO-123', currencyUom: 'INR' } as any);
    component.parts.set([
      {
        partTotal: 100,
        orderPartSeqId: '0001',
        shipBeforeDate: '2024-04-01',
        items: [
          { orderItemSeqId: '0001', productId: 'P1', product: { productName: 'Product One' }, quantity: 1, statusId: 'ITEM_CREATED' },
          { orderItemSeqId: '0002', productId: 'P2', quantity: 1, statusId: 'ITEM_COMPLETED' },
        ],
      } as any,
    ]);
    component.statusDescriptionMap.set(new Map([['ORDER_CREATED', 'Created']]));
    component.shipmentTypeMap.set(new Map([['SHIPMENT_STANDARD', 'Standard Shipment']]));
    component.orderItemTypeMap.set(new Map([['PRODUCT_ORDER_ITEM', 'Product Item']]));
    component.productNameMap.set(new Map([['P1', 'Product One']]));
    spyOn<any>(component, 'silentRefresh').and.stub();

    expect(component.getRowClass({ statusId: 'ITEM_CANCELLED' } as any)).toBe('status-cancelled');
    expect(component.getRowClass({ statusId: 'ITEM_COMPLETED' } as any)).toBe('status-completed');
    expect(component.getRowClass({ statusId: 'ITEM_CREATED' } as any)).toBe('');
    expect(component.getStatusDescription()).toBe('-');
    expect(component.getShipmentTypeDescription('SHIPMENT_STANDARD')).toBe('Standard Shipment');
    expect(component.getOrderItemTypeDescription('PRODUCT_ORDER_ITEM')).toBe('Product Item');
    expect(component.getProductName({ productId: 'P1' } as any)).toBe('Product One');
    expect(component.getCurrencyUom()).toBe('INR');
    expect(component.canManageOrderItems({ statusId: 'ITEM_COMPLETED' } as any)).toBeFalse();
    expect(component.canManageOrderItems({ statusId: 'ITEM_CREATED' } as any)).toBeTrue();
    expect(component.formatShipBeforeDate('2024-04-01')).toContain('2024');
    expect(component.getRelatedOrderRouteBase()).toBe('/pos');

    mockDialogClose(null);
    component.addItemDialog();
    component.cancelItem({} as any);
    component.addUpdateNoteDialog();
    component.deleteNote({} as any);
    component.addUpdateContentDialog();
    component.editShippingInstructions({} as any);
    component.updateShipBeforeDate({} as any);
    component.openOrderContent({} as any);
    component.loadVendorDetails('');
    component.goToReceive();

    mockDialogClose({ address1: 'Updated Ship To' });
    component.addShipToAddress();
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditAddressComponent, jasmine.anything());

    mockDialogClose({ address1: 'Updated Vendor' });
    component.editVendorAddress({ address1: 'Old Vendor' } as any);
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditAddressComponent, jasmine.anything());

    component.loadVendorDetails('VENDOR-1');
    expect(partyServiceSpy.getSupplier).toHaveBeenCalledWith('VENDOR-1');
    expect(component.vendorName()).toBe('Vendor 1');
    expect(component.vendorAddresses()).toHaveSize(1);
  });

  it('covers PO fallback helpers and action error paths', () => {
    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    component.canEditItems.set(false);
    component.orderHeader.set({ currencyUomId: 'USD' } as any);
    component.relatedOrderTypeId = 'PURCHASE_QUOTE';
    spyOn<any>(component, 'silentRefresh').and.stub();
    spyOn(console, 'error');
    const openSpy = spyOn(window, 'open').and.stub();
    const createUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:pdf');
    spyOn(URL, 'revokeObjectURL').and.stub();
    spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);

    expect(component.getShipmentTypeDescription('UNKNOWN')).toBe('UNKNOWN');
    expect(component.getOrderItemTypeDescription()).toBe('');
    expect(component.getProductName({ productId: 'PX', itemDescription: 'Fallback item' } as any)).toBe('Fallback item');
    expect(component.getStatusDescription('INV_INSP_PENDING')).toBe('Inspection Pending');
    expect(component.getStatusDescription('UNKNOWN')).toBe('UNKNOWN');
    expect(component.formatShipBeforeDate(null)).toBe('');
    expect(component.getRelatedOrderRouteBase()).toBe('/pos/quotes');
    expect(component.canManageOrderItems()).toBeFalse();

    orderServiceSpy.updateOrderStatus.and.returnValue(throwError(() => ({ error: { message: 'approval limit' } })));
    mockDialogClose(true);
    component.changeOrderStatus('ORDER_HOLD');
    expect(snackbarSpy.showError).toHaveBeenCalledWith('You do not have approval permission for this purchase order amount.');

    orderServiceSpy.reorderOrder.and.returnValue(throwError(() => new Error('reorder failed')));
    component.reorderOrder();
    orderServiceSpy.convertPurchaseQuoteToOrder.and.returnValue(throwError(() => new Error('convert failed')));
    component.convertQuoteToPo();
    expect(console.error).toHaveBeenCalled();

    component.openPdf();
    expect(createUrlSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('blob:pdf', '_blank');

    component.orderPrimaryId = undefined;
    component.openOrderContent(null as any);
    expect(orderServiceSpy.downloadOrderContent).not.toHaveBeenCalledWith('PO-123', undefined as any);
  });

  it('covers approval error message variants and no-id navigation fallbacks', () => {
    expect((component as any).getPurchaseOrderApprovalErrorMessage({ error: { message: 'no purchase order approval limit assigned' } }))
      .toBe('You do not have approval permission for this purchase order amount.');
    expect((component as any).getPurchaseOrderApprovalErrorMessage({ error: { detail: 'current user could not be resolved' } }))
      .toBe('You do not have approval permission for this purchase order amount.');
    expect((component as any).getPurchaseOrderApprovalErrorMessage({})).toBe('PO.APPROVE_ERROR');

    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    component.statusItem.set({ statusId: 'ORDER_APPROVED' } as any);
    component.relatedOrderPrimaryId = null;
    orderServiceSpy.convertPurchaseQuoteToOrder.and.returnValue(of({}));
    orderServiceSpy.reorderOrder.and.returnValue(of({}));
    component.convertQuoteToPo();
    component.reorderOrder();
    expect(routerSpy.navigate).not.toHaveBeenCalledWith(['/pos/undefined']);

    orderServiceSpy.convertPurchaseQuoteToOrder.and.returnValue(throwError(() => new Error('convert failed')));
    orderServiceSpy.reorderOrder.and.returnValue(throwError(() => new Error('reorder failed')));
    spyOn(console, 'error');
    component.convertQuoteToPo();
    component.reorderOrder();
    expect(console.error).toHaveBeenCalled();
  });

  it('covers remaining vendor, quote, and navigation fallback branches', () => {
    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    component.statusItem.set({ statusId: 'ORDER_CANCELLED' } as any);
    component.isQuoteMode = true;
    spyOn(console, 'error');
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();

    expect(component.canRejectQuote()).toBeFalse();
    expect(component.canConvertQuoteToPo()).toBeFalse();
    expect((component as any).getPurchaseOrderApprovalErrorMessage({ message: 'plain backend error' })).toBe('plain backend error');

    partyServiceSpy.getSupplier.and.returnValue(throwError(() => new Error('vendor failed')));
    component.loadVendorDetails('VENDOR-ERR');
    expect(component.vendorName()).toBe('VENDOR-ERR');
    expect(component.vendorAddresses()).toEqual([]);

    mockDialogClose(null);
    component.addShipToAddress();
    expect(silentRefreshSpy).not.toHaveBeenCalled();

    component.vendorPartyId = 'VENDOR-1';
    component.editVendorAddress(null);
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditAddressComponent, jasmine.anything());

    component.orderPrimaryId = undefined;
    component.goToReceive();
    expect(routerSpy.navigate).not.toHaveBeenCalledWith(['/pos/PO-123/receive']);

    orderServiceSpy.updateOrderStatus.and.returnValue(throwError(() => new Error('cancel failed')));
    mockDialogClose(true);
    component.cancelOrder();
    expect(console.error).toHaveBeenCalled();
  });

  it('covers vendor address priority fallback and edit/no-op dialog branches', () => {
    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    component.vendorPartyId = 'VENDOR-1';
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();

    partyServiceSpy.getSupplier.and.returnValue(of({
      supplierDetail: {
        party: { partyId: 'VENDOR-1', groupName: 'Vendor 1' },
        postalAddressList: [
          { contactMechPurposeId: 'SHIPPING_LOCATION', address1: 'Ship Address' },
          { contactMechPurposeId: 'PRIMARY_LOCATION', address1: 'Primary Address' },
        ],
      },
    } as any));
    component.loadVendorDetails('VENDOR-1');
    expect(component.vendorAddresses()[0]?.address1).toBe('Ship Address');

    partyServiceSpy.getSupplier.and.returnValue(of({
      supplierDetail: {
        party: { partyId: 'VENDOR-2', groupName: 'Vendor 2' },
        postalAddressList: [{ address1: 'Fallback Address' }],
      },
    } as any));
    component.loadVendorDetails('VENDOR-2');
    expect(component.vendorAddresses()[0]?.address1).toBe('Fallback Address');

    component.vendorPartyId = undefined;
    component.editVendorAddress({ contactMechId: 'ADDR-1' } as any);
    expect(dialogSpy.open).not.toHaveBeenCalledWith(AddEditAddressComponent, jasmine.anything());

    component.orderId = undefined;
    component.addShipToAddress();
    expect(silentRefreshSpy).not.toHaveBeenCalled();
  });

  it('covers note and shipping instruction no-op result branches', () => {
    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    spyOn<any>(component, 'silentRefresh').and.stub();
    const syncOrderNotesSpy = spyOn<any>(component, 'syncOrderNotes').and.stub();

    mockDialogClose(undefined);
    component.addUpdateNoteDialog({ id: 'NOTE-1' } as any);
    component.addUpdateContentDialog({ id: 'CONTENT-1' } as any);
    component.editShippingInstructions({ orderPartSeqId: '0001', shippingInstructions: 'Old' } as any);
    component.updateShipBeforeDate({ orderPartSeqId: '0001', shipBeforeDate: '2024-01-01' } as any);
    expect(syncOrderNotesSpy).not.toHaveBeenCalled();
    expect(orderServiceSpy.updateShippingInstructions).not.toHaveBeenCalledWith('PO-123', '0001', jasmine.anything());
    expect(orderServiceSpy.updateShipGroupShipBeforeDate).not.toHaveBeenCalledWith('PO-123', '0001', jasmine.anything());
  });

  it('covers cancel item confirmation branches and lookup fallbacks', () => {
    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();
    orderServiceSpy.cancelOrderItem.and.returnValue(of({}));

    mockDialogClose(false);
    component.cancelItem({ orderItemSeqId: '0001' } as any);
    expect(orderServiceSpy.cancelOrderItem).not.toHaveBeenCalled();

    mockDialogClose(true);
    component.cancelItem({ orderItemSeqId: '0001' } as any);
    expect((dialogSpy.open.calls.mostRecent().args[1] as any).data.message).toBe('COMMON.CONFIRM_CANCEL_ITEM');
    expect(orderServiceSpy.cancelOrderItem).toHaveBeenCalledWith('PO-123', '0001');
    expect(silentRefreshSpy).toHaveBeenCalled();

    commonServiceSpy.getAllStatusItems.and.returnValue(throwError(() => new Error('status failed')));
    commonServiceSpy.getShipmentTypes.and.returnValue(of([{ shipmentTypeId: 'SHIPMENT_X', description: 'X' }] as any));
    commonServiceSpy.getOrderItemTypes.and.returnValue(of([{ orderItemTypeId: 'PRODUCT_ORDER_ITEM', description: 'Product Item' }] as any));
    component.loadLookupData();
    expect(component.statusDescriptionMap().size).toBe(0);
    expect(component.shipmentTypeMap().get('SHIPMENT_X')).toBe('X');
    expect(component.orderItemTypeMap().get('PRODUCT_ORDER_ITEM')).toBe('Product Item');

    orderServiceSpy.getOrder.and.returnValue(of({ parts: [], contents: [] } as any));
    orderServiceSpy.getPODisplayInfo.and.returnValue(of({
      orderHeader: {},
      statusItem: { statusId: 'ORDER_CREATED', description: 'Created' },
      firstPart: {},
      orderStatusList: [],
      orderNoteList: [],
      orderTermList: [],
      orderPaymentPreferenceList: [],
      orderAdjustmentList: [],
      shipments: [],
      invoices: [],
      returns: [],
      orderContactMechList: [],
    } as any));
    component.getOrderById('PO-123').subscribe();
    expect(component.orderId).toBeUndefined();
    expect(component.canApprove()).toBeTrue();
    expect(component.canReceive()).toBeFalse();
  });

  it('covers numeric order lookup, silent refresh, and create-return guards', () => {
    orderServiceSpy.getOrderById.and.returnValue(of({
      parts: [{ items: [{ productId: 'P9', productName: 'Product Nine' }] }],
      contents: [{ contentId: 'C-9' }],
    } as any));
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of({
      orderHeader: { orderId: '123', entryDate: '2024-02-01T00:00:00Z', currencyUomId: 'EUR' },
      statusItem: { statusId: 'ORDER_APPROVED', description: 'Approved' },
      firstPart: { vendorPartyId: 'VENDOR-9' },
      shipments: [],
      picklists: [],
      reservationStatus: { fullyReserved: true, hasBackorder: false },
      orderContactMechList: [],
    } as any));
    spyOn<any>(component, 'loadValidStatusChanges').and.stub();

    component.isQuoteMode = false;
    component.getOrderById('123').subscribe();

    expect(orderServiceSpy.getOrderById).toHaveBeenCalledWith('123');
    expect(orderServiceSpy.getOrderDisplayInfoById).toHaveBeenCalledWith('123');
    expect(component.orderHeader()?.orderId).toBe('123');
    expect(component.canReceive()).toBeTrue();
    expect(component.canCreateReturn()).toBeFalse();

    component.isQuoteMode = true;
    expect(component.canCreateReturn()).toBeFalse();

    const refreshSpy = spyOn(component, 'getOrderById').and.returnValue(of({} as any));
    component.orderPrimaryId = '123';
    (component as any).silentRefresh();
    expect(refreshSpy).toHaveBeenCalledWith('123', false);

    component.orderPrimaryId = undefined;
    (component as any).silentRefresh();
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('covers note/content/pdf no-op guards and note append behavior', fakeAsync(() => {
    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    component.orderNotes.set([{ id: 'NOTE-OLD' } as any]);
    spyOn<any>(component, 'silentRefresh').and.stub();
    spyOn<any>(component, 'syncOrderNotes').and.stub();
    spyOn(window, 'open').and.stub();

    mockDialogClose({ id: 'NOTE-NEW', noteText: 'New note' });
    component.addUpdateNoteDialog({ id: 'NOTE-OLD' } as any);
    tick();
    expect(component.orderNotes().some((note) => note?.id === 'NOTE-NEW')).toBeTrue();

    component.orderId = undefined;
    component.addUpdateNoteDialog({ id: 'NOTE-OTHER' } as any);
    component.addUpdateContentDialog({ id: 'CONTENT-2' } as any);
    component.openPdf();
    tick();

    expect(component.orderNotes().some((note) => note?.id === 'NOTE-NEW')).toBeTrue();
    expect(window.open).not.toHaveBeenCalled();
  }));

  it('covers status action filtering and load fallback branches', () => {
    component.isQuoteMode = true;
    component.statusItem.set({ statusId: 'ORDER_HOLD' } as any);
    commonServiceSpy.getValidStatusChanges.and.returnValue(throwError(() => new Error('status lookup failed')));

    component.loadValidStatusChanges();
    expect(component.validStatusChanges()).toEqual([]);

    const quoteCreated = (component as any).filterStatusChangesForUi([
      { statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve' },
      { statusIdTo: 'ORDER_HOLD', transitionName: 'Hold' },
      { statusIdTo: 'ORDER_CANCELLED', transitionName: 'Cancel' },
      { statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve Duplicate' },
    ], 'ORDER_CREATED');
    expect(quoteCreated.map((change: any) => change.statusIdTo)).toEqual(['ORDER_APPROVED']);

    const quoteHold = (component as any).filterStatusChangesForUi([
      { statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve' },
      { statusIdTo: 'ORDER_HOLD', transitionName: 'Hold' },
      { statusIdTo: 'ORDER_CANCELLED', transitionName: 'Cancel' },
    ], 'ORDER_HOLD');
    expect(quoteHold.map((change: any) => change.statusIdTo)).toEqual(['ORDER_APPROVED']);

    expect((component as any).filterStatusChangesForUi([{ statusIdTo: 'ORDER_APPROVED' }], 'ORDER_COMPLETED')).toEqual([]);
    component.isQuoteMode = false;
    expect((component as any).filterStatusChangesForUi([
      { statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve' },
      { statusIdTo: 'ORDER_HOLD', transitionName: 'Hold' },
      { statusIdTo: 'ORDER_CANCELLED', transitionName: 'Cancel' },
      { statusIdTo: 'ORDER_PENDING', transitionName: 'Pending' },
    ], 'ORDER_CREATED').map((change: any) => change.statusIdTo)).toEqual([
      'ORDER_APPROVED',
      'ORDER_HOLD',
      'ORDER_CANCELLED',
    ]);

    expect((component as any).resolveActionType({ statusIdTo: 'ORDER_APPROVED' })).toBe('APPROVE');
    expect((component as any).resolveActionType({ statusIdTo: 'ORDER_HOLD' })).toBe('HOLD');
    expect((component as any).resolveActionType({ statusIdTo: 'ORDER_CANCELLED' })).toBe('CANCEL');
    expect((component as any).resolveActionType({ transitionName: 'Custom' })).toBeNull();
  });

  it('covers no-op guards for missing order identifiers', () => {
    component.orderId = undefined;
    component.orderPrimaryId = undefined;
    component.canEditItems.set(false);
    spyOn<any>(component, 'silentRefresh').and.stub();

    component.addItemDialog();
    component.cancelItem({ orderItemSeqId: '0001' } as any);
    component.goToCreateReturn();
    component.goToReceive();
    component.changeOrderStatus('ORDER_APPROVED');
    component.cancelOrder();
    component.addShipToAddress();
    component.editVendorAddress({ contactMechId: 'ADDR-1' } as any);
    component.updateShipBeforeDate({ orderPartSeqId: '0001' } as any);
    component.editShippingInstructions({ orderPartSeqId: '0001' } as any);
    component.openOrderContent({ contentId: 'C1' } as any);

    expect(orderServiceSpy.cancelOrderItem).not.toHaveBeenCalled();
    expect(orderServiceSpy.updateOrderStatus).not.toHaveBeenCalledWith(undefined as any, jasmine.anything());
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(dialogSpy.open).not.toHaveBeenCalledWith(AddEditAddressComponent, jasmine.anything());
  });

  it('covers overview metadata, return navigation, and basic helper branches', () => {
    component.orderHeader.set({ orderId: 'PO-123', entryDate: '2024-01-01T00:00:00Z' } as any);
    component.statusItem.set({ statusId: 'ORDER_COMPLETED' } as any);
    component.isQuoteMode = false;

    expect(component.contentColumnKeys).toEqual(['description', 'contentDate', 'contentLocation']);
    expect(component.invoiceColumnKeys).toEqual(['invoiceId', 'productId', 'quantity', 'amount']);
    expect(component.returnColumnKeys).toEqual(['returnId', 'returnType', 'status', 'entryDate', 'totalAmount']);
    expect(component.overviewFields().map((field) => field.label)).toEqual(['COMMON.ID', 'PO.ORDER_DATE', 'COMMON.STATUS']);
    expect(component.canCreateReturn()).toBeTrue();

    component.goToCreateReturn();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/returns/create'], {
      queryParams: { orderId: 'PO-123', orderTypeId: 'PURCHASE_ORDER' },
    });

    expect(component.formatShipBeforeDate(null)).toBe('');
    expect(component.formatShipBeforeDate('2024-05-02')).toBe('May 2, 2024');

    const loadLookupSpy = spyOn(component, 'loadLookupData').and.stub();
    component.ngOnInit();
    expect(loadLookupSpy).toHaveBeenCalled();

    component.orderId = undefined;
    component.deleteNote({ id: 'NOTE-1' } as any);
    component.editShippingInstructions({ orderPartSeqId: '0001' } as any);
    expect(dialogSpy.open).not.toHaveBeenCalledWith(ShippingInstructionDialogComponent, jasmine.anything());

    component.orderId = 'PO-123';
    orderServiceSpy.reorderOrder.calls.reset();
    component.orderId = undefined;
    component.reorderOrder();
    expect(orderServiceSpy.reorderOrder).not.toHaveBeenCalled();
  });

  it('covers quote rejection and shipment/date update success paths', () => {
    component.orderId = 'PO-123';
    component.orderPrimaryId = 'PO-123';
    component.orderHeader.set({ orderId: 'PO-123' } as any);
    component.statusItem.set({ statusId: 'ORDER_APPROVED' } as any);
    component.isQuoteMode = true;
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();

    mockDialogClose(true);
    component.rejectQuote();
    expect(orderServiceSpy.updateOrderStatus).toHaveBeenCalledWith('PO-123', 'ORDER_REJECTED');

    component.cancelOrder();
    expect((dialogSpy.open.calls.mostRecent().args[1] as any).data.message).toBe('COMMON.CONFIRM_CANCEL_ORDER');
    expect(orderServiceSpy.updateOrderStatus).toHaveBeenCalledWith('PO-123', 'ORDER_CANCELLED');

    mockDialogClose('Leave at dock');
    component.editShippingInstructions({ orderPartSeqId: '0001', shippingInstructions: '' } as any);
    expect(orderServiceSpy.updateShippingInstructions).toHaveBeenCalledWith('PO-123', '0001', 'Leave at dock');

    mockDialogClose('2026-04-10');
    component.updateShipBeforeDate({ orderPartSeqId: '0001', shipBeforeDate: '2026-04-09' } as any);
    expect(orderServiceSpy.updateShipGroupShipBeforeDate).toHaveBeenCalledWith('PO-123', '0001', '2026-04-10');

    orderServiceSpy.reorderOrder.and.returnValue(of({ id: 55 }));
    component.reorderOrder();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/pos/55']);
    expect(silentRefreshSpy).toHaveBeenCalled();
  });
});
