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
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { of } from 'rxjs';
import { catchError, finalize, map, tap, timeout } from 'rxjs/operators';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

@Component({
  standalone: false,
  selector: 'app-boms',
  templateUrl: './boms.component.html',
  styleUrls: ['./boms.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BomsComponent implements OnInit {
  isLoading = signal<boolean>(false);
  productFilter = signal('');
  selectedBomType = signal('');
  bomTypes = signal<any[]>([]);
  boms = signal<any[]>([]);
  pagination = signal({
    page: 1,
    rowsPerPage: 10,
  });
  pages = signal<number>(0);

  columns = [
    { key: 'bomId', label: 'BOM.ID' },
    { key: 'product', label: 'BOM.PRODUCT' },
  ];

  constructor(
    private manufacturingService: ManufacturingService,
    private renderScheduler: RenderSchedulerService
  ) { }

  ngOnInit(): void {
    this.loadBomTypes();
    this.loadBoms();
  }

  loadBomTypes(): void {
    this.manufacturingService.getProductAssocTypes().subscribe({
      next: (types) => {
        const list = Array.isArray(types) ? types : [];
        this.renderScheduler.deferMacrotask(() => {
          this.bomTypes.set(list.filter((type: any) => this.isBomType(type?.productAssocTypeId)));
        });
      },
      error: () => {
        this.renderScheduler.deferMacrotask(() => {
          this.bomTypes.set([]);
        });
      },
    });
  }

  loadBoms(): void {
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });
    this.manufacturingService
      .getBoms(
        this.pagination().page - 1,
        this.pagination().rowsPerPage,
        this.productFilter(),
        this.selectedBomType()
      )
      .pipe(
        timeout(15000),
        catchError((_error) => {
          return of({ documentList: [], documentListCount: 0 });
        }),
        map((response: any) => ({
          items: this.extractItems(response),
          total: this.extractTotal(response),
        })),
        tap(({ items, total }) => {
          this.renderScheduler.deferMacrotask(() => {
            const mapped = items.map((item: any) => ({
              bomId: item.productId,
              bomName: item.productName || item.productId,
              productId: item.productId,
              productName: item.productName || item.productId,
              bomType: item.bomTypeId,
              bomTypeLabel: item.bomTypeLabel || item.bomTypeId,
            }));
            this.boms.set(mapped);
            this.pages.set(total);
          });
        }),
        finalize(() => {
          this.renderScheduler.deferMacrotask(() => {
            this.isLoading.set(false);
          });
        })
      )
      .subscribe();
  }

  applyFilters(): void {
    this.pagination.update((state) => ({ ...state, page: 1 }));
    this.loadBoms();
  }

  clearFilters(): void {
    this.productFilter.set('');
    this.selectedBomType.set('');
    this.pagination.update((state) => ({ ...state, page: 1 }));
    this.applyFilters();
  }

  onPageChange(pageIndex: number): void {
    this.pagination.update((state) => ({ ...state, page: pageIndex + 1 }));
    this.loadBoms();
  }

  private isBomType(typeId?: string): boolean {
    const value = (typeId || '').toUpperCase();
    return value.includes('BOM') || value.includes('COMPONENT');
  }

  private extractItems(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.documentList)) return response.documentList;
    if (Array.isArray(response?.resultList)) return response.resultList;
    if (Array.isArray(response?.responseMap?.resultList)) return response.responseMap.resultList;
    if (Array.isArray(response?.content)) return response.content;
    return [];
  }

  private extractTotal(response: any): number {
    if (typeof response?.documentListCount === 'number') return response.documentListCount;
    if (typeof response?.totalElements === 'number') return response.totalElements;
    if (typeof response?.responseMap?.total === 'number') return response.responseMap.total;
    return this.extractItems(response).length;
  }

  trackByBomType = (index: number, type: any): string =>
    type?.productAssocTypeId ?? String(index);
}
