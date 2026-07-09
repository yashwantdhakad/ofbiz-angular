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
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from '../../common/material/material.module';

@Component({
  selector: 'app-report-chart-grid',
  standalone: true,
  imports: [CommonModule, MaterialModule, TranslateModule],
  templateUrl: './report-chart-grid.component.html',
  styleUrls: ['./report-chart-grid.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportChartGridComponent {
  readonly salesTrend = input<any[]>([]);
  readonly topProducts = input<any[]>([]);
  readonly lowStockByFacility = input<any[]>([]);
  readonly supplierRisk = input<any[]>([]);

  trackByLabel = (_index: number, item: any): string => item?.bucketDate || item?.productId || item?.facilityId || item?.supplierPartyId || `${_index}`;

  formatAmount(value: unknown): string {
    return Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatNumber(value: unknown, maximumFractionDigits = 0): string {
    return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits });
  }

  barWidth(value: unknown, maxValue: number): string {
    const numericValue = Number(value ?? 0);
    if (maxValue <= 0 || numericValue <= 0) {
      return '0%';
    }
    return `${Math.max(8, Math.round((numericValue / maxValue) * 100))}%`;
  }

  maxValue(items: any[], field: string): number {
    return items.reduce((max, item) => Math.max(max, Number(item?.[field] ?? 0)), 0);
  }
}
