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
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ReturnDetailComponent } from './return-detail.component';
import { ReturnService } from '@ofbiz/services/return/return.service';

describe('ReturnDetailComponent', () => {
  let component: ReturnDetailComponent;
  let fixture: ComponentFixture<ReturnDetailComponent>;
  let returnServiceSpy: jasmine.SpyObj<ReturnService>;

  beforeEach(async () => {
    returnServiceSpy = jasmine.createSpyObj('ReturnService', ['getReturn', 'acceptReturn', 'rejectReturn']);

    await TestBed.configureTestingModule({
      declarations: [ReturnDetailComponent],
      providers: [
        { provide: ReturnService, useValue: returnServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ returnId: 'RET100' })),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReturnDetailComponent);
    component = fixture.componentInstance;
  });

  function loadDetailResponse(overrides: Partial<any> = {}): void {
    returnServiceSpy.getReturn.and.returnValue(of({
      summary: {
        returnId: 'RET100',
        statusId: 'RETURN_REQUESTED',
        orderTypeId: 'PURCHASE_ORDER',
      },
      items: [
        {
          returnItemSeqId: '0001',
          orderItemSeqId: 'OI1',
          orderId: 'PO100',
          orderTypeId: 'PURCHASE_ORDER',
          shipmentId: 'SHP1',
          inventoryItemId: 'INV1',
          productName: 'Widget',
          returnType: 'DEFECTIVE',
          returnQuantity: 3,
          receivedQuantity: 1,
          returnPrice: 12.5,
          statusId: 'RETURN_REQUESTED',
        },
      ],
      statusHistory: [
        {
          statusId: 'RETURN_REQUESTED',
          statusDatetime: '2026-04-07T09:00:00',
          changeByUserLoginId: 'requester',
        },
        {
          statusId: 'RETURN_ACCEPTED',
          statusDatetime: '2026-04-07T11:00:00',
          changeByUserLoginId: 'reviewer',
        },
        {
          statusDatetime: '2026-04-07T12:00:00',
        },
      ],
      ...overrides,
    }));
  }

  it('maps return status history entries when detail loads', fakeAsync(() => {
    loadDetailResponse({
      summary: {
        returnId: 'RET100',
        statusId: 'RETURN_ACCEPTED',
        orderTypeId: 'PURCHASE_ORDER',
      },
    });

    fixture.detectChanges();
    tick();

    expect(returnServiceSpy.getReturn).toHaveBeenCalledWith('RET100');
    expect(component.returnId).toBe('RET100');
    expect(component.loading()).toBeFalse();
    expect(component.detail?.summary?.statusId).toBe('RETURN_ACCEPTED');
    expect(component.canReviewReturn()).toBeFalse();
    expect(component.canReceiveIntoInventory()).toBeTrue();
    expect(component.getOrderLink('PO100', 'PURCHASE_ORDER')).toEqual(['/pos', 'PO100']);
    expect(component.getOrderLink('SO100', 'SALES_ORDER')).toEqual(['/orders', 'SO100']);
    expect(component.getOrderLink('', 'PURCHASE_ORDER')).toBeNull();
    expect(component.getPartyLink('SUP1', 'PURCHASE_ORDER', 'from')).toEqual(['/suppliers', 'SUP1']);
    expect(component.getPartyLink('CUST1', 'PURCHASE_ORDER', 'to')).toEqual(['/customers', 'CUST1']);
    expect(component.getPartyLink('CUST2', 'SALES_ORDER', 'from')).toEqual(['/customers', 'CUST2']);
    expect(component.getPartyLink('SUP2', 'SALES_ORDER', 'to')).toEqual(['/suppliers', 'SUP2']);
    expect(component.getPartyLink('', 'SALES_ORDER', 'from')).toBeNull();
    expect(component.getInventoryLink('INV1')).toEqual(['/assets', 'INV1']);
    expect(component.getInventoryLink('')).toBeNull();
    expect(component.displayedColumns).toContain('status');
    expect(component.statusHistoryEntries()).toEqual([
      jasmine.objectContaining({
        statusId: 'RETURN_REQUESTED',
        statusLabel: 'Return Requested',
        changedAt: '2026-04-07T09:00:00',
        changedBy: 'requester',
      }),
      jasmine.objectContaining({
        statusId: 'RETURN_ACCEPTED',
        statusLabel: 'Return Accepted',
        changedAt: '2026-04-07T11:00:00',
        changedBy: 'reviewer',
      }),
    ]);
    expect(component.detail?.items?.length).toBe(1);
    expect(component.statusHistoryEntries()).toEqual([
      jasmine.objectContaining({
        statusId: 'RETURN_REQUESTED',
        statusLabel: 'Return Requested',
        changedAt: '2026-04-07T09:00:00',
        changedBy: 'requester',
      }),
      jasmine.objectContaining({
        statusId: 'RETURN_ACCEPTED',
        statusLabel: 'Return Accepted',
        changedAt: '2026-04-07T11:00:00',
        changedBy: 'reviewer',
      }),
    ]);
  }));

  it('shows an error and clears detail state when load fails', fakeAsync(() => {
    returnServiceSpy.getReturn.and.returnValue(throwError(() => ({
      error: {
        detail: 'Detailed load failure',
      },
    })));

    fixture.detectChanges();
    tick();

    expect(component.detail).toBeNull();
    expect(component.statusHistoryEntries()).toEqual([]);
    expect(component.errorMessage).toBe('Detailed load failure');
    expect(component.loading()).toBeFalse();
  }));

  it('covers accept and reject branches plus guards', fakeAsync(() => {
    loadDetailResponse({
      summary: {
        returnId: 'RET100',
        statusId: 'RETURN_REQUESTED',
        orderTypeId: 'PURCHASE_ORDER',
      },
      items: [
        {
          returnQuantity: 3,
          receivedQuantity: 1,
        },
      ],
    });
    returnServiceSpy.acceptReturn.and.returnValues(
      of({
        summary: { returnId: 'RET100', statusId: 'RETURN_ACCEPTED' },
        statusHistory: [
          { statusId: 'RETURN_ACCEPTED', statusDatetime: '2026-04-07T12:30:00', changeByUserLoginId: 'reviewer' },
        ],
      }),
      throwError(() => ({ error: { message: 'accept failed' } }))
    );
    returnServiceSpy.rejectReturn.and.returnValues(
      of({
        summary: { returnId: 'RET100', statusId: 'RETURN_REJECTED' },
        statusHistory: [
          { statusId: 'RETURN_REJECTED', statusDatetime: '2026-04-07T13:00:00', changeByUserLoginId: 'reviewer' },
        ],
      }),
      throwError(() => ({ error: { detail: 'reject failed detail' } }))
    );

    fixture.detectChanges();
    tick();

    expect(component.canReviewReturn()).toBeTrue();
    expect(component.canReceiveIntoInventory()).toBeFalse();

    component.acceptReturn();
    expect(returnServiceSpy.acceptReturn).toHaveBeenCalledWith('RET100');
    expect(component.detail?.summary?.statusId).toBe('RETURN_ACCEPTED');
    expect(component.statusHistoryEntries()[0]).toEqual(jasmine.objectContaining({
      statusId: 'RETURN_ACCEPTED',
      statusLabel: 'Return Accepted',
      changedBy: 'reviewer',
    }));

    component.detail = {
      summary: { statusId: 'RETURN_REQUESTED' },
      items: [],
    };
    component.acceptReturn();
    expect(component.errorMessage).toBe('accept failed');

    component.detail = {
      summary: { statusId: 'RETURN_REQUESTED' },
      items: [],
    };
    component.rejectReturn();
    expect(returnServiceSpy.rejectReturn).toHaveBeenCalledWith('RET100');
    expect(component.detail?.summary?.statusId).toBe('RETURN_REJECTED');
    expect(component.statusHistoryEntries()[0]).toEqual(jasmine.objectContaining({
      statusId: 'RETURN_REJECTED',
      statusLabel: 'Return Rejected',
      changedBy: 'reviewer',
    }));

    component.detail = {
      summary: { statusId: 'RETURN_REQUESTED' },
      items: [],
    };
    component.rejectReturn();
    expect(component.errorMessage).toBe('reject failed detail');
  }));

  it('guards accept and reject when the return is not in review state or id is missing', () => {
    component.returnId = '';
    component.acceptReturn();
    component.rejectReturn();
    expect(returnServiceSpy.acceptReturn).not.toHaveBeenCalled();
    expect(returnServiceSpy.rejectReturn).not.toHaveBeenCalled();

    component.returnId = 'RET100';
    component.detail = {
      summary: { statusId: 'RETURN_ACCEPTED' },
      items: [],
    };
    expect(component.canReviewReturn()).toBeFalse();
    expect(component.canReceiveIntoInventory()).toBeFalse();
  });

  it('allows supplier accepted returns to receive remaining inventory', () => {
    component.detail = {
      summary: { statusId: 'SUP_RETURN_ACCEPTED' },
      items: [
        { returnQuantity: 4, receivedQuantity: 1 },
      ],
    };

    expect(component.canReceiveIntoInventory()).toBeTrue();
  });
});
