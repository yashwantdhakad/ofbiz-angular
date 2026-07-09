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
import { ProductEditComponent } from './product-edit.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('ProductEditComponent', () => {
  let component: ProductEditComponent;
  let fixture: ComponentFixture<ProductEditComponent>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ProductEditComponent>>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  const mockDialogData = {
    productDetail: {
      productId: 'PROD-123',
      productName: 'Test Product',
    },
  };

  beforeEach(async () => {
    productServiceSpy = jasmine.createSpyObj('ProductService', ['updateProduct']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      declarations: [ProductEditComponent],
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    })
      .overrideTemplate(ProductEditComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(ProductEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and form should be initialized with values', () => {
    expect(component).toBeTruthy();
    expect(component.updateProductForm.value.productId).toBe('PROD-123');
    expect(component.updateProductForm.value.productName).toBe('Test Product');
  });

  it('should call updateProduct and close dialog on success', () => {
    const updatedValue = {
      productId: 'PROD-123',
      productName: 'Updated Product',
      internalName: 'Updated Internal Name',
      description: 'Updated description',
      requireInspection: true,
    };
    const expectedPayload = { ...updatedValue, requireInspection: 'Y' };

    component.updateProductForm.setValue(updatedValue);
    productServiceSpy.updateProduct.and.returnValue(of({}));

    component.updateProduct();

    expect(productServiceSpy.updateProduct).toHaveBeenCalledWith(expectedPayload);
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('PRODUCT.UPDATE_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(expectedPayload);
  });

  it('should show error on updateProduct failure', () => {
    component.updateProductForm.setValue({
      productId: 'PROD-123',
      productName: 'Fail Product',
      internalName: 'Fail Internal Name',
      description: 'Fail description',
      requireInspection: false,
    });

    productServiceSpy.updateProduct.and.returnValue(
      throwError(() => new Error('Update failed'))
    );

    component.updateProduct();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('PRODUCT.UPDATE_ERROR');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should not submit the form if invalid', () => {
    component.updateProductForm.controls['productName'].setValue('');
    component.updateProduct();

    expect(productServiceSpy.updateProduct).not.toHaveBeenCalled();
  });
});
