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
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import {
  CycleCountPendingLocationListResponse,
  CycleCountService
} from '@ofbiz/services/cycle-count/cycle-count.service';
import { TranslateService } from '@ngx-translate/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-cycle-count-create',
  standalone: false,
  templateUrl: './cycle-count-create.component.html',
  styleUrls: ['./cycle-count-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CycleCountCreateComponent implements OnInit {
  readonly facilities = this.referenceDataStore.facilities;
  readonly filterForm = this.formBuilder.group({
    facilityId: [''],
    locationSeqId: [''],
    areaId: [''],
    aisleId: [''],
    sectionId: [''],
    levelId: [''],
    positionId: [''],
    notScannedInLastDays: [null as number | null],
    scheduledInNextDays: [null as number | null],
  });

  pendingItems = signal<any[]>([]);
  pendingTotal = signal(0);
  pendingPageIndex = 0;
  pendingPageSize = 20;
  pendingPageSizeOptions = [10, 20, 50, 100];

  selectedLocations = new Set<string>();

  loadingPending = signal(false);
  creatingSession = signal(false);

  pendingColumns = ['select', 'facilityId', 'locationSeqId', 'areaId', 'aisleId', 'sectionId', 'levelId', 'positionId', 'lastCountDate', 'nextCountDate', 'totalItems'];

  constructor(
    private formBuilder: FormBuilder,
    private cycleCountService: CycleCountService,
    private snackbar: SnackbarService,
    private router: Router,
    private translate: TranslateService,
    private referenceDataStore: ReferenceDataStore,
  ) {
    effect(() => {
      const facilities = this.facilities();
      const currentFacilityId = this.filterForm.controls.facilityId.value || '';
      if (!currentFacilityId && facilities.length > 0) {
        const facilityId = facilities[0]?.facilityId || '';
        this.filterForm.patchValue({ facilityId }, { emitEvent: false });
        if (facilityId) {
          this.searchPending();
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadFacilities();
  }

  loadFacilities(): void {
    this.referenceDataStore.ensureFacilitiesLoaded();
  }

  onFacilityChange(value: string): void {
    this.filterForm.patchValue({ facilityId: value || '' }, { emitEvent: false });
    this.pendingPageIndex = 0;
    this.selectedLocations.clear();
    this.searchPending();
  }

  searchPending(): void {
    const filters = this.filterForm.getRawValue();
    if (!filters.facilityId) {
      return;
    }
    this.loadingPending.set(true);
    this.cycleCountService.pendingLocations({
      facilityId: filters.facilityId,
      locationSeqId: filters.locationSeqId || undefined,
      areaId: filters.areaId || undefined,
      aisleId: filters.aisleId || undefined,
      sectionId: filters.sectionId || undefined,
      levelId: filters.levelId || undefined,
      positionId: filters.positionId || undefined,
      notScannedInLastDays: filters.notScannedInLastDays,
      scheduledInNextDays: filters.scheduledInNextDays,
      page: this.pendingPageIndex,
      size: this.pendingPageSize,
    }).pipe(
      timeout(15000),
      finalize(() => {
        this.loadingPending.set(false);
      })
    ).subscribe({
      next: (response: CycleCountPendingLocationListResponse | any) => {
        const items = [response?.items, response?.content].find((candidate: any) => Array.isArray(candidate)) ?? [];
        const total = Number(response?.total ?? response?.totalElements ?? 0);
        this.pendingItems.set(items);
        this.pendingTotal.set(total);
        this.selectedLocations.clear();
      },
      error: () => {
        this.pendingItems.set([]);
        this.pendingTotal.set(0);
        this.selectedLocations.clear();
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.LOAD_PENDING_ERROR'));
      },
    });
  }

  onPendingPage(event: PageEvent): void {
    this.pendingPageIndex = event.pageIndex;
    this.pendingPageSize = event.pageSize;
    this.searchPending();
  }

  toggleLocation(locationSeqId?: string, checked?: boolean): void {
    if (!locationSeqId) {
      return;
    }
    if (checked) {
      this.selectedLocations.add(locationSeqId);
      return;
    }
    this.selectedLocations.delete(locationSeqId);
  }

  isLocationSelected(locationSeqId?: string): boolean {
    return !!locationSeqId && this.selectedLocations.has(locationSeqId);
  }

  toggleAllLocations(checked?: boolean): void {
    if (!checked) {
      this.selectedLocations.clear();
      return;
    }
    this.pendingItems().forEach((item) => {
      if (item?.locationSeqId) {
        this.selectedLocations.add(item.locationSeqId);
      }
    });
  }

  createSession(): void {
    const facilityId = this.filterForm.controls.facilityId.value || '';
    if (!facilityId) {
      this.snackbar.showError(this.translate.instant('CYCLE_COUNT.FACILITY_REQUIRED'));
      return;
    }
    const locationSeqIds = Array.from(this.selectedLocations.values());
    if (locationSeqIds.length === 0) {
      this.snackbar.showError(this.translate.instant('CYCLE_COUNT.SELECT_LOCATION_REQUIRED'));
      return;
    }

    this.creatingSession.set(true);
    this.cycleCountService.createSession({ facilityId, locationSeqIds }).pipe(
      timeout(15000),
      finalize(() => {
        this.creatingSession.set(false);
      })
    ).subscribe({
      next: (session) => {
        this.snackbar.showSuccess(this.translate.instant('CYCLE_COUNT.CREATE_SUCCESS', { sessionId: session?.sessionId || '' }));
        if (session?.sessionId) {
          this.router.navigate(['/cycle-count/record', session.sessionId]);
        }
      },
      error: () => {
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.CREATE_ERROR'));
      },
    });
  }
}
