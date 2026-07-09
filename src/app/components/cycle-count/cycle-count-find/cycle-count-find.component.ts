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
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CycleCountService, CycleCountSessionListItem } from '@ofbiz/services/cycle-count/cycle-count.service';
import { PageEvent } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';

@Component({
  selector: 'app-cycle-count-find',
  standalone: false,
  templateUrl: './cycle-count-find.component.html',
  styleUrls: ['./cycle-count-find.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CycleCountFindComponent implements OnInit {
  readonly facilities = this.referenceDataStore.facilities;
  selectedFacilityId = '';

  sessionId = '';
  sessionLocation = '';
  selectedStatus = '';
  statusOptions = ['', 'CREATED', 'PENDING_REVIEW', 'COMPLETED', 'REJECTED'];

  sessions = signal<any[]>([]);
  sessionTotal = signal(0);
  sessionPageIndex = signal(0);
  sessionPageSize = signal(20);
  sessionPageSizeOptions = [10, 20, 50, 100];

  loadingSessions = signal(false);
  sessionColumns = ['sessionId', 'facilityId', 'statusId', 'createdDate', 'locations', 'counted'];

  constructor(
    private cycleCountService: CycleCountService,
    private snackbar: SnackbarService,
    private router: Router,
    private translate: TranslateService,
    private referenceDataStore: ReferenceDataStore,
  ) {
    effect(() => {
      const facilities = this.facilities();
      if (!this.selectedFacilityId && facilities.length > 0) {
        this.selectedFacilityId = facilities[0]?.facilityId || '';
        if (this.selectedFacilityId) {
          this.searchSessions();
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
    this.selectedFacilityId = value || '';
    this.sessionPageIndex.set(0);
    this.searchSessions();
  }

  searchSessions(): void {
    this.loadingSessions.set(true);
    this.cycleCountService.findSessions({
      sessionId: this.sessionId || undefined,
      facilityId: this.selectedFacilityId || undefined,
      location: this.sessionLocation || undefined,
      statuses: this.selectedStatus ? [this.selectedStatus] : undefined,
      page: this.sessionPageIndex(),
      size: this.sessionPageSize(),
    }).pipe(finalize(() => {
      this.loadingSessions.set(false);
    })).subscribe({
      next: (response) => {
        this.sessions.set(Array.isArray((response as any)?.items) ? (response as any).items : []);
        this.sessionTotal.set(Number(response?.total || 0));
      },
      error: () => {
        this.sessions.set([]);
        this.sessionTotal.set(0);
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.LOAD_SESSIONS_ERROR'));
      },
    });
  }

  onSessionPage(event: PageEvent): void {
    this.sessionPageIndex.set(event.pageIndex);
    this.sessionPageSize.set(event.pageSize);
    this.searchSessions();
  }

  openSession(session: CycleCountSessionListItem): void {
    if (!session?.sessionId) {
      return;
    }
    if (session.statusId === 'PENDING_REVIEW') {
      this.router.navigate(['/cycle-count/review', session.sessionId]);
      return;
    }
    if (session.statusId === 'COMPLETED' || session.statusId === 'REJECTED') {
      this.router.navigate(['/cycle-count/report', session.sessionId]);
      return;
    }
    this.router.navigate(['/cycle-count/record', session.sessionId]);
  }

  getStatusLabel(statusId?: string): string {
    switch ((statusId || '').toUpperCase()) {
      case 'CREATED':
        return this.translate.instant('COMMON.CREATED');
      case 'PENDING_REVIEW':
        return this.translate.instant('CYCLE_COUNT.PENDING_REVIEW');
      case 'COMPLETED':
        return this.translate.instant('CYCLE_COUNT.COMPLETED');
      case 'REJECTED':
        return this.translate.instant('CYCLE_COUNT.REJECTED');
      default:
        return statusId || '-';
    }
  }
}
