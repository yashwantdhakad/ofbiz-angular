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
import { Router } from '@angular/router';
import { EventEmitter } from '@angular/core';
import { of, throwError } from 'rxjs';
import { CreateProductComponent } from './create-product.component';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

describe('CreateProductComponent', () => {
  let component: CreateProductComponent;
  let fixture: ComponentFixture<CreateProductComponent>;
  let commonService: jasmine.SpyObj<CommonService>;
  let productService: jasmine.SpyObj<ProductService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let router: jasmine.SpyObj<Router>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    const commonSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    const productSpy = jasmine.createSpyObj('ProductService', ['createProduct']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
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
      declarations: [CreateProductComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: CommonService, useValue: commonSpy },
        { provide: ProductService, useValue: productSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: Router, useValue: routerSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    commonService = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
    productService = TestBed.inject(ProductService) as jasmine.SpyObj<ProductService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
  });

  beforeEach(() => {
    commonService.getLookupResults.and.returnValue(of([]));
    fixture = TestBed.createComponent(CreateProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize product form with default values', () => {
    const form = component.productForm;
    expect(form).toBeTruthy();
    expect(form.get('productTypeId')?.value).toBe('FINISHED_GOOD');
  });

  it('should fetch product types on init', () => {
    commonService.getLookupResults.and.returnValue(of([{ productTypeId: 'FINISHED_GOOD' }]));

    component.fetchProductTypes();

    expect(commonService.getLookupResults).toHaveBeenCalledWith({}, 'product_type');
    expect(component.productTypes()).toHaveSize(1);
  });

  it('should normalize snake_case product type id from lookup response', () => {
    commonService.getLookupResults.and.returnValue(
      of([{ product_type_id: 'RAW_MATERIAL', description: 'Raw Material' }])
    );

    component.fetchProductTypes();

    expect(component.productTypes()[0].productTypeId).toBe('RAW_MATERIAL');
  });

  it('should show error if fetch product types fails', () => {
    translateService.instant.and.returnValue('Error fetching types');
    commonService.getLookupResults.and.returnValue(throwError(() => new Error()));

    component.fetchProductTypes();

    expect(snackbarService.showError).toHaveBeenCalledWith('Error fetching types');
  });

  it('should not submit if form is invalid', () => {
    component.productForm.get('productName')?.setValue('');
    component.createProduct();
    expect(productService.createProduct).not.toHaveBeenCalled();
  });

  it('should submit product and navigate on success', fakeAsync(() => {
    const formData = {
      productName: 'Product 1',
      internalName: 'Product 1',
      productTypeId: 'FINISHED_GOOD',
      price: 10,
      description: '',
    };

    translateService.instant.and.returnValue('Created');
    component.productForm.setValue(formData);
    productService.createProduct.and.returnValue(of({ product: { productId: 'P001' } }));

    component.createProduct();
    tick();

    expect(productService.createProduct).toHaveBeenCalledWith(formData);
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('Created');
    expect(router.navigate).toHaveBeenCalledWith(['/products/P001']);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should show error message if product creation returns no productId', fakeAsync(() => {
    translateService.instant.and.returnValue('Failed');
    component.productForm.setValue({
      productName: 'Test',
      internalName: '',
      productTypeId: 'FINISHED_GOOD',
      price: 10,
      description: '',
    });

    productService.createProduct.and.returnValue(of({}));

    component.createProduct();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('Failed');
  }));

  it('should handle error on product creation', fakeAsync(() => {
    translateService.instant.and.returnValue('Create error');
    component.productForm.setValue({
      productName: 'Test',
      internalName: '',
      productTypeId: 'FINISHED_GOOD',
      price: 10,
      description: '',
    });

    productService.createProduct.and.returnValue(throwError(() => new Error()));

    component.createProduct();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('Create error');
  }));
});
