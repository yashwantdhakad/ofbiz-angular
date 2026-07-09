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
import { FeatureService } from './feature.service';
import { ApiService } from '../common/api.service';
import { of } from 'rxjs';
import { HttpHeaders, HttpResponse } from '@angular/common/http';

describe('FeatureService', () => {
  let service: FeatureService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', [
      'customGetWms',
      'getWms',
      'postWms',
      'putWms',
      'deleteWms',
      'post',
      'put',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        FeatureService,
        { provide: ApiService, useValue: spy }
      ]
    });

    service = TestBed.inject(FeatureService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call getFeatures with correct URL and return data', () => {
    const mockResponse = new HttpResponse({
      body: [{ productFeatureId: 'F1' }],
      headers: new HttpHeaders({ 'x-total-count': '5' }),
    });

    apiServiceSpy.customGetWms.and.returnValue(of(mockResponse));

    service.getFeatures(0, 'test').subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = '/product-features?pageIndex=0&pageSize=10&queryString=test';
    expect(apiServiceSpy.customGetWms).toHaveBeenCalledWith(expectedUrl);
  });

  it('should call createFeature with correct params and return result', () => {
    const payload = { description: 'New Feature' };
    const mockResult = { productFeatureId: 'F2' };

    apiServiceSpy.postWms.and.returnValue(of(mockResult));

    service.createFeature(payload).subscribe((res) => {
      expect(res).toEqual(mockResult);
    });

    expect(apiServiceSpy.postWms).toHaveBeenCalledWith('/product-features', payload);
  });

  it('should call getFeature with correct ID and return detail', () => {
    const mockDetail = { productFeatureId: 'F1', description: 'Size' };

    apiServiceSpy.getWms.and.returnValue(of(mockDetail));

    service.getFeature('F1').subscribe((res) => {
      expect(res).toEqual(mockDetail);
    });

    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/product-features/by-id/F1');
  });

  it('should update feature', () => {
    const params = { productFeatureId: 'F1' };
    const res = { ok: true };
    apiServiceSpy.putWms.and.returnValue(of(res));
    service.updateFeature(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.putWms).toHaveBeenCalledWith('/product-features/by-id/F1', params);
  });

  it('should create product feature appl', () => {
    const params = { productId: 'PROD/1', data: true };
    const res = { ok: true };
    apiServiceSpy.post.and.returnValue(of(res));
    service.createProductFeatureAppl(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/products/PROD%2F1/features', params);
  });

  it('should update product feature appl', () => {
    const params = { id: 1, productId: 'PROD/1', data: true };
    const res = { ok: true };
    apiServiceSpy.put.and.returnValue(of(res));
    service.updateProductFeatureAppl(params).subscribe(r => expect(r).toEqual(res));
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/products/PROD%2F1/features/1', params);
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

  it('should fetch feature types and product feature applications', () => {
    apiServiceSpy.getWms.and.returnValues(of([{ productFeatureTypeId: 'SIZE' }]), of([{ productFeatureId: 'F1' }]));

    service.getProductFeatureTypes().subscribe((res) => {
      expect(res).toEqual([{ productFeatureTypeId: 'SIZE' }]);
    });
    service.getProductFeatureAppls('PROD/1').subscribe((res) => {
      expect(res).toEqual([{ productFeatureId: 'F1' }]);
    });

    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/product-feature-types');
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/product-feature-appls/product/PROD%2F1');
  });

  it('should delete product feature applications and encode identifiers', () => {
    apiServiceSpy.delete.and.returnValue(of({ ok: true }));
    apiServiceSpy.getWms.and.returnValue(of({ ok: true }));
    apiServiceSpy.putWms.and.returnValue(of({ ok: true }));

    service.deleteProductFeatureAppl('PROD/1', 42).subscribe((res) => {
      expect(res).toEqual({ ok: true });
    });
    service.getFeature('A/B').subscribe();
    service.updateFeature({ productFeatureId: 'A/B', description: 'Updated' }).subscribe();

    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/products/PROD%2F1/features/42');
    expect(apiServiceSpy.getWms).toHaveBeenCalledWith('/product-features/by-id/A%2FB');
    expect(apiServiceSpy.putWms).toHaveBeenCalledWith('/product-features/by-id/A%2FB', {
      productFeatureId: 'A/B',
      description: 'Updated',
    });
  });
});
