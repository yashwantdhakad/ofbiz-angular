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
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ProductService } from '@ofbiz/services/product/product.service';
import { AddDeliverableItemDialogComponent } from './add-deliverable-item-dialog.component';

describe('AddDeliverableItemDialogComponent', () => {
  let component: AddDeliverableItemDialogComponent;
  let fixture: ComponentFixture<AddDeliverableItemDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddDeliverableItemDialogComponent>>;
  let productService: jasmine.SpyObj<ProductService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<AddDeliverableItemDialogComponent>>('MatDialogRef', ['close']);
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsAutocompleteFromOms']);

    await TestBed.configureTestingModule({
      declarations: [AddDeliverableItemDialogComponent],
      providers: [
        FormBuilder,
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            item: {
              productId: 'P-1',
              productName: 'Widget',
              estimatedQuantity: '2',
              fromDate: '2026-04-01T00:00:00Z',
              thruDate: '2026-04-08T00:00:00Z',
            },
          },
        },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ProductService, useValue: productService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddDeliverableItemDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(AddDeliverableItemDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('seeds the form from dialog data and loads autocomplete results', fakeAsync(() => {
    productService.getProductsAutocompleteFromOms.and.returnValue(
      of({
        documentList: [
          { productId: 'P-1', name: 'Widget' },
          { productId: 'P-2', name: 'Gadget' },
        ],
      } as any)
    );

    createComponent();
    tick(300);

    expect(component.form.value.productId).toBe('P-1');
    expect(component.form.value.productSearch).toBe('Widget');
    expect(component.selectedProduct).toBeNull();

    let emitted: any[] = [];
    component.filteredProducts$.subscribe((items) => {
      emitted = items;
    });
    tick(300);
    emitted = [];
    component.form.get('productSearch')?.setValue('gad');
    tick(300);

    expect(productService.getProductsAutocompleteFromOms).toHaveBeenCalledWith('gad');
    expect(emitted).toEqual([
      { productId: 'P-1', name: 'Widget' },
      { productId: 'P-2', name: 'Gadget' },
    ]);
    expect(component.isLoading()).toBeFalse();
  }));

  it('keeps the primary-key product immutable while editing', fakeAsync(() => {
    productService.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [] } as any));
    createComponent();
    tick(300);

    let emitted: any[] = [];
    component.filteredProducts$.subscribe((items) => {
      emitted = items;
    });
    tick(300);

    component.onProductSelected({ productId: 'P-9', name: 'Selected' } as any);
    expect(component.selectedProduct).toBeNull();
    expect(component.form.value.productId).toBe('P-1');

    component.form.get('productSearch')?.setValue('manual');
    tick(300);

    expect(component.selectedProduct).toBeNull();
    expect(component.form.value.productId).toBe('P-1');
    expect(emitted).toEqual([]);
  }));

  it('falls back to an empty list when autocomplete fails', fakeAsync(() => {
    productService.getProductsAutocompleteFromOms.and.returnValue(throwError(() => new Error('search failed')) as any);

    createComponent();
    tick(300);

    let emitted: any[] = [];
    component.filteredProducts$.subscribe((items) => {
      emitted = items;
    });
    component.form.get('productSearch')?.setValue('abc');
    tick(300);

    expect(emitted).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  }));

  it('marks invalid forms touched and closes with the normalized payload when valid', () => {
    productService.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [] } as any));
    createComponent();
    spyOn(component.form, 'markAllAsTouched');

    component.form.patchValue({ productId: '' });
    component.save();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.form.patchValue({
      productId: 'P-1',
      estimatedQuantity: '5',
      fromDate: new Date('2026-04-02T00:00:00Z'),
      thruDate: null,
    });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      productId: 'P-1',
      estimatedQuantity: '5',
      fromDate: jasmine.any(Date),
      thruDate: null,
    });
  });

  it('formats products for display', () => {
    productService.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [] } as any));
    createComponent();

    expect(component.displayProduct('Raw')).toBe('Raw');
    expect(component.displayProduct({ productId: 'P-1', name: 'Widget' } as any)).toBe('Widget');
    expect(component.displayProduct({ productId: 'P-2', productName: 'Widget Two' } as any)).toBe('Widget Two');
    expect(component.displayProduct({ productId: 'P-3' } as any)).toBe('P-3');
    expect(component.displayProduct(null)).toBe('');
  });

  it('queries by product id when the search control emits a selected object', fakeAsync(() => {
    productService.getProductsAutocompleteFromOms.and.returnValue(
      of({ documentList: [{ productId: 'P-4', name: 'Bracket' }] } as any)
    );
    createComponent();
    tick(300);

    let emitted: any[] = [];
    component.filteredProducts$.subscribe((items) => {
      emitted = items;
    });

    component.form.get('productSearch')?.setValue({ productId: 'P-4', name: 'Bracket' } as any);
    tick(300);

    expect(productService.getProductsAutocompleteFromOms).toHaveBeenCalledWith('P-4');
    expect(emitted).toEqual([{ productId: 'P-4', name: 'Bracket' }]);
  }));
});
