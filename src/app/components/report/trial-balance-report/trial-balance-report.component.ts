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
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaterialModule } from '../../common/material/material.module';
import { SharedFormatPipesModule } from '../../common/material/shared-format-pipes.module';
import { ReportService, TrialBalanceReportItem } from '@ofbiz/services/report/report.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  selector: 'app-trial-balance-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, MaterialModule, SharedFormatPipesModule],
  templateUrl: './trial-balance-report.component.html',
  styleUrls: ['./trial-balance-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrialBalanceReportComponent implements OnInit {
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly rows = signal<TrialBalanceReportItem[]>([]);
  readonly displayedColumns = ['accountCode', 'accountName', 'accountType', 'totalDebits', 'totalCredits', 'netBalance'];

  readonly filterForm = {
    fromDate: new FormControl<Date | string | null>(this.addDays(new Date(), -29), { nonNullable: true }),
    toDate: new FormControl<Date | string | null>(new Date(), { nonNullable: true }),
  };

  readonly hasRows = computed(() => this.rows().length > 0);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly reportService: ReportService,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const fromStr = this.toDateString(this.filterForm.fromDate.value);
    const toStr = this.toDateString(this.filterForm.toDate.value);
    this.reportService.getTrialBalance(fromStr, toStr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.rows.set(Array.isArray(items) ? items : []);
          this.loading.set(false);
        },
        error: () => {
          this.rows.set([]);
          this.errorMessage.set('REPORTS.LOAD_ERROR');
          this.loading.set(false);
          this.snackbarService.showError(this.translate.instant('REPORTS.LOAD_ERROR'));
        },
      });
  }

  resetFilters(): void {
    this.filterForm.fromDate.setValue(this.addDays(new Date(), -29));
    this.filterForm.toDate.setValue(new Date());
    this.loadReport();
  }

  totalDebits(): number {
    return this.rows().reduce((sum, row) => sum + Number(row.totalDebits || 0), 0);
  }

  totalCredits(): number {
    return this.rows().reduce((sum, row) => sum + Number(row.totalCredits || 0), 0);
  }

  netBalance(): number {
    return this.rows().reduce((sum, row) => sum + Number(row.netBalance || 0), 0);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private toDateString(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
