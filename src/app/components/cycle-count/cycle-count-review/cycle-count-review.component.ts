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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CycleCountService } from '@ofbiz/services/cycle-count/cycle-count.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-cycle-count-review',
  standalone: false,
  templateUrl: './cycle-count-review.component.html',
  styleUrls: ['./cycle-count-review.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CycleCountReviewComponent implements OnInit {
  readonly sessionId = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly sessionIdValue = computed(() => this.sessionId()?.get('sessionId') || '');
  detail = signal<any>(null);
  loading = signal(false);
  submitting = signal(false);
  selectedItemSeqIds = signal<string[]>([]);

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cycleCountService: CycleCountService,
    private snackbar: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    if (!this.sessionId()?.get('sessionId')) {
      this.router.navigate(['/cycle-count/find']);
      return;
    }
    this.load();
  }

  get canReview(): boolean {
    return (this.detail()?.statusId || '') === 'PENDING_REVIEW';
  }

  get displayedColumns(): string[] {
    const baseColumns = ['locationSeqId', 'inventoryItemId', 'productIdentifier', 'itemStatusId', 'countedQuantity', 'systemQoh', 'variance'];
    return this.canReview ? [...baseColumns, 'select'] : baseColumns;
  }

  load(): void {
    const sessionId = this.sessionId()?.get('sessionId') || '';
    if (!sessionId) {
      return;
    }
    this.loading.set(true);
    this.cycleCountService.getSession(sessionId).pipe(
      finalize(() => {
        this.loading.set(false);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (detail: any) => {
        this.detail.set(detail);
        this.selectedItemSeqIds.set([]);
      },
      error: () => {
        this.detail.set(null);
        this.selectedItemSeqIds.set([]);
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.REVIEW_LOAD_ERROR'));
      },
    });
  }

  accept(): void {
    if (!this.canReview) {
      return;
    }
    this.submitting.set(true);
    const selectedIds = this.selectedItemSeqIds();
    const sessionId = this.sessionId()?.get('sessionId') || '';
    const request$ = selectedIds.length
      ? this.cycleCountService.acceptItems(sessionId, selectedIds)
      : this.cycleCountService.accept(sessionId);
    request$.pipe(
      finalize(() => {
        this.submitting.set(false);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.selectedItemSeqIds.set([]);
        const statusId = String(detail?.statusId || '').toUpperCase();
        const noItemsPending = (detail?.items || []).every(
          (item: any) => String(item?.itemStatusId || '').toUpperCase() !== 'PENDING_REVIEW'
        );
        if (statusId === 'COMPLETED' || noItemsPending) {
          this.snackbar.showSuccess(
            this.translate.instant('CYCLE_COUNT.ACCEPT_COMPLETE_SUCCESS')
          );
          this.router.navigate(['/cycle-count/report', sessionId]);
          return;
        }
        this.snackbar.showSuccess(this.translate.instant('CYCLE_COUNT.ACCEPT_SUCCESS'));
      },
      error: () => {
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.ACCEPT_ERROR'));
      },
    });
  }

  reject(): void {
    if (!this.canReview) {
      return;
    }
    this.submitting.set(true);
    const selectedIds = this.selectedItemSeqIds();
    const sessionId = this.sessionId()?.get('sessionId') || '';
    const request$ = selectedIds.length
      ? this.cycleCountService.rejectItems(sessionId, selectedIds)
      : this.cycleCountService.reject(sessionId);
    request$.pipe(
      finalize(() => {
        this.submitting.set(false);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.selectedItemSeqIds.set([]);
        if (String(detail?.statusId || '').toUpperCase() === 'COMPLETED') {
          this.snackbar.showSuccess(
            this.translate.instant('CYCLE_COUNT.REJECT_COMPLETE_SUCCESS')
          );
          this.router.navigate(['/cycle-count/report', sessionId]);
          return;
        }
        this.snackbar.showSuccess(this.translate.instant('CYCLE_COUNT.REJECT_SUCCESS'));
        this.router.navigate(['/cycle-count/record', sessionId]);
      },
      error: () => {
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.REJECT_ERROR'));
      },
    });
  }

  isRowSelectable(row: any): boolean {
    return String(row?.itemStatusId || '').toUpperCase() === 'PENDING_REVIEW';
  }

  isSelected(itemSeqId?: string): boolean {
    return !!itemSeqId && this.selectedItemSeqIds().includes(itemSeqId);
  }

  isAllSelected(): boolean {
    const selectableIds = (this.detail()?.items || [])
      .filter((row: any) => this.isRowSelectable(row))
      .map((row: any) => row.inventoryCountItemSeqId);
    return selectableIds.length > 0 && selectableIds.every((id: string) => this.selectedItemSeqIds().includes(id));
  }

  toggleRow(itemSeqId: string, checked: boolean): void {
    this.selectedItemSeqIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(itemSeqId);
      } else {
        next.delete(itemSeqId);
      }
      return Array.from(next);
    });
  }

  toggleAll(checked: boolean): void {
    if (!checked) {
      this.selectedItemSeqIds.set([]);
      return;
    }
    const selectableIds = (this.detail()?.items || [])
      .filter((row: any) => this.isRowSelectable(row))
      .map((row: any) => row.inventoryCountItemSeqId);
    this.selectedItemSeqIds.set(selectableIds);
  }

  getStatusLabel(statusId?: string): string {
    const normalized = String(statusId || '').trim();
    if (!normalized) {
      return '-';
    }
    return normalized.replace(/_/g, ' ');
  }
}
