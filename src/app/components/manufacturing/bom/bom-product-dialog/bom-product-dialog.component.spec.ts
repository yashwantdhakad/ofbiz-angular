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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { EventEmitter } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonService } from '@ofbiz/services/common/common.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { BomProductDialogComponent } from './bom-product-dialog.component';

describe('BomProductDialogComponent', () => {
  let component: BomProductDialogComponent;
  let fixture: ComponentFixture<BomProductDialogComponent>;
  let commonService: jasmine.SpyObj<CommonService>;
  let productService: jasmine.SpyObj<ProductService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<BomProductDialogComponent>>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    const commonSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    const productSpy = jasmine.createSpyObj('ProductService', ['createProduct']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream']);
    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);
    renderSchedulerSpy.deferMacrotask.and.callFake((task: () => void) => task());
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));
    translateSpy.stream.and.callFake((key: string) => of(key));
    Object.defineProperties(translateSpy, {
      onTranslationChange: { value: new EventEmitter(), configurable: true },
      onLangChange: { value: new EventEmitter(), configurable: true },
      onDefaultLangChange: { value: new EventEmitter(), configurable: true },
    });

    await TestBed.configureTestingModule({
      declarations: [BomProductDialogComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: CommonService, useValue: commonSpy },
        { provide: ProductService, useValue: productSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { defaultProductTypeId: 'RAW_MATERIAL' } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    commonService = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
    productService = TestBed.inject(ProductService) as jasmine.SpyObj<ProductService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<BomProductDialogComponent>>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
  });

  beforeEach(() => {
    commonService.getLookupResults.and.returnValue(of([{ productTypeId: 'RAW_MATERIAL', description: 'Raw Material' }]));
    fixture = TestBed.createComponent(BomProductDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize the product type from dialog data', () => {
    expect(component.productForm.get('productTypeId')?.value).toBe('RAW_MATERIAL');
  });

  it('should load product types on init', () => {
    expect(commonService.getLookupResults).toHaveBeenCalledWith({}, 'product_type');
    expect(component.productTypes()).toHaveSize(1);
  });

  it('should create product and close with normalized product payload', fakeAsync(() => {
    component.productForm.setValue({
      productName: 'Steel Rod',
      internalName: 'STEEL_ROD',
      productTypeId: 'RAW_MATERIAL',
      description: 'Component',
      price: null,
    });
    productService.createProduct.and.returnValue(of({ product: { productId: 'RM_101' } }));

    component.save();
    tick();

    expect(productService.createProduct).toHaveBeenCalledWith(component.productForm.getRawValue());
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('PRODUCT.CREATED_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({
        productId: 'RM_101',
        productName: 'Steel Rod',
        name: 'Steel Rod',
      })
    );
  }));

  it('should show error when product creation fails', fakeAsync(() => {
    component.productForm.setValue({
      productName: 'Steel Rod',
      internalName: '',
      productTypeId: 'RAW_MATERIAL',
      description: '',
      price: null,
    });
    productService.createProduct.and.returnValue(throwError(() => new Error('boom')));

    component.save();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('PRODUCT.ERROR_CREATE');
  }));

  it('should allow saving without a price in BOM quick-create dialog', () => {
    component.productForm.patchValue({
      productName: 'Quick Created Product',
      productTypeId: 'RAW_MATERIAL',
      price: null,
    });

    expect(component.productForm.valid).toBeTrue();
  });

  it('should show lookup error when type fetch fails', () => {
    translateService.instant.and.returnValue('Type lookup failed');
    commonService.getLookupResults.and.returnValue(throwError(() => new Error('boom')));

    component['fetchProductTypes']();

    expect(snackbarService.showError).toHaveBeenCalledWith('Type lookup failed');
  });

  it('should block save when the form is invalid and close the dialog', fakeAsync(() => {
    component.productForm.setValue({
      productName: '',
      internalName: '',
      productTypeId: '',
      description: '',
      price: null,
    });

    component.save();
    tick();

    expect(component.productForm.touched).toBeTrue();
    expect(productService.createProduct).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.close();
    expect(dialogRef.close).toHaveBeenCalled();
  }));

  it('should track product types by id and normalize raw lookup responses', () => {
    expect(component.trackByProductType(3, { productTypeId: 'RAW_MATERIAL' })).toBe('RAW_MATERIAL');
    expect(component.trackByProductType(4, null as any)).toBe('4');

    commonService.getLookupResults.and.returnValue(of({
      product_type_id: 'FINISHED_GOOD',
      description: 'Finished Good',
    } as any));

    component['fetchProductTypes']();

    expect(component.productTypes()).toEqual([
      jasmine.objectContaining({
        productTypeId: 'FINISHED_GOOD',
        description: 'Finished Good',
      }),
    ]);
  });

  it('should normalize created product payloads from root response and ignore missing ids', () => {
    component.productForm.patchValue({
      productName: 'Fallback Name',
      internalName: '',
      productTypeId: 'RAW_MATERIAL',
      description: '',
      price: null,
    });

    const normalized = component['normalizeCreatedProduct']({ productId: '  PROD-1  ', productName: '' });
    expect(normalized).toEqual(jasmine.objectContaining({
      productId: 'PROD-1',
      productName: 'Fallback Name',
      name: 'Fallback Name',
    }));

    const fallbackProduct = component['normalizeCreatedProduct']({ product: { productId: 'PROD-2', name: 'Inner Name' } });
    expect(fallbackProduct).toEqual(jasmine.objectContaining({
      productId: 'PROD-2',
      productName: 'Inner Name',
      name: 'Inner Name',
    }));

    expect(component['normalizeCreatedProduct']({ product: { productName: 'No Id' } })).toBeNull();
  });
});
