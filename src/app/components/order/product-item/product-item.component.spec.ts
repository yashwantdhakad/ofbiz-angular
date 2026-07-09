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
import { ProductItemComponent } from './product-item.component';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { OrderService } from '@ofbiz/services/order/order.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { of, throwError } from 'rxjs';

describe('ProductItemComponent', () => {
  let component: ProductItemComponent;
  let fixture: ComponentFixture<ProductItemComponent>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ProductItemComponent>>;

  const mockData = {
    productItemData: {
      orderId: 'ORDER-123',
      orderPartSeqId: '0001',
      productId: 'PROD-1',
      quantity: 2,
      unitAmount: 100,
      updateExisting: false
    }
  };

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['addItem', 'updateOrderItemQuantity']);
    productServiceSpy = jasmine.createSpyObj('ProductService', ['getProductsAutocompleteFromOms']);
    commonServiceSpy = jasmine.createSpyObj('CommonService', ['getParentEnumTypes']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [ProductItemComponent],
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: CommonService, useValue: commonServiceSpy },
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and initialize the form', () => {
    expect(component).toBeTruthy();
    expect(component.addUpdateProductItemForm).toBeDefined();
  });

  it('should call productService for autocomplete', (done) => {
    const response = { documentList: [{ productId: 'PROD-1' }] };
    productServiceSpy.getProductsAutocompleteFromOms.and.returnValue(of(response));

    component.getProductsFromService('PROD-1').subscribe((result) => {
      expect(result).toEqual(response.documentList);
      done();
    });
  });


  it('should call addItem and close dialog on successful submit', () => {
    orderServiceSpy.addItem.and.returnValue(of({}));
    component.addUpdateProductItemForm.patchValue({
      productId: 'PROD-1',
      quantity: 2,
      unitAmount: 100,
    });

    component.addUpdateProductItem();

    expect(orderServiceSpy.addItem).toHaveBeenCalledWith(jasmine.objectContaining({
      orderId: 'ORDER-123',
      orderPartSeqId: '0001',
      productId: 'PROD-1',
      quantity: 2,
      unitAmount: 100,
    }));
    expect(dialogRefSpy.close).toHaveBeenCalledWith(jasmine.objectContaining({
      orderId: 'ORDER-123',
      orderPartSeqId: '0001',
      productId: 'PROD-1',
      quantity: 2,
      unitAmount: 100,
    }));
  });

  it('should show error on addItem failure', () => {
    orderServiceSpy.addItem.and.returnValue(throwError(() => new Error('Failed')));

    component.addUpdateProductItemForm.patchValue({
      productId: 'PROD-1',
      quantity: 2,
      unitAmount: 100,
    });

    component.addUpdateProductItem();

    expect(orderServiceSpy.addItem).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should initialize autocomplete on init', () => {
    component.ngOnInit();
    expect(component.filteredProducts$).toBeDefined();
  });
});
