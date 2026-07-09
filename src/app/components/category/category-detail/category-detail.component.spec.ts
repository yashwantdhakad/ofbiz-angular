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
import { of, throwError, Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CategoryService } from '@ofbiz/services/category/category.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CategoryDetailComponent } from './category-detail.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AddEditProductComponent } from '../add-edit-product/add-edit-product.component';
import { EditCategoryComponent } from '../edit-category/edit-category.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { TranslateService } from '@ngx-translate/core';

describe('CategoryDetailComponent', () => {
  let component: CategoryDetailComponent;
  let fixture: ComponentFixture<CategoryDetailComponent>;
  let categoryService: jasmine.SpyObj<CategoryService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let routeSubject: Subject<any>;

  const categoryResponse = {
    category: {
      productCategoryId: 'CAT123',
      productCategoryTypeId: 'CATALOG_CATEGORY',
      categoryName: 'Electronics'
    },
    products: [{ productId: 'P1', product: { productName: 'Phone' } }],
  };

  beforeEach(async () => {
    const categorySpy = jasmine.createSpyObj('CategoryService', ['getCategory', 'deleteProductCategory']);
    const commonSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));
    routeSubject = new Subject();

    categorySpy.getCategory.and.returnValue(of(categoryResponse));
    categorySpy.deleteProductCategory.and.returnValue(of(undefined));
    commonSpy.getLookupResults.and.returnValue(of([
      { productCategoryTypeId: 'CATALOG_CATEGORY', description: 'Catalog Category' }
    ]));

    await TestBed.configureTestingModule({
      declarations: [CategoryDetailComponent],
      providers: [
        { provide: CategoryService, useValue: categorySpy },
        { provide: CommonService, useValue: commonSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: ActivatedRoute, useValue: { params: routeSubject.asObservable() } },
        { provide: TranslateService, useValue: translateServiceSpy },
        DatePipe,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(CategoryDetailComponent, '')
      .compileComponents();

    categoryService = TestBed.inject(CategoryService) as jasmine.SpyObj<CategoryService>;
    commonService = TestBed.inject(CommonService) as jasmine.SpyObj<CommonService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CategoryDetailComponent);
    component = fixture.componentInstance;
  });

  function mockDialogClose(result: any) {
    dialog.open.and.returnValue({ afterClosed: () => of(result) } as any);
  }

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load category detail and products from the route category id', fakeAsync(() => {
    fixture.detectChanges();
    routeSubject.next({ productCategoryId: 'CAT123' });
    tick();

    expect(categoryService.getCategory).toHaveBeenCalledWith('CAT123');
    expect(commonService.getLookupResults).toHaveBeenCalledWith({}, 'product_category_type');
    expect(component.productCategoryId).toBe('CAT123');
    expect(component.categoryDetail()?.productCategoryId).toBe('CAT123');
    expect(component.categoryTypeLabel()).toBe('Catalog Category');
    expect(component.products()).toHaveSize(1);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle error in getCategory', fakeAsync(() => {
    categoryService.getCategory.and.returnValue(throwError(() => new Error('Failed')));

    component.getCategory('CAT123');
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('CATEGORY.FETCH_PRODUCTS_ERROR');
    expect(component.categoryDetail()).toBeNull();
    expect(component.products()).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should open addProductToCategoryDialog and refresh silently on success', () => {
    component.productCategoryId = 'CAT123';
    const getCategorySpy = spyOn(component, 'getCategory');
    mockDialogClose({ productCategoryId: 'CAT123' });

    component.addProductToCategoryDialog({ productId: 'P1' });

    expect(dialog.open).toHaveBeenCalledWith(AddEditProductComponent, {
      data: {
        categoryProductData: {
          productId: 'P1',
          productCategoryId: 'CAT123',
        },
      },
    });
    expect(getCategorySpy).toHaveBeenCalledWith('CAT123', false);
  });

  it('should open editCategoryDialog and refresh silently on success', () => {
    component.categoryDetail.set({ productCategoryId: 'CAT123', categoryName: 'Electronics' });
    const getCategorySpy = spyOn(component, 'getCategory');
    mockDialogClose({ productCategoryId: 'CAT123' });

    component.editCategoryDialog();

    expect(dialog.open).toHaveBeenCalledWith(EditCategoryComponent, {
      data: { categoryDetail: { productCategoryId: 'CAT123', categoryName: 'Electronics' } },
    });
    expect(getCategorySpy).toHaveBeenCalledWith('CAT123', false);
  });

  it('should delete a category product after confirmation and show success', fakeAsync(() => {
    component.productCategoryId = 'CAT123';
    const getCategorySpy = spyOn(component, 'getCategory');
    mockDialogClose(true);

    component.deleteProductCategoryDialog({ productCategoryId: 'CAT123', productId: 'P1' });
    tick();

    expect(dialog.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      data: {
        title: 'CATEGORY.DELETE_PRODUCT_TITLE',
        message: 'CATEGORY.DELETE_PRODUCT_MESSAGE',
      },
    });
    expect(categoryService.deleteProductCategory).toHaveBeenCalledWith({ productCategoryId: 'CAT123', productId: 'P1' });
    expect(getCategorySpy).toHaveBeenCalledWith('CAT123', false);
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('CATEGORY.PRODUCT_DELETED_SUCCESS');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle deleteProductCategoryDialog service error', fakeAsync(() => {
    mockDialogClose(true);
    categoryService.deleteProductCategory.and.returnValue(throwError(() => new Error('error')));

    component.deleteProductCategoryDialog({ productCategoryId: 'CAT123' });
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('CATEGORY.PRODUCT_DELETED_ERROR');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle delete confirmation dialog error', fakeAsync(() => {
    dialog.open.and.returnValue({
      afterClosed: () => throwError(() => new Error('confirm failed'))
    } as any);

    component.deleteProductCategoryDialog({ productCategoryId: 'CAT123' });
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('CATEGORY.DELETE_CONFIRM_ERROR');
  }));

  it('should not delete if confirmation is cancelled', fakeAsync(() => {
    mockDialogClose(false);

    component.deleteProductCategoryDialog({ productCategoryId: 'CAT123' });
    tick();

    expect(categoryService.deleteProductCategory).not.toHaveBeenCalled();
  }));

  it('should return product column keys and current date time', () => {
    const keys = component.getProductColumnKeys();
    expect(keys).toEqual(['productId', 'product.productName', 'fromDate', 'sequenceNum', 'action']);
    expect(typeof component.getCurrentDateTime()).toBe('string');
  });

  it('should return correct values for dot notation keys in getValue', () => {
    const product = {
      productId: 'P1',
      product: { productName: 'Sample' },
    };

    expect(component.getValue(product, 'product.productName')).toBe('Sample');
    expect(component.getValue(product, 'product.missingKey')).toBe('');
    expect(component.getValue(product, 'missing')).toBe('');
  });
});
