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
import { base64ToBlob } from '../common/blob.util';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DeleteProductPricePayload,
  ProductAssocTypeOption,
  ProductAutocompleteItem,
  ProductContentDialogData,
  ProductDetail,
  ProductDetailResponse,
  ProductIdentification,
  ProductIdentificationType,
  ProductListResponse,
  ProductShippingConfig,
  ProductSummary,
  ProductUpdatePayload,
} from '@ofbiz/models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(private apiService: ApiService) {}

  getProducts(pageIndex: number, keyword: string, sortBy?: string, sortDirection?: string): Observable<ProductListResponse<ProductSummary>> {
    const params = new URLSearchParams({
      page: pageIndex.toString(),
      query: keyword || '',
    });
    if (sortBy) {
      params.append('sortBy', sortBy);
    }
    if (sortDirection) {
      params.append('sortDirection', sortDirection);
    }
    const url = `/common/products?${params.toString()}`;
    return this.apiService.get<{ data?: ProductListResponse<ProductSummary> }>(url).pipe(
      map((response) => {
        const payload = response?.data;
        const list = Array.isArray(payload?.documentList) ? payload.documentList : [];
        const mappedList = list.map((item) => ({
          ...item,
          name: item?.productName || item?.name || item?.productId,
        }));
        return {
          ...(payload ?? {}),
          documentList: mappedList,
        } as ProductListResponse<ProductSummary>;
      })
    );
  }

  getProductsAutocompleteFromOms(keyword: string, limit: number = 20): Observable<ProductListResponse<ProductAutocompleteItem>> {
    const params = new URLSearchParams({
      query: keyword || '',
      limit: String(limit),
    });
    const url = `/common/intra/products/autocomplete?${params.toString()}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => {
        const data = response?.data ?? {};
        const list = Array.isArray(data?.documentList) ? data.documentList : [];
        const mappedList = list.map((item: any) => ({
          ...item,
          name: item?.productName || item?.name || item?.productId,
        }));
        return {
          ...data,
          documentList: mappedList,
        };
      })
    );
  }

  getProductsByIds(productIds: string[]): Observable<ProductSummary[]> {
    const uniqueIds = Array.from(new Set((productIds || []).filter((id) => !!id)));
    if (uniqueIds.length === 0) {
      return of([]);
    }
    const url = `/common/products?productIds=${encodeURIComponent(uniqueIds.join(','))}`;
    return this.apiService.get<{ data?: ProductListResponse<ProductSummary> }>(url).pipe(
      map((response) => {
        const payload = response?.data;
        const list = Array.isArray(payload?.documentList) ? payload.documentList : [];
        return list.map((item) => ({
          ...item,
          name: item?.productName || item?.name || item?.productId,
        }));
      })
    );
  }

  createProduct(params: any): Observable<any> {
    return this.apiService.post<{ data?: any }>('/common/products', params).pipe(
      map((response) => response?.data ?? {})
    );
  }

  getProduct(productId: string): Observable<ProductDetailResponse> {
    const url = `/common/products/${encodeURIComponent(productId)}`;
    return this.apiService.get<{ data?: ProductDetailResponse }>(url).pipe(
      map((response) => response?.data ?? {})
    );
  }

  getInventorySummary(productId: string): Observable<any[]> {
    const url = `/inventory-items/summary?productId=${encodeURIComponent(productId)}`;
    return this.apiService.getWms<any[]>(url);
  }

  updateProduct(params: ProductUpdatePayload | ProductDetail): Observable<ProductDetail> {
    const productId = params.productId ?? '';
    const url = `/common/products/${encodeURIComponent(productId)}`;
    return this.apiService.put<{ data?: ProductDetail }>(url, params).pipe(
      map((response) => (response?.data ?? {}) as ProductDetail)
    );
  }

  getProductShippingConfig(productId: string): Observable<ProductShippingConfig> {
    const url = `/common/products/${encodeURIComponent(productId)}/shipping-config`;
    return this.apiService.get<any>(url).pipe(
      map((res) => res?.data ?? {})
    );
  }

  upsertProductShippingConfig(productId: string, payload: ProductShippingConfig): Observable<ProductShippingConfig> {
    const url = `/common/products/${encodeURIComponent(productId)}/shipping-config`;
    return this.apiService.put<any>(url, payload).pipe(
      map((res) => res?.data ?? {})
    );
  }

  addProductPrice(params: any): Observable<any> {
    const url = `/common/products/${encodeURIComponent(params.productId)}/prices`;
    return this.apiService.post<any>(url, params).pipe(
      map((res) => res?.data ?? {})
    );
  }

  deleteProductPrice(params: DeleteProductPricePayload): Observable<unknown> {
    const url = `/common/products/${encodeURIComponent(params.productId)}/prices/${encodeURIComponent(params.productPriceId)}`;
    return this.apiService.delete<any>(url).pipe(
      map((res) => res?.data ?? {})
    );
  }

  updateProductPrice(params: any): Observable<any> {
    const url = `/common/products/${encodeURIComponent(params.productId)}/prices/${encodeURIComponent(params.productPriceId)}`;
    return this.apiService.put<any>(url, params).pipe(
      map((res) => res?.data ?? {})
    );
  }

  addProductCategory(params: any): Observable<any> {
    const url = `/common/products/${encodeURIComponent(params.productId)}/categories`;
    return this.apiService.post<any>(url, params).pipe(
      map((res) => res?.data ?? {})
    );
  }

  deleteProductCategory(params: any): Observable<any> {
    const url = `/common/products/${encodeURIComponent(params.productId)}/categories/${encodeURIComponent(params.productCategoryId)}`;
    return this.apiService.delete<any>(url).pipe(
      map((res) => res?.data ?? {})
    );
  }

  deleteProduct(productId: string): Observable<any> {
    const url = `/common/products/${encodeURIComponent(productId)}`;
    return this.apiService.delete<{ data?: any }>(url).pipe(
      map((response) => response?.data ?? {})
    );
  }

  createProductAssoc(params: any): Observable<any> {
    const url = `/common/products/${encodeURIComponent(params.productId)}/assocs`;
    return this.apiService.post<any>(url, params).pipe(
      map((res) => res?.data ?? {})
    );
  }

  createProductContent(productId: string, formData: FormData): Observable<ProductContentDialogData> {
    const url = `/common/products/${encodeURIComponent(productId)}/contents`;
    return this.apiService.postWmsFormData(url, formData);
  }

  downloadProductContent(productId: string, contentId: string): Observable<Blob> {
    const url = `/common/products/${encodeURIComponent(productId)}/contents/${encodeURIComponent(contentId)}`;
    return this.apiService.get<any>(url).pipe(
      map((response: any) => base64ToBlob(
        response?.data?.fileBytes,
        response?.data?.mimeType || 'application/octet-stream'
      ))
    );
  }

  getProductAssocTypes(): Observable<ProductAssocTypeOption[]> {
    return this.apiService.get<any>('/common/product-assoc-types').pipe(
      map((res) => {
        const items = Array.isArray(res?.data?.resultList) ? res.data.resultList : [];
        return items.map((item: any) => ({
          ...item,
          enumId: item?.enumId ?? item?.productAssocTypeId,
        }));
      })
    );
  }

  getGoodIdentifications(productId: string): Observable<ProductIdentification[]> {
    const url = `/common/good-identifications?productId=${encodeURIComponent(productId)}`;
    return this.apiService.get<any>(url).pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }

  createGoodIdentification(payload: ProductIdentification): Observable<ProductIdentification> {
    return this.apiService.post<any>('/common/good-identifications', payload).pipe(
      map((res) => res?.data ?? {})
    );
  }

  updateGoodIdentification(id: number, payload: ProductIdentification): Observable<ProductIdentification> {
    const url = `/common/good-identifications/${encodeURIComponent(String(id))}`;
    return this.apiService.put<any>(url, payload).pipe(
      map((res) => res?.data ?? {})
    );
  }

  deleteGoodIdentification(id: number): Observable<unknown> {
    const url = `/common/good-identifications/${encodeURIComponent(String(id))}`;
    return this.apiService.delete<any>(url).pipe(
      map((res) => res?.data ?? {})
    );
  }

  getGoodIdentificationTypes(): Observable<ProductIdentificationType[]> {
    return this.apiService.get<any>('/common/good-identification-types').pipe(
      map((res) => Array.isArray(res?.data?.resultList) ? res.data.resultList : [])
    );
  }
}
