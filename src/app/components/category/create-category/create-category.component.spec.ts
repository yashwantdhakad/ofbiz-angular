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
import { CreateCategoryComponent } from './create-category.component';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

describe('CreateCategoryComponent', () => {
  let component: CreateCategoryComponent;
  let fixture: ComponentFixture<CreateCategoryComponent>;
  let categoryServiceSpy: jasmine.SpyObj<CategoryService>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const categorySpy = jasmine.createSpyObj('CategoryService', ['createCategory']);
    const commonSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    const routerMock = jasmine.createSpyObj('Router', ['navigate']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateSpy.instant.and.callFake((key: string) => {
      const map: Record<string, string> = {
        'CATEGORY.FETCH_TYPES_ERROR': 'Error fetching category types.',
        'CATEGORY.CREATED_SUCCESS': 'Category created successfully.',
        'CATEGORY.ERROR_CREATE': 'Error creating category.',
      };
      return map[key] ?? key;
    });

    await TestBed.configureTestingModule({
      declarations: [CreateCategoryComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: CategoryService, useValue: categorySpy },
        { provide: CommonService, useValue: commonSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: Router, useValue: routerMock },
        { provide: TranslateService, useValue: translateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateCategoryComponent);
    component = fixture.componentInstance;
    categoryServiceSpy = TestBed.inject(CategoryService) as jasmine.SpyObj<CategoryService>;
    commonServiceSpy = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
    snackbarServiceSpy = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch category types on init', () => {
    const enumTypes = [{ productCategoryTypeId: 'CATALOG_CATEGORY', description: 'Catalog' }];
    commonServiceSpy.getLookupResults.and.returnValue(of(enumTypes));

    component.ngOnInit();

    expect(commonServiceSpy.getLookupResults).toHaveBeenCalledWith({}, 'product_category_type');
    expect(component.categoryTypes()).toEqual(enumTypes);
  });

  it('should handle error when fetching category types', () => {
    commonServiceSpy.getLookupResults.and.returnValue(throwError(() => new Error('API Error')));

    component.ngOnInit();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('Error fetching category types.');
  });

  it('should not create category if form is invalid', () => {
    component.categoryForm.controls['categoryName'].setValue(''); // required
    component.createCategory();

    expect(categoryServiceSpy.createCategory).not.toHaveBeenCalled();
  });

  it('should create category successfully', () => {
    const formData = {
      categoryName: 'Electronics',
      productCategoryTypeId: 'CATALOG_CATEGORY',
      primaryParentCategoryId: '',
      description: 'Gadgets',
    };

    component.categoryForm.setValue(formData);

    categoryServiceSpy.createCategory.and.returnValue(of({ productCategoryId: 'CAT1001' }));

    component.createCategory();

    expect(categoryServiceSpy.createCategory).toHaveBeenCalledWith(formData);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/category/CAT1001']);
    expect(snackbarServiceSpy.showSuccess).toHaveBeenCalledWith('Category created successfully.');
  });

  it('should show error if category creation fails', () => {
    const formData = {
      categoryName: 'Books',
      productCategoryTypeId: 'CATALOG_CATEGORY',
      primaryParentCategoryId: '',
      description: '',
    };

    component.categoryForm.setValue(formData);

    categoryServiceSpy.createCategory.and.returnValue(throwError(() => new Error('Creation error')));

    component.createCategory();

    expect(snackbarServiceSpy.showError).toHaveBeenCalledWith('Error creating category.');
  });
});
