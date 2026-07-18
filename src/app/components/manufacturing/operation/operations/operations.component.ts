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
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, finalize, timeout } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';

@Component({
  standalone: false,
  selector: 'app-operations',
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsComponent implements OnInit {
  displayedColumns: string[] = [
    'id',
    'name',
    'description',
    'facility',
    'operationType',
    'estSetupTime',
    'estUnitRunTime',
  ];

  allOperations = signal<any[]>([]);
  searchQuery = signal('');
  operationTypeFilter = signal('');
  facilityFilter = signal('');

  operationTypes = signal<string[]>([]);
  facilities = signal<any[]>([]);

  pagination = signal({
    pageIndex: 0,
    pageSize: 10,
  });
  totalElements = signal<number>(0);
  readonly filteredOperations = computed(() => {
    const keyword = this.searchQuery().trim().toLowerCase();
    return this.allOperations().filter((item: any) => {
      const matchesKeyword =
        !keyword ||
        [item?.workEffortId, item?.workEffortName, item?.description]
          .filter((value) => !!value)
          .some((value) => String(value).toLowerCase().includes(keyword));

      const matchesOperationType =
        !this.operationTypeFilter() || item?.workEffortPurposeTypeId === this.operationTypeFilter();

      const matchesFacility = !this.facilityFilter() || item?.facilityId === this.facilityFilter();

      return matchesKeyword && matchesOperationType && matchesFacility;
    });
  });
  readonly operations = computed(() => {
    const start = this.pagination().pageIndex * this.pagination().pageSize;
    return this.filteredOperations().slice(start, start + this.pagination().pageSize);
  });

  isLoading = signal<boolean>(false);

  constructor(
    private manufacturingService: ManufacturingService,
    private router: Router,
    private renderScheduler: RenderSchedulerService,
    private translate: TranslateService,
    private referenceDataStore: ReferenceDataStore
  ) {
    effect(() => {
      this.facilities.set(this.referenceDataStore.facilities());
    });
    effect(() => {
      this.totalElements.set(this.filteredOperations().length);
    });
  }

  ngOnInit(): void {
    this.referenceDataStore.ensureFacilitiesLoaded();
    this.loadOperations();
  }

  loadOperations(): void {
    this.isLoading.set(true);
    this.manufacturingService
      .getWorkEfforts({
        workEffortTypeIds: 'ROU_TASK,ROUTING_TASK',
        queryString: this.searchQuery().trim() || undefined,
        size: 500,
      })
      .pipe(
        timeout(15000),
        catchError((_error) => {
          return of([]);
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (response: any) => {
          const list = this.extractItems(response);
          this.allOperations.set(list);
          this.operationTypes.set(Array.from(
            new Set(
              list
                .map((item: any) => item?.workEffortPurposeTypeId)
                .filter((value: string) => !!value)
            )
          ));
        },
      });
  }

  onSearch(): void {
    this.pagination.update((state) => ({ ...state, pageIndex: 0 }));
    this.loadOperations();
  }

  onFilterChange(): void {
    this.pagination.update((state) => ({ ...state, pageIndex: 0 }));
  }

  onPageChange(event: PageEvent): void {
    this.pagination.set({
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
    });
  }

  navigateToCreate(): void {
    this.router.navigate(['/operations/create']);
  }

  navigateToDetail(workEffortId: string): void {
    if (!workEffortId) return;
    this.router.navigate(['/operations', workEffortId]);
  }

  getFacilityName(facilityId: string): string {
    if (!facilityId) return '-';
    const facility = this.facilities().find((item: any) => item?.facilityId === facilityId);
    return facility?.facilityName || facilityId;
  }

  getOperationTypeLabel(operationTypeId: string): string {
    if (!operationTypeId) return '-';
    const keyMap: Record<string, string> = {
      ROU_ASSEMBLING: 'MANUFACTURING.ROU_ASSEMBLING',
      ROU_MANUFACTURING: 'MANUFACTURING.ROU_MANUFACTURING',
      ROU_PACKING: 'MANUFACTURING.ROU_PACKING',
    };
    const key = keyMap[String(operationTypeId).toUpperCase()];
    if (key) return this.translate.instant(key);
    return operationTypeId
      .replace(/^ROU_/, '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatMillis(value: string): string {
    const numeric = Number(value);
    if (!value || Number.isNaN(numeric) || numeric <= 0) return '-';

    const totalMinutes = Math.floor(numeric / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hrs ${minutes.toString().padStart(2, '0')} min`;
  }

  private extractItems(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.documentList)) return response.documentList;
    if (Array.isArray(response?.resultList)) return response.resultList;
    if (Array.isArray(response?.responseMap?.resultList)) return response.responseMap.resultList;
    if (Array.isArray(response?.content)) return response.content;
    return [];
  }
}
