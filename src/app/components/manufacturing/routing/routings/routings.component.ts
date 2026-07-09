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
import { Router } from '@angular/router';
import { ManufacturingService } from '../../../../services/manufacturing/manufacturing.service';
import { PageEvent } from '@angular/material/paginator';
import { of } from 'rxjs';
import { catchError, finalize, timeout } from 'rxjs/operators';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

@Component({
  standalone: false,
  selector: 'app-routings',
  templateUrl: './routings.component.html',
  styleUrls: ['./routings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutingsComponent implements OnInit {
  routings = signal<any[]>([]);
  displayedColumns: string[] = ['id', 'routing', 'description', 'deliverableProducts', 'qtyToProduce'];

  pagination = signal({
    pageIndex: 0,
    pageSize: 10,
  });
  totalElements = signal<number>(0);

  searchQuery = signal('');
  deliverableProductFilter = signal('');
  deliverableProducts = signal<any[]>([]);

  isLoading = signal<boolean>(false);

  constructor(
    private manufacturingService: ManufacturingService,
    private router: Router,
    private renderScheduler: RenderSchedulerService
  ) { }

  ngOnInit(): void {
    this.loadRoutings();
  }

  loadRoutings(): void {
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });
    this.manufacturingService
      .getRoutings(
        this.pagination().pageIndex,
        this.pagination().pageSize,
        this.searchQuery(),
        this.deliverableProductFilter()
      )
      .pipe(
        timeout(15000),
        catchError((error) => {
          console.error('Error loading routings:', error);
          return of({ documentList: [], totalElements: 0 });
        }),
        finalize(() => {
          this.renderScheduler.deferMacrotask(() => {
            this.isLoading.set(false);
          });
        })
      )
      .subscribe({
        next: (response) => {
          this.renderScheduler.deferMacrotask(() => {
            const routingList = Array.isArray(response?.documentList) ? response.documentList : [];
            this.routings.set(routingList);
            this.totalElements.set(response?.totalElements || 0);
            this.deliverableProducts.set(this.extractDeliverableProducts(routingList));
          });
        }
      });
  }

  onSearch(): void {
    this.pagination.update((state) => ({ ...state, pageIndex: 0 }));
    this.loadRoutings();
  }

  onPageChange(event: PageEvent): void {
    this.pagination.set({
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
    });
    this.loadRoutings();
  }

  onFilterChange(): void {
    this.pagination.update((state) => ({ ...state, pageIndex: 0 }));
    this.loadRoutings();
  }

  navigateToCreate(): void {
    this.router.navigate(['/routings/create']);
  }

  navigateToDetail(workEffortId: string): void {
    this.router.navigate(['/routings', workEffortId]);
  }

  trackByDeliverableProduct = (_: number, product: any): any =>
    product?.productId ?? product?.id ?? _;

  trackByRouting = (_: number, routing: any): any =>
    routing?.workEffortId ?? routing?.id ?? _;

  private extractDeliverableProducts(routings: any[]): any[] {
    const seen = new Set<string>();
    return routings
      .flatMap((routing: any) => Array.isArray(routing?.deliverableProducts) ? routing.deliverableProducts : [])
      .filter((product: any) => {
        const productId = String(product?.productId || '');
        if (!productId || seen.has(productId)) {
          return false;
        }
        seen.add(productId);
        return true;
      });
  }
}
