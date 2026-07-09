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
import { CategoryComponent } from './category.component';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

describe('CategoryComponent', () => {
  let component: CategoryComponent;
  let fixture: ComponentFixture<CategoryComponent>;
  let categoryService: jasmine.SpyObj<CategoryService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let commonService: jasmine.SpyObj<CommonService>;

  const response = {
    resultList: [{ productCategoryId: 'CAT1', categoryName: 'Electronics', productCategoryTypeId: 'PctCatalog' }],
    totalCount: 1,
  };

  beforeEach(async () => {
    const categorySpy = jasmine.createSpyObj('CategoryService', ['getCategories']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError']);
    const commonSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);
    renderSchedulerSpy.deferMacrotask.and.callFake((task: () => void) => task());

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [CategoryComponent],
      providers: [
        { provide: CategoryService, useValue: categorySpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: CommonService, useValue: commonSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    categoryService = TestBed.inject(CategoryService) as jasmine.SpyObj<CategoryService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    commonService = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CategoryComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should load category types and categories on init', fakeAsync(() => {
    commonService.getLookupResults.and.returnValue(
      of([{ productCategoryTypeId: 'PctCatalog', description: 'Catalog Category' }])
    );
    categoryService.getCategories.and.returnValue(of(response));
    fixture.detectChanges();
    tick(300);

    expect(commonService.getLookupResults).toHaveBeenCalledWith({}, 'product_category_type');
    expect(component.items()).toHaveSize(1);
    expect(component.pages()).toBe(1);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle error in getCategories', fakeAsync(() => {
    commonService.getLookupResults.and.returnValue(of([]));
    categoryService.getCategories.and.returnValue(throwError(() => new Error('API failure')));
    fixture.detectChanges();
    tick(300);

    expect(snackbarService.showError).toHaveBeenCalledWith('CATEGORY.FETCH_CATEGORIES_ERROR');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should update queryString and call getCategories on search', fakeAsync(() => {
    commonService.getLookupResults.and.returnValue(of([]));
    categoryService.getCategories.and.returnValue(of(response));
    fixture.detectChanges();
    component.searchControl.setValue('Test');
    tick(300);

    expect(categoryService.getCategories).toHaveBeenCalledWith(0, 'Test', undefined, undefined);
  }));

  it('should handle page change', fakeAsync(() => {
    commonService.getLookupResults.and.returnValue(of([]));
    categoryService.getCategories.and.returnValue(of(response));
    fixture.detectChanges();
    tick(300);
    categoryService.getCategories.calls.reset();

    component.queryString = 'food';
    component.onPageChange(1);
    tick();

    expect(categoryService.getCategories).toHaveBeenCalledWith(1, 'food', undefined, undefined);
  }));

  it('should toggle sorting and request sorted data', fakeAsync(() => {
    commonService.getLookupResults.and.returnValue(of([]));
    categoryService.getCategories.and.returnValue(of(response));
    fixture.detectChanges();
    tick(300);
    categoryService.getCategories.calls.reset();

    component.pagination.page = 2;
    component.queryString = 'home';
    component.onSortChange({ active: 'categoryName', direction: '' });
    tick();
    expect(component.currentSort).toEqual({ active: 'categoryName', direction: 'asc' });
    expect(categoryService.getCategories).toHaveBeenCalledWith(1, 'home', 'categoryName', 'asc');

    component.onSortChange({ active: 'categoryName', direction: '' });
    tick();
    expect(component.currentSort).toEqual({ active: 'categoryName', direction: 'desc' });
    expect(categoryService.getCategories).toHaveBeenCalledWith(1, 'home', 'categoryName', 'desc');
  }));

  it('should return correct column keys', () => {
    const keys = component.getColumnKeys();
    expect(keys).toEqual(['productCategoryId', 'categoryName', 'productCategoryTypeId']);
  });

  it('should map category type id to description in getValue', () => {
    component.categoryTypeMap.set(new Map([['PctCatalog', 'Catalog Category']]));
    const value = component.getValue({ productCategoryTypeId: 'PctCatalog' }, 'productCategoryTypeId');
    expect(value).toBe('Catalog Category');
  });
});
