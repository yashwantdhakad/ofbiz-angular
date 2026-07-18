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
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs/operators';
import { ReplenishmentService } from '@ofbiz/services/replenishment/replenishment.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';

interface ReplenishmentRunJob {
  id: number;
  status: string;
  facilityId?: string;
  horizonDays?: number;
  requestedBy?: string;
  createdAt?: string;
  completedAt?: string;
  generatedRequirementCount?: number;
  evaluatedItemCount?: number;
  errorMessage?: string;
}

@Component({
  selector: 'app-replenishment',
  standalone: false,
  templateUrl: './replenishment.component.html',
  styleUrls: ['./replenishment.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplenishmentComponent implements OnInit, OnDestroy {
  facilityId = '';
  horizonDays = 30;
  runningMrp = signal<boolean>(false);
  facilities = signal<any[]>([]);

  runs = signal<ReplenishmentRunJob[]>([]);
  totalRuns = signal<number>(0);
  runsPagination = { page: 0, size: 20 };
  loadingRuns = signal<boolean>(false);
  loadingFacilities = signal<boolean>(false);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  runColumns = [
    'id',
    'status',
    'facilityId',
    'requestedBy',
    'generatedRequirementCount',
    'createdAt',
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private replenishmentService: ReplenishmentService,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
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
    this.loadRuns();
    this.refreshTimer = setInterval(() => {
      this.loadRuns();
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  runMrp(): void {
    if (!this.facilityId) {
      this.snackbarService.showError(this.translate.instant('REPLENISHMENT.SELECT_FACILITY_ERROR'));
      return;
    }
    this.runningMrp.set(true);
    this.replenishmentService
      .runMrp(this.trimOrUndefined(this.facilityId), this.horizonDays)
      .pipe(
        finalize(() => {
          this.runningMrp.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('REPLENISHMENT.RUN_SUBMITTED_SUCCESS'));
          this.loadRuns();
        },
        error: (_err) => {
          this.snackbarService.showError(this.translate.instant('REPLENISHMENT.RUN_SUBMITTED_ERROR'));
        },
      });
  }

  loadRuns(): void {
    this.loadingRuns.set(true);
    this.replenishmentService
      .listRuns(this.runsPagination.page, this.runsPagination.size)
      .pipe(
        finalize(() => this.loadingRuns.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.runs.set(Array.isArray(response?.items) ? response.items : []);
          this.totalRuns.set(Number(response?.total ?? 0));
        },
        error: (err) => {
          console.error('Failed to load replenishment runs', err);
          this.runs.set([]);
          this.totalRuns.set(0);
        },
      });
  }

  onRunsPageChange(event: PageEvent): void {
    this.runsPagination.page = event.pageIndex;
    this.runsPagination.size = event.pageSize;
    this.loadRuns();
  }

  getFacilityLabel(facility: any): string {
    if (!facility) {
      return '';
    }
    const facilityId = facility?.facilityId || facility?.id || '';
    const facilityName = facility?.facilityName || facility?.description || '';
    return facilityName || facilityId;
  }

  private trimOrUndefined(value: string | null | undefined): string | undefined {
    const text = (value || '').trim();
    return text.length ? text : undefined;
  }
}
