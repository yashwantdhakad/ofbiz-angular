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
import { ChangeDetectionStrategy, Component, OnInit, effect, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs/operators';
import { RequirementService } from '@ofbiz/services/requirement/requirement.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { FacilityReferenceItem } from '@ofbiz/models/manufacturing.model';

interface ReplenishmentRequirementRow {
  id?: string;
  requirementId?: string;
  productId?: string;
  productName?: string;
  productDisplay?: string;
  facilityId?: string;
  statusId?: string;
  statusDescription?: string;
  requirementTypeId?: string;
  requirementTypeDescription?: string;
  quantity?: number;
  requirementStartDate?: string;
  requiredByDate?: string;
  description?: string;
}

@Component({
  selector: 'app-requirement-find',
  standalone: false,
  templateUrl: './requirement-find.component.html',
  styleUrls: ['./requirement-find.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequirementFindComponent implements OnInit {
  isLoading = signal<boolean>(false);
  requirements = signal<ReplenishmentRequirementRow[]>([]);
  total = signal<number>(0);
  facilities = signal<FacilityReferenceItem[]>([]);
  loadingFacilities = signal<boolean>(false);

  facilityId = '';
  requirementTypeId = '';
  pagination = { page: 0, size: 20 };

  requirementTypes = [
    { id: '', label: 'All' },
    { id: 'PRODUCT_REQUIREMENT', label: 'Product' },
    { id: 'INTERNAL_REQUIREMENT', label: 'Internal' },
  ];

  displayedColumns = [
    'requirementId',
    'productId',
    'productName',
    'facilityId',
    'quantity',
    'statusId',
    'requiredByDate',
  ];

  constructor(
    private requirementService: RequirementService,
    private referenceDataStore: ReferenceDataStore,
    private preferredFacilityService: PreferredFacilityService
  ) {
    effect(() => {
      const facilities = this.referenceDataStore.facilities();
      this.facilities.set(facilities);
      if (!this.facilityId && facilities.length > 0) {
        this.facilityId = this.preferredFacilityService.resolveInitialFacilityId(facilities);
      }
      this.loadingFacilities.set(this.referenceDataStore.facilitiesLoading());
    });
  }

  ngOnInit(): void {
    this.referenceDataStore.ensureFacilitiesLoaded();
    this.search();
  }

  search(): void {
    this.pagination.page = 0;
    this.loadRequirements();
  }

  onPageChange(event: PageEvent): void {
    this.pagination.page = event.pageIndex;
    this.pagination.size = event.pageSize;
    this.loadRequirements();
  }

  clearFilters(): void {
    this.facilityId = this.preferredFacilityService.resolveInitialFacilityId(this.facilities());
    this.requirementTypeId = '';
    this.search();
  }

  private loadRequirements(): void {
    this.isLoading.set(true);
    this.requirementService
      .searchRequirements(
        this.pagination.page,
        this.pagination.size,
        this.facilityId || undefined,
        undefined,
        this.requirementTypeId || undefined
      )
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          // OFBiz wraps OUT params in { data: { content, totalElements } }
          const payload = response?.data ?? response;
          const items = Array.isArray(payload?.content) ? payload.content : [];
          this.requirements.set(items);
          this.total.set(Number(payload?.totalElements ?? items.length));
        },
        error: () => {
          this.requirements.set([]);
          this.total.set(0);
        },
      });
  }

  getFacilityLabel(facility: FacilityReferenceItem): string {
    return facility?.label || facility?.facilityId || '';
  }
}
