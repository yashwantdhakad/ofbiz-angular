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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReturnService } from '@ofbiz/services/return/return.service';
import { ReturnCreateComponent } from './return-create.component';

describe('ReturnCreateComponent', () => {
  let fixture: ComponentFixture<ReturnCreateComponent>;
  let component: ReturnCreateComponent;
  let returnServiceSpy: jasmine.SpyObj<ReturnService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let queryParamMap$: BehaviorSubject<any>;

  const order = {
    orderId: 'TN1-ORD-1',
    orderTypeId: 'SALES_ORDER',
    customerPartyId: 'CUST1',
    vendorPartyId: 'VEND1',
    facilityId: 'FAC1',
    currencyUom: 'USD',
    items: [
      {
        orderItemSeqId: '00001',
        productId: 'PROD1',
        productName: 'Product 1',
        quantity: 2,
        unitAmount: 10,
      },
    ],
  };

  beforeEach(async () => {
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    returnServiceSpy = jasmine.createSpyObj<ReturnService>('ReturnService', [
      'searchOrderCandidates',
      'getOrderForReturn',
      'createReturn',
      'listReturnTypes',
      'listReturnReasons',
      'listReturnItemTypes',
    ]);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    snackbarSpy = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);

    returnServiceSpy.searchOrderCandidates.and.returnValue(of([]));
    returnServiceSpy.getOrderForReturn.and.returnValue(of(order));
    returnServiceSpy.createReturn.and.returnValue(of({ summary: { returnId: 'RET1' } }));
    returnServiceSpy.listReturnTypes.and.returnValue(of([{ id: 'RTN_REFUND_IMMED', description: 'Refund Immediately' }]));
    returnServiceSpy.listReturnReasons.and.returnValue(of([{ id: 'RRC_DID_NOT_WANT', description: 'Did Not Want Item' }]));
    returnServiceSpy.listReturnItemTypes.and.returnValue(of([{ id: 'RITM_RETURN_ITEM', description: 'Return Product Item' }]));

    await TestBed.configureTestingModule({
      declarations: [ReturnCreateComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: ReturnService, useValue: returnServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParamMap$.asObservable() } },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => key,
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(ReturnCreateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(ReturnCreateComponent);
    component = fixture.componentInstance;
  });

  it('loads lookups and an order from query params into signal state', () => {
    fixture.detectChanges();
    queryParamMap$.next(convertToParamMap({ orderId: 'TN1-ORD-1', orderTypeId: 'PURCHASE_ORDER' }));

    expect(component.orderTypeId).toBe('PURCHASE_ORDER');
    expect(component.orderControl.value).toBe('TN1-ORD-1');
    expect(returnServiceSpy.getOrderForReturn).toHaveBeenCalledWith('TN1-ORD-1');
    expect(component.selectedOrder()?.orderId).toBe('TN1-ORD-1');
    expect(component.orderItems()[0].returnTypeId).toBe('RTN_REFUND_IMMED');
    expect(component.orderItems()[0].returnReasonId).toBe('RRC_DID_NOT_WANT');
    expect(component.orderItems()[0].returnItemTypeId).toBe('RITM_RETURN_ITEM');
  });

  it('searches order candidates with debounce and updates signal options', fakeAsync(() => {
    fixture.detectChanges();
    returnServiceSpy.searchOrderCandidates.and.returnValue(of([{ orderId: 'TN1-ORD-2' }]));

    component.orderControl.setValue('TN1');
    tick(400);

    expect(returnServiceSpy.searchOrderCandidates).toHaveBeenCalledWith('SALES_ORDER', 'TN1');
    expect(component.orderOptions()).toEqual([{ orderId: 'TN1-ORD-2' }]);
    expect(component.loadingOrderCandidates()).toBeFalse();
  }));

  it('creates a return from selected rows and navigates to the new return', () => {
    fixture.detectChanges();
    component.loadOrder('TN1-ORD-1');
    component.orderItems()[0].selected = true;

    component.createReturn();

    expect(returnServiceSpy.createReturn).toHaveBeenCalledWith(jasmine.objectContaining({
      orderId: 'TN1-ORD-1',
      orderTypeId: 'SALES_ORDER',
      fromPartyId: 'CUST1',
      toPartyId: 'VEND1',
      destinationFacilityId: 'FAC1',
      items: [
        jasmine.objectContaining({
          orderItemSeqId: '00001',
          productId: 'PROD1',
          returnQuantity: 1,
          returnPrice: 10,
        }),
      ],
    }));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/returns', 'RET1']);
    expect(component.creatingReturn()).toBeFalse();
  });

  it('clears order state and shows an error when loading order fails', () => {
    fixture.detectChanges();
    returnServiceSpy.getOrderForReturn.and.returnValue(throwError(() => ({ error: { message: 'Not found' } })));

    component.loadOrder('BAD');

    expect(component.selectedOrder()).toBeNull();
    expect(component.orderItems()).toEqual([]);
    expect(snackbarSpy.showError).toHaveBeenCalledWith('Not found');
    expect(component.loadingOrder()).toBeFalse();
  });

  it('verifies normalizeOrderQuery logic', () => {
    fixture.detectChanges();
    expect((component as any).normalizeOrderQuery('ABC')).toBe('ABC');
    expect((component as any).normalizeOrderQuery({ orderId: 'XYZ' })).toBe('XYZ');
    expect((component as any).normalizeOrderQuery(null)).toBe('');
  });

  it('does not call service if no items are selected for return', () => {
    fixture.detectChanges();
    component.loadOrder('TN1-ORD-1');
    component.orderItems().forEach(i => i.selected = false);

    component.createReturn();

    expect(returnServiceSpy.createReturn).not.toHaveBeenCalled();
  });

  it('handles error on createReturn failure', () => {
    fixture.detectChanges();
    component.loadOrder('TN1-ORD-1');
    component.orderItems()[0].selected = true;
    returnServiceSpy.createReturn.and.returnValue(throwError(() => ({ error: { message: 'Create return failed' } })));

    component.createReturn();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Create return failed');
    expect(component.creatingReturn()).toBeFalse();
  });

  it('handles error message fallback on createReturn failure', () => {
    fixture.detectChanges();
    component.loadOrder('TN1-ORD-1');
    component.orderItems()[0].selected = true;
    returnServiceSpy.createReturn.and.returnValue(throwError(() => new Error('Raw error')));

    component.createReturn();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('RETURN.CREATE_ERROR');
  });

  it('handles empty lookups gracefully during init', () => {
    returnServiceSpy.listReturnTypes.and.returnValue(of([]));
    returnServiceSpy.listReturnReasons.and.returnValue(of([]));
    returnServiceSpy.listReturnItemTypes.and.returnValue(of([]));

    fixture.detectChanges();

    expect(component.returnTypes()).toEqual([]);
    expect(component.returnReasons()).toEqual([]);
  });
});
