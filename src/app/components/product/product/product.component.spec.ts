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
import { ProductComponent } from './product.component';
import { ProductService } from '@ofbiz/services/product/product.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';

describe('ProductComponent', () => {
  let component: ProductComponent;
  let fixture: ComponentFixture<ProductComponent>;
  let productService: jasmine.SpyObj<ProductService>;
  let commonService: jasmine.SpyObj<CommonService>;

  const mockProducts = {
    documentList: [
      { productId: 'P001', productName: 'Product 1', productTypeId: 'FINISHED_GOOD' },
      { productId: 'P002', productName: 'Product 2', productTypeId: 'RAW_MATERIAL' },
    ],
    documentListCount: 20,
  };

  beforeEach(async () => {
    const productServiceSpy = jasmine.createSpyObj('ProductService', ['getProducts']);
    const commonServiceSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [ProductComponent],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: CommonService, useValue: commonServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    productService = TestBed.inject(ProductService) as jasmine.SpyObj<ProductService>;
    commonService = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should return product table column keys', () => {
    expect(component.columnKeys).toEqual([
      'productId',
      'productName',
      'internalName',
      'description',
      'goodIdentificationValue',
      'productTypeId',
    ]);
  });

  it('should load product types and products on init', fakeAsync(() => {
    commonService.getLookupResults.and.returnValue(
      of([{ productTypeId: 'FINISHED_GOOD', description: 'Finished Good' }])
    );
    productService.getProducts.and.returnValue(of(mockProducts));
    fixture.detectChanges(); // triggers ngOnInit
    tick(300);

    expect(commonService.getLookupResults).toHaveBeenCalledWith({}, 'product_type');
    expect(productService.getProducts).toHaveBeenCalledWith(0, '', undefined, undefined);
    expect(component.items()).toHaveSize(2);
    expect(component.pages()).toBe(20);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should map product type id to description in getValue', () => {
    component.productTypeMap.set(new Map([['FINISHED_GOOD', 'Finished Good']]));
    const value = component.getValue({ productTypeId: 'FINISHED_GOOD' }, 'productTypeId');
    expect(value).toBe('Finished Good');
  });

  it('should handle page change', fakeAsync(() => {
    commonService.getLookupResults.and.returnValue(of([]));
    productService.getProducts.and.returnValue(of(mockProducts));
    fixture.detectChanges();
    tick(300);
    productService.getProducts.calls.reset();

    component.queryString.set('test');
    component.onPageChange(1);
    tick();

    expect(productService.getProducts).toHaveBeenCalledWith(1, 'test', undefined, undefined);
  }));

  it('should toggle sorting and request sorted data', fakeAsync(() => {
    commonService.getLookupResults.and.returnValue(of([]));
    productService.getProducts.and.returnValue(of(mockProducts));
    fixture.detectChanges();
    tick(300);
    productService.getProducts.calls.reset();

    component.searchControl.setValue('chair');
    tick(300);
    productService.getProducts.calls.reset();
    component.pagination.update((state) => ({ ...state, page: 2 }));

    component.onSortChange({ active: 'productName', direction: '' });
    tick();
    expect(component.currentSort()).toEqual({ active: 'productName', direction: 'asc' });
    expect(productService.getProducts).toHaveBeenCalled();

    component.onSortChange({ active: 'productName', direction: '' });
    tick();
    expect(component.currentSort()).toEqual({ active: 'productName', direction: 'desc' });
    expect(productService.getProducts.calls.count()).toBeGreaterThan(1);
  }));

  it('should handle getProducts error', fakeAsync(() => {
    commonService.getLookupResults.and.returnValue(of([]));
    productService.getProducts.and.returnValue(throwError(() => new Error('Failed')));
    fixture.detectChanges();
    tick(300);

    expect(component.items()).toEqual([]);
    expect(component.pages()).toBe(0);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should unsubscribe product list loading when destroyed', fakeAsync(() => {
    const products$ = new Subject<typeof mockProducts>();
    commonService.getLookupResults.and.returnValue(of([]));
    productService.getProducts.and.returnValue(products$.asObservable());

    fixture.detectChanges();
    tick(300);

    expect(products$.observed).toBeTrue();
    expect(component.isLoading()).toBeTrue();

    fixture.destroy();

    expect(products$.observed).toBeFalse();
    expect(component.isLoading()).toBeFalse();
  }));
});
