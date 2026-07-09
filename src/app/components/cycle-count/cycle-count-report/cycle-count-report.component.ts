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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { CycleCountService, CycleCountSessionDetail, CycleCountSessionItem, CycleCountVariance } from '@ofbiz/services/cycle-count/cycle-count.service';

@Component({
  selector: 'app-cycle-count-report',
  standalone: false,
  templateUrl: './cycle-count-report.component.html',
  styleUrls: ['./cycle-count-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CycleCountReportComponent implements OnInit {
  sessionId = '';
  detail = signal<CycleCountSessionDetail | null>(null);
  rows: CycleCountVariance[] = [];
  readonly loading = signal(false);
  displayedColumns = ['inventoryCountItemSeqId', 'locationSeqId', 'inventoryItemId', 'productIdentifier', 'systemQuantityOnHand', 'actualQuantityOnHand', 'varianceQuantityOnHand'];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cycleCountService: CycleCountService,
    private snackbar: SnackbarService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (!this.sessionId) {
      this.router.navigate(['/cycle-count/find']);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      report: this.cycleCountService.report(this.sessionId),
      detail: this.cycleCountService.getSession(this.sessionId),
    }).pipe(
      finalize(() => {
        this.loading.set(false);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ report, detail }) => {
        this.detail.set(detail);
        let rows = Array.isArray(report) ? report : [];
        if (rows.length === 0 && Array.isArray(detail?.items)) {
          rows = detail.items.map((item: CycleCountSessionItem) => ({
            inventoryCountItemSeqId: item.inventoryCountItemSeqId,
            inventoryItemId: item.inventoryItemId,
            locationSeqId: item.locationSeqId,
            productId: item.productId,
            productIdentifier: item.productIdentifier,
            systemQuantityOnHand: item.systemQoh,
            actualQuantityOnHand: item.countedQuantity,
            varianceQuantityOnHand: item.variance,
          }));
        }
        this.rows = rows;
      },
      error: () => {
        this.detail.set(null);
        this.rows = [];
        this.snackbar.showError(this.translate.instant('CYCLE_COUNT.REPORT_LOAD_ERROR'));
      },
    });
  }

  get canReturnToRecord(): boolean {
    const status = String(this.detail()?.statusId || '').toUpperCase();
    return status !== 'COMPLETED' && status !== 'REJECTED';
  }

  get canOpenReview(): boolean {
    const status = String(this.detail()?.statusId || '').toUpperCase();
    return status !== 'COMPLETED' && status !== 'REJECTED';
  }
}
