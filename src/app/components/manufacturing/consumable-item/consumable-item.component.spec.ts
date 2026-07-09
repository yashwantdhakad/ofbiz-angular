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
import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { ConsumableItemComponent } from './consumable-item.component';

describe('ConsumableItemComponent', () => {
  let component: ConsumableItemComponent;
  let fixture: ComponentFixture<ConsumableItemComponent>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;
  let productService: jasmine.SpyObj<ProductService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ConsumableItemComponent>>;

  beforeEach(async () => {
    manufacturingService = jasmine.createSpyObj('ManufacturingService', ['addConsumable', 'updateConsumable']);
    productService = jasmine.createSpyObj('ProductService', ['getProductsAutocompleteFromOms']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    manufacturingService.addConsumable.and.returnValue(of({}));
    manufacturingService.updateConsumable.and.returnValue(of({}));
    productService.getProductsAutocompleteFromOms.and.returnValue(of({ documentList: [{ productId: 'RM_100' }] }));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [ConsumableItemComponent],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: ProductService, useValue: productService },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            consumableData: {
              workEffortId: 'JOB_1',
              productId: '',
              estimatedQuantity: '2',
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsumableItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not add consumable when form is invalid', () => {
    component.addConsumableForm.patchValue({ productId: '' });
    component.addConsumable();
    expect(manufacturingService.addConsumable).not.toHaveBeenCalled();
  });

  it('should call addConsumable and close dialog on success', () => {
    component.addConsumableForm.patchValue({
      workEffortId: 'JOB_1',
      productId: 'RM_100',
      estimatedQuantity: '5',
    });

    component.addConsumable();

    expect(manufacturingService.addConsumable).toHaveBeenCalledWith('JOB_1', {
      productId: 'RM_100',
      estimatedQuantity: '5',
    });
    expect(dialogRef.close).toHaveBeenCalledWith({
      productId: 'RM_100',
      estimatedQuantity: '5',
    });
  });

  it('should reject a non-positive quantity and clear loading after a save failure', () => {
    component.addConsumableForm.patchValue({
      productId: 'RM_100',
      estimatedQuantity: 0,
    });
    component.addConsumable();
    expect(manufacturingService.addConsumable).not.toHaveBeenCalled();

    manufacturingService.addConsumable.and.returnValue(throwError(() => new Error('save failed')));
    component.addConsumableForm.patchValue({ estimatedQuantity: 2 });
    component.addConsumable();

    expect(component.isLoading()).toBeFalse();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should update an existing consumable using its line id', () => {
    const snackbarService = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showError']);
    const translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    const cdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck']);
    const editComponent = new ConsumableItemComponent(
      dialogRef,
      {
        consumableData: {
          workEffortId: 'JOB_1',
          id: 42,
          productId: 'RM_100',
          estimatedQuantity: 3,
        },
      },
      TestBed.inject(FormBuilder),
      manufacturingService,
      productService,
      snackbarService,
      translateService,
      cdr
    );
    editComponent.ngOnInit();
    editComponent.addConsumableForm.patchValue({ estimatedQuantity: 4 });

    editComponent.addConsumable();

    expect(editComponent.addConsumableForm.get('productId')?.disabled).toBeTrue();
    expect(manufacturingService.updateConsumable).toHaveBeenCalledWith('JOB_1', 42, {
      productId: 'RM_100',
      estimatedQuantity: 4,
    });
  });
});
