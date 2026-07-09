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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { ProductSummary } from '@ofbiz/models/product.model';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { SupplierProductService } from '@ofbiz/services/supplier-product/supplier-product.service';
import { SupplierProductDialogComponent } from './supplier-product-dialog.component';

describe('SupplierProductDialogComponent', () => {
  let component: SupplierProductDialogComponent;
  let fixture: ComponentFixture<SupplierProductDialogComponent>;
  let productService: jasmine.SpyObj<ProductService>;
  let partyService: jasmine.SpyObj<PartyService>;
  let supplierProductService: jasmine.SpyObj<SupplierProductService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SupplierProductDialogComponent>>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    productService = jasmine.createSpyObj('ProductService', ['getProductsAutocompleteFromOms']);
    partyService = jasmine.createSpyObj('PartyService', ['getSuppliersAutocompleteFromWms']);
    supplierProductService = jasmine.createSpyObj('SupplierProductService', ['create']);
    snackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    translateService = jasmine.createSpyObj('TranslateService', ['instant']);
    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);

    productService.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [] }));
    partyService.getSuppliersAutocompleteFromWms.and.returnValue(of({ resultList: [] }));
    translateService.instant.and.callFake((key: string) => key);
    renderSchedulerSpy.deferMacrotask.and.callFake((task: () => void) => task());

    await TestBed.configureTestingModule({
      imports: [SupplierProductDialogComponent],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: PartyService, useValue: partyService },
        { provide: SupplierProductService, useValue: supplierProductService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TranslateService, useValue: translateService },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: MAT_DIALOG_DATA, useValue: { partyId: 'SUP1' } },
      ],
    })
      .overrideComponent(SupplierProductDialogComponent, {
        set: { template: '<form [formGroup]="supplierProductForm"></form>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SupplierProductDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the dialog', () => {
    expect(component).toBeTruthy();
  });

  it('should submit supplier product and show success feedback', fakeAsync(() => {
    supplierProductService.create.and.returnValue(of({}));
    component.supplierProductForm.patchValue({
      productId: { productId: 'PROD1' },
      supplierProductName: 'Vendor SKU',
      lastPrice: '24.50',
    });

    component.save();
    tick();

    expect(supplierProductService.create).toHaveBeenCalledWith({
      partyId: 'SUP1',
      productId: 'PROD1',
      supplierProductName: 'Vendor SKU',
      lastPrice: '24.50',
    });
    expect(translateService.instant).toHaveBeenCalledWith('SUPPLIER.PRODUCT_ADD_SUCCESS');
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('SUPPLIER.PRODUCT_ADD_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  }));

  it('should show error feedback when save fails', fakeAsync(() => {
    supplierProductService.create.and.returnValue(throwError(() => new Error('save failed')));
    component.supplierProductForm.patchValue({
      productId: { productId: 'PROD1' },
      supplierProductName: 'Vendor SKU',
      lastPrice: '24.50',
    });

    component.save();
    tick();

    expect(translateService.instant).toHaveBeenCalledWith('SUPPLIER.PRODUCT_ADD_ERROR');
    expect(snackbarService.showError).toHaveBeenCalledWith('SUPPLIER.PRODUCT_ADD_ERROR');
    expect(dialogRef.close).not.toHaveBeenCalled();
  }));

  it('should lock incoming ids and expose display and trackBy helpers', () => {
    expect(component.isPartyLocked).toBeTrue();
    expect(component.isProductLocked).toBeFalse();
    expect(component.supplierProductForm.get('partyId')?.value).toBe('SUP1');
    expect(component.displaySupplier('SUP1')).toBe('SUP1');
    expect(component.displaySupplier({ groupName: 'Vendor 1' } as any)).toBe('Vendor 1');
    expect(component.displaySupplier({ name: 'Vendor 2' } as any)).toBe('Vendor 2');
    expect(component.displaySupplier({ partyId: 'SUP3' } as any)).toBe('SUP3');
    expect(component.displaySupplier(null)).toBe('');
    expect(component.displayProduct('PROD1')).toBe('PROD1');
    expect(component.displayProduct({ productName: 'Product 1' } as any)).toBe('Product 1');
    expect(component.displayProduct({ name: 'Product 2' } as any)).toBe('Product 2');
    expect(component.displayProduct({ internalName: 'INT-3' } as any)).toBe('INT-3');
    expect(component.displayProduct({ productId: 'PROD3' } as any)).toBe('PROD3');
    expect(component.displayProduct(null)).toBe('');
    expect(component.trackBySupplier(0, { partyId: 'SUP1' })).toBe('SUP1');
    expect(component.trackByProduct(1, { productId: 'PROD1' } as any)).toBe('PROD1');
    expect(component.trackBySupplier(4, {} as any)).toBe('4');
    expect(component.trackByProduct(5, {} as any)).toBe('5');
  });

  it('should guard invalid save and support selection and cancel helpers', () => {
    component.save();
    expect(component.supplierProductForm.touched).toBeTrue();
    expect(supplierProductService.create).not.toHaveBeenCalled();

    component.onSupplierSelected({ partyId: 'SUP2', groupName: 'Vendor 2' });
    component.onSupplierProductSelected({ productId: 'PROD2', productName: 'Product 2' } as any);
    expect(component.supplierProductForm.get('partyId')?.value).toEqual(jasmine.objectContaining({ partyId: 'SUP2' }));
    expect(component.supplierProductForm.get('productId')?.value).toEqual(jasmine.objectContaining({ productId: 'PROD2' }));

    component.onSupplierSelected(null);
    component.onSupplierProductSelected(null);
    expect(component.supplierProductForm.get('partyId')?.value).toEqual(jasmine.objectContaining({ partyId: 'SUP2' }));
    expect(component.supplierProductForm.get('productId')?.value).toEqual(jasmine.objectContaining({ productId: 'PROD2' }));

    component.cancel();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('should keep blank supplier search local and search products on blank input', fakeAsync(() => {
    const supplierResults: any[][] = [];
    const productResults: any[][] = [];

    component.filteredSuppliers$.subscribe((value) => supplierResults.push(value as any));
    component.filteredProducts$.subscribe((value) => productResults.push(value as any));

    tick(300);

    expect(partyService.getSuppliersAutocompleteFromWms).not.toHaveBeenCalled();
    expect(productService.getProductsAutocompleteFromOms).toHaveBeenCalledWith('');
    expect(supplierResults[0]).toEqual([]);
    expect(productResults[0]).toEqual([]);
  }));

  it('should query autocomplete when search values are non-empty or object-backed', fakeAsync(() => {
    component.filteredSuppliers$.subscribe();
    component.filteredProducts$.subscribe();

    component.supplierProductForm.get('partyId')?.setValue('Acme');
    component.supplierProductForm.get('productId')?.setValue({ productId: 'PROD9' } as ProductSummary);
    tick(300);

    expect(partyService.getSuppliersAutocompleteFromWms).toHaveBeenCalledWith('Acme');
    expect(productService.getProductsAutocompleteFromOms).toHaveBeenCalledWith('PROD9');
  }));

  it('should use unlocked ids from form and locked product id when saving', fakeAsync(() => {
    supplierProductService.create.and.returnValue(of({}));
    component.isPartyLocked = false;
    component.isProductLocked = true;
    component.data.productId = 'PROD-LOCKED';
    component.supplierProductForm.patchValue({
      partyId: { partyId: 'SUP2' },
      productId: { productId: 'PROD1' },
      supplierProductName: 'Vendor SKU',
      lastPrice: '24.50',
    });

    component.save();
    tick();

    expect(supplierProductService.create).toHaveBeenCalledWith({
      partyId: 'SUP2',
      productId: 'PROD-LOCKED',
      supplierProductName: 'Vendor SKU',
      lastPrice: '24.50',
    });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  }));
});
