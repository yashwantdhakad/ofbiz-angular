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
import { TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CycleCountService } from '@ofbiz/services/cycle-count/cycle-count.service';

@Component({
  selector: 'app-cycle-count-record',
  standalone: false,
  templateUrl: './cycle-count-record.component.html',
  styleUrls: ['./cycle-count-record.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CycleCountRecordComponent implements OnInit {
  readonly sessionId = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly sessionIdValue = computed(() => this.sessionId()?.get('sessionId') || '');
  detail = signal<any>(null);
  loading = signal(false);
  saving = signal(false);
  savingRowSeqId = signal<string | null>(null);
  submitting = signal(false);

  displayedColumns = ['inventoryItemId', 'locationSeqId', 'productIdentifier', 'itemStatusId', 'systemQoh', 'variance', 'countedQuantity', 'rowSave'];

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

  get canEdit(): boolean {
    const status = this.detail()?.statusId || '';
    return status === 'CREATED' || status === 'PENDING_REVIEW' || status === 'REJECTED';
  }

  get canOpenReview(): boolean {
    return String(this.detail()?.statusId || '').toUpperCase() !== 'CREATED';
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
        const sessionStatus = String(detail?.statusId || '').toUpperCase();
        if (sessionStatus === 'COMPLETED' || sessionStatus === 'REJECTED') {
          this.router.navigate(['/cycle-count/report', this.sessionIdValue()]);
          return;
        }
        this.detail.set(detail);
      },
      error: () => {
        this.detail.set(null);
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.RECORD_LOAD_ERROR'));
      },
    });
  }

  onCountChange(item: any, value: string | number | null | undefined): void {
    if (value === null || value === undefined) {
      item.countedQuantity = null;
      item.variance = null;
      return;
    }
    const textValue = typeof value === 'string' ? value.trim() : String(value);
    if (textValue === '') {
      item.countedQuantity = null;
      item.variance = null;
      return;
    }
    const num = Number(textValue);
    if (Number.isNaN(num)) {
      return;
    }
    item.countedQuantity = num;
    const systemQoh = Number(item.systemQoh || 0);
    item.variance = Number((num - systemQoh).toFixed(6));
  }

  saveCounts(): void {
    if (!this.detail()?.items?.length) {
      return;
    }
    this.saving.set(true);
    const payload = this.detail().items.map((item: any) => ({
      inventoryCountItemSeqId: item.inventoryCountItemSeqId,
      countedQuantity: item.countedQuantity == null ? null : Number(item.countedQuantity),
    }));
    const sessionId = this.sessionId()?.get('sessionId') || '';

    this.cycleCountService.updateCounts(sessionId, payload).pipe(
      finalize(() => {
        this.saving.set(false);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.snackbar.showSuccess(this.translate.instant('CYCLE_COUNT.SAVE_ALL_SUCCESS'));
      },
      error: () => {
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.SAVE_ALL_ERROR'));
      },
    });
  }

  saveRow(item: any): void {
    if (!item?.inventoryCountItemSeqId) {
      return;
    }
    this.savingRowSeqId.set(item.inventoryCountItemSeqId);
    const sessionId = this.sessionId()?.get('sessionId') || '';
    this.cycleCountService.updateCounts(sessionId, [{
      inventoryCountItemSeqId: item.inventoryCountItemSeqId,
      countedQuantity: item.countedQuantity == null ? null : Number(item.countedQuantity),
    }]).pipe(
      finalize(() => {
        this.savingRowSeqId.set(null);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.snackbar.showSuccess(this.translate.instant('CYCLE_COUNT.SAVE_ROW_SUCCESS'));
      },
      error: () => {
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.SAVE_ROW_ERROR'));
      },
    });
  }

  submit(): void {
    const hasCountedItems = Array.isArray(this.detail()?.items)
      && this.detail().items.some((item: any) => item?.countedQuantity != null);
    if (!hasCountedItems) {
      this.snackbar.showError(this.translate.instant('CYCLE_COUNT.SUBMIT_REQUIRES_COUNT'));
      return;
    }
    this.submitting.set(true);
    const sessionId = this.sessionId()?.get('sessionId') || '';
    this.cycleCountService.submitForReview(sessionId).pipe(
      finalize(() => {
        this.submitting.set(false);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackbar.showSuccess(this.translate.instant('CYCLE_COUNT.SUBMIT_SUCCESS'));
        this.router.navigate(['/cycle-count/review', sessionId]);
      },
      error: () => {
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.SUBMIT_ERROR'));
      },
    });
  }

  isRowEditable(item: any): boolean {
    if (!this.canEdit) {
      return false;
    }
    const status = String(item?.itemStatusId || '').toUpperCase();
    return status !== 'COMPLETED';
  }

  getStatusLabel(statusId?: string): string {
    const normalized = String(statusId || '').trim();
    if (!normalized) {
      return '-';
    }
    return normalized.replace(/_/g, ' ');
  }
}
