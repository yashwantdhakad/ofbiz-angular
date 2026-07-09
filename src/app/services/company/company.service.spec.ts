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
import { of, throwError } from 'rxjs';
import { ApiService } from '../common/api.service';
import { CompanyService } from './company.service';

describe('CompanyService', () => {
  let apiService: jasmine.SpyObj<ApiService>;
  let service: CompanyService;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'put', 'post']);
    service = new CompanyService(apiService);
  });

  function makeContextResponse(overrides: Record<string, unknown> = {}): unknown {
    return {
      data: {
        companyPartyId: 'COMP-1',
        party: { partyId: 'COMP-1', groupName: 'Party Name' },
        productStores: [{ id: 1, productStoreId: 'STORE-1', companyName: 'Acme', payToPartyId: 'COMP-1' }],
        storeFacilities: [{ productStoreId: 'STORE-1', facilityId: 'FAC-1' }],
        facilities: [{ facilityId: 'FAC-1', facilityName: 'Main' }],
        postalAddressList: [{ contactMechPurposeId: 'PRIMARY_LOCATION', address1: 'Line 1' }],
        logoBase64: null,
        logoMimeType: null,
        ...overrides,
      },
    };
  }

  it('loads context and resolves company details', () => {
    apiService.get.and.returnValue(of(makeContextResponse()) as any);

    service.loadContext();

    const context = service.contextSignal();
    expect(context.loading).toBeFalse();
    expect(context.companyName).toBe('Party Name');
    expect(context.companyPartyId).toBe('COMP-1');
    expect(context.companyAddress).toEqual({ contactMechPurposeId: 'PRIMARY_LOCATION', address1: 'Line 1' } as any);
    expect(context.primaryStore?.productStoreId).toBe('STORE-1');
    expect(context.companyLogoUrl).toBeNull();
  });

  it('builds a data URL when logoBase64 is present in context', () => {
    apiService.get.and.returnValue(of(makeContextResponse({
      logoBase64: 'abc123',
      logoMimeType: 'image/png',
    })) as any);

    service.loadContext();

    expect(service.contextSignal().companyLogoUrl).toBe('data:image/png;base64,abc123');
  });

  it('skips reload when context is already populated and force is false', () => {
    service.contextSignal.set({
      ...service.contextSignal(),
      primaryStore: { id: 1 },
      companyProfile: { partyId: 'COMP-1' } as any,
    });

    service.loadContext();

    expect(apiService.get).not.toHaveBeenCalled();
  });

  it('refreshes the context when forced even if cached', () => {
    apiService.get.and.returnValue(of(makeContextResponse()) as any);
    service.contextSignal.set({
      ...service.contextSignal(),
      primaryStore: { id: 1 },
      companyProfile: { partyId: 'COMP-1' } as any,
    });

    service.refreshContext();

    expect(apiService.get).toHaveBeenCalled();
  });

  it('clears the loading flag when the context request fails', () => {
    apiService.get.and.returnValue(throwError(() => new Error('network error')) as any);

    service.loadContext();

    expect(service.contextSignal().loading).toBeFalse();
  });

  it('returns stores by numeric id', () => {
    service.contextSignal.update((current) => ({
      ...current,
      stores: [{ id: 7, productStoreId: 'STORE-7' }],
    }));

    expect(service.getStoreById(7)).toEqual({ id: 7, productStoreId: 'STORE-7' });
    expect(service.getStoreById(9)).toBeNull();
  });

  it('revokes no URL on destroy when none was set', () => {
    expect(() => service.ngOnDestroy()).not.toThrow();
  });
});
