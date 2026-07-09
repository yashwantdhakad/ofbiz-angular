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
import { AddEditProductPriceComponent } from './add-edit-product-price.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { of, throwError } from 'rxjs';

describe('AddEditProductPriceComponent', () => {
  let component: AddEditProductPriceComponent;
  let fixture: ComponentFixture<AddEditProductPriceComponent>;

  const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
  const mockCommonService = jasmine.createSpyObj('CommonService', ['getUoms']);
  const mockProductService = jasmine.createSpyObj('ProductService', ['addProductPrice', 'updateProductPrice']);
  const mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
  const mockTranslateService = jasmine.createSpyObj('TranslateService', ['instant', 'get']);

  const mockData = {
    productPriceData: {
      productId: 'PROD-1',
      price: 100,
      pricePurposeEnums: [{ enumId: 'PppPurchase' }],
      priceTypeEnums: [{ enumId: 'PptCurrent' }],
    },
  };

  beforeEach(async () => {
    mockCommonService.getUoms.and.returnValue(of([]));
    mockTranslateService.instant.and.callFake((key: string) => key);
    mockTranslateService.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [AddEditProductPriceComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: CommonService, useValue: mockCommonService },
        { provide: ProductService, useValue: mockProductService },
        { provide: SnackbarService, useValue: mockSnackbarService },
        { provide: TranslateService, useValue: mockTranslateService },
      ],
    })
      .overrideTemplate(AddEditProductPriceComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(AddEditProductPriceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and initialize form', () => {
    expect(component).toBeTruthy();
    expect(component.addUpdateProductPriceForm.value.productId).toEqual('PROD-1');
  });

  it('should fetch UOMs on init', () => {
    const mockUoms = [{ uomId: 'USD', description: 'Dollar' }];
    mockCommonService.getUoms.and.returnValue(of(mockUoms));

    component.getUoms();

    expect(mockCommonService.getUoms).toHaveBeenCalledWith('CURRENCY_MEASURE');
  });

  it('should call addProductPrice on submit when productPriceId is not present', () => {
    mockProductService.addProductPrice.and.returnValue(of({}));

    component.addUpdateProductPriceForm.patchValue({ price: 150, currencyUomId: 'USD' });
    component.addUpdateProductPrice();

    expect(mockProductService.addProductPrice).toHaveBeenCalled();
    expect(mockSnackbarService.showSuccess).toHaveBeenCalledWith('PRODUCT.PRICE_ADD_SUCCESS');
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should call updateProductPrice when productPriceId is present', () => {
    component.addUpdateProductPriceForm.patchValue({
      productPriceId: 'PRICE-001',
      price: 200,
      currencyUomId: 'USD',
    });

    mockProductService.updateProductPrice.and.returnValue(of({}));

    component.addUpdateProductPrice();

    expect(mockProductService.updateProductPrice).toHaveBeenCalled();
    expect(mockSnackbarService.showSuccess).toHaveBeenCalledWith('PRODUCT.PRICE_UPDATE_SUCCESS');
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should show error snackbar when add/update fails', () => {
    mockProductService.addProductPrice.and.returnValue(throwError(() => new Error('Failure')));

    component.addUpdateProductPriceForm.patchValue({ price: 123, currencyUomId: 'USD' });
    component.addUpdateProductPrice();

    expect(mockSnackbarService.showError).toHaveBeenCalledWith('PRODUCT.PRICE_SAVE_ERROR');
  });

  it('should show error snackbar when uom fetch fails', () => {
    mockCommonService.getUoms.and.returnValue(throwError(() => new Error('uom fail')));

    component.getUoms();

    expect(mockSnackbarService.showError).toHaveBeenCalledWith('PRODUCT.PRICE_UOM_FETCH_ERROR');
  });
});
