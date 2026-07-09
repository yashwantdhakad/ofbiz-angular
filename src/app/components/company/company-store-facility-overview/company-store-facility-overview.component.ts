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
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CompanyMaterialModule } from '../../common/material/company-material.module';
import { CompanyService } from '../../../services/company/company.service';

interface FacilityRow {
  storeId?: string;
  facilityId?: string;
  facilityName?: string;
  facilityTypeId?: string;
}

interface StoreFacilityEntry {
  facilityId?: string;
  facility?: { facilityName?: string; facilityTypeId?: string };
}

@Component({
  selector: 'app-company-store-facility-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, CompanyMaterialModule],
  templateUrl: './company-store-facility-overview.component.html',
  styleUrls: ['./company-store-facility-overview.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyStoreFacilityOverviewComponent {
  readonly context = computed(() => this.companyService.contextSignal());
  readonly facilityRows = computed(() => {
    const rows: FacilityRow[] = [];
    const mapping = this.context()?.storeFacilitiesByStoreId || {};
    Object.keys(mapping).forEach((storeId) => {
      (mapping[storeId] as StoreFacilityEntry[] || []).forEach((entry) => {
        rows.push({
          storeId,
          facilityId: entry?.facilityId,
          facilityName: entry?.facility?.facilityName || '--',
          facilityTypeId: entry?.facility?.facilityTypeId || '--',
        });
      });
    });
    return rows;
  });

  storesExpanded = false;
  facilitiesExpanded = false;

  readonly storeColumns: string[] = ['productStoreId', 'storeName', 'companyName', 'defaultCurrencyUomId', 'payToPartyId'];
  readonly facilityColumns: string[] = ['storeId', 'facilityId', 'facilityName', 'facilityTypeId'];

  constructor(private readonly companyService: CompanyService) {}

  trackByStore = (_: number, item: { id?: string | number; productStoreId?: string }): string | number =>
    item?.id ?? item?.productStoreId ?? _;

  trackByFacility = (_: number, item: FacilityRow): string => `${item?.storeId || ''}::${item?.facilityId || _}`;
}
