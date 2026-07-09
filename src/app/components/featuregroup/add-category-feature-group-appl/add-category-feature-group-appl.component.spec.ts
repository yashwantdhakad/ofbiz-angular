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
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { AddCategoryFeatureGroupApplComponent } from './add-category-feature-group-appl.component';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { FeatureGroupService } from '@ofbiz/services/featuregroup/feature-group.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

describe('AddCategoryFeatureGroupApplComponent', () => {
  let component: AddCategoryFeatureGroupApplComponent;
  let fixture: ComponentFixture<AddCategoryFeatureGroupApplComponent>;
  let categoryService: jasmine.SpyObj<CategoryService>;
  let featureGroupService: jasmine.SpyObj<FeatureGroupService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddCategoryFeatureGroupApplComponent>>;

  const dialogData = {
    featureGroupCategoryData: {
      productFeatureGroupId: 'FG001',
      productCategoryId: 'CAT001',
      applTypeEnumId: 'PfatStandard',
      fromDate: '', // for create
    },
  };

  beforeEach(async () => {
    const categorySpy = jasmine.createSpyObj('CategoryService', ['getCategories']);
    const featureGroupSpy = jasmine.createSpyObj('FeatureGroupService', [
      'createProductCategoryFeatGrpAppl',
      'updateProductCategoryFeatGrpAppl',
    ]);
    const commonSpy = jasmine.createSpyObj('CommonService', ['getEnumTypes']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const dialogSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));

    await TestBed.configureTestingModule({
      declarations: [AddCategoryFeatureGroupApplComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: CategoryService, useValue: categorySpy },
        { provide: FeatureGroupService, useValue: featureGroupSpy },
        { provide: CommonService, useValue: commonSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatDialogRef, useValue: dialogSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: TranslateService, useValue: translateSpy },
      ],
    })
      .overrideTemplate(AddCategoryFeatureGroupApplComponent, '')
      .compileComponents();

    categoryService = TestBed.inject(CategoryService) as jasmine.SpyObj<CategoryService>;
    featureGroupService = TestBed.inject(FeatureGroupService) as jasmine.SpyObj<FeatureGroupService>;
    commonService = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<AddCategoryFeatureGroupApplComponent>>;
  });

  beforeEach(() => {
    commonService.getEnumTypes.and.returnValue(of([]));
    categoryService.getCategories.and.returnValue(of({ body: [] }));
    fixture = TestBed.createComponent(AddCategoryFeatureGroupApplComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with provided data', () => {
    const form = component.categoryFeatureGroupApplForm;
    expect(form.get('productFeatureGroupId')?.value).toBe('FG001');
    expect(form.get('productCategoryId')?.value).toBe('CAT001');
    expect(form.get('applTypeEnumId')?.value).toBe('PfatStandard');
  });

  it('should call getEnumTypes on init', () => {
    commonService.getEnumTypes.and.returnValue(of([{ enumId: 'PfatStandard' }]));
    component.loadEnumTypes();
    expect(commonService.getEnumTypes).toHaveBeenCalledWith('ProductFeatureApplType');
  });

  it('should handle getEnumTypes error', () => {
    commonService.getEnumTypes.and.returnValue(throwError(() => new Error('Enum error')));
    component.loadEnumTypes();
    expect(component.enumTypes()).toEqual([]);
  });

  it('should show an error and return empty category list when lookup fails', fakeAsync(() => {
    let result: any[] | undefined;
    categoryService.getCategories.and.returnValue(throwError(() => new Error('Lookup failed')));

    component.ngOnInit();
    component.filteredCategories$.subscribe((res) => {
      result = res;
    });
    component.categoryFeatureGroupApplForm.get('productCategoryId')?.setValue('Electronics');
    tick(301);

    expect(result).toEqual([]);
    expect(snackbarService.showError).toHaveBeenCalledWith('CATEGORY.FETCH_ERROR');
  }));

  it('should call createProductCategoryFeatGrpAppl and close dialog on success', fakeAsync(() => {
    featureGroupService.createProductCategoryFeatGrpAppl.and.returnValue(of({}));
    component.createProductCategoryFeatGrpAppl();
    tick();

    expect(featureGroupService.createProductCategoryFeatGrpAppl).toHaveBeenCalled();
    expect(snackbarService.showSuccess).toHaveBeenCalledWith(
      'FEATUREGROUP.APPLICATION_CREATE_SUCCESS'
    );
    expect(dialogRef.close).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));

  it('should call updateProductCategoryFeatGrpAppl and close dialog on success', fakeAsync(() => {
    // Simulate update by setting id (component checks id to choose update flow)
    component.categoryFeatureGroupApplForm.get('id')?.setValue('ID-1');
    featureGroupService.updateProductCategoryFeatGrpAppl.and.returnValue(of({}));

    component.createProductCategoryFeatGrpAppl();
    tick();

    expect(featureGroupService.updateProductCategoryFeatGrpAppl).toHaveBeenCalled();
    expect(snackbarService.showSuccess).toHaveBeenCalledWith(
      'FEATUREGROUP.APPLICATION_UPDATE_SUCCESS'
    );
    expect(dialogRef.close).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle error in create/update flow', fakeAsync(() => {
    featureGroupService.createProductCategoryFeatGrpAppl.and.returnValue(
      throwError(() => new Error('Create Error'))
    );

    component.createProductCategoryFeatGrpAppl();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith(
      'FEATUREGROUP.APPLICATION_SAVE_ERROR'
    );
    expect(component.isLoading()).toBeFalse();
  }));

  it('should return empty array if category input is empty', fakeAsync(() => {
    categoryService.getCategories.and.returnValue(of({ body: [] }));

    component.ngOnInit();
    const control = component.categoryFeatureGroupApplForm.get('productCategoryId');
    control?.setValue('');
    tick(300);

    component.filteredCategories$.subscribe((result) => {
      expect(result).toEqual([]);
    });
  }));

  it('should return filtered categories for valid input', fakeAsync(() => {
    categoryService.getCategories.and.returnValue(of({ body: [{ productCategoryId: 'CAT100' }] }));

    component.ngOnInit();
    const control = component.categoryFeatureGroupApplForm.get('productCategoryId');
    component.filteredCategories$.subscribe((result) => {
      if (result.length) {
        expect(result).toHaveSize(1);
        expect(result[0].productCategoryId).toBe('CAT100');
      }
    });
    control?.setValue('Electronics');
    tick(301);
  }));

  it('should normalize category id on create and expose display helper branches', fakeAsync(() => {
    component.categoryFeatureGroupApplForm.patchValue({
      productCategoryId: { productCategoryId: 'CAT200', categoryName: 'Hardware' },
    });
    featureGroupService.createProductCategoryFeatGrpAppl.and.returnValue(of({}));

    component.createProductCategoryFeatGrpAppl();
    tick();

    expect(featureGroupService.createProductCategoryFeatGrpAppl).toHaveBeenCalledWith(
      jasmine.objectContaining({ productCategoryId: 'CAT200' })
    );
    expect(component.displayCategory(null)).toBe('');
    expect(component.displayCategory('CAT200')).toBe('CAT200');
    expect(component.displayCategory({ categoryName: 'Hardware', productCategoryId: 'CAT200' })).toBe('Hardware');
    expect(component.displayCategory({ productCategoryId: 'CAT200' })).toBe('CAT200');
  }));

  it('should not submit when form is invalid', () => {
    component.categoryFeatureGroupApplForm.patchValue({
      productCategoryId: null,
    });

    component.createProductCategoryFeatGrpAppl();

    expect(featureGroupService.createProductCategoryFeatGrpAppl).not.toHaveBeenCalled();
    expect(featureGroupService.updateProductCategoryFeatGrpAppl).not.toHaveBeenCalled();
  });
});
