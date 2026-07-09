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
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CompanyMaterialModule } from '../../common/material/company-material.module';
import { ApiService } from '@ofbiz/services/common/api.service';
import { CompanyProductStore, CompanyService } from '@ofbiz/services/company/company.service';

interface ProductStoreFacilityDisplay {
  facilityId?: string | null;
  facilityName: string;
  facilityTypeId: string;
}

interface ProductStoreShippingMethod {
  productStoreId?: string | null;
  productStoreShipMethId?: string | number | null;
  shipmentMethodTypeId?: string | null;
  partyId?: string | null;
  companyPartyId?: string | null;
  serviceName?: string | null;
}

@Component({
  standalone: true,
  selector: 'app-product-store-detail',
  imports: [CommonModule, RouterModule, TranslateModule, CompanyMaterialModule],
  templateUrl: './product-store-detail.component.html',
  styleUrls: ['./product-store-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductStoreDetailComponent {
  isLoading = signal(true);
  storeId = signal<number | null>(null);
  readonly routeStoreId = toSignal(
    this.route.params.pipe(map((params) => Number(params['id']) || null)),
    { initialValue: null }
  );

  context = computed(() => this.companyService.contextSignal());

  store = computed(() => {
    const id = this.storeId();
    if (!id) {
      return null;
    }
    return this.context().stores?.find((item: CompanyProductStore) => Number(item?.id) === id) || null;
  });

  storeFacilities = computed<ProductStoreFacilityDisplay[]>(() => {
    const store = this.store();
    if (!store) {
      return [];
    }
    const productStoreId = (store?.productStoreId || '').toString();
    return productStoreId
      ? (this.context().storeFacilitiesByStoreId?.[productStoreId] || []).map((entry) => ({
          facilityId: entry?.facilityId,
          facilityName: entry?.facility?.facilityName || '--',
          facilityTypeId: entry?.facility?.facilityTypeId || '--',
        }))
      : [];
  });

  shippingMethods = signal<ProductStoreShippingMethod[]>([]);

  readonly shippingColumns = ['productStoreShipMethId', 'shipmentMethodTypeId', 'partyId', 'companyPartyId', 'serviceName'];
  readonly facilityColumns = ['facilityId', 'facilityName', 'facilityTypeId'];
  private readonly destroyRef = inject(DestroyRef);
  private lastLoadedStoreId: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly companyService: CompanyService,
    private readonly apiService: ApiService
  ) {
    effect(() => {
      const store = this.store();
      const productStoreId = (store?.productStoreId || '').toString();

      if (this.context().loading) {
        return;
      }

      if (!store || !productStoreId) {
        this.shippingMethods.set([]);
        this.isLoading.set(false);
        this.lastLoadedStoreId = null;
        return;
      }

      if (this.lastLoadedStoreId === productStoreId) {
        this.isLoading.set(false);
        return;
      }

      this.lastLoadedStoreId = productStoreId;
      this.apiService.get<{methods?: ProductStoreShippingMethod[]}>(`/common/company/product-store-shipment-methods?productStoreId=${encodeURIComponent(productStoreId)}`)
        .pipe(
          catchError(() => of({ methods: [] })),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((response: any) => {
          const methodList = [response?.data?.methods, response?.methods].find((candidate: any) => Array.isArray(candidate)) ?? [];
          this.shippingMethods.set(methodList.filter((item: any) =>
            (item?.productStoreId || '').toString() === productStoreId
          ));
          this.isLoading.set(false);
        });
    });

    effect(() => {
      const id = this.routeStoreId();
      if (!id) {
        this.isLoading.set(false);
        this.storeId.set(null);
        return;
      }
      this.isLoading.set(true);
      this.storeId.set(id);
      this.companyService.loadContext();
    });
  }
}
