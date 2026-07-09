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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { CompanyService } from '@ofbiz/services/company/company.service';
import { ProductService } from '@ofbiz/services/product/product.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { ProductFacilityService } from '@ofbiz/services/product/product-facility.service';
import { TokenStorageService } from '@ofbiz/services/common/token-storage.service';
import { ReportService } from '@ofbiz/services/report/report.service';
import { ReportChartGridComponent } from '../report/report-chart-grid/report-chart-grid.component';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../common/material/material.module';

interface OnboardingChecklistItem {
  label: string;
  detail: string;
  done: boolean;
}

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, TranslateModule, ReportChartGridComponent, RouterModule, MaterialModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  readonly DAILY_FREE_LIMIT = 100;

  readonly salesTrend = signal<any[]>([]);
  readonly onboardingLoading = signal<boolean>(false);
  readonly onboardingError = signal<boolean>(false);
  readonly onboardingItems = signal<OnboardingChecklistItem[]>([]);
  private readonly destroyRef = inject(DestroyRef);
  constructor(
    private readonly companyService: CompanyService,
    private readonly productService: ProductService,
    private readonly partyService: PartyService,
    private readonly productFacilityService: ProductFacilityService,
    private readonly tokenStorageService: TokenStorageService,
    private readonly reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.companyService.loadContext?.();

    this.reportService.getSalesTrend({ datePreset: 'LAST_7_DAYS' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.salesTrend.set(Array.isArray(result) ? result : []);
        },
        error: () => {
          this.salesTrend.set([]);
        },
      });

    this.loadOnboardingChecklist();
  }

  private loadOnboardingChecklist(): void {
    this.onboardingLoading.set(true);
    this.onboardingError.set(false);

    forkJoin({
      products: this.productService.getProducts(0, '').pipe(catchError(() => of({ documentList: [] } as any))),
      suppliers: this.partyService.getSuppliers(0, '').pipe(catchError(() => of({ resultList: [] } as any))),
    })
      .pipe(
        switchMap(({ products, suppliers }) => {
          const productList = Array.isArray(products?.documentList) ? products.documentList : [];
          const productIds: string[] = productList
            .slice(0, 5)
            .map((item: any) => (item?.productId || '').toString().trim())
            .filter((item: string) => !!item);
          const facilityChecks = productIds.map((productId: string) =>
            this.productFacilityService.getProductFacilities(productId).pipe(catchError(() => of([])))
          );
          return forkJoin({
            products: of(productList),
            suppliers: of(Array.isArray(suppliers?.resultList) ? suppliers.resultList : []),
            facilities: facilityChecks.length > 0 ? forkJoin(facilityChecks) : of([]),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({
      next: ({ products, suppliers, facilities }) => {
        const hasProducts = (products || []).length > 0;
        const hasSupplier = (suppliers || []).length > 0;
        const facilityGroups: any[][] = Array.isArray(facilities) ? facilities : [];
        const hasReorderPoint = facilityGroups.some((productFacilities: any[]) =>
          Array.isArray(productFacilities) &&
          productFacilities.some((facility: any) => Number(facility?.reorderQuantity || 0) > 0)
        );

        this.onboardingItems.set([
          {
            label: 'HOME.ONBOARDING_PRODUCTS_SYNCED',
            detail: 'HOME.ONBOARDING_PRODUCTS_SYNCED_DETAIL',
            done: hasProducts,
          },
          {
            label: 'HOME.ONBOARDING_REORDER_POINTS',
            detail: 'HOME.ONBOARDING_REORDER_POINTS_DETAIL',
            done: hasReorderPoint,
          },
          {
            label: 'HOME.ONBOARDING_SUPPLIER',
            detail: 'HOME.ONBOARDING_SUPPLIER_DETAIL',
            done: hasSupplier,
          },
        ]);
        this.onboardingLoading.set(false);
      },
      error: () => {
        this.onboardingError.set(true);
        this.onboardingLoading.set(false);
      },
    });
  }

}
