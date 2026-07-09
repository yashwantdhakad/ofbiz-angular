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
import { FeatureGroupService } from './feature-group.service';
import { ApiService } from '../common/api.service';
import { of } from 'rxjs';
import { HttpHeaders, HttpResponse } from '@angular/common/http';

describe('FeatureGroupService', () => {
  let service: FeatureGroupService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', [
      'customGetWms',
      'getWms',
      'postWms',
      'putWms',
    ]);

    TestBed.configureTestingModule({
      providers: [
        FeatureGroupService,
        { provide: ApiService, useValue: spy },
      ],
    });

    service = TestBed.inject(FeatureGroupService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call getFeatureGroups with correct URL', () => {
    const mockResponse = new HttpResponse({
      body: [{ productFeatureGroupId: 'FG1' }],
      headers: new HttpHeaders({ 'x-total-count': '10' }),
    });

    apiServiceSpy.customGetWms.and.returnValue(of(mockResponse));

    service.getFeatureGroups(0, 'Test').subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `/product-feature-groups?pageIndex=0&pageSize=10&queryString=Test`;
    expect(apiServiceSpy.customGetWms).toHaveBeenCalledWith(expectedUrl);
  });

  it('should call createFeatureGroup with correct payload', () => {
    const payload = { description: 'New Group' };
    const mockResponse = { productFeatureGroupId: 'FG2' };

    apiServiceSpy.postWms.and.returnValue(of(mockResponse));

    service.createFeatureGroup(payload).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    expect(apiServiceSpy.postWms).toHaveBeenCalledWith('/product-feature-groups', payload);
  });

  it('should call getFeatureGroup with correct ID', () => {
    const mockDetail = { productFeatureGroupId: 'FG1', description: 'Test Group' };

    apiServiceSpy.getWms.and.returnValue(of(mockDetail));

    service.getFeatureGroup('FG1').subscribe((res) => {
      expect(res).toEqual(mockDetail);
    });

    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/product-feature-groups/by-id/FG1');
  });

  it('should update feature group', () => {
    const params = { productFeatureGroupId: 'FG1' };
    const res = { ok: true };
    apiServiceSpy.putWms.and.returnValue(of(res));
    service.updateFeatureGroup(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.putWms).toHaveBeenCalledWith('/product-feature-groups/by-id/FG1', params);
  });

  it('should create product category feature group appl', () => {
    const params = { data: true };
    const res = { ok: true };
    apiServiceSpy.postWms.and.returnValue(of(res));
    service.createProductCategoryFeatGrpAppl(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.postWms).toHaveBeenCalledWith('/product-feature-cat-grp-appls', params);
  });

  it('should update product category feature group appl', () => {
    const params = { id: 1, data: true };
    const res = { ok: true };
    apiServiceSpy.putWms.and.returnValue(of(res));
    service.updateProductCategoryFeatGrpAppl(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.putWms).toHaveBeenCalledWith('/product-feature-cat-grp-appls/1', params);
  });

  it('should create product feature group appl', () => {
    const params = { data: true };
    const res = { ok: true };
    apiServiceSpy.postWms.and.returnValue(of(res));
    service.createProductFeatureGroupAppl(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.postWms).toHaveBeenCalledWith('/product-feature-group-appls', params);
  });

  it('should update product feature group appl', () => {
    const params = { id: 2, data: true };
    const res = { ok: true };
    apiServiceSpy.putWms.and.returnValue(of(res));
    service.updateProductFeatureGroupAppl(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.putWms).toHaveBeenCalledWith('/product-feature-group-appls/2', params);
  });
});
