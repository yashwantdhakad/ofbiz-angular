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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ReportService, ProfitLossReport } from '@ofbiz/services/report/report.service';
import { MaterialModule } from '../../common/material/material.module';

@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, MaterialModule],
  templateUrl: './profit-loss.component.html',
  styleUrls: ['./profit-loss.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfitLossComponent implements OnInit {
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly reportData = signal<ProfitLossReport | null>(null);

  readonly filterForm = new FormGroup({
    datePreset: new FormControl<string>('YTD', { nonNullable: true }),
    fromDate: new FormControl<Date | null>(null),
    toDate: new FormControl<Date | null>(null),
  });

  readonly showCustomDateRange = computed(() => this.filterForm.controls.datePreset.value === 'CUSTOM');

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly reportService: ReportService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  applyFilters(): void {
    this.loadReport();
  }

  printReport(): void {
    window.print();
  }

  private loadReport(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const preset = this.filterForm.controls.datePreset.value;
    let fromDate: string | null = null;
    let toDate: string | null = null;

    if (preset === 'CUSTOM') {
      const from = this.filterForm.controls.fromDate.value;
      const to = this.filterForm.controls.toDate.value;
      if (from) fromDate = this.toDateString(from);
      if (to) toDate = this.toDateString(to);
    } else {
      // For presets we could calculate on frontend or pass preset to backend
      // But since backend doesn't take datePreset in this endpoint currently, we will calculate here.
      const today = new Date();
      if (preset === 'THIS_MONTH') {
        fromDate = this.toDateString(new Date(today.getFullYear(), today.getMonth(), 1));
        toDate = this.toDateString(today);
      } else if (preset === 'LAST_MONTH') {
        fromDate = this.toDateString(new Date(today.getFullYear(), today.getMonth() - 1, 1));
        toDate = this.toDateString(new Date(today.getFullYear(), today.getMonth(), 0));
      } else if (preset === 'YTD') {
        fromDate = this.toDateString(new Date(today.getFullYear(), 0, 1));
        toDate = this.toDateString(today);
      }
    }

    this.reportService.getProfitLossReport(fromDate, toDate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.reportData.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('REPORTS.LOAD_ERROR');
          this.loading.set(false);
        },
      });
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
