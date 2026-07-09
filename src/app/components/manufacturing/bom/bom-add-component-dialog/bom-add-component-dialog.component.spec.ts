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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { BomAddComponentDialogComponent } from './bom-add-component-dialog.component';

describe('BomAddComponentDialogComponent', () => {
  let component: BomAddComponentDialogComponent;
  let fixture: ComponentFixture<BomAddComponentDialogComponent>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;
  let productService: jasmine.SpyObj<ProductService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<BomAddComponentDialogComponent>>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;

  const createData = {
    productId: 'FG_100',
    bomTypeId: 'MANUF_COMPONENT',
  };

  beforeEach(async () => {
    manufacturingService = jasmine.createSpyObj('ManufacturingService', ['addProductAssoc', 'updateProductAssoc']);
    productService = jasmine.createSpyObj('ProductService', ['getProductsAutocompleteFromOms']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);
    manufacturingService.addProductAssoc.and.returnValue(of({}));
    manufacturingService.updateProductAssoc.and.returnValue(of({}));
    productService.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [] }));
    renderSchedulerSpy.deferMacrotask.and.callFake((task: () => void) => task());

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [BomAddComponentDialogComponent],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: ProductService, useValue: productService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: createData },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BomAddComponentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call addProductAssoc in create mode', () => {
    component.componentProductControl.setValue('RM_200');
    component.quantity = 2;
    component.sequenceNum = '10';
    component.save();

    expect(manufacturingService.addProductAssoc).toHaveBeenCalledWith(
      'FG_100',
      jasmine.objectContaining({
        toProductId: 'RM_200',
        productAssocTypeEnumId: 'MANUF_COMPONENT',
        quantity: '2',
      })
    );
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should call updateProductAssoc in edit mode', () => {
    component.isEdit = true;
    component.assocId = 11;
    component.associationKey = {
      productId: 'FG_100',
      productIdTo: 'RM_200',
      productAssocTypeId: 'MANUF_COMPONENT',
      fromDate: '2024-01-02T03:04:05',
    };
    component.componentProductControl.setValue('RM_200');
    component.quantity = 4;
    component.sequenceNum = '20';

    component.save();

    expect(manufacturingService.updateProductAssoc).toHaveBeenCalledWith(
      11,
      jasmine.objectContaining({
        productId: 'FG_100',
        productIdTo: 'RM_200',
        productAssocTypeId: 'MANUF_COMPONENT',
        fromDate: '2024-01-02T03:04:05',
        quantity: '4',
        sequenceNum: '20',
      })
    );
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should close dialog with false on close()', () => {
    component.close();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should disable the component selector in edit mode and expose helpers', () => {
    const editComponent = new BomAddComponentDialogComponent(
      {
        productId: 'FG_100',
        bomTypeId: 'MANUF_COMPONENT',
        mode: 'edit',
        assocId: 11,
        componentProductId: 'RM_100',
        quantity: 3,
        sequenceNum: '15',
        fromDate: '2024-01-02T03:04:05',
      },
      dialogRef,
      manufacturingService,
      productService,
      renderSchedulerSpy
    );

    editComponent.ngOnInit();

    expect(editComponent.isEdit).toBeTrue();
    expect(editComponent.assocId).toBe(11);
    expect(editComponent.componentProductControl.disabled).toBeTrue();
    expect(editComponent.displayProduct('RM_100')).toBe('RM_100');
    expect(editComponent.displayProduct({ productName: 'Raw Material' })).toBe('Raw Material');
    expect(editComponent.trackByProduct(0, { productId: 'RM_100' })).toBe('RM_100');
    expect(editComponent.trackByProduct(1, null)).toBe('1');
  });

  it('should guard invalid save and handle create and update failures', () => {
    component.productId = '';
    component.save();
    expect(manufacturingService.addProductAssoc).not.toHaveBeenCalled();

    component.productId = 'FG_100';
    component.componentProductControl.setValue('RM_200');
    manufacturingService.addProductAssoc.and.returnValue(throwError(() => new Error('create failed')));
    component.save();
    expect(component.isSaving()).toBeFalse();
    expect(dialogRef.close).not.toHaveBeenCalledWith(true);

    component.isEdit = true;
    component.assocId = 11;
    manufacturingService.updateProductAssoc.and.returnValue(throwError(() => new Error('update failed')));
    component.save();
    expect(component.isSaving()).toBeFalse();
  });

  it('should filter autocomplete products and suppress virtual entries', fakeAsync(() => {
    productService.getProductsAutocompleteFromOms.and.returnValue(of({
      documentList: [
        { productId: 'RM_200', productName: 'Raw Material', isVirtual: 'N' },
        { productId: 'VIRT_1', productName: 'Virtual', isVirtual: 'Y' },
      ],
    }));

    let results: any[] | undefined;
    component.filteredProducts$.subscribe((items) => {
      results = items;
    });
    component.componentProductControl.setValue('RM');
    tick(301);

    expect(results?.length).toBe(1);
    expect(results?.[0].productId).toBe('RM_200');
  }));

  it('should return empty autocomplete results for blank or failed searches', fakeAsync(() => {
    let results: any[] | undefined;
    component.filteredProducts$.subscribe((items) => {
      results = items;
    });
    component.componentProductControl.setValue('');
    tick(301);
    expect(results).toEqual([]);

    productService.getProductsAutocompleteFromOms.and.returnValue(throwError(() => new Error('search failed')));
    component.componentProductControl.setValue('ERR');
    tick(301);
    expect(results).toEqual([]);
  }));

  it('should normalize object values and dates for create and update payloads', () => {
    component.componentProductControl.setValue({ productId: 'RM_201', productName: 'Raw Material 201' } as any);
    component.quantity = 5;
    component.sequenceNum = '30';
    component.fromDate = new Date('2024-02-03T04:05:06');

    component.save();

    expect(manufacturingService.addProductAssoc).toHaveBeenCalledWith(
      'FG_100',
      jasmine.objectContaining({
        toProductId: 'RM_201',
        quantity: '5',
        fromDate: '2024-02-03T04:05:06',
        sequenceNum: '30',
      })
    );

    component.isEdit = true;
    component.assocId = 12;
    component.componentProductControl.setValue('RM_201');
    component.fromDate = 'invalid-date' as any;
    component.save();

    expect(manufacturingService.updateProductAssoc).toHaveBeenCalledWith(
      12,
      jasmine.objectContaining({
        quantity: '5',
        sequenceNum: '30',
      })
    );
  });
});
