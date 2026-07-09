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
import { Injectable } from '@angular/core';
import { ApiService } from '../common/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  constructor(private apiService: ApiService) {}

  getCategories(pageIndex: number, keyword: string, sortBy?: string, sortDirection?: string): Observable<any> {
    const params = new URLSearchParams();
    params.set('page', pageIndex.toString());
    if (keyword) {
      params.set('query', keyword);
      params.set('categoryName', keyword);
    }
    if (sortBy) {
      params.set('sortBy', sortBy);
    }
    if (sortDirection) {
      params.set('sortDirection', sortDirection);
    }

    return this.apiService.get<any>(`/common/categories?${params.toString()}`).pipe(
      map((response: any) => ({
        resultList: Array.isArray(response?.data?.resultList) ? response.data.resultList : [],
        totalCount: response?.data?.documentListCount ?? response?.data?.totalCount ?? 0,
      }))
    );
  }

  createCategory(params: any): Observable<any> {
    return this.apiService.post<any>('/common/categories', params).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  updateCategory(params: any): Observable<any> {
    const url = `/common/categories/${encodeURIComponent(params.productCategoryId)}`;
    return this.apiService.put<any>(url, params).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  getCategory(categoryId: string): Observable<any> {
    const url = `/common/categories/${encodeURIComponent(categoryId)}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  addProductToCategory(params: any): Observable<any> {
    const url = `/common/products/${encodeURIComponent(params.productId)}/categories`;
    return this.apiService.post(url, params).pipe(
      map((response: any) => response?.data ?? response)
    );
  }

  deleteProductCategory(params: any): Observable<any> {
    const url = `/common/products/${encodeURIComponent(params.productId)}/categories/${encodeURIComponent(params.productCategoryId)}`;
    return this.apiService.delete(url).pipe(
      map((response: any) => response?.data ?? response)
    );
  }
}
