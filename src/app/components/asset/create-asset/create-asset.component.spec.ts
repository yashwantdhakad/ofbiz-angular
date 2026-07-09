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
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { CreateAssetComponent } from './create-asset.component';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { OrderService } from '@ofbiz/services/order/order.service';
import { ReturnService } from '@ofbiz/services/return/return.service';
import { TranslateService } from '@ngx-translate/core';

describe('CreateAssetComponent', () => {
  let component: CreateAssetComponent;
  let fixture: ComponentFixture<CreateAssetComponent>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let returnServiceSpy: jasmine.SpyObj<ReturnService>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;

  beforeEach(async () => {
    snackbarSpy = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    orderServiceSpy = jasmine.createSpyObj<OrderService>('OrderService', ['getPOs', 'getOrderById']);
    returnServiceSpy = jasmine.createSpyObj<ReturnService>('ReturnService', ['listReturns', 'getReturn']);
    productServiceSpy = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsAutocompleteFromOms']);

    orderServiceSpy.getPOs.and.returnValue(of({ responseMap: { orderList: [] } } as any));
    orderServiceSpy.getOrderById.and.returnValue(of({ orderHeader: { statusId: 'ORDER_APPROVED' }, parts: [] } as any));
    returnServiceSpy.listReturns.and.returnValue(of({ content: [] } as any));
    returnServiceSpy.getReturn.and.returnValue(of({ summary: { statusId: 'RETURN_ACCEPTED' }, items: [] } as any));
    productServiceSpy.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [] } as any));

    const translateSpy = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant', 'get']);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      declarations: [CreateAssetComponent],
      imports: [ReactiveFormsModule, FormsModule],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: Router, useValue: routerSpy },
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: ReturnService, useValue: returnServiceSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
    })
      .overrideTemplate(CreateAssetComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateAssetComponent);
    component = fixture.componentInstance;
    routerSpy.navigate.calls.reset();
    snackbarSpy.showError.calls.reset();
    productServiceSpy.getProductsAutocompleteFromOms.calls.reset();
    orderServiceSpy.getPOs.calls.reset();
    orderServiceSpy.getOrderById.calls.reset();
    returnServiceSpy.listReturns.calls.reset();
    returnServiceSpy.getReturn.calls.reset();
    fixture.detectChanges();
  });

  it('creates and wires autocomplete streams on init', () => {
    component.ngOnInit();

    component.receiveHubForm.get('product')?.setValue('PROD001');
    component.receiveHubForm.get('purchaseOrder')?.setValue('TN1-PO-10001');
    component.receiveHubForm.get('returnHeader')?.setValue('RET1001');

    expect(component.filteredProducts$).toBeTruthy();
    expect(component.filteredPurchaseOrders$).toBeTruthy();
    expect(component.filteredReturns$).toBeTruthy();
  });

  it('returns empty autocomplete results and clears loading for blank queries', fakeAsync(() => {
    component.ngOnInit();

    component.receiveHubForm.get('product')?.setValue('');
    component.receiveHubForm.get('purchaseOrder')?.setValue('');
    component.receiveHubForm.get('returnHeader')?.setValue('');
    tick(200);

    component.filteredProducts$.subscribe((result) => expect(result).toEqual([]));
    component.filteredPurchaseOrders$.subscribe((result) => expect(result).toEqual([]));
    component.filteredReturns$.subscribe((result) => expect(result).toEqual([]));
    expect(component.isProductSearchLoading()).toBeFalse();
    expect(component.isPurchaseOrderSearchLoading()).toBeFalse();
    expect(component.isReturnSearchLoading()).toBeFalse();
  }));

  it('shows translated search errors when product, PO, and return lookups fail', fakeAsync(() => {
    productServiceSpy.getProductsAutocompleteFromOms.and.returnValue(throwError(() => new Error('boom')));
    orderServiceSpy.getPOs.and.returnValue(throwError(() => new Error('boom')));
    returnServiceSpy.listReturns.and.returnValue(throwError(() => new Error('boom')));
    component['getProductsFromService']('PROD001').subscribe();
    component['searchPurchaseOrders']('TN1-PO-10001').subscribe();
    component['searchReturns']('RET1001').subscribe();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('ASSET.LOAD_PRODUCTS_ERROR');
    expect(snackbarSpy.showError).toHaveBeenCalledWith('ASSET.LOAD_PURCHASE_ORDERS_ERROR');
    expect(snackbarSpy.showError).toHaveBeenCalledWith('ASSET.LOAD_RETURNS_ERROR');
  }));

  it('covers display helpers for fallback cases', () => {
    expect(component.displayProduct(null)).toBe('');
    expect(component.displayProduct('P1')).toBe('P1');
    expect(component.displayProduct({ productName: 'Name' })).toBe('Name');
    expect(component.displayProduct({ name: 'Alt' })).toBe('Alt');
    expect(component.displayProduct({ internalName: 'Internal' })).toBe('Internal');
    expect(component.displayProduct({ productId: 'PROD1' })).toBe('PROD1');

    expect(component.displayPurchaseOrder(null)).toBe('');
    expect(component.displayPurchaseOrder('PO1')).toBe('PO1');
    expect(component.displayPurchaseOrder({ orderId: 'PO2' })).toBe('PO2');

    expect(component.displayReturn(null)).toBe('');
    expect(component.displayReturn('RET1')).toBe('RET1');
    expect(component.displayReturn({ returnId: 'RET2' })).toBe('RET2');
  });

  it('validates and routes product receiving only for selected product objects', () => {
    component.startProductReceiving();
    expect(component.receiveHubForm.get('product')?.hasError('required')).toBeTrue();

    component.receiveHubForm.get('product')?.setValue('PROD001');
    component.startProductReceiving();
    expect(component.receiveHubForm.get('product')?.hasError('required')).toBeTrue();

    component.receiveHubForm.get('product')?.setValue({ productId: 'PROD001', productName: 'Demo Product' });
    component.startProductReceiving();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/assets/create/product'], { queryParams: { productId: 'PROD001' } });
  });

  it('validates and routes purchase order receiving with status and remaining checks', fakeAsync(() => {
    component.startPurchaseOrderReceiving();
    expect(component.receiveHubForm.get('purchaseOrder')?.hasError('required')).toBeTrue();

    component.receiveHubForm.get('purchaseOrder')?.setValue({ id: 12 });
    orderServiceSpy.getOrderById.and.returnValue(of({ parts: [{ items: [{ remainingQuantity: 0 }] }] } as any));
    component.startPurchaseOrderReceiving();
    tick();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('ASSET.PURCHASE_ORDER_NO_REMAINING');

    orderServiceSpy.getOrderById.and.returnValue(of({
      statusItem: { statusId: 'ORDER_CREATED', description: 'Created' },
      parts: [{ items: [{ remainingQuantity: 2 }] }],
    } as any));
    component.startPurchaseOrderReceiving();
    tick();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('ASSET.PURCHASE_ORDER_APPROVAL_REQUIRED');

    orderServiceSpy.getOrderById.and.returnValue(throwError(() => new Error('boom')));
    component.startPurchaseOrderReceiving();
    tick();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('ASSET.PURCHASE_ORDER_VALIDATE_ERROR');

    orderServiceSpy.getOrderById.and.returnValue(of({
      parts: [{ items: [{ remainingQuantity: 2 }] }],
    } as any));
    component.startPurchaseOrderReceiving();
    tick();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/pos/12/receive']);
  }));

  it('validates and routes return receiving only for accepted returns with remaining quantity', fakeAsync(() => {
    component.startReturnReceiving();
    expect(component.receiveHubForm.get('returnHeader')?.hasError('required')).toBeTrue();

    component.receiveHubForm.get('returnHeader')?.setValue('RET1001');
    component.startReturnReceiving();
    expect(component.receiveHubForm.get('returnHeader')?.hasError('required')).toBeTrue();

    component.receiveHubForm.get('returnHeader')?.setValue({ returnId: 'RET1001' });
    returnServiceSpy.getReturn.and.returnValue(of({
      summary: { statusId: 'RETURN_CREATED' },
      items: [{ returnQuantity: 2, receivedQuantity: 1 }],
    } as any));
    component.startReturnReceiving();
    tick();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('ASSET.RETURN_INELIGIBLE');

    returnServiceSpy.getReturn.and.returnValue(of({
      summary: { statusId: 'RETURN_ACCEPTED' },
      items: [{ returnQuantity: 2, receivedQuantity: 2 }],
    } as any));
    component.startReturnReceiving();
    tick();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('ASSET.RETURN_INELIGIBLE');

    returnServiceSpy.getReturn.and.returnValue(of({
      summary: { statusId: 'RETURN_ACCEPTED' },
      items: [{ returnQuantity: 3, receivedQuantity: 1 }],
    } as any));
    component.startReturnReceiving();
    tick();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/returns/RET1001/receive']);
  }));
});
