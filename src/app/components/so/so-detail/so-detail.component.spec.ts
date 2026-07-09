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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';

import { SODetailComponent } from './so-detail.component';
import { OrderService } from '@ofbiz/services/order/order.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { NoteComponent } from '../../order/note/note.component';
import { ProductItemComponent } from '../../order/product-item/product-item.component';
import { ContentComponent } from '../../order/content/content.component';
import { ShippingInstructionDialogComponent } from '../../order/shipping-instruction-dialog/shipping-instruction-dialog.component';
import { DateUpdateDialogComponent } from '../../common/date-update-dialog/date-update-dialog.component';
import { AddEditAddressComponent } from '@ofbiz/components/party/add-edit-address/add-edit-address.component';
import { ShipToPhoneDialogComponent } from '../ship-to-phone-dialog/ship-to-phone-dialog.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { AddOrderAdjustmentDialogComponent } from '../add-order-adjustment-dialog/add-order-adjustment-dialog.component';

describe('SODetailComponent', () => {
  let component: SODetailComponent;
  let fixture: ComponentFixture<SODetailComponent>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let routerSpy: jasmine.SpyObj<Router>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;

  const displayInfoMock = {
    orderHeader: { orderId: 'SO-123', entryDate: '2024-01-01T00:00:00Z', currencyUomId: 'USD' },
    statusItem: { statusId: 'ORDER_CREATED', description: 'Created' },
    orderNoteList: [{ id: 'NOTE-1', noteText: 'Urgent' }],
    firstPartInfo: {},
    firstPart: { customerPartyId: 'CUST-1' },
    orderContactMechList: [
      {
        contactMechId: 'ADDR-1',
        contactMechPurposeTypeId: 'SHIPPING_LOCATION',
        postalAddress: { address1: 'Street 1', city: 'City', countryGeoId: 'USA' }
      },
      {
        contactMechId: 'PHONE-1',
        contactMechPurposeTypeId: 'PHONE_SHIPPING',
        telecomNumber: { countryCode: '+1', areaCode: '555', contactNumber: '1234567' }
      }
    ],
    orderAdjustmentList: [],
    orderTermList: [],
    orderPaymentPreferenceList: [],
    shipments: [{ shipmentId: 'SHIP-1', statusId: 'SHIPMENT_INPUT' }],
    invoices: [],
    returns: [],
    picklists: [{ picklistId: 'PICK-1', shipmentId: 'SHIP-1' }],
    reservationStatus: { fullyReserved: true },
    facilityAddress: { address1: 'Warehouse 1' },
    relatedOrderPrimaryId: null,
    relatedOrderId: null,
    relatedOrderTypeId: null,
  };

  const orderResponseMock = {
    parts: [{
      customerPartyId: 'CUST-1',
      partTotal: 100,
      items: [{
        orderItemSeqId: '0001',
        productId: 'PROD-1',
        quantity: 5,
        unitAmount: 20,
        issuedQuantity: 3,
        reservedQuantity: 5,
      }]
    }],
    contents: [{ contentId: 'CONTENT-1', contentLocation: 'file.pdf' }]
  };

  beforeEach(async () => {
    const orderSpy = jasmine.createSpyObj('OrderService', [
      'getOrderById',
      'getOrder',
      'getOrderDisplayInfoById',
      'getOrderIdentifications',
      'getOrderShipments',
      'getOrderInvoices',
      'getReservationStatus',
      'getOrderPicklists',
      'getPODisplayInfo',
      'deleteOrderNote',
      'updateShippingInstructions',
      'updateShipGroupShipBeforeDate',
      'upsertOrderShippingPhone',
      'approveSalesOrder',
      'updateOrderStatus',
      'createPicklist',
      'downloadOrderContent',
      'getOrderPdf',
      'reorderOrder',
      'convertQuoteToOrder',
      'markPicklistPicked',
      'shipShipment',
      'updateOrderItemQuantity',
      'cancelOrderItem',
      'addOrderAdjustment',
    ]);
    const commonSpy = jasmine.createSpyObj('CommonService', [
      'getAllStatusItems',
      'getShipmentTypes',
      'getOrderItemTypes',
      'getValidStatusChanges',
    ]);
    const productSpy = jasmine.createSpyObj('ProductService', ['getProductsByIds']);
    const facilitySpy = jasmine.createSpyObj('FacilityService', ['getFacility']);
    const partySpy = jasmine.createSpyObj('PartyService', ['getCustomer']);
    const dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    const routerMock = jasmine.createSpyObj('Router', ['navigate']);
    const snackbarMock = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const storeSpy = jasmine.createSpyObj('Store', ['dispatch', 'pipe']);
    const schedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['defer', 'markForCheck']);

    storeSpy.pipe.and.returnValue(of({}));
    schedulerSpy.defer.and.callFake((task: () => void) => task());
    schedulerSpy.markForCheck.and.callFake(() => {});

    orderSpy.getOrderById.and.returnValue(of(orderResponseMock));
    orderSpy.getOrder.and.returnValue(of(orderResponseMock));
    orderSpy.getOrderDisplayInfoById.and.returnValue(of(displayInfoMock));
    orderSpy.getOrderIdentifications.and.returnValue(of([]));
    orderSpy.getPODisplayInfo.and.returnValue(of(displayInfoMock));
    orderSpy.getOrderShipments.and.returnValue(of([]));
    orderSpy.getOrderInvoices.and.returnValue(of([]));
    orderSpy.getReservationStatus.and.returnValue(of({ fullyReserved: false }));
    orderSpy.getOrderPicklists.and.returnValue(of([]));
    orderSpy.deleteOrderNote.and.returnValue(of({}));
    orderSpy.updateShippingInstructions.and.returnValue(of({}));
    orderSpy.updateShipGroupShipBeforeDate.and.returnValue(of({}));
    orderSpy.upsertOrderShippingPhone.and.returnValue(of({}));
    orderSpy.approveSalesOrder.and.returnValue(of({}));
    orderSpy.updateOrderStatus.and.returnValue(of({}));
    orderSpy.createPicklist.and.returnValue(of({}));
    orderSpy.downloadOrderContent.and.returnValue(of(new Blob(['test'], { type: 'text/plain' })));
    orderSpy.getOrderPdf.and.returnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    orderSpy.reorderOrder.and.returnValue(of({ id: 999 }));
    orderSpy.convertQuoteToOrder.and.returnValue(of({ id: 777 }));
    orderSpy.markPicklistPicked.and.returnValue(of({}));
    orderSpy.shipShipment.and.returnValue(of({}));
    orderSpy.updateOrderItemQuantity.and.returnValue(of({ quantity: 7 }));
    orderSpy.cancelOrderItem.and.returnValue(of({}));
    orderSpy.addOrderAdjustment.and.returnValue(of({}));

    commonSpy.getAllStatusItems.and.returnValue(of([]));
    commonSpy.getShipmentTypes.and.returnValue(of([]));
    commonSpy.getOrderItemTypes.and.returnValue(of([]));
    commonSpy.getValidStatusChanges.and.returnValue(of([]));
    productSpy.getProductsByIds.and.returnValue(of([]));
    facilitySpy.getFacility.and.returnValue(of({ addresses: [] }));
    partySpy.getCustomer.and.returnValue(of({ customerDetail: {} }));
    dialogMock.open.and.returnValue({ afterClosed: () => of(true) } as any);

    TestBed.configureTestingModule({
      declarations: [SODetailComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: OrderService, useValue: orderSpy },
        { provide: CommonService, useValue: commonSpy },
        { provide: ProductService, useValue: productSpy },
        { provide: FacilityService, useValue: facilitySpy },
        { provide: PartyService, useValue: partySpy },
        { provide: MatDialog, useValue: dialogMock },
        { provide: Router, useValue: routerMock },
        { provide: SnackbarService, useValue: snackbarMock },
        { provide: Store, useValue: storeSpy },
        { provide: RenderSchedulerService, useValue: schedulerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { data: {} }, data: of({}) },
            snapshot: { data: {}, paramMap: convertToParamMap({ id: 'SO-123' }) },
            data: of({}),
            paramMap: of(convertToParamMap({ id: 'SO-123' })),
          },
        },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => key,
            get: (key: string) => of(key),
            stream: (key: string) => of(key),
            onLangChange: of({}),
            onTranslationChange: of({}),
            onDefaultLangChange: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    TestBed.overrideComponent(SODetailComponent, {
      set: { template: '' },
    });

    await TestBed.compileComponents();
    orderServiceSpy = TestBed.inject(OrderService) as jasmine.SpyObj<OrderService>;
    dialogSpy = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    commonServiceSpy = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
    partyServiceSpy = TestBed.inject(PartyService) as jasmine.SpyObj<PartyService>;
    snackbarServiceSpy = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
  });

  function createComponent() {
    fixture = TestBed.createComponent(SODetailComponent);
    component = fixture.componentInstance;
  }

  function mockDialogClose(result: any) {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as any);
  }

  it('should create component', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should fetch order detail on init', () => {
    createComponent();
    component.loadLookupData();
    component.getOrderById('SO-123').subscribe();

    expect(orderServiceSpy.getOrder).toHaveBeenCalledWith('SO-123');
    expect(orderServiceSpy.getPODisplayInfo).toHaveBeenCalledWith('SO-123');
    expect(commonServiceSpy.getAllStatusItems).toHaveBeenCalled();
    expect(component.orderHeader()?.orderId).toBe('SO-123');
    expect(component.orderNotes()).toHaveSize(1);
    expect(component.shipToAddresses()).toHaveSize(1);
    expect(component.shipToPhones()).toHaveSize(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('should cover numeric-id, silent refresh, and summary helper branches', () => {
    createComponent();
    const getOrderByIdSpy = spyOn(component, 'getOrderById').and.returnValue(of({} as any));

    expect((component as any).isNumericIdentifier(' 123 ')).toBeTrue();
    expect((component as any).isNumericIdentifier('SO-123')).toBeFalse();

    component.orderPrimaryId = undefined;
    (component as any).silentRefresh();
    expect(getOrderByIdSpy).not.toHaveBeenCalled();

    component.orderPrimaryId = 'SO-123';
    (component as any).silentRefresh();
    expect(getOrderByIdSpy).toHaveBeenCalledWith('SO-123', false);

    component.parts.set([{ partTotal: 25 }, { partTotal: 75 }] as any);
    (component as any).calculateSummary([
      { orderAdjustmentTypeId: 'SHIPPING_CHARGES', amount: 10 },
      { orderAdjustmentTypeId: 'DISCOUNT_ADJUSTMENT', amount: -5 },
      { orderAdjustmentTypeId: 'OTHER', amount: 99 },
    ] as any);

    expect(component.shippingTotal()).toBe(10);
    expect(component.discountTotal()).toBe(-5);
    expect(component.itemSubtotal()).toBe(100);
    expect(component.orderTotal()).toBe(105);
  });

  it('should handle get order failure and stop loading', () => {
    createComponent();
    orderServiceSpy.getOrder.and.returnValue(throwError(() => new Error('failed')));

    component.getOrderById('SO-123').subscribe();

    expect(component.isLoading()).toBeFalse();
  });

  it('should use numeric identifier lookup and cover helper fallbacks for status, links, and labels', () => {
    createComponent();
    orderServiceSpy.getOrderById.and.returnValue(of(orderResponseMock));
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of({
      ...displayInfoMock,
      orderHeader: { orderId: '123', orderTypeId: 'SALES_ORDER', entryDate: '2024-01-01T00:00:00Z' },
      statusItem: { statusId: 'ORDER_APPROVED', description: 'Approved' },
      statusHistory: [],
    } as any));

    component.getOrderById('123').subscribe();

    expect(orderServiceSpy.getOrderById).toHaveBeenCalledWith('123');
    expect(orderServiceSpy.getOrderDisplayInfoById).toHaveBeenCalledWith('123');
    component.statusDescriptionMap.set(new Map([
      ['ORDER_APPROVED', 'Approved'],
      ['ORDER_CANCELLED', 'Cancel'],
      ['ORDER_HOLD', 'Hold'],
    ]));
    expect(component.getStatusDescription('ORDER_APPROVED')).toBe('Approved');
    expect(component.getStatusDescription('UNKNOWN')).toBe('UNKNOWN');
    expect(component.getShipmentTypeDescription('')).toBe('');
    expect(component.getShipmentTypeDescription('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE');
    expect(component.getOrderItemTypeDescription('PRODUCT')).toBe('PRODUCT');
    expect(component.getStatusActionLabel({ statusIdTo: 'ORDER_CANCELLED', transitionName: 'Cancel' })).toBe('Cancel');
    expect(component.getStatusActionLabel({ statusIdTo: 'ORDER_HOLD', transitionName: 'Hold' })).toBe('Hold');
    expect(component.getStatusActionLabel({ statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve' })).toBe('Approve');
    expect(component.getFallbackApproveLabel()).toBe('COMMON.APPROVE');
    expect(component.getShipmentStatus('SHIP-1')).toBe('SHIPMENT_INPUT');
  });

  it('should map quote overview fields and sparse details with no picklist or shipment data', () => {
    createComponent();
    component.isQuoteMode = true;
    orderServiceSpy.getPODisplayInfo.and.returnValue(of({
      orderHeader: {
        orderId: 'Q-1',
        orderName: 'PO-REF',
        externalId: 'EXT-1',
        orderTypeId: 'SALES_QUOTE',
        entryDate: '2024-02-01T00:00:00Z',
      },
      statusItem: { statusId: 'ORDER_CREATED', description: 'Created' },
      orderContactMechList: [],
      shipments: [],
      invoices: [],
      returns: [],
      picklists: [],
      reservationStatus: { fullyReserved: true },
      orderAdjustmentList: [],
      orderTermList: [],
      orderPaymentPreferenceList: [],
      orderStatusList: [
        { statusId: 'ORDER_CREATED', description: 'Created', statusDatetime: '2024-02-01T01:00:00Z', statusUserLogin: 'user1', changeReason: 'new' },
        { statusId: 'ITEM_CREATED', orderItemSeqId: '0001', statusDatetime: '2024-02-01T01:30:00Z', statusUserLogin: 'user1' },
        { statusId: null, statusDatetime: '2024-02-01T02:00:00Z' },
      ],
      firstPart: {},
      facilityAddress: null,
    } as any));

    component.getOrderById('SO-123').subscribe();

    expect(component.overviewFields().map((field) => field.label)).toEqual([
      'QUOTE.ID',
      'SO.PO_NUMBER',
      'COMMON.EXTERNAL_ID',
      'QUOTE.TYPE',
      'QUOTE.DATE',
      'COMMON.STATUS',
    ]);
    expect(component.statusHistoryEntries()).toEqual([
      jasmine.objectContaining({
        statusId: 'ORDER_CREATED',
        statusLabel: 'Created',
        changedAt: '2024-02-01T01:00:00Z',
        changedBy: 'user1',
        reason: 'new',
      }),
      jasmine.objectContaining({
        statusId: null,
        statusLabel: '-',
        changedAt: '2024-02-01T02:00:00Z',
      }),
    ]);
    expect(component.shipToAddresses()).toEqual([]);
    expect(component.shipToPhones()).toEqual([]);
    expect(component.shipments()).toEqual([]);
    expect(component.invoiceItems()).toEqual([]);
    expect(component.returnItems()).toEqual([]);
    expect(component.picklists()).toEqual([]);
    expect(component.canPicklist()).toBeFalse();
    expect(component.facilityAddress()).toBeNull();
  });

  it('should map invoices, shipment status ids, phone-only contacts, and valid status changes on load', () => {
    createComponent();
    commonServiceSpy.getValidStatusChanges.and.returnValue(of([
      { statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve' },
    ]));
    orderServiceSpy.getPODisplayInfo.and.returnValue(of({
      ...displayInfoMock,
      orderHeader: { orderId: 'SO-123', entryDate: '2024-01-01T00:00:00Z' },
      orderContactMechList: [
        {
          contactMechPurposeTypeId: 'PHONE_SHIPPING',
          telecomNumber: { contactNumber: '9999999' },
        },
      ],
      shipments: [
        { shipmentId: 'SHIP-1', statusId: 'SHIPMENT_INPUT' },
        { shipmentId: null, statusId: 'IGNORED' },
      ],
      invoices: [
        {
          id: 1,
          invoiceId: 'INV-1',
          currencyUomId: 'USD',
          items: [{ productId: 'PROD-1', quantity: 2, amount: 15 }],
        },
      ],
      picklists: [],
      reservationStatus: { fullyReserved: false },
    } as any));

    component.getOrderById('SO-123').subscribe();

    expect(commonServiceSpy.getValidStatusChanges).toHaveBeenCalledWith('ORDER_CREATED');
    expect(component.shipToPhones()).toEqual([
      { contactMechId: undefined, countryCode: '', areaCode: '', contactNumber: '9999999' },
    ]);
    expect(component.shipmentStatusById().get('SHIP-1')).toBe('SHIPMENT_INPUT');
    expect(component.shipmentStatusById().size).toBe(1);
    expect(component.invoiceItems()).toEqual([
      {
        id: 1,
        invoiceId: 'INV-1',
        currencyUomId: 'USD',
        productId: 'PROD-1',
        quantity: 2,
        amount: 15,
      },
    ]);
    expect(component.validStatusChanges()).toHaveSize(1);
  });

  it('should cover quote and shipment action helpers', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    component.orderHeader.set({ orderId: 'SO-123', entryDate: '2024-01-01T00:00:00Z' } as any);
    component.statusItem.set({ statusId: 'ORDER_COMPLETED', description: 'Completed' } as any);
    component.isQuoteMode = false;
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();

    expect(component.canCreateReturn()).toBeTrue();
    component.goToCreateReturn();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/returns/create'], {
      queryParams: { orderId: 'SO-123', orderTypeId: 'SALES_ORDER' },
    });

    component.createPicklist();
    expect(orderServiceSpy.createPicklist).toHaveBeenCalledWith('SO-123');
    expect(silentRefreshSpy).toHaveBeenCalled();

    component.markPicklistPicked('PICK-1');
    expect(orderServiceSpy.markPicklistPicked).toHaveBeenCalledWith('PICK-1');

    component.shipShipment('SHIP-1');
    expect(orderServiceSpy.shipShipment).toHaveBeenCalledWith('SHIP-1');

    component.reorderOrder();
    expect(orderServiceSpy.reorderOrder).toHaveBeenCalledWith('SO-123');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/orders/999']);

    component.isQuoteMode = true;
    component.statusItem.set({ statusId: 'ORDER_APPROVED', description: 'Approved' } as any);
    component.convertQuoteToOrder();
    expect(orderServiceSpy.convertQuoteToOrder).toHaveBeenCalledWith('SO-123');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/orders/777']);

    component.approveOrder();
    expect(orderServiceSpy.updateOrderStatus).toHaveBeenCalledWith('SO-123', 'ORDER_APPROVED');
  });

  it('should open note, item, and content dialogs then refresh or sync data', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    component.canEditItems.set(true);
    component.orderNotes.set([{ id: 'NOTE-1', noteText: 'Old note' }]);
    const getOrderByIdSpy = spyOn(component, 'getOrderById').and.returnValue(of({} as any));
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of({ orderNoteList: [{ id: 'NOTE-2', noteText: 'Fresh note' }] } as any));

    mockDialogClose({ id: 'NOTE-2', noteText: 'Fresh note' });
    component.addUpdateNoteDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(NoteComponent, {
      data: { noteData: { orderId: 'SO-123' } },
    });
    expect(orderServiceSpy.getOrderDisplayInfoById).toHaveBeenCalledWith('SO-123');

    mockDialogClose({ id: 'ITEM-1' });
    component.addItemDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(ProductItemComponent, {
      data: { productItemData: { orderId: 'SO-123' } },
    });

    mockDialogClose({ id: 'CONTENT-1' });
    component.addUpdateContentDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(ContentComponent, {
      data: { contentData: { orderId: 'SO-123' } },
    });

    expect(getOrderByIdSpy).toHaveBeenCalledWith('SO-123', false);
    expect(component.orderNotes()).toEqual([{ id: 'NOTE-2', noteText: 'Fresh note' }]);
  });

  it('should update existing notes and cover helper fallbacks', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    component.orderNotes.set([{ id: 'NOTE-1', noteText: 'Old note' }]);
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of({ orderNoteList: [{ id: 'NOTE-1', noteText: 'Updated note' }] } as any));
    const syncSpy = spyOn<any>(component, 'syncOrderNotes').and.callThrough();
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ id: 'NOTE-1', noteText: 'Updated note' }) } as any);

    component.addUpdateNoteDialog({ id: 'NOTE-1', noteText: 'Old note' });

    expect(component.orderNotes()).toEqual([{ id: 'NOTE-1', noteText: 'Updated note' }]);
    expect(syncSpy).toHaveBeenCalled();

    component.orderHeader.set({ orderId: 'SO-123' } as any);
    component.statusItem.set({ statusId: 'ORDER_COMPLETED' } as any);
    expect(component.canCreateReturn()).toBeTrue();
    component.isQuoteMode = true;
    expect(component.canCreateReturn()).toBeFalse();
    component.isQuoteMode = false;
    component.orderHeader.set({} as any);
    expect(component.canCreateReturn()).toBeFalse();

    component.shipmentStatusById.set(new Map([['SHIP-1', 'SHIPMENT_READY']]));
    expect(component.getShipmentStatus('SHIP-1')).toBe('SHIPMENT_READY');
    expect(component.getShipmentStatus('')).toBeUndefined();
  });

  it('should not open item dialog when the sales order is completed or not editable', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.canEditItems.set(false);

    component.addItemDialog();
    component.editItem({ orderItemSeqId: '0001', statusId: 'ITEM_CREATED' });

    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('should cover edit quantity guards and cancel edit branch', () => {
    createComponent();
    component.canEditItems.set(true);
    const item = { orderItemSeqId: '0001', quantity: 5, issuedQuantity: 1, reservedQuantity: 2, unitAmount: 10 };

    component.startEditQuantity({} as any);
    component.startEditQuantity(item as any);
    expect(component.isEditingItem(item as any)).toBeTrue();
    component.cancelEditQuantity();
    expect(component.isEditingItem(item as any)).toBeFalse();

    component.orderId = undefined;
    component.editingQuantity = 3;
    component.saveQuantity(item as any);

    component.orderId = 'SO-123';
    component.editingQuantity = null;
    component.saveQuantity(item as any);
    component.editingQuantity = NaN;
    component.saveQuantity(item as any);
    component.editingQuantity = -1;
    component.saveQuantity(item as any);

    expect(orderServiceSpy.updateOrderItemQuantity).not.toHaveBeenCalledWith('SO-123', '0001', jasmine.any(Number));
    expect(component.getDisplayedReservedQuantity({ reservedQuantity: 1, issuedQuantity: 4 } as any)).toBe(0);
    expect(component.getDisplayedShippedQuantity(null as any)).toBe(0);
    expect(component.getItemComponents(null as any)).toEqual([]);
  });

  it('should delete notes after confirmation and sync the refreshed notes', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    component.orderNotes.set([{ id: 'NOTE-1', noteText: 'Delete me' }]);
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of({ orderNoteList: [] } as any));
    mockDialogClose(true);

    component.deleteNote({ id: 'NOTE-1' });

    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, jasmine.anything());
    expect(orderServiceSpy.deleteOrderNote).toHaveBeenCalledWith({ orderId: 'SO-123', noteId: 'NOTE-1' });
    expect(component.orderNotes()).toEqual([]);
  });

  it('should update shipping instructions, ship before date, ship-to address, and ship-to phone then refresh silently', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    const getOrderByIdSpy = spyOn(component, 'getOrderById').and.returnValue(of({} as any));

    mockDialogClose('Leave at dock');
    component.editShippingInstructions({ orderPartSeqId: '0001', shippingInstructions: '' });
    expect(dialogSpy.open).toHaveBeenCalledWith(ShippingInstructionDialogComponent, {
      data: {
        titleKey: 'COMMON.SHIPPING_INSTRUCTIONS',
        shippingInstructions: '',
      },
    });

    mockDialogClose('2026-03-30');
    component.updateShipBeforeDate({ orderPartSeqId: '0001', shipBeforeDate: '2026-03-24' });
    expect(dialogSpy.open).toHaveBeenCalledWith(DateUpdateDialogComponent, {
      data: {
        title: 'Update Ship Before Date',
        date: '2026-03-24'
      }
    });

    mockDialogClose({ id: 'ADDR-1' });
    component.editShipToAddress({
      contactMechId: 'ADDR-1',
      contactMechPurposeTypeId: 'SHIPPING_LOCATION',
      postalAddress: { address1: 'Street 1', city: 'City', countryGeoId: 'USA' }
    });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditAddressComponent, {
      data: {
        addressData: jasmine.objectContaining({
          orderId: 'SO-123',
          contactMechId: 'ADDR-1',
          contactMechPurposeId: 'SHIPPING_LOCATION',
        }),
      },
    });

    mockDialogClose({ contactNumber: '1234567', areaCode: '555', countryCode: '+1' });
    component.editShipToPhone({ contactNumber: '1234567', areaCode: '555', countryCode: '+1' });
    expect(dialogSpy.open).toHaveBeenCalledWith(ShipToPhoneDialogComponent, {
      data: {
        countryCode: '+1',
        areaCode: '555',
        contactNumber: '1234567',
      },
    });

    expect(orderServiceSpy.updateShippingInstructions).toHaveBeenCalledWith('SO-123', '0001', 'Leave at dock');
    expect(orderServiceSpy.updateShipGroupShipBeforeDate).toHaveBeenCalledWith('SO-123', '0001', '2026-03-30');
    expect(orderServiceSpy.upsertOrderShippingPhone).toHaveBeenCalledWith('SO-123', {
      contactNumber: '1234567',
      areaCode: '555',
      countryCode: '+1'
    });
    expect(getOrderByIdSpy).toHaveBeenCalledWith('SO-123', false);
  });

  it('should approve, create picklist, mark picklist picked, and ship shipment then refresh silently', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    const getOrderByIdSpy = spyOn(component, 'getOrderById').and.returnValue(of({} as any));

    component.approveOrder();
    component.createPicklist();
    component.markPicklistPicked('PICK-1');
    component.shipShipment('SHIP-1');

    expect(orderServiceSpy.approveSalesOrder).toHaveBeenCalledWith('SO-123');
    expect(orderServiceSpy.createPicklist).toHaveBeenCalledWith('SO-123');
    expect(orderServiceSpy.markPicklistPicked).toHaveBeenCalledWith('PICK-1');
    expect(orderServiceSpy.shipShipment).toHaveBeenCalledWith('SHIP-1');
    expect(getOrderByIdSpy).toHaveBeenCalledWith('SO-123', false);
  });

  it('should download order content and support pdf, reorder, and convert quote actions', () => {
    createComponent();
    component.orderId = 'SO-123';
    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:so');
    const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
    const windowOpenSpy = spyOn(window, 'open');
    spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);

    component.openOrderContent({ contentId: 'CONTENT-1' });
    component.openPdf();
    component.reorderOrder();
    component.convertQuoteToOrder();

    expect(orderServiceSpy.downloadOrderContent).toHaveBeenCalledWith('SO-123', 'CONTENT-1');
    expect(orderServiceSpy.getOrderPdf).toHaveBeenCalledWith('SO-123');
    expect(windowOpenSpy).toHaveBeenCalledWith('blob:so', '_blank', 'noopener');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:so');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/orders/999']);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/orders/777']);
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should support quantity editing and display helpers', () => {
    createComponent();
    component.canEditItems.set(true);
    const item = { orderItemSeqId: '0001', quantity: 5, issuedQuantity: 3, reservedQuantity: 5, unitAmount: 20 };

    component.startEditQuantity(item);
    expect(component.isEditingItem(item)).toBeTrue();
    component.editingQuantity = 7;
    component.orderId = 'SO-123';
    component.saveQuantity(item);
    expect(orderServiceSpy.updateOrderItemQuantity).toHaveBeenCalledWith('SO-123', '0001', 7);
    expect(item.quantity).toBe(7);

    expect(component.getDisplayedShippedQuantity(item)).toBe(3);
    expect(component.getDisplayedReservedQuantity(item)).toBe(2);
    expect(component.getItemTotalAmount(item)).toBe(140);
    expect(component.formatPhone({ countryCode: '+1', areaCode: '555', contactNumber: '1234567' })).toBe('+1 555 1234567');
    expect(component.formatShipBeforeDate('2026-03-24')).toContain('2026');
  });

  it('should cover helper branches and no-op guards', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    component.parts.set([
      {
        partTotal: 50,
        carrierPartyId: 'UPS',
        carrierService: 'GROUND',
        customerPartyId: 'CUST-1',
        facility: { facilityId: 'FAC-1', facilityName: 'Main Facility' },
        items: [
          {
            orderItemSeqId: '0001',
            productId: 'PROD-1',
            quantity: 2,
            unitAmount: 5,
            components: [{ productId: 'COMP-1', productName: 'Component One' }],
          },
        ],
      } as any,
    ]);
    component.statusDescriptionMap.set(new Map([['ORDER_CREATED', 'Created']]));
    component.shipmentTypeMap.set(new Map([['STANDARD', 'Standard']]));
    component.orderItemTypeMap.set(new Map([['PRODUCT', 'Product']]));
    component.productNameMap.set(new Map([['PROD-1', 'Product One']]));
    (component as any).customerNameMap.set(new Map([['CUST-1', 'Customer One']]));
    component.canEditItems.set(false);

    expect(component.getShipByLabel(component.parts()[0] as any)).toBe('UPS @ GROUND');
    expect(component.getStatusDescription('ORDER_CREATED')).toBe('Created');
    expect(component.getShipmentTypeDescription('STANDARD')).toBe('Standard');
    expect(component.getOrderItemTypeDescription('PRODUCT')).toBe('Product');
    expect(component.getProductName({ productId: 'PROD-1' } as any)).toBe('Product One');
    expect(component.getCustomerName(component.parts()[0] as any)).toBe('Customer One');
    expect(component.getFacilityDisplayName(component.parts()[0] as any)).toBe('Main Facility (FAC-1)');
    expect(component.getFacilityId(component.parts()[0] as any)).toBe('FAC-1');
    expect(component.getFallbackCustomerPhone({ customer: { telecomNumber: { countryCode: '+1', areaCode: '555', contactNumber: '1234' } } } as any)).toContain('1234');
    expect(component.getFallbackCustomerPhone({ telecom: { telecomNumber: { countryCode: '+1', areaCode: '650', contactNumber: '8888' } } } as any)).toContain('8888');
    expect(component.getPartItems(component.parts()[0] as any)).toHaveSize(1);
    expect(component.getItemComponents(component.parts()[0].items?.[0] as any)).toHaveSize(1);
    expect(component.getComponentName({ productId: 'COMP-1', productName: 'Component One' })).toBe('Component One');
    expect(component.getComponentName({ productId: 'COMP-2' } as any)).toBe('COMP-2');
    expect(component.getRowClass({ statusId: 'ITEM_CANCELLED' } as any)).toContain('status-cancelled');
    expect(component.getFallbackApproveLabel()).toBe('COMMON.APPROVE');
    expect(component.getRelatedOrderRouteBase()).toBe('/orders');

    component.relatedOrderTypeId = 'SALES_ORDER';
    expect(component.getRelatedOrderRouteBase()).toBe('/orders');
    component.relatedOrderTypeId = 'SALES_QUOTE';
    expect(component.getRelatedOrderRouteBase()).toBe('/quotes');
    component.relatedOrderTypeId = 'PURCHASE_ORDER';
    expect(component.getRelatedOrderRouteBase()).toBe('/pos');
    component.relatedOrderTypeId = 'PURCHASE_QUOTE';
    expect(component.getRelatedOrderRouteBase()).toBe('/pos/quotes');

    component.startEditQuantity({ orderItemSeqId: '0002', quantity: 1 } as any);
    expect(component.isEditingItem({ orderItemSeqId: '0002' } as any)).toBeFalse();
    component.editingItemKey = null;
    component.editingQuantity = null;
    expect(component.isEditingItem({ orderItemSeqId: '0002' } as any)).toBeFalse();
    component.startEditQuantity({} as any);
    component.addItemDialog();
    component.deleteNote({} as any);
    component.editShippingInstructions({} as any);
    component.updateShipBeforeDate({} as any);
    component.editShipToAddress(null);
    component.editShipToPhone(null);
    component.openOrderContent(null as any);
    component.createPicklist();
    component.markPicklistPicked('');
    component.shipShipment('');

    expect(dialogSpy.open).not.toHaveBeenCalledWith(ProductItemComponent, jasmine.anything());
  });

  it('should keep shipping contacts empty when none are returned', () => {
    createComponent();
    orderServiceSpy.getPODisplayInfo.and.returnValue(of({
      ...displayInfoMock,
      orderContactMechList: [],
    }));

    component.getOrderById('SO-123').subscribe();

    expect(component.shipToAddresses()).toEqual([]);
    expect(component.shipToPhones()).toEqual([]);
  });

  it('should resolve customer names from part details and sync notes through sales-order fallback path', () => {
    createComponent();
    (component as any).primeCustomerNames([{
      customerPartyId: 'CUST-200',
      customer: {
        partyId: 'CUST-200',
        person: { firstName: 'Alice', lastName: 'Doe' },
      },
      items: [],
    }] as any);
    expect(component.customerNameMap().get('CUST-200')).toBe('Alice Doe');

    component.orderPrimaryId = undefined;
    component.orderId = 'SO-123';
    orderServiceSpy.getPODisplayInfo.and.returnValue(of({
      orderNoteList: [{ id: 'NOTE-9', noteText: 'Fallback note' }],
    } as any));

    (component as any).syncOrderNotes();
    expect(orderServiceSpy.getPODisplayInfo).toHaveBeenCalledWith('SO-123');
    expect(component.orderNotes()).toEqual([{ id: 'NOTE-9', noteText: 'Fallback note' }]);
  });

  it('should resolve product names from part details and product lookup results', () => {
    createComponent();
    const productService = TestBed.inject(ProductService) as jasmine.SpyObj<ProductService>;
    productService.getProductsByIds.and.returnValue(of([
      { productId: 'PROD-2', productName: 'Fetched Product' },
    ] as any));

    (component as any).primeProductNames([{
      items: [
        {
          productId: 'PROD-1',
          product: { productName: 'Inline Product' },
          components: [
            { productId: 'COMP-1', productName: 'Inline Component' },
            { productId: 'PROD-2' },
          ],
        },
      ],
    }] as any);

    expect(component.productNameMap().get('PROD-1')).toBe('Inline Product');
    expect(component.productNameMap().get('COMP-1')).toBe('Inline Component');
    expect(component.productNameMap().get('PROD-2')).toBe('Fetched Product');
    expect(productService.getProductsByIds).toHaveBeenCalledWith(['PROD-2']);
  });

  it('should cover quote/status helper branches and cancel flow', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    component.isQuoteMode = true;
    component.statusItem.set({ statusId: 'ORDER_CREATED' } as any);
    component.relatedOrderPrimaryId = null;
    spyOn<any>(component, 'silentRefresh').and.stub();
    spyOn(console, 'error');

    expect(component.canRejectQuote()).toBeTrue();
    expect(component.canConvertQuote()).toBeFalse();
    expect(component.getStatusActionLabel({ statusIdTo: 'ORDER_APPROVED', transitionName: '' })).toBe('QUOTE.APPROVE');
    expect(component.getFallbackApproveLabel()).toBe('QUOTE.APPROVE');
    expect(component.getRelatedOrderRouteBase()).toBe('/orders');

    mockDialogClose(true);
    component.cancelOrder();
    expect((dialogSpy.open.calls.mostRecent().args[1] as any).data.message).toBe('COMMON.CONFIRM_CANCEL_ORDER');
    expect(orderServiceSpy.updateOrderStatus).toHaveBeenCalledWith('SO-123', 'ORDER_CANCELLED');

    orderServiceSpy.updateOrderStatus.and.returnValue(throwError(() => new Error('cancel failed')));
    component.cancelOrder();
    expect(console.error).toHaveBeenCalled();

    component.isQuoteMode = false;
    component.statusItem.set({ statusId: 'ORDER_APPROVED' } as any);
    component.relatedOrderTypeId = 'PURCHASE_QUOTE';
    expect(component.canRejectQuote()).toBeFalse();
    expect(component.canConvertQuote()).toBeFalse();
    expect(component.getRelatedOrderRouteBase()).toBe('/pos/quotes');
  });

  it('should cover quantity guard paths and fallback display helpers', () => {
    createComponent();
    const item = { orderItemSeqId: '0001', quantity: 0, reservedQuantity: 1, issuedQuantity: 2, unitAmount: 0, totalAmount: 9 };

    component.saveQuantity(item as any);
    expect(orderServiceSpy.updateOrderItemQuantity).not.toHaveBeenCalled();

    component.orderId = 'SO-123';
    component.editingQuantity = -1;
    component.saveQuantity(item as any);
    component.editingQuantity = Number.NaN;
    component.saveQuantity(item as any);

    expect(orderServiceSpy.updateOrderItemQuantity).not.toHaveBeenCalled();
    expect(component.getDisplayedReservedQuantity(item)).toBe(0);
    expect(component.getItemTotalAmount(item)).toBe(9);
    expect(component.getShipmentTypeDescription('UNKNOWN')).toBe('UNKNOWN');
    expect(component.getOrderItemTypeDescription()).toBe('');
    expect(component.getProductName({ productId: 'PROD-X', itemDescription: 'Fallback item' } as any)).toBe('Fallback item');
    expect(component.getCustomerName({ customerPartyId: 'CUST-X' } as any)).toBe('CUST-X');
    expect(component.getFacilityDisplayName({ facilityId: 'FAC-X' } as any)).toBe('FAC-X');
    expect(component.formatPhone(null)).toBe('');
    expect(component.formatShipBeforeDate(null)).toBe('');
  });

  it('should cover lookup and status transition fallback branches', () => {
    createComponent();
    component.statusItem.set(null);
    component.loadValidStatusChanges();
    expect(component.validStatusChanges()).toEqual([]);

    component.statusItem.set({ statusId: 'ORDER_CREATED' } as any);
    commonServiceSpy.getValidStatusChanges.and.returnValue(of([]));
    component.loadValidStatusChanges();
    expect(component.validStatusChanges()).toEqual([]);

    component.isQuoteMode = false;
    expect((component as any).filterStatusChangesForUi([
      { statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve' },
      { statusIdTo: 'ORDER_HELD', transitionName: 'Hold' },
      { statusIdTo: 'ORDER_CANCELLED', transitionName: 'Cancel' },
      { statusIdTo: 'ORDER_CANCELLED', transitionName: 'Cancel duplicate' },
    ], 'ORDER_CREATED')).toHaveSize(3);
    expect((component as any).filterStatusChangesForUi([{ statusIdTo: 'ORDER_CREATED' }], 'ORDER_COMPLETED')).toEqual([]);
    expect((component as any).resolveActionType({ statusIdTo: 'ORDER_HOLD' })).toBe('HOLD');
    expect((component as any).resolveActionType({ description: 'Cancel Order' })).toBe('CANCEL');
    expect((component as any).resolveActionType({ statusIdTo: 'UNKNOWN' })).toBeNull();
    expect((component as any).pickAndOrderActions([
      { statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve' },
      { statusIdTo: 'ORDER_APPROVED', transitionName: 'Approve duplicate' },
      { statusIdTo: 'ORDER_HOLD', transitionName: 'Hold' },
      { statusIdTo: 'ORDER_CANCELLED', transitionName: 'Cancel' },
    ], ['APPROVE', 'HOLD', 'CANCEL'])).toHaveSize(3);

    commonServiceSpy.getValidStatusChanges.and.returnValue(throwError(() => new Error('status failed')));
    component.statusItem.set({ statusId: 'ORDER_CREATED' } as any);
    component.loadValidStatusChanges();
    expect(component.validStatusChanges()).toEqual([]);
  });

  it('should cover non-refresh and error branches for content and order status actions', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();
    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:order');
    const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
    const windowOpenSpy = spyOn(window, 'open');
    spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);
    spyOn(console, 'error');

    orderServiceSpy.downloadOrderContent.and.returnValue(throwError(() => new Error('download failed')));
    component.openOrderContent({ contentId: 'CONTENT-1' });
    expect(windowOpenSpy).not.toHaveBeenCalledWith('blob:order', '_blank', 'noopener');

    component.orderPrimaryId = undefined;
    component.markPicklistPicked('PICK-1');
    component.shipShipment('SHIP-1');
    expect(silentRefreshSpy).not.toHaveBeenCalled();

    mockDialogClose(false);
    component.changeOrderStatus('ORDER_APPROVED');
    expect(orderServiceSpy.updateOrderStatus).not.toHaveBeenCalledWith('SO-123', 'ORDER_APPROVED');

    mockDialogClose(true);
    orderServiceSpy.updateOrderStatus.and.returnValue(throwError(() => new Error('update failed')));
    component.changeOrderStatus('ORDER_APPROVED');
    expect(console.error).toHaveBeenCalled();

    orderServiceSpy.reorderOrder.and.returnValue(throwError(() => new Error('reorder failed')));
    component.reorderOrder();
    orderServiceSpy.convertQuoteToOrder.and.returnValue(throwError(() => new Error('convert failed')));
    component.convertQuoteToOrder();

    expect(console.error).toHaveBeenCalled();
    expect(createObjectURLSpy).not.toHaveBeenCalled();
    expect(revokeObjectURLSpy).not.toHaveBeenCalledWith('blob:order');
  });

  it('should cover no-op dialog closes and remaining helper branches', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    component.canEditItems.set(true);
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();

    dialogSpy.open.and.returnValue({ afterClosed: () => of('') } as any);
    component.editShippingInstructions({ orderPartSeqId: '0001', shippingInstructions: 'Existing' } as any);
    component.updateShipBeforeDate({ orderPartSeqId: '0001', shipBeforeDate: '2026-04-01' } as any);

    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.editShipToAddress({ contactMechId: 'ADDR-1' } as any);
    component.editShipToPhone({ contactNumber: '1234' } as any);

    expect(orderServiceSpy.updateShippingInstructions).not.toHaveBeenCalled();
    expect(orderServiceSpy.updateShipGroupShipBeforeDate).not.toHaveBeenCalled();
    expect(orderServiceSpy.upsertOrderShippingPhone).not.toHaveBeenCalled();
    expect(silentRefreshSpy).not.toHaveBeenCalled();

    expect(component.canManageOrderItems({ statusId: 'ITEM_CANCELLED' } as any)).toBeFalse();
    expect(component.canManageOrderItems({ statusId: 'ITEM_COMPLETED' } as any)).toBeFalse();
    expect(component.canManageOrderItems({ statusId: 'ITEM_APPROVED' } as any)).toBeTrue();
    expect(component.getRowClass({ statusId: 'ITEM_COMPLETED' } as any)).toBe('status-completed');
    expect(component.getRowClass({
      statusId: 'ITEM_APPROVED',
      quantity: 5,
      reservedQuantity: 1,
      issuedQuantity: 1,
    } as any)).toBe('status-backorder');
  });

  it('should cover status history, quote helpers, and cancel-item branches', () => {
    createComponent();
    component.orderHeader.set({ orderId: 'SO-123' } as any);
    component.orderStatusHistory.set([
      { statusId: 'ORDER_APPROVED', statusDatetime: '2026-04-09T00:00:00Z', statusUserLogin: 'admin', changeReason: 'approved' } as any,
      { statusId: null, statusDatetime: '2026-04-10T00:00:00Z' } as any,
    ]);
    component.statusDescriptionMap.set(new Map([['ORDER_APPROVED', 'Approved']]));
    component.isQuoteMode = true;
    component.statusItem.set({ statusId: 'ORDER_APPROVED' } as any);
    component.relatedOrderPrimaryId = null;
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();

    expect(component.statusHistoryEntries()[0]).toEqual(jasmine.objectContaining({
      statusId: 'ORDER_APPROVED',
      statusLabel: 'Approved',
      changedBy: 'admin',
      reason: 'approved',
    }));
    expect(component.statusHistoryEntries()[1].statusLabel).toBe('-');
    expect(component.canConvertQuote()).toBeTrue();
    expect(component.canRejectQuote()).toBeFalse();
    expect(component.getStatusActionLabel({ description: 'Hold order' })).toBe('Hold order');
    expect(component.getStatusActionLabel(null)).toBe('');
    expect(component.getShipmentStatus(undefined)).toBeUndefined();
    expect((component as any).hasRemainingPickQuantity()).toBeFalse();
    expect((component as any).hasAnyItems()).toBeFalse();
    component.statusItem.set({ statusId: 'ORDER_CREATED' } as any);
    expect(component.canRejectQuote()).toBeTrue();
    component.relatedOrderPrimaryId = 1;
    expect(component.canRejectQuote()).toBeFalse();
    expect(component.canConvertQuote()).toBeFalse();
    expect(component.getStatusActionLabel({ statusIdTo: 'ORDER_CANCELLED', transitionName: 'Cancel' })).toBe('Cancel');
    expect(component.getStatusActionLabel({ statusIdTo: 'ORDER_HOLD', transitionName: 'Hold' })).toBe('Hold');

    mockDialogClose(false);
    component.cancelItem({ orderItemSeqId: '0001' });
    expect(orderServiceSpy.cancelOrderItem).not.toHaveBeenCalled();

    mockDialogClose(true);
    component.cancelItem({ orderItemSeqId: '0001' });
    expect((dialogSpy.open.calls.mostRecent().args[1] as any).data.message).toBe('COMMON.CONFIRM_CANCEL_ITEM');
    expect(orderServiceSpy.cancelOrderItem).toHaveBeenCalledWith('SO-123', '0001');
    expect(silentRefreshSpy).toHaveBeenCalled();

    component.rejectQuote();
    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, jasmine.anything());
  });

  it('should cover guard paths for order actions without an order id', () => {
    createComponent();
    component.orderId = undefined;
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();

    component.goToCreateReturn();
    component.approveOrder();
    component.createPicklist();
    component.openOrderContent({ contentId: 'CONTENT-1' });
    component.openPdf();
    component.reorderOrder();
    component.convertQuoteToOrder();
    component.markPicklistPicked('PICK-1');
    component.shipShipment('SHIP-1');
    component.cancelOrder();
    component.changeOrderStatus('ORDER_APPROVED');
    component.addItemDialog({ orderItemSeqId: '0001' } as any);
    component.editItem({ orderItemSeqId: '0001' } as any);
    component.deleteNote({ id: 'NOTE-1' } as any);
    component.editShippingInstructions({ orderPartSeqId: '0001' } as any);
    component.updateShipBeforeDate({ orderPartSeqId: '0001' } as any);
    component.editShipToAddress({ contactMechId: 'ADDR-1' } as any);
    component.editShipToPhone({ contactNumber: '1234' } as any);
    component.markPicklistPicked('PICK-1');
    component.shipShipment('SHIP-1');
    component.cancelItem({ orderItemSeqId: '0001' });

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(orderServiceSpy.approveSalesOrder).not.toHaveBeenCalled();
    expect(orderServiceSpy.updateOrderStatus).not.toHaveBeenCalled();
    expect(orderServiceSpy.createPicklist).not.toHaveBeenCalled();
    expect(orderServiceSpy.downloadOrderContent).not.toHaveBeenCalled();
    expect(orderServiceSpy.getOrderPdf).not.toHaveBeenCalled();
    expect(orderServiceSpy.reorderOrder).not.toHaveBeenCalled();
    expect(orderServiceSpy.convertQuoteToOrder).not.toHaveBeenCalled();
    expect(orderServiceSpy.cancelOrderItem).not.toHaveBeenCalled();
    expect(silentRefreshSpy).not.toHaveBeenCalled();
  });

  it('should cover helper metadata, return navigation, and customer-name fallbacks', () => {
    createComponent();
    component.orderHeader.set({
      orderId: 'SO-123',
      orderName: 'PO-REF',
      externalId: 'EXT-1',
      orderTypeId: 'SALES_ORDER',
      entryDate: '2024-01-01T00:00:00Z',
    } as any);
    component.statusItem.set({ statusId: 'ORDER_COMPLETED', description: 'Completed' } as any);
    component.isQuoteMode = false;

    expect(component.partColumns).toEqual([
      'productId',
      'productName',
      'itemDescription',
      'description',
      'requiredByDate',
      'unitAmount',
      'quantity',
      'statusId',
      'totalAmount',
      'action',
    ]);
    expect(component.contentColumns).toEqual(['description', 'contentDate', 'contentLocation']);
    expect(component.shipmentColumns).toEqual([
      'shipmentId',
      'shipmentTypeId',
      'statusId',
      'trackingNumber',
      'createdDate',
    ]);
    expect(component.overviewFields().map((field) => field.label)).toEqual([
      'COMMON.ID',
      'SO.PO_NUMBER',
      'COMMON.EXTERNAL_ID',
      'SO.ORDER_TYPE',
      'SO.ORDER_DATE',
      'COMMON.STATUS',
    ]);

    expect(component.canCreateReturn()).toBeTrue();
    component.goToCreateReturn();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/returns/create'], {
      queryParams: { orderId: 'SO-123', orderTypeId: 'SALES_ORDER' },
    });

    expect(component.getOrderItemTypeDescription()).toBe('');
    expect(component.getShipmentTypeDescription('SHIPMENT_STANDARD')).toBe('SHIPMENT_STANDARD');
    expect(component.getProductName({ productId: 'PROD-X' } as any)).toBe('PROD-X');
    expect(component.getFallbackCustomerPhone({
      customer: { telecomNumber: { countryCode: '+1', areaCode: '650', contactNumber: '1234567' } },
    } as any)).toContain('1234567');
    expect(component.getItemComponents({ components: [{ id: 'C1' }] } as any)).toEqual([{ id: 'C1' }]);
    expect(component.getItemComponents(null)).toEqual([]);
    expect(component.getShipmentStatus('SHIP-UNKNOWN')).toBeUndefined();
    expect((component as any).hasRemainingPickQuantity()).toBeFalse();

    partyServiceSpy.getCustomer.and.returnValue(throwError(() => new Error('customer failed')));
    (component as any).primeCustomerNames([{ customerPartyId: 'CUST-X', items: [] } as any]);
    expect(component.customerNameMap().get('CUST-X')).toBe('CUST-X');

    component.orderId = undefined;
    orderServiceSpy.createPicklist.calls.reset();
    component.createPicklist();
    expect(orderServiceSpy.createPicklist).not.toHaveBeenCalled();
  });

  it('should cover success paths for shipment, content, and reorder actions', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    component.shipmentStatusById.set(new Map([['SHIP-1', 'SHIPMENT_INPUT']]));
    component.parts.set([{ items: [{ quantity: 5, issuedQuantity: 2, reservedQuantity: 4, components: [{ id: 'C1' }] }] }] as any);
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();
    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:shipment');
    const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
    const windowOpenSpy = spyOn(window, 'open');
    spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);

    component.createPicklist();
    component.openOrderContent({ contentId: 'CONTENT-1' });
    component.reorderOrder();
    component.convertQuoteToOrder();
    component.markPicklistPicked('PICK-1');
    component.shipShipment('SHIP-1');

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledWith('blob:shipment', '_blank', 'noopener');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:shipment');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/orders/999']);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/orders/777']);
    expect(orderServiceSpy.markPicklistPicked).toHaveBeenCalledWith('PICK-1');
    expect(orderServiceSpy.shipShipment).toHaveBeenCalledWith('SHIP-1');
    expect(component.getShipmentStatus('SHIP-1')).toBe('SHIPMENT_INPUT');
    expect(component.getDisplayedReservedQuantity({ reservedQuantity: 4, issuedQuantity: 2 })).toBe(2);
    expect(component.getItemComponents({ components: [{ id: 'C1' }] })).toEqual([{ id: 'C1' }]);
    expect((component as any).hasRemainingPickQuantity()).toBeTrue();
    expect(silentRefreshSpy).toHaveBeenCalled();
  });

  it('should add order adjustments and handle cancel or error outcomes', () => {
    createComponent();
    component.orderId = 'SO-123';
    component.orderPrimaryId = 'SO-123';
    component.canEditItems.set(true);
    const silentRefreshSpy = spyOn<any>(component, 'silentRefresh').and.stub();

    mockDialogClose({ orderAdjustmentTypeId: 'DISCOUNT_ADJUSTMENT', amount: -3 });

    component.openAddAdjustmentDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(AddOrderAdjustmentDialogComponent, { width: '440px' });
    expect(orderServiceSpy.addOrderAdjustment).toHaveBeenCalledWith('SO-123', {
      orderAdjustmentTypeId: 'DISCOUNT_ADJUSTMENT',
      amount: -3,
    });
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('Order adjustment added.');
    expect(silentRefreshSpy).toHaveBeenCalled();

    orderServiceSpy.addOrderAdjustment.calls.reset();
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.openAddAdjustmentDialog();
    expect(orderServiceSpy.addOrderAdjustment).not.toHaveBeenCalled();

    orderServiceSpy.addOrderAdjustment.and.returnValue(throwError(() => ({ error: { message: 'Adjustment failed' } })));
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ amount: 5 }) } as any);
    component.openAddAdjustmentDialog();
    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('Adjustment failed');
  });

  it('should guard add adjustment and resolve mapped component names', () => {
    createComponent();
    component.orderId = undefined;
    component.canEditItems.set(true);

    component.openAddAdjustmentDialog();
    expect(dialogSpy.open).not.toHaveBeenCalledWith(AddOrderAdjustmentDialogComponent, jasmine.anything());

    component.orderId = 'SO-123';
    component.canEditItems.set(false);
    component.openAddAdjustmentDialog();
    expect(dialogSpy.open).not.toHaveBeenCalledWith(AddOrderAdjustmentDialogComponent, jasmine.anything());

    component.productNameMap.set(new Map([['COMP-1', 'Mapped Component']]));
    expect(component.getComponentName({ productId: 'COMP-1' })).toBe('Mapped Component');
    expect(component.getComponentName({ productId: 'COMP-2', productName: 'Inline Component' })).toBe('Inline Component');
    expect(component.getComponentName({ productName: 'No Id Component' })).toBe('No Id Component');
  });
});
