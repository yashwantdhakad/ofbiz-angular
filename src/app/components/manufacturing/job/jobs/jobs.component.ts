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
import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';

@Component({
  standalone: false,
  selector: 'app-jobs',
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsComponent implements OnInit {
  isLoading = signal<boolean>(false);
  queryString = signal('');
  selectedPurposeType = signal('');
  pagination = signal({
    page: 1,
    rowsPerPage: 10,
  });
  items = signal<any[]>([]);
  pages = signal<number>(0);
  purposeTypes = [
    { value: '', label: 'COMMON.ALL' },
    { value: 'WEPT_PRODUCTION_RUN', label: 'REQUIREMENT.REF_PRODUCTION_RUN' },
    { value: 'WEPT_MAINTENANCE', label: 'MANUFACTURING.PURPOSE_MAINTENANCE' },
    { value: 'WEPT_REPAIR', label: 'MANUFACTURING.PURPOSE_REPAIR' },
    { value: 'WEPT_REFURBISH_RUN', label: 'MANUFACTURING.PURPOSE_REFURBISH_RUN' },
    { value: 'WEPT_DECOMPOSE_RUN', label: 'MANUFACTURING.PURPOSE_DECOMPOSE_RUN' },
  ];

  displayedColumns: { key: string; header: string }[] = [
    { key: 'workEffortId', header: 'MANUFACTURING.JOB_ID' },
    { key: 'workEffortName', header: 'MANUFACTURING.JOB_NAME' },
    { key: 'workEffortPurposeTypeDescription', header: 'COMMON.TYPE' },
    { key: 'facilityName', header: 'MANUFACTURING.FACILITY_ID' },
    { key: 'statusDescription', header: 'MANUFACTURING.STATUS_ID' },
    { key: 'estimatedStartDate', header: 'MANUFACTURING.START_DATE' },
  ];
  readonly displayedColumnKeys = computed(() => this.displayedColumns.map((col) => col.key));

  constructor(
    private manufacturingService: ManufacturingService
  ) { }

  ngOnInit(): void {
    this.isLoading.set(true);
    this.getJobs(1);
  }

  getJobs(page: number): void {
    this.pagination.update((state) => ({ ...state, page }));
    this.manufacturingService
      .getJobs(
        page - 1,
        this.pagination().rowsPerPage,
        this.queryString(),
        this.selectedPurposeType()
      )
      .subscribe({
        next: (response) => {
          const payload = response as unknown as Record<string, any>;
          const list = [payload?.['resultList'], payload?.['documentList']]
            .find((candidate) => Array.isArray(candidate)) ?? [];
          const total = Number(payload?.['totalElements'] ?? payload?.['documentListCount'] ?? list.length);
          this.items.set(list);
          this.pages.set(Number.isNaN(total) ? list.length : total);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  onSearch(): void {
    this.pagination.update((state) => ({ ...state, page: 1 }));
    this.isLoading.set(true);
    this.getJobs(1);
  }

  onPageChange(pageIndex: number): void {
    this.pagination.update((state) => ({ ...state, page: pageIndex + 1 }));
    this.isLoading.set(true);
    this.getJobs(this.pagination().page);
  }
}
