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
import { TestBed } from '@angular/core/testing';
import { CategoryService } from './category.service';
import { ApiService } from '../common/api.service';
import { of } from 'rxjs';

describe('CategoryService', () => {
  let service: CategoryService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [
        CategoryService,
        { provide: ApiService, useValue: spy }
      ]
    });

    service = TestBed.inject(CategoryService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call getCategories with correct URL and params', () => {
    const apiResponse = {
      data: {
        resultList: [{ productCategoryId: 'CAT01' }],
        documentListCount: 10,
      },
    };

    apiServiceSpy.get.and.returnValue(of(apiResponse));

    const pageIndex = 0;
    const keyword = 'electronics';

    service.getCategories(pageIndex, keyword).subscribe((res) => {
      expect(res).toEqual({
        resultList: [{ productCategoryId: 'CAT01' }],
        totalCount: 10,
      });
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith(
      '/common/categories?page=0&query=electronics&categoryName=electronics'
    );
  });

  it('should call createCategory with correct payload', () => {
    const params = { categoryName: 'New Category' };
    const mockResponse = { productCategoryId: 'CAT02' };

    apiServiceSpy.post.and.returnValue(of({ data: mockResponse }));

    service.createCategory(params).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/categories', params);
  });

  it('should call getCategory with correct ID', () => {
    const mockCategory = { productCategoryId: 'CAT01' };
    apiServiceSpy.get.and.returnValue(of({ data: mockCategory }));

    service.getCategory('CAT01').subscribe((res) => {
      expect(res).toEqual(mockCategory);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/categories/CAT01');
  });

  it('should update category', () => {
    const params = { productCategoryId: 'CAT01' };
    const res = { ok: true };
    apiServiceSpy.put.and.returnValue(of({ data: res }));
    service.updateCategory(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/categories/CAT01', params);
  });

  it('should add product to category', () => {
    const params = { productId: 'P1' };
    const res = { ok: true };
    apiServiceSpy.post.and.returnValue(of({ data: res }));
    service.addProductToCategory(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/products/P1/categories', params);
  });

  it('should delete product category', () => {
    const params = { productId: 'P1', productCategoryId: 'C1' };
    const res = { ok: true };
    apiServiceSpy.delete.and.returnValue(of({ data: res }));
    service.deleteProductCategory(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/products/P1/categories/C1');
  });
});
