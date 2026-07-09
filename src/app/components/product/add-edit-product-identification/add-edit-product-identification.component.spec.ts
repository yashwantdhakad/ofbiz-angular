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
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { AddEditProductIdentificationComponent } from './add-edit-product-identification.component';

describe('AddEditProductIdentificationComponent', () => {
  let component: AddEditProductIdentificationComponent;
  let fixture: ComponentFixture<AddEditProductIdentificationComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddEditProductIdentificationComponent>>;
  let productService: jasmine.SpyObj<ProductService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let translate: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    productService = jasmine.createSpyObj('ProductService', [
      'getGoodIdentificationTypes',
      'createGoodIdentification',
      'updateGoodIdentification',
    ]);
    snackbarService = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translate = jasmine.createSpyObj('TranslateService', ['instant']);
    translate.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      declarations: [AddEditProductIdentificationComponent],
      providers: [
        FormBuilder,
        { provide: ProductService, useValue: productService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: TranslateService, useValue: translate },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { identificationData: { productId: 'PROD-1' } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddEditProductIdentificationComponent, { set: { template: '' } })
      .compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(AddEditProductIdentificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('loads identification types and falls back to empty on error', () => {
    productService.getGoodIdentificationTypes.and.returnValues(
      of([{ enumId: 'SKU' }] as any),
      throwError(() => new Error('load failed'))
    );

    createComponent();
    expect(component.idTypes).toEqual([{ enumId: 'SKU' }] as any);

    component.ngOnInit();
    expect(component.idTypes).toEqual([]);
  });

  it('marks invalid forms touched and blocks duplicate save while isSaving is true', () => {
    productService.getGoodIdentificationTypes.and.returnValue(of([] as any));
    createComponent();
    spyOn(component.form, 'markAllAsTouched');
    component.isSaving.set(true);

    component.save();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(productService.createGoodIdentification).not.toHaveBeenCalled();
  });

  it('creates an identification and closes with success feedback', () => {
    productService.getGoodIdentificationTypes.and.returnValue(of([] as any));
    productService.createGoodIdentification.and.returnValue(of({ id: 11 } as any));
    createComponent();
    component.form.patchValue({
      productId: 'PROD-1',
      goodIdentificationTypeId: 'SKU',
      idValue: 'ABC-123',
    });
    component.isSaving.set(false);

    component.save();

    expect(productService.createGoodIdentification).toHaveBeenCalledWith(
      jasmine.objectContaining({ productId: 'PROD-1', goodIdentificationTypeId: 'SKU', idValue: 'ABC-123' })
    );
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('PRODUCT.IDENTIFICATION_ADDED_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 11 });
  });

  it('updates an identification and shows error feedback on failure', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [AddEditProductIdentificationComponent],
      providers: [
        FormBuilder,
        { provide: ProductService, useValue: productService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: TranslateService, useValue: translate },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            identificationData: {
              id: 5,
              productId: 'PROD-1',
              goodIdentificationTypeId: 'UPC',
              idValue: 'OLD',
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddEditProductIdentificationComponent, { set: { template: '' } })
      .compileComponents();

    productService.getGoodIdentificationTypes.and.returnValue(of([] as any));
    productService.updateGoodIdentification.and.returnValue(throwError(() => new Error('update failed')));

    fixture = TestBed.createComponent(AddEditProductIdentificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.form.patchValue({ idValue: 'NEW' });

    component.save();

    expect(productService.updateGoodIdentification).toHaveBeenCalledWith(
      5,
      jasmine.objectContaining({ id: 5, idValue: 'NEW' })
    );
    expect(snackbarService.showError).toHaveBeenCalledWith('PRODUCT.IDENTIFICATION_UPDATED_ERROR');
    expect(component.isSaving()).toBeFalse();
  });

  it('closes with false when cancelled', () => {
    productService.getGoodIdentificationTypes.and.returnValue(of([] as any));
    createComponent();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
