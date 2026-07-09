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
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AddEditProductComponent } from './add-edit-product.component';
import { TranslateService } from '@ngx-translate/core';

describe('AddEditProductComponent', () => {
  let component: AddEditProductComponent;
  let fixture: ComponentFixture<AddEditProductComponent>;
  let categoryServiceSpy: jasmine.SpyObj<CategoryService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddEditProductComponent>>;

  const mockDialogData = {
    categoryProductData: {
      productCategoryId: 'CAT123',
      productId: 'PROD001',
      fromDate: '2024-01-01',
      thruDate: '2024-12-31',
    },
  };

  beforeEach(async () => {
    const categorySpy = jasmine.createSpyObj('CategoryService', ['addProductToCategory']);
    const productSpy = jasmine.createSpyObj('ProductService', ['getProducts']);
    const snackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
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
        'CATEGORY.PRODUCT_ADDED_SUCCESS': 'Product added to category successfully.',
        'CATEGORY.PRODUCT_ADDED_ERROR': 'Error adding product to category.',
      };
      return map[key] ?? key;
    });
    translateSpy.get.and.callFake((key: string) => of(translateSpy.instant(key)));

    await TestBed.configureTestingModule({
      declarations: [AddEditProductComponent],
      imports: [ReactiveFormsModule, FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: CategoryService, useValue: categorySpy },
        { provide: ProductService, useValue: productSpy },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: TranslateService, useValue: translateSpy },
      ],
    }).compileComponents();

    categoryServiceSpy = TestBed.inject(CategoryService) as jasmine.SpyObj<CategoryService>;
    snackbarSpy = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    dialogRefSpy = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<AddEditProductComponent>>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEditProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with injected data', () => {
    expect(component.addProductToCategoryForm.value).toEqual({
      productCategoryId: 'CAT123',
      productId: 'PROD001',
      fromDate: '2024-01-01',
      thruDate: '2024-12-31',
    });
  });

  it('should not call service if form is invalid', fakeAsync(() => {
    component.addProductToCategoryForm.controls['productId'].setValue('');
    component.addProductToCategoryForm.controls['productId'].markAsTouched();
    component.addProductToCategoryForm.updateValueAndValidity();

    component.addProductToCategory();
    tick();

    expect(categoryServiceSpy.addProductToCategory).not.toHaveBeenCalled();
  }));

  it('should call service and close dialog on success', fakeAsync(() => {
    const formValues = component.addProductToCategoryForm.value;
    categoryServiceSpy.addProductToCategory.and.returnValue(of({ success: true }));

    component.addProductToCategory();
    tick();

    expect(categoryServiceSpy.addProductToCategory).toHaveBeenCalledWith(formValues);
    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      productCategoryId: formValues.productCategoryId,
      refresh: true,
    });
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('Product added to category successfully.');
    flush();
  }));

  it('should handle service error gracefully', fakeAsync(() => {
    categoryServiceSpy.addProductToCategory.and.returnValue(
      throwError(() => new Error('API Error'))
    );

    component.addProductToCategory();
    tick();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('Error adding product to category.');
    flush();
  }));
});
