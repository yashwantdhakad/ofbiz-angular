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
import { AddToProductComponent } from './add-to-product.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { CommonService } from '@ofbiz/services/common/common.service';
import { FeatureService } from '@ofbiz/services/features/feature.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('AddToProductComponent', () => {
  let component: AddToProductComponent;
  let fixture: ComponentFixture<AddToProductComponent>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockFeatureService: jasmine.SpyObj<FeatureService>;
  let mockProductService: jasmine.SpyObj<ProductService>;
  let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddToProductComponent>>;

  beforeEach(async () => {
    mockCommonService = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    mockFeatureService = jasmine.createSpyObj('FeatureService', [
      'createProductFeatureAppl',
      'updateProductFeatureAppl',
      'getFeatures',
    ]);
    mockProductService = jasmine.createSpyObj('ProductService', ['getProductsAutocompleteFromOms']);
    mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockCommonService.getLookupResults.and.returnValue(of([]));
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      imports: [AddToProductComponent, ReactiveFormsModule],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        FormBuilder,
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { featureProductData: {} } },
        { provide: CommonService, useValue: mockCommonService },
        { provide: FeatureService, useValue: mockFeatureService },
        { provide: ProductService, useValue: mockProductService },
        { provide: SnackbarService, useValue: mockSnackbarService },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    })
      .overrideTemplate(AddToProductComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(AddToProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load ProductFeatureApplType lookup on init', () => {
    mockCommonService.getLookupResults.and.returnValue(of([{ productFeatureApplTypeId: 'STANDARD_FEATURE' }]));
    component.ngOnInit();
    expect(mockCommonService.getLookupResults).toHaveBeenCalledWith({}, 'product_feature_appl_type');
  });

  it('should show success on successful createProductFeatureAppl', fakeAsync(() => {
    component.createProductFeatureApplForm.patchValue({
      id: null,
      productFeatureId: 'F1',
      applTypeEnumId: 'PfatStandard',
      productId: 'P1',
      sequenceNum: 1,
      amount: 10,
      fromDate: undefined
    });
    mockFeatureService.createProductFeatureAppl.and.returnValue(of({ success: true }));

    component.createProductFeatureAppl();
    tick();

    expect(mockFeatureService.createProductFeatureAppl).toHaveBeenCalled();
    expect(mockSnackbarService.showSuccess).toHaveBeenCalledWith('FEATURE.APPLICATION_CREATE_SUCCESS');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should show error on failed createProductFeatureAppl', fakeAsync(() => {
    component.createProductFeatureApplForm.patchValue({
      id: null,
      productFeatureId: 'F1',
      applTypeEnumId: 'PfatStandard',
      productId: 'P1',
      sequenceNum: 1,
      amount: 10,
      fromDate: undefined
    });
    mockFeatureService.createProductFeatureAppl.and.returnValue(throwError(() => new Error('Error')));

    component.createProductFeatureAppl();
    tick();

    expect(mockSnackbarService.showError).toHaveBeenCalledWith('FEATURE.APPLICATION_SAVE_ERROR');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should cover display helpers, autocomplete empty branches, and update flow', fakeAsync(() => {
    component.createProductFeatureApplForm.patchValue({
      id: 'APPL-1',
      productFeatureId: { productFeatureId: 'F1', description: 'Feature One' },
      applTypeEnumId: 'PfatStandard',
      productId: { productId: 'P1', productName: 'Product One' },
    });
    mockFeatureService.updateProductFeatureAppl.and.returnValue(of({ success: true }));

    expect(component.displayProduct('raw')).toBe('raw');
    expect(component.displayProduct({ internalName: 'Internal Product' })).toBe('Internal Product');
    expect(component.displayFeature('feature')).toBe('feature');
    expect(component.displayFeature({ abbrev: 'FTR' })).toBe('FTR');

    component['getProducts']('').subscribe((items) => expect(items).toEqual([]));
    component['getFeatures']('').subscribe((items) => expect(items).toEqual([]));

    component.createProductFeatureAppl();
    tick();

    expect(mockFeatureService.updateProductFeatureAppl).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'APPL-1',
      productId: 'P1',
      productFeatureId: 'F1',
      productFeatureApplTypeId: 'PfatStandard',
    }));
    expect(mockSnackbarService.showSuccess).toHaveBeenCalledWith('FEATURE.APPLICATION_UPDATE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));

  it('should not submit invalid form and should normalize appl type payload list', () => {
    component.createProductFeatureApplForm.patchValue({
      productFeatureId: '',
      applTypeEnumId: '',
      productId: '',
    });
    component.createProductFeatureAppl();
    expect(mockFeatureService.createProductFeatureAppl).not.toHaveBeenCalled();

    mockCommonService.getLookupResults.and.returnValue(of({ productFeatureApplTypeId: 'ONLY_ONE' } as any));
    component['loadEnumTypes']();
    expect(component.applTypes()).toEqual([{ productFeatureApplTypeId: 'ONLY_ONE' } as any]);
  });

  it('should show fetch errors for products, features, and application types', () => {
    mockProductService.getProductsAutocompleteFromOms.and.returnValue(throwError(() => new Error('products')));
    mockFeatureService.getFeatures.and.returnValue(throwError(() => new Error('features')));
    mockCommonService.getLookupResults.and.returnValue(throwError(() => new Error('types')));

    component.ngOnInit();
    component['getProducts']('P1').subscribe();
    component['getFeatures']('F1').subscribe();
    component['loadEnumTypes']();

    expect(mockSnackbarService.showError).toHaveBeenCalledWith('FEATURE.FETCH_APPL_TYPES_ERROR');
    expect(mockSnackbarService.showError).toHaveBeenCalledWith('FEATURE.FETCH_PRODUCTS_ERROR');
    expect(mockSnackbarService.showError).toHaveBeenCalledWith('FEATURE.FETCH_ERROR');
  });
});
