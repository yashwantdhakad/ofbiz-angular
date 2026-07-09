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
export class FeatureGroupService {
  constructor(private apiService: ApiService) {}

  getFeatureGroups(pageIndex: number, keyword: string): Observable<HttpResponse<any>> {
    const params = {
      pageIndex: pageIndex.toString(),
      pageSize: '10',
      queryString: keyword,
    };
    const queryString = new URLSearchParams(params).toString();
    const url = `/product-feature-groups?${queryString}`;
    return this.apiService.customGetWms(url); // should return Observable<HttpResponse<any>>
  }

  createFeatureGroup(params: any): Observable<any> {
    return this.apiService.postWms('/product-feature-groups', params);
  }

  getFeatureGroup(productFeatureGroupId: string): Observable<any> {
    const url = `/product-feature-groups/by-id/${encodeURIComponent(productFeatureGroupId)}`;
    return this.apiService.getWms(url);
  }

  updateFeatureGroup(params: any): Observable<any> {
    const url = `/product-feature-groups/by-id/${encodeURIComponent(params.productFeatureGroupId)}`;
    return this.apiService.putWms(url, params);
  }

  createProductCategoryFeatGrpAppl(params: any): Observable<any> {
    return this.apiService.postWms('/product-feature-cat-grp-appls', params);
  }

  updateProductCategoryFeatGrpAppl(params: any): Observable<any> {
    const url = `/product-feature-cat-grp-appls/${encodeURIComponent(params.id)}`;
    return this.apiService.putWms(url, params);
  }

  createProductFeatureGroupAppl(params: any): Observable<any> {
    return this.apiService.postWms('/product-feature-group-appls', params);
  }

  updateProductFeatureGroupAppl(params: any): Observable<any> {
    const url = `/product-feature-group-appls/${encodeURIComponent(params.id)}`;
    return this.apiService.putWms(url, params);
  }
}
