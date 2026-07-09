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
import { EditCategoryComponent } from './edit-category.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

describe('EditCategoryComponent', () => {
  let component: EditCategoryComponent;
  let fixture: ComponentFixture<EditCategoryComponent>;
  let categoryServiceSpy: jasmine.SpyObj<CategoryService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<EditCategoryComponent>>;

  const mockData = {
    categoryDetail: {
      productCategoryId: 'CAT1001',
      productCategoryTypeId: 'CATALOG_CATEGORY',
      primaryParentCategoryId: '',
      categoryName: 'Electronics',
      description: 'Electronic items',
      longDescription: '',
    },
  };

  beforeEach(async () => {
    categoryServiceSpy = jasmine.createSpyObj('CategoryService', ['updateCategory']);
    snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [EditCategoryComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    })
      .overrideTemplate(EditCategoryComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create EditCategoryComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with provided data', () => {
    const formValue = component.updateCategoryForm.value;
    expect(formValue.productCategoryId).toBe(mockData.categoryDetail.productCategoryId);
    expect(formValue.categoryName).toBe(mockData.categoryDetail.categoryName);
    expect(formValue.description).toBe(mockData.categoryDetail.description);
  });

  it('should call updateCategory() and close dialog on success', fakeAsync(() => {
    categoryServiceSpy.updateCategory.and.returnValue(of({ success: true }));

    component.updateCategoryForm.setValue({
      productCategoryId: 'CAT1001',
      productCategoryTypeId: 'CATALOG_CATEGORY',
      primaryParentCategoryId: '',
      categoryName: 'Updated Name',
      description: 'Updated description',
      longDescription: '',
    });

    component.updateCategory();
    tick(); // simulate async

    expect(categoryServiceSpy.updateCategory).toHaveBeenCalled();
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('CATEGORY.UPDATED_SUCCESS');
    expect(dialogRefSpy.close).toHaveBeenCalledWith(jasmine.objectContaining({
      categoryName: 'Updated Name',
    }));
  }));

  it('should show error if updateCategory fails', fakeAsync(() => {
    categoryServiceSpy.updateCategory.and.returnValue(throwError(() => new Error('API error')));

    component.updateCategory();
    tick(); // simulate async

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('CATEGORY.UPDATED_ERROR');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  }));
});
