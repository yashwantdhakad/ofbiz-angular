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
import { ProductAssocComponent } from './product-assoc.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { of, throwError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

describe('ProductAssocComponent', () => {
  let component: ProductAssocComponent;
  let fixture: ComponentFixture<ProductAssocComponent>;

  const mockProductService = jasmine.createSpyObj('ProductService', [
    'getProductsAutocompleteFromOms',
    'createProductAssoc',
    'getProductAssocTypes',
  ]);
  const mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
  const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
  const mockCommonService = jasmine.createSpyObj('CommonService', ['getLookupResults']);

  const mockData = {
    assocData: {
      productId: 'PROD-001',
      toProductId: 'PROD-002',
      productAssocTypeEnumId: 'PA_COMP',
      quantity: 1,
      fromDate: '2025-07-27',
    },
  };

  beforeEach(async () => {
    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);
    renderSchedulerSpy.deferMacrotask.and.callFake((fn: () => void) => fn());
    mockProductService.getProductAssocTypes.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule, TranslateModule.forRoot()],
      declarations: [ProductAssocComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: ProductService, useValue: mockProductService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: SnackbarService, useValue: mockSnackbarService },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        TranslateService,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    mockProductService.getProductAssocTypes.calls.reset();
    mockProductService.createProductAssoc.calls.reset();
    mockProductService.getProductsAutocompleteFromOms.calls.reset();
    mockSnackbarService.showSuccess.calls.reset();
    mockSnackbarService.showError.calls.reset();
    mockDialogRef.close.calls.reset();
    fixture = TestBed.createComponent(ProductAssocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and initialize form with data', () => {
    expect(component).toBeTruthy();
    expect(component.addProductAssocForm.value.productId).toBe('PROD-001');
  });

  it('should call getEnumTypes and populate enumTypes', () => {
    const mockEnum = [{ productAssocTypeId: 'PA_COMP', description: 'Component' }];
    mockProductService.getProductAssocTypes.and.returnValue(of(mockEnum));
    component.getEnumTypes();
    expect(mockProductService.getProductAssocTypes).toHaveBeenCalled();
  });

  it('should show an error when getEnumTypes() fails', () => {
    mockProductService.getProductAssocTypes.and.returnValue(throwError(() => new Error('load failed')));

    component.getEnumTypes();

    expect(mockSnackbarService.showError).toHaveBeenCalled();
  });

  it('should initialize search helper and query products after debounce', fakeAsync(() => {
    mockProductService.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [{ productId: 'P-1' }] }));

    component.ngOnInit();
    const subscription = component.filteredProducts$.subscribe();
    component.addProductAssocForm.get('toProductId')?.setValue('P-1');
    tick(350);

    expect(mockProductService.getProductsAutocompleteFromOms).toHaveBeenCalledWith('P-1');
    subscription.unsubscribe();
  }));

  it('should return empty results for blank autocomplete input and map service responses', fakeAsync(() => {
    const getProducts = (component as any).getProductsFromService.bind(component);
    mockProductService.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [{ productId: 'P-2' }] }));

    getProducts('   ').subscribe((items: any[]) => expect(items).toEqual([]));
    getProducts({ productId: 'P-2' }).subscribe((items: any[]) => expect(items).toEqual([{ productId: 'P-2' }]));
    getProducts('P-2').subscribe((items: any[]) => expect(items).toEqual([{ productId: 'P-2' }]));
    tick();
  }));

  it('should swallow autocomplete errors', () => {
    const getProducts = (component as any).getProductsFromService.bind(component);
    mockProductService.getProductsAutocompleteFromOms.and.returnValue(throwError(() => new Error('search failed')));

    getProducts('P-3').subscribe((items: any[]) => expect(items).toEqual([]));
  });

  it('should call createProductAssoc() and submit form successfully', () => {
    const formValues = component.addProductAssocForm.value;
    mockProductService.createProductAssoc.and.returnValue(of({}));

    component.createProductAssoc();

    expect(mockProductService.createProductAssoc).toHaveBeenCalledWith({
      ...formValues,
      toProductId: formValues.toProductId?.productId ?? formValues.toProductId,
    });
    expect(mockSnackbarService.showSuccess).toHaveBeenCalled();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should show error when createProductAssoc() fails', () => {
    mockProductService.createProductAssoc.and.returnValue(throwError(() => new Error('Creation failed')));

    component.createProductAssoc();

    expect(mockSnackbarService.showError).toHaveBeenCalled();
  });

  it('should not call API if form is invalid', () => {
    component.addProductAssocForm.get('toProductId')?.setValue(null);
    component.createProductAssoc();
    expect(mockProductService.createProductAssoc).not.toHaveBeenCalled();
  });

  it('should map displayProduct fallbacks and trackBy helpers', () => {
    expect(component.displayProduct(null)).toBe('');
    expect(component.displayProduct('ABC')).toBe('ABC');
    expect(component.displayProduct({ productName: 'Name' })).toBe('Name');
    expect(component.displayProduct({ name: 'Alt' })).toBe('Alt');
    expect(component.displayProduct({ internalName: 'Internal' })).toBe('Internal');
    expect(component.displayProduct({ productId: 'P-9' })).toBe('P-9');
    expect(component.displayProduct({})).toBe('');

    expect(component.trackByProduct(1, { productId: 'P-1' })).toBe('P-1');
    expect(component.trackByProduct(2, null)).toBe('2');
    expect(component.trackByEnumType(3, { enumId: 'E-1' })).toBe('E-1');
    expect(component.trackByEnumType(4, null)).toBe('4');
  });
});
