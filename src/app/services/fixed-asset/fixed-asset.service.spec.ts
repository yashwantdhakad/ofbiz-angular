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
import { of } from 'rxjs';

import { ApiService } from '../common/api.service';
import { FixedAssetService } from './fixed-asset.service';

describe('FixedAssetService', () => {
  let service: FixedAssetService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [
        FixedAssetService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });

    service = TestBed.inject(FixedAssetService);
  });

  it('builds OMS fixed-asset CRUD endpoints', () => {
    apiServiceSpy.get.and.returnValue(of([] as any));
    apiServiceSpy.post.and.returnValue(of({} as any));
    apiServiceSpy.put.and.returnValue(of({} as any));
    apiServiceSpy.delete.and.returnValue(of({} as any));

    service.listFixedAssets().subscribe();
    service.getFixedAsset('FA-100').subscribe();
    service.createFixedAsset({ fixedAssetId: 'FA-200' }).subscribe();
    service.updateFixedAsset(10, { fixedAssetName: 'Updated' }).subscribe();
    service.deleteFixedAsset(11).subscribe();
    service.listFixedAssetTypes().subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/accounting/fixed-assets');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/accounting/fixed-assets/FA-100');
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/accounting/fixed-assets', { fixedAssetId: 'FA-200' });
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/accounting/fixed-assets/10', { fixedAssetName: 'Updated' });
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/accounting/fixed-assets/11');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/accounting/fixed-asset-types');
  });
});
