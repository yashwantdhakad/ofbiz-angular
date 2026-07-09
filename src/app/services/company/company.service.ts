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
import { Injectable, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../common/api.service';
import { FacilityDetail } from '@ofbiz/models/facility.model';
import { Party, PostalAddress } from '@ofbiz/models/party.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CompanyProductStore {
  id?: number | string;
  productStoreId?: string;
  storeName?: string;
  companyName?: string;
  payToPartyId?: string;
  defaultCurrencyUomId?: string;
  reserveInventory?: string | boolean;
  reserveOrderEnumId?: string;
  headerApprovedStatus?: string;
}

export interface CompanyStoreFacility {
  productStoreId?: string | null;
  facilityId?: string | null;
}

export interface CompanyStoreFacilityRow extends CompanyStoreFacility {
  facility?: FacilityDetail | null;
}

export interface CompanyContext {
  loading: boolean;
  companyName: string;
  companyPartyId: string;
  companyProfile: Party | null;
  companyAddress: PostalAddress | null;
  companyLogoUrl: string | null;
  stores: CompanyProductStore[];
  facilities: FacilityDetail[];
  storeFacilitiesByStoreId: Record<string, CompanyStoreFacilityRow[]>;
  primaryStore: CompanyProductStore | null;
}

@Injectable({
  providedIn: 'root',
})
export class CompanyService implements OnDestroy {
  readonly contextSignal = signal<CompanyContext>({
    loading: false,
    companyName: 'Ng ERP',
    companyPartyId: 'COMPANY',
    companyProfile: null,
    companyAddress: null,
    companyLogoUrl: null,
    stores: [],
    facilities: [],
    storeFacilitiesByStoreId: {},
    primaryStore: null,
  });

  private companyLogoObjectUrl: string | null = null;
  private loading = false;

  constructor(
    private readonly apiService: ApiService
  ) {}

  updateCompanyName(partyId: string, groupName: string): Observable<any> {
    return this.apiService.put<any>('/common/company/name', { partyId, groupName }).pipe(
      map((res) => res?.data ?? res)
    );
  }

  uploadCompanyLogo(partyId: string, imageData: string, mimeType: string, fileName: string): Observable<any> {
    return this.apiService.post<any>('/common/company/logo', { partyId, imageData, mimeType, fileName }).pipe(
      map((res) => res?.data ?? res)
    );
  }

  ngOnDestroy(): void {
    this.revokeLogoUrl();
  }

  loadContext(force: boolean = false): void {
    if (this.loading && !force) {
      return;
    }
    const current = this.contextSignal();
    if (!force && current.primaryStore && current.companyProfile) {
      return;
    }

    this.loading = true;
    this.contextSignal.update(c => ({ ...c, loading: true }));

    this.apiService.get<any>('/common/company/context').subscribe({
      next: (response) => {
        const ctx = response?.data;
        const normalizedStores: CompanyProductStore[]       = Array.isArray(ctx?.productStores)   ? ctx.productStores   : [];
        const normalizedStoreFacilities: CompanyStoreFacility[] = Array.isArray(ctx?.storeFacilities) ? ctx.storeFacilities : [];
        const normalizedFacilities: FacilityDetail[]        = Array.isArray(ctx?.facilities)      ? ctx.facilities      : [];
        const companyPartyId: string                        = (ctx?.companyPartyId || 'COMPANY').toString().trim();
        const party: Party | null                           = ctx?.party ?? null;
        const postalAddressList: PostalAddress[]            = Array.isArray(ctx?.postalAddressList) ? ctx.postalAddressList : [];

        const primaryStore = this.resolvePrimaryStore(normalizedStores);
        const mapping      = this.buildStoreFacilityMapping(normalizedStores, normalizedStoreFacilities, normalizedFacilities);
        const companyAddress = postalAddressList.find((address: PostalAddress) =>
          ['PRIMARY_LOCATION', 'BILLING_LOCATION', 'SHIPPING_LOCATION'].includes(address?.contactMechPurposeId || '')
        ) || postalAddressList[0] || null;

        const companyName   = this.resolveCompanyName(primaryStore, party);
        // Build logo data URL from base64 embedded in the context response
        const logoBase64   = ctx?.logoBase64 as string | null;
        const logoMimeType = (ctx?.logoMimeType as string | null) || 'image/png';
        let companyLogoUrl: string | null = null;
        if (logoBase64) {
          companyLogoUrl = `data:${logoMimeType};base64,${logoBase64}`;
        }

        const nextState: CompanyContext = {
          loading: false,
          companyName,
          companyPartyId,
          companyProfile: party,
          companyAddress,
          companyLogoUrl,
          stores: normalizedStores,
          facilities: normalizedFacilities,
          storeFacilitiesByStoreId: mapping,
          primaryStore,
        };

        this.loading = false;
        this.contextSignal.set(nextState);
      },
      error: () => {
        this.loading = false;
        this.contextSignal.update(c => ({ ...c, loading: false }));
      },
    });
  }

  refreshContext(): void {
    this.loadContext(true);
  }

  getStoreById(id: number): CompanyProductStore | null {
    const stores = this.contextSignal().stores || [];
    return stores.find((item: CompanyProductStore) => Number(item?.id) === Number(id)) || null;
  }

  private resolvePrimaryStore(stores: CompanyProductStore[]): CompanyProductStore | null {
    if (!stores.length) {
      return null;
    }
    const sorted = [...stores].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
    return sorted[0] || null;
  }

  private resolveCompanyPartyId(primaryStore: CompanyProductStore | null): string {
    const payToPartyId = (primaryStore?.payToPartyId || '').toString().trim();
    return payToPartyId || 'COMPANY';
  }

  private resolveCompanyName(primaryStore: CompanyProductStore | null, party: Party | null): string {
    const partyGroupName = (party?.groupName || '').toString().trim();
    const storeCompanyName = (primaryStore?.companyName || '').toString().trim();
    const storeName = (primaryStore?.storeName || '').toString().trim();
    return partyGroupName || storeCompanyName || storeName || 'Ng ERP';
  }

  private buildStoreFacilityMapping(
    stores: CompanyProductStore[],
    storeFacilities: CompanyStoreFacility[],
    facilities: FacilityDetail[]
  ): Record<string, CompanyStoreFacilityRow[]> {
    const facilityMap = new Map<string, FacilityDetail>();
    (facilities || []).forEach((facility: FacilityDetail) => {
      const facilityId = (facility?.facilityId || '').toString();
      if (facilityId) {
        facilityMap.set(facilityId, facility);
      }
    });

    const mapping: Record<string, CompanyStoreFacilityRow[]> = {};
    (stores || []).forEach((store: CompanyProductStore) => {
      const storeId = (store?.productStoreId || '').toString();
      if (storeId) {
        mapping[storeId] = [];
      }
    });

    (storeFacilities || []).forEach((link: CompanyStoreFacility) => {
      const storeId = (link?.productStoreId || '').toString();
      const facilityId = (link?.facilityId || '').toString();
      if (!storeId || !facilityId) {
        return;
      }
      const facility = facilityMap.get(facilityId);
      const row = {
        ...link,
        facility: facility || null,
      };
      if (!mapping[storeId]) {
        mapping[storeId] = [];
      }
      mapping[storeId].push(row);
    });

    return mapping;
  }

  private revokeLogoUrl(): void {
    if (this.companyLogoObjectUrl) {
      URL.revokeObjectURL(this.companyLogoObjectUrl);
      this.companyLogoObjectUrl = null;
    }
  }
}
