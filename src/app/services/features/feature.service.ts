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
import { HttpResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class FeatureService {
  constructor(private apiService: ApiService) { }

  getFeatures(pageIndex: number, keyword: string): Observable<HttpResponse<any>> {
    const params = {
      pageIndex: pageIndex.toString(),
      pageSize: '10',
      queryString: keyword,
    };
    const queryString = new URLSearchParams(params).toString();
    const url = `/product-features?${queryString}`;
    return this.apiService.customGetWms(url); // should return Observable<HttpResponse<any>>
  }

  getProductFeatureTypes(): Observable<any[]> {
    return this.apiService.getWms('/product-feature-types');
  }

  createFeature(params: any): Observable<any> {
    return this.apiService.postWms('/product-features', params);
  }

  getFeature(productFeatureId: string): Observable<any> {
    const url = `/product-features/by-id/${encodeURIComponent(productFeatureId)}`;
    return this.apiService.getWms(url);
  }

  updateFeature(params: any): Observable<any> {
    const url = `/product-features/by-id/${encodeURIComponent(params.productFeatureId)}`;
    return this.apiService.putWms(url, params);
  }

  createProductFeatureAppl(params: any): Observable<any> {
    return this.apiService.post(
      `/common/products/${encodeURIComponent(params.productId)}/features`,
      params
    );
  }

  updateProductFeatureAppl(params: any): Observable<any> {
    const url = `/common/products/${encodeURIComponent(params.productId)}/features/${encodeURIComponent(params.id)}`;
    return this.apiService.put(url, params);
  }

  createProductFeatureGroupAppl(params: any): Observable<any> {
    return this.apiService.postWms('/product-feature-group-appls', params);
  }

  updateProductFeatureGroupAppl(params: any): Observable<any> {
    const url = `/product-feature-group-appls/${encodeURIComponent(params.id)}`;
    return this.apiService.putWms(url, params);
  }

  getProductFeatureAppls(productId: string): Observable<any[]> {
    const url = `/product-feature-appls/product/${encodeURIComponent(productId)}`;
    return this.apiService.getWms(url);
  }

  deleteProductFeatureAppl(productId: string, id: number | string): Observable<any> {
    return this.apiService.delete(
      `/common/products/${encodeURIComponent(productId)}/features/${encodeURIComponent(String(id))}`
    );
  }
}
