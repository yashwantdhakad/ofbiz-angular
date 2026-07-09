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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageEvent } from '@angular/material/paginator';
import { PicklistService } from '@ofbiz/services/picklist/picklist.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { FacilityReferenceItem } from '@ofbiz/models/manufacturing.model';
import { StatusLookupItem } from '@ofbiz/models/order.model';

interface PicklistSummary {
  picklistId?: string;
  statusId?: string;
  statusDescription?: string;
  facilityId?: string;
  facilityName?: string;
  orderCount?: number;
  itemCount?: number;
  pickerId?: string;
  createdDate?: string;
}

interface PickerRoleDto {
  partyId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  groupName?: string;
  partyName?: string;
}

@Component({
  standalone: false,
  selector: 'app-picklists',
  templateUrl: './picklists.component.html',
  styleUrls: ['./picklists.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicklistsComponent implements OnInit {
  isLoading = signal<boolean>(false);
  picklists = signal<PicklistSummary[]>([]);
  totalPicklists = signal<number>(0);
  pagination = { page: 0, size: 20 };
  facilities = signal<FacilityReferenceItem[]>([]);
  statusOptions = signal<StatusLookupItem[]>([]);
  pickerNameMap = signal<Map<string, string>>(new Map());
  filters = signal({
    facilityId: '',
    statusId: '',
    fromDate: null as Date | null,
    toDate: null as Date | null,
  });

  displayedColumns = [
    'picklistId',
    'statusId',
    'facilityId',
    'orderCount',
    'itemCount',
    'pickerId',
    'createdDate',
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private picklistService: PicklistService,
    private partyService: PartyService,
    private renderScheduler: RenderSchedulerService,
    private referenceDataStore: ReferenceDataStore,
    private preferredFacilityService: PreferredFacilityService
  ) {
    effect(() => {
      const facilities = this.referenceDataStore.facilities();
      this.facilities.set(facilities);
      if (!this.filters().facilityId && facilities.length > 0) {
        this.filters.update((current) => ({
          ...current,
          facilityId: this.preferredFacilityService.resolveInitialFacilityId(facilities),
        }));
      }
      this.statusOptions.set(this.referenceDataStore.statusItemsByType('PICKLIST_STATUS'));
    });
  }

  ngOnInit(): void {
    this.referenceDataStore.ensureFacilitiesLoaded();
    this.referenceDataStore.ensureStatusTypeLoaded('PICKLIST_STATUS');
    this.loadPicklists();
  }

  loadPicklists(): void {
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });
    this.picklistService
      .getPicklists({
        facilityId: this.filters().facilityId || undefined,
        statusId: this.filters().statusId || undefined,
        fromDate: this.formatDate(this.filters().fromDate),
        toDate: this.formatDate(this.filters().toDate),
        page: this.pagination.page,
        size: this.pagination.size,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.renderScheduler.deferMacrotask(() => {
            const list = [response?.resultList, response?.documentList]
              .find((candidate: any) => Array.isArray(candidate)) ?? [];
            this.picklists.set(list);
            this.totalPicklists.set(Number(response?.totalCount ?? response?.documentListCount ?? list.length));
            this.loadPickerNames(this.collectPickerPartyIds(list));
            this.isLoading.set(false);
          });
        },
        error: () => {
          this.renderScheduler.deferMacrotask(() => {
            this.picklists.set([]);
            this.totalPicklists.set(0);
            this.isLoading.set(false);
          });
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.pagination.page = event.pageIndex;
    this.pagination.size = event.pageSize;
    this.loadPicklists();
  }

  resetFilters(): void {
    this.pagination.page = 0;
    this.filters.set({
      facilityId: this.preferredFacilityService.resolveInitialFacilityId(this.facilities()),
      statusId: '',
      fromDate: null,
      toDate: null,
    });
    this.loadPicklists();
  }

  getPickerName(partyId?: string): string {
    if (!partyId) return '-';
    return this.pickerNameMap().get(partyId) || partyId;
  }

  private loadPickerNames(partyIds: string[]): void {
    const uniquePartyIds = Array.from(new Set((partyIds || []).filter((id) => !!id)));
    if (uniquePartyIds.length === 0) {
      this.pickerNameMap.set(new Map());
      return;
    }
    this.partyService
      .getPartyRoleSummaries('PICKER', uniquePartyIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          const list: PickerRoleDto[] = Array.isArray(roles) ? (roles as PickerRoleDto[]) : [];
          this.pickerNameMap.set(new Map(
            list
              .filter((role: PickerRoleDto) => !!role?.partyId)
              .map((role: PickerRoleDto) => [role.partyId, this.getPickerDisplayName(role)])
          ));
        },
        error: () => {
          this.pickerNameMap.set(new Map());
        },
      });
  }

  private collectPickerPartyIds(picklists: PicklistSummary[]): string[] {
    return (picklists || [])
      .map((picklist) => picklist?.pickerId)
      .filter((partyId): partyId is string => !!partyId);
  }

  private getPickerDisplayName(role: PickerRoleDto): string {
    const fullName = [role?.firstName, role?.lastName].filter(Boolean).join(' ').trim();
    return fullName || role?.name || role?.groupName || role?.partyName || role?.partyId;
  }

  private formatDate(date: Date | null): string | undefined {
    if (!date) return undefined;
    return date.toISOString().split('T')[0];
  }

  updateFilter(key: 'facilityId' | 'statusId', value: string): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
  }

  updateDateFilter(key: 'fromDate' | 'toDate', value: Date | null): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
  }

  trackByFacility = (_: number, facility: FacilityReferenceItem): string | number =>
    facility?.facilityId ?? _;

  trackByStatus = (_: number, status: StatusLookupItem): string | number =>
    status?.statusId ?? _;

  trackByPicklist = (_: number, item: PicklistSummary): string | number =>
    item?.picklistId ?? _;
}
