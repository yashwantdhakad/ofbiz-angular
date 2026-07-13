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
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../common/api.service';

export interface ReportFilters {
  datePreset?: string;
  fromDate?: string | null;
  toDate?: string | null;
  facilityId?: string | null;
}

export interface TrialBalanceReportItem {
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
}

export interface ProfitLossReportItem {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface ProfitLossReport {
  revenueItems: ProfitLossReportItem[];
  totalRevenue: number;
  cogsItems: ProfitLossReportItem[];
  totalCogs: number;
  grossProfit: number;
  expenseItems: ProfitLossReportItem[];
  totalExpenses: number;
  netProfit: number;
}

export interface CashflowForecastBucket {
  bucketDate: string;
  expectedInflow: number;
  expectedOutflow: number;
  netCashFlow: number;
  inflowDocumentCount: number;
  outflowDocumentCount: number;
}

export interface CashflowForecastSummary {
  fromDate: string;
  thruDate: string;
  expectedInflow: number;
  expectedOutflow: number;
  netCashFlow: number;
  inflowDocumentCount: number;
  outflowDocumentCount: number;
  currencyUomId: string;
}

export interface CashflowForecastResponse {
  summary: CashflowForecastSummary;
  buckets: CashflowForecastBucket[];
}

export interface VendorPerformanceItem {
  supplierPartyId: string;
  supplierName: string;
  purchaseOrderCount: number;
  openPurchaseOrderCount: number;
  purchaseOrderValue: number;
  openPurchaseOrderValue: number;
  receiptCount: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  onTimeReceiptRate: number;
  averageDeliveryDelayDays: number;
  purchaseInvoiceValue: number;
  priceVarianceAmount: number;
  priceVarianceRate: number;
  qualityRejectionRate: number;
  score: number;
}

export interface VendorPerformanceResponse {
  items: VendorPerformanceItem[];
  totalCount: number;
  averageScore: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  constructor(private apiService: ApiService) {}

  getSalesOverview(filters: ReportFilters): Observable<any> {
    return this.apiService.get(`/common/reports/sales/overview${this.toQueryString(filters, false)}`).pipe(
      map((response: any) => this.unwrap(response)?.overview ?? this.unwrap(response))
    );
  }

  getSalesTrend(filters: ReportFilters): Observable<any[]> {
    return this.apiService.get(`/common/reports/sales/trend${this.toQueryString(filters, false)}`).pipe(
      map((response: any) => this.toItems(response))
    );
  }

  getTopProducts(filters: ReportFilters, limit: number = 8): Observable<any[]> {
    return this.apiService.get(`/common/reports/sales/top-products${this.toQueryString(filters, false, { limit: String(limit) })}`).pipe(
      map((response: any) => this.toItems(response))
    );
  }

  getSupplierRisk(filters: ReportFilters, limit: number = 10): Observable<any[]> {
    return this.apiService.get(`/common/reports/sales/supplier-risk${this.toQueryString(filters, false, { limit: String(limit) })}`).pipe(
      map((response: any) => this.toItems(response))
    );
  }

  getInventoryOverview(filters: ReportFilters): Observable<any> {
    return this.apiService.get(`/common/reports/inventory/overview${this.toQueryString(filters, true)}`).pipe(
      map((response: any) => this.unwrap(response)?.overview ?? this.unwrap(response))
    );
  }

  getLowStockByFacility(limit: number = 8): Observable<any[]> {
    return this.apiService.get(`/common/reports/inventory/low-stock-by-facility${this.toQueryString({}, true, { limit: String(limit) })}`).pipe(
      map((response: any) => this.toItems(response))
    );
  }

  getSupplierReturnSignals(filters: ReportFilters, limit: number = 10): Observable<any[]> {
    return this.apiService.get(`/common/reports/inventory/supplier-return-signals${this.toQueryString(filters, false, { limit: String(limit) })}`).pipe(
      map((response: any) => this.toItems(response))
    );
  }

  getTrialBalance(fromDate?: string | null, toDate?: string | null): Observable<TrialBalanceReportItem[]> {
    const params = new URLSearchParams();
    if (fromDate) {
      params.append('fromDate', fromDate);
    }
    if (toDate) {
      params.append('toDate', toDate);
    }
    const query = params.toString();
    const suffix = query.length > 0 ? `?${query}` : '';
    return this.apiService.get(`/common/reports/accounting/trial-balance${suffix}`).pipe(
      map((response: any) => this.toItems(response) as TrialBalanceReportItem[])
    );
  }

  getProfitLossReport(fromDate?: string | null, toDate?: string | null): Observable<ProfitLossReport> {
    const params = new URLSearchParams();
    if (fromDate) {
      params.append('fromDate', fromDate);
    }
    if (toDate) {
      params.append('toDate', toDate);
    }
    const query = params.toString();
    const suffix = query.length > 0 ? `?${query}` : '';
    return this.apiService.getOms<ProfitLossReport>(`/accounting/profit-loss${suffix}`);
  }

  getCashflowForecast(fromDate?: string | null, thruDate?: string | null): Observable<CashflowForecastResponse> {
    const params = new URLSearchParams();
    if (fromDate) {
      params.append('fromDate', fromDate);
    }
    if (thruDate) {
      params.append('thruDate', thruDate);
    }
    const query = params.toString();
    const suffix = query.length > 0 ? `?${query}` : '';
    return this.apiService.get(`/common/reports/cashflow/forecast${suffix}`).pipe(
      map((response: any) => this.unwrap(response) as CashflowForecastResponse)
    );
  }

  getVendorPerformance(
    fromDate?: string | null,
    thruDate?: string | null,
    limit: number = 10
  ): Observable<VendorPerformanceResponse> {
    const params = new URLSearchParams();
    if (fromDate) {
      params.append('fromDate', fromDate);
    }
    if (thruDate) {
      params.append('thruDate', thruDate);
    }
    params.append('limit', String(limit));
    return this.apiService.get(`/common/reports/vendors/performance?${params.toString()}`).pipe(
      map((response: any) => this.unwrap(response) as VendorPerformanceResponse)
    );
  }

  private unwrap(response: any): any {
    return response?.data ?? response;
  }

  private toItems(response: any): any[] {
    const data = this.unwrap(response);
    if (Array.isArray(data)) {
      return data;
    }
    return Array.isArray(data?.items) ? data.items : [];
  }

  private toQueryString(
    filters: ReportFilters,
    inventoryOnly: boolean,
    extraParams: Record<string, string> = {}
  ): string {
    const params = new URLSearchParams();

    if (!inventoryOnly && filters.datePreset) {
      params.append('datePreset', filters.datePreset);
    }
    if (!inventoryOnly && filters.fromDate) {
      params.append('fromDate', filters.fromDate);
    }
    if (!inventoryOnly && filters.toDate) {
      params.append('toDate', filters.toDate);
    }
    if (filters.facilityId) {
      params.append('facilityId', filters.facilityId);
    }

    Object.entries(extraParams).forEach(([key, value]) => params.append(key, value));

    const query = params.toString();
    return query.length > 0 ? `?${query}` : '';
  }
}
