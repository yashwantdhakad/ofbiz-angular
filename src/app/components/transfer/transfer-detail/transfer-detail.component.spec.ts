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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { of, throwError } from 'rxjs';

import { TransferDetailComponent } from './transfer-detail.component';
import { OrderService } from '@ofbiz/services/order/order.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { ProductItemComponent } from '../../order/product-item/product-item.component';
import { ShippingInstructionDialogComponent } from '../../order/shipping-instruction-dialog/shipping-instruction-dialog.component';

describe('TransferDetailComponent', () => {
  let component: TransferDetailComponent;
  let fixture: ComponentFixture<TransferDetailComponent>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let referenceDataStoreSpy: jasmine.SpyObj<ReferenceDataStore>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let translateSpy: jasmine.SpyObj<TranslateService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRouteStub: any;

  beforeEach(async () => {
    activatedRouteStub = {
      params: of({ id: '100' }),
    };
    orderServiceSpy = jasmine.createSpyObj('OrderService', [
      'getOrderDisplayInfoById',
      'getOrderById',
      'updateOrderStatus',
      'createTransferShipment',
      'createPicklist',
      'cancelOrderItem',
      'updateShippingInstructions',
    ]);
    referenceDataStoreSpy = jasmine.createSpyObj('ReferenceDataStore', ['ensureFacilitiesLoaded', 'facilities']);
    referenceDataStoreSpy.facilities.and.returnValue([]);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateSpy.instant.and.callFake((key: string) => key);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);

    await TestBed.configureTestingModule({
      declarations: [TransferDetailComponent],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: ReferenceDataStore, useValue: referenceDataStoreSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: DatePipe, useValue: new DatePipe('en-US') },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(TransferDetailComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TransferDetailComponent);
    component = fixture.componentInstance;
  });

  function loadSuccessResponse(overrides: Partial<any> = {}): void {
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(of({
      orderHeader: { orderId: 'TO-100', entryDate: '2026-04-07T09:00:00' },
      statusItem: { statusId: 'ORDER_APPROVED', description: 'Approved' },
      orderStatusList: [
        {
          statusId: 'ORDER_CREATED',
          statusDatetime: '2026-04-07T08:00:00',
          statusUserLogin: 'creator',
        },
        {
          statusId: 'ORDER_APPROVED',
          statusDatetime: '2026-04-07T10:00:00',
          statusUserLogin: 'approver',
        },
      ],
      firstPart: {
        orderPartSeqId: '00001',
        originFacilityId: 'FAC_FROM',
        facilityId: 'FAC_TO',
        carrierPartyId: 'CARRIER',
        carrierService: 'EXPRESS',
        shippingInstructions: 'Handle with care',
      },
      shipmentIds: ['SHP1'],
      shipments: [{ shipmentId: 'SHP1' }],
      picklists: [],
      reservationStatus: { fullyReserved: true, hasBackorder: false },
      originFacilityAddress: { address1: 'From street' },
      facilityAddress: { address1: 'To street' },
      ...overrides,
    }));
    orderServiceSpy.getOrderById.and.returnValue(of({
      parts: [
        {
          items: [
            {
              orderItemSeqId: '00001',
              productId: 'P100',
              description: 'Widget',
              reservedQuantity: 5,
              issuedQuantity: 2,
              quantity: 3,
              unitAmount: 10,
            },
          ],
        },
      ],
    }));
  }

  it('maps transfer order status history entries for the shared icon', fakeAsync(() => {
    loadSuccessResponse();

    fixture.detectChanges();
    tick();

    expect(referenceDataStoreSpy.ensureFacilitiesLoaded).toHaveBeenCalled();
    expect(orderServiceSpy.getOrderDisplayInfoById).toHaveBeenCalledWith('100');
    expect(orderServiceSpy.getOrderById).toHaveBeenCalledWith('100');
    expect(component.orderHeader()?.orderId).toBe('TO-100');
    expect(component.statusItem()?.statusId).toBe('ORDER_APPROVED');
    expect(component.canApprove()).toBeFalse();
    expect(component.canPicklist()).toBeTrue();
    expect(component.canReceive()).toBeFalse();
    expect(component.canCancel()).toBeTrue();
    expect(component.canMarkShipped()).toBeTrue();
    expect(component.canOpenShipment()).toBeTrue();
    expect(component.canEditItems()).toBeTrue();
    expect(component.shipByLabel()).toBe('CARRIER @ EXPRESS');
    expect(component.overviewFields().some((field: any) => field.isStatus)).toBeTrue();
    expect(component.reservationFields()).toEqual([
      { label: 'TRANSFER.RESERVATION_READY', value: 'COMMON.YES' },
      { label: 'TRANSFER.HAS_BACKORDER', value: 'COMMON.NO' },
    ]);
    expect(component.getDisplayedReservedQuantity({ reservedQuantity: 5, issuedQuantity: 2 })).toBe(3);
    expect(component.getDisplayedReservedQuantity({ reservedQuantity: 1, issuedQuantity: 5 })).toBe(0);
    expect(component.statusHistoryEntries()).toEqual([
      jasmine.objectContaining({
        statusId: 'ORDER_CREATED',
        statusLabel: 'Order Created',
        changedAt: '2026-04-07T08:00:00',
        changedBy: 'creator',
      }),
      jasmine.objectContaining({
        statusId: 'ORDER_APPROVED',
        statusLabel: 'Order Approved',
        changedAt: '2026-04-07T10:00:00',
        changedBy: 'approver',
      }),
    ]);
  }));

  it('clears state and shows an error when load fails', fakeAsync(() => {
    orderServiceSpy.getOrderDisplayInfoById.and.returnValue(throwError(() => new Error('load failed')));
    orderServiceSpy.getOrderById.and.returnValue(of({ parts: [] }));

    fixture.detectChanges();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('TRANSFER.ERROR_LOAD');
    expect(component.isLoading()).toBeFalse();
    expect(component.orderHeader()).toBeNull();
    expect(component.shipments()).toEqual([]);
  }));

  it('routes based on computed actions and guards on missing ids', () => {
    component.orderPrimaryId = '100';
    component.orderId = 'TO-100';
    component.shipments.set([{ shipmentId: 'SHP1' }]);
    component.statusItem.set({ statusId: 'ORDER_CREATED' } as any);
    component.reservationStatus.set({ fullyReserved: true, hasBackorder: false });
    component.picklists.set([]);

    component.receive();
    component.goToCreatePicklist();
    component.openPicklist('PK1');
    component.openPicklist();
    component.openShipment('SHP1');
    component.openShipment();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/transfers/100/receive']);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/picklists', 'PK1']);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/shipments', 'SHP1']);
    expect(component.getStatusDescription('order_shipped')).toBe('Order Shipped');
    expect(component.getStatusDescription(null)).toBe('-');
    expect(component.reservationFields()).toEqual([
      { label: 'TRANSFER.RESERVATION_READY', value: 'COMMON.YES' },
      { label: 'TRANSFER.HAS_BACKORDER', value: 'COMMON.NO' },
    ]);
  });

  it('covers approve, shipped, cancel, and create-picklist branches', fakeAsync(() => {
    loadSuccessResponse();
    fixture.detectChanges();
    tick();

    component.orderPrimaryId = '100';
    component.orderId = 'TO-100';
    component.reservationStatus.set({ fullyReserved: true, hasBackorder: false });
    component.picklists.set([]);
    orderServiceSpy.updateOrderStatus.and.returnValues(
      of({ orderId: 'TO-100', statusId: 'ORDER_APPROVED' }),
      throwError(() => new Error('approve failed')),
      of({ orderId: 'TO-100', statusId: 'ORDER_CANCELLED' }),
      throwError(() => new Error('cancel failed'))
    );
    orderServiceSpy.createTransferShipment.and.returnValues(
      of({ shipmentId: 'SHP1' }),
      throwError(() => new Error('ship failed'))
    );
    orderServiceSpy.createPicklist.and.returnValues(
      of({ picklistId: 'PK1' }),
      of({})
    );
    orderServiceSpy.updateShippingInstructions.and.returnValue(of({} as any));

    component.approve();
    expect(orderServiceSpy.updateOrderStatus).toHaveBeenCalledWith('TO-100', 'ORDER_APPROVED');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('TRANSFER.APPROVED');
    expect(component.isLoading()).toBeFalse();

    component.approve();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('TRANSFER.APPROVE_ERROR');

    component.markShipped();
    expect(orderServiceSpy.createTransferShipment).toHaveBeenCalledWith('TO-100');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('TRANSFER.SHIPPED');

    component.markShipped();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('TRANSFER.SHIP_ERROR');

    component.createPicklist();
    expect(orderServiceSpy.createPicklist).toHaveBeenCalledWith('TO-100');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/picklists', 'PK1']);

    component.createPicklist();
    expect(component.orderPrimaryId).toBe('100');

    component.statusItem.set({ statusId: 'ORDER_APPROVED' } as any);
    component.picklists.set([{ picklistId: 'EXISTING' }]);
    expect(component.canPicklist()).toBeFalse();
    component.reservationStatus.set({ fullyReserved: false, hasBackorder: true });
    expect(component.canPicklist()).toBeFalse();
    component.shipments.set([]);
    expect(component.canOpenShipment()).toBeFalse();
    expect(component.canEditItems()).toBeTrue();
    expect(component.canReceive()).toBeFalse();
    expect(component.canCancel()).toBeTrue();

    component.cancel();
    expect(orderServiceSpy.updateOrderStatus).toHaveBeenCalledWith('TO-100', 'ORDER_CANCELLED');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('TRANSFER.CANCEL_SUCCESS');

    component.cancel();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('TRANSFER.CANCEL_ERROR');
  }));

  it('covers the item and shipping instruction dialog branches', () => {
    loadSuccessResponse();
    fixture.detectChanges();
    orderServiceSpy.updateShippingInstructions.and.returnValue(of({} as any));

    dialogSpy.open.and.returnValue({
      afterClosed: () =>
        of({
          orderItemSeqId: '00002',
          quantity: 4,
          updateExisting: false,
        }),
    } as any);
    orderServiceSpy.updateShippingInstructions.and.returnValue(of({} as any));

    component.addItemDialog(null);
    expect(dialogSpy.open).toHaveBeenCalledWith(
      ProductItemComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          productItemData: jasmine.objectContaining({
            orderId: 'TO-100',
            orderPartSeqId: '00001',
            updateExisting: false,
          }),
        }),
      })
    );

    component.editItem({ orderItemSeqId: '00001', unitAmount: null } as any);
    expect(dialogSpy.open).toHaveBeenCalledWith(
      ProductItemComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          productItemData: jasmine.objectContaining({
            orderItemSeqId: '00001',
            unitAmount: 0,
          }),
        }),
      })
    );

    dialogSpy.open.and.returnValue({
      afterClosed: () => of('  Keep chilled  '),
    } as any);
    component.editShippingInstructions();
    expect(dialogSpy.open).toHaveBeenCalledWith(
      ShippingInstructionDialogComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          titleKey: 'COMMON.SHIPPING_INSTRUCTIONS',
          shippingInstructions: 'Handle with care',
        }),
      })
    );
    expect(orderServiceSpy.updateShippingInstructions).toHaveBeenCalledWith('TO-100', '00001', 'Keep chilled');
  });

  it('opens item dialogs and guards only the shipping-instruction and cancel-item branches on missing ids', () => {
    component.orderId = undefined;
    component.orderPrimaryId = '100';

    component.addItemDialog(null);
    component.editItem({ orderItemSeqId: '00001', unitAmount: 1 } as any);
    component.editShippingInstructions();
    component.cancelItem({} as any);

    expect(dialogSpy.open).toHaveBeenCalledTimes(2);
    expect(orderServiceSpy.cancelOrderItem).not.toHaveBeenCalled();
  });

  it('cancels an item after confirmation and refreshes the order', () => {
    loadSuccessResponse();
    fixture.detectChanges();
    orderServiceSpy.cancelOrderItem.and.returnValue(of({} as any));
    orderServiceSpy.updateShippingInstructions.and.returnValue(of({} as any));
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true),
    } as any);

    component.cancelItem({ orderItemSeqId: '00001' } as any);

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmationDialogComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          title: 'COMMON.CONFIRMATION',
          message: 'TRANSFER.CANCEL_ITEM_CONFIRM',
        }),
      })
    );
    expect(orderServiceSpy.cancelOrderItem).toHaveBeenCalledWith('TO-100', '00001');
  });

  it('covers error paths and no-op guards for transfer actions', fakeAsync(() => {
    loadSuccessResponse();
    fixture.detectChanges();
    tick();

    component.orderPrimaryId = '100';
    component.orderId = 'TO-100';
    component.reservationStatus.set({ fullyReserved: true, hasBackorder: false });
    component.picklists.set([]);

    orderServiceSpy.updateOrderStatus.and.returnValue(throwError(() => ({ error: { detail: 'Approve failed' } })));
    orderServiceSpy.createTransferShipment.and.returnValue(throwError(() => ({ error: { message: 'Ship failed' } })));
    orderServiceSpy.createPicklist.and.returnValue(throwError(() => ({ error: { detail: 'Pick failed' } })));
    orderServiceSpy.cancelOrderItem.and.returnValue(throwError(() => new Error('cancel failed')));
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);

    component.approve();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('Approve failed');

    component.markShipped();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('Ship failed');

    component.createPicklist();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('Pick failed');

    component.cancel();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('Approve failed');

    component.orderId = undefined;
    component.approve();
    component.markShipped();
    component.createPicklist();
    component.cancel();
    expect(orderServiceSpy.updateOrderStatus).toHaveBeenCalledTimes(2);
    expect(orderServiceSpy.createTransferShipment).toHaveBeenCalledTimes(1);
    expect(orderServiceSpy.createPicklist).toHaveBeenCalledTimes(1);

    component.orderPrimaryId = undefined;
    component.receive();
    component.goToCreatePicklist();
    component.openPicklist();
    component.openShipment();
    expect(routerSpy.navigate).not.toHaveBeenCalledWith(['/transfers/100/receive']);
  }));
});
