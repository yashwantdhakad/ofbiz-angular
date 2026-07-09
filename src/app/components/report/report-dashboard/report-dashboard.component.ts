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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ReportFilters, ReportService } from '@ofbiz/services/report/report.service';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { MaterialModule } from '../../common/material/material.module';
import { ReportChartGridComponent } from '../report-chart-grid/report-chart-grid.component';

type DatePreset = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'YTD' | 'TODAY' | 'CUSTOM';

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule, MaterialModule, ReportChartGridComponent],
  templateUrl: './report-dashboard.component.html',
  styleUrls: ['./report-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDashboardComponent implements OnInit {
  readonly loading = signal<boolean>(false);
  readonly hasSearched = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly facilities = signal<any[]>([]);
  readonly salesOverview = signal<any | null>(null);
  readonly inventoryOverview = signal<any | null>(null);
  readonly salesTrend = signal<any[]>([]);
  readonly topProducts = signal<any[]>([]);
  readonly lowStockByFacility = signal<any[]>([]);
  readonly supplierRisk = signal<any[]>([]);

  readonly filterForm = new FormGroup({
    datePreset: new FormControl<DatePreset>('LAST_30_DAYS', { nonNullable: true }),
    fromDate: new FormControl<Date | null>(null),
    toDate: new FormControl<Date | null>(null),
    facilityId: new FormControl<string>('', { nonNullable: true }),
  });

  readonly showCustomDateRange = computed(() => this.filterForm.controls.datePreset.value === 'CUSTOM');
  readonly summaryCards = computed(() => {
    const sales = this.salesOverview();
    const inventory = this.inventoryOverview();

    return [
      { label: 'REPORTS.TOTAL_REVENUE', value: sales?.totalRevenue ?? 0, format: 'amount' },
      { label: 'REPORTS.TOTAL_ORDERS', value: sales?.totalOrders ?? 0, format: 'count' },
      { label: 'REPORTS.AVG_ORDER_VALUE', value: sales?.averageOrderValue ?? 0, format: 'amount' },
      { label: 'REPORTS.PENDING_PO_RECEIPTS', value: sales?.pendingPoReceiptsCount ?? 0, format: 'count' },
      { label: 'REPORTS.PRODUCTS_TRACKED', value: inventory?.productsTracked ?? 0, format: 'count' },
      { label: 'REPORTS.TOTAL_ON_HAND', value: inventory?.totalOnHandQty ?? 0, format: 'number' },
      { label: 'REPORTS.LOW_STOCK_ALERTS', value: inventory?.lowStockCount ?? 0, format: 'count' },
      { label: 'REPORTS.OVERDUE_JOBS', value: inventory?.overdueJobsCount ?? 0, format: 'count' },
      { label: 'REPORTS.RETURNS_IN_RANGE', value: inventory?.returnsCount ?? 0, format: 'count' },
      { label: 'REPORTS.INSPECTION_PENDING_ITEMS', value: inventory?.inspectionPendingCount ?? 0, format: 'count' },
      { label: 'REPORTS.INSPECTION_PENDING_QTY', value: inventory?.inspectionPendingQty ?? 0, format: 'number' },
    ];
  });

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly reportService: ReportService,
    private readonly commonService: CommonService,
    private readonly preferredFacilityService: PreferredFacilityService,
  ) {}

  ngOnInit(): void {
    this.loadFacilities();
  }
  applyFilters(): void {
    this.hasSearched.set(true);
    this.loadReports();
  }

  resetFilters(): void {
    this.filterForm.setValue({
      datePreset: 'LAST_30_DAYS',
      fromDate: null,
      toDate: null,
      facilityId: this.preferredFacilityService.resolveInitialFacilityId(this.facilities()),
    });
    this.hasSearched.set(false);
    this.errorMessage.set(null);
    this.resetReportState();
    this.loading.set(false);
  }

  formatCardValue(card: { value: any; format: string }): string {
    const numericValue = Number(card.value ?? 0);
    if (card.format === 'amount') {
      return numericValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (card.format === 'number') {
      return numericValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return numericValue.toLocaleString();
  }

  private loadFacilities(): void {
    this.commonService.getFacilities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: any[]) => {
          const facilities = Array.isArray(items) ? items : [];
          this.facilities.set(facilities);
          if (!this.filterForm.controls.facilityId.value && facilities.length > 0) {
            this.filterForm.controls.facilityId.setValue(
              this.preferredFacilityService.resolveInitialFacilityId(facilities)
            );
          }
        },
        error: () => this.facilities.set([]),
      });
  }

  private loadReports(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters = this.buildFilters();
    forkJoin({
      salesOverview: this.reportService.getSalesOverview(filters),
      salesTrend: this.reportService.getSalesTrend(filters),
      topProducts: this.reportService.getTopProducts(filters),
      supplierRisk: this.reportService.getSupplierRisk(filters),
      supplierReturnSignals: this.reportService.getSupplierReturnSignals(filters),
      inventoryOverview: this.reportService.getInventoryOverview(filters),
      lowStockByFacility: this.reportService.getLowStockByFacility(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.salesOverview.set(result.salesOverview);
          this.salesTrend.set(Array.isArray(result.salesTrend) ? result.salesTrend : []);
          this.topProducts.set(Array.isArray(result.topProducts) ? result.topProducts : []);
          this.supplierRisk.set(this.mergeSupplierRisk(result.supplierRisk, result.supplierReturnSignals));
          this.inventoryOverview.set(result.inventoryOverview);
          this.lowStockByFacility.set(Array.isArray(result.lowStockByFacility) ? result.lowStockByFacility : []);
          this.loading.set(false);
        },
        error: () => {
          this.resetReportState();
          this.errorMessage.set('REPORTS.LOAD_ERROR');
          this.loading.set(false);
        },
      });
  }

  private resetReportState(): void {
    this.salesOverview.set(null);
    this.salesTrend.set([]);
    this.topProducts.set([]);
    this.inventoryOverview.set(null);
    this.lowStockByFacility.set([]);
    this.supplierRisk.set([]);
  }

  private buildFilters(): ReportFilters {
    const datePreset = this.filterForm.controls.datePreset.value;
    const fromDate = this.filterForm.controls.fromDate.value;
    const toDate = this.filterForm.controls.toDate.value;
    const facilityId = this.filterForm.controls.facilityId.value;

    return {
      datePreset: datePreset === 'CUSTOM' ? undefined : datePreset,
      fromDate: fromDate ? this.toDateString(fromDate) : null,
      toDate: toDate ? this.toDateString(toDate) : null,
      facilityId: facilityId || null,
    };
  }

  private mergeSupplierRisk(supplierRisk: any[], supplierReturnSignals: any[]): any[] {
    const baseItems = Array.isArray(supplierRisk) ? supplierRisk : [];
    const returnMap = new Map<string, any>();
    (Array.isArray(supplierReturnSignals) ? supplierReturnSignals : []).forEach((item) => {
      if (item?.supplierPartyId) {
        returnMap.set(item.supplierPartyId, item);
      }
    });

    return baseItems
      .map((item) => {
        const returnSignal = returnMap.get(item.supplierPartyId);
        const returnsCount = Number(returnSignal?.returnsCount ?? 0);
        const returnedQty = Number(returnSignal?.returnedQty ?? 0);
        const latePurchaseOrdersCount = Number(item?.latePurchaseOrdersCount ?? 0);
        const openPurchaseOrdersCount = Number(item?.openPurchaseOrdersCount ?? 0);
        const oldestOpenPoDays = Number(item?.oldestOpenPoDays ?? 0);
        const riskScore =
          (latePurchaseOrdersCount * 5) +
          (returnsCount * 4) +
          openPurchaseOrdersCount +
          (Math.min(oldestOpenPoDays, 60) / 10);

        return {
          ...item,
          returnsCount,
          returnedQty,
          riskScore: Number(riskScore.toFixed(1)),
        };
      })
      .sort((left, right) => right.riskScore - left.riskScore)
      .slice(0, 10);
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
