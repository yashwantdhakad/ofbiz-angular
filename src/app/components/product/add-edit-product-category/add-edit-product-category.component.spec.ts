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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AddEditProductCategoryComponent } from './add-edit-product-category.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

describe('AddEditProductCategoryComponent', () => {
  let component: AddEditProductCategoryComponent;
  let fixture: ComponentFixture<AddEditProductCategoryComponent>;

  let mockCategoryService: jasmine.SpyObj<CategoryService>;
  let mockProductService: jasmine.SpyObj<ProductService>;
  let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<AddEditProductCategoryComponent>>;

  beforeEach(async () => {
    mockCategoryService = jasmine.createSpyObj('CategoryService', ['getCategories']);
    mockProductService = jasmine.createSpyObj('ProductService', ['addProductCategory']);
    mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    const translateSpy = jasmine.createSpyObj(
      'TranslateService',
      ['instant', 'get'],
      {
        onLangChange: of(),
        onDefaultLangChange: of(),
        onTranslationChange: of(),
      }
    );
    translateSpy.instant.and.callFake((key: string) => {
      const map: Record<string, string> = {
        'PRODUCT.CATEGORY_ADDED_SUCCESS': 'Product category added successfully.',
        'PRODUCT.CATEGORY_ADDED_ERROR': 'Error adding product category.',
      };
      return map[key] ?? key;
    });
    translateSpy.get.and.callFake((key: string) => of(translateSpy.instant(key)));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [AddEditProductCategoryComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { productCategoryData: { productId: 'P1001' } } },
        { provide: ProductService, useValue: mockProductService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: SnackbarService, useValue: mockSnackbarService },
        { provide: TranslateService, useValue: translateSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddEditProductCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with productId from dialog data', () => {
    expect(component.addProductCategoryForm.value.productId).toBe('P1001');
  });

  it('should call productService.addProductCategory and show success snackbar on successful submit', () => {
    component.addProductCategoryForm.setValue({
      productId: 'P1001',
      productCategoryId: 'CAT100'
    });

    mockProductService.addProductCategory.and.returnValue(of({}));

    component.addProductCategory();

    expect(mockProductService.addProductCategory).toHaveBeenCalledWith({
      productId: 'P1001',
      productCategoryId: 'CAT100'
    });

    expect(mockSnackbarService.showSuccess).toHaveBeenCalledWith('Product category added successfully.');
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should show error snackbar on addProductCategory error', () => {
    component.addProductCategoryForm.setValue({
      productId: 'P1001',
      productCategoryId: 'CAT100'
    });

    mockProductService.addProductCategory.and.returnValue(throwError(() => new Error('Failed')));

    component.addProductCategory();

    expect(mockSnackbarService.showError).toHaveBeenCalledWith('Error adding product category.');
  });

  it('displayCategoryFn should return category name from cachedCategories', () => {
    component.cachedCategories = [
      { productCategoryId: 'CAT100', categoryName: 'Hardware' }
    ];

    const result = component.displayCategoryFn('CAT100');
    expect(result).toBe('Hardware');
  });

  it('displayCategoryFn should return raw ID if category not found', () => {
    component.cachedCategories = [
      { productCategoryId: 'CAT100', categoryName: 'Hardware' }
    ];

    const result = component.displayCategoryFn('UNKNOWN');
    expect(result).toBe('UNKNOWN');
  });
});
