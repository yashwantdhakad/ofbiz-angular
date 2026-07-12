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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ReturnService } from '@ofbiz/services/return/return.service';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';

interface ReturnSummary {
  returnId?: string;
  statusId?: string;
  statusDescription?: string;
  orderTypeId?: string;
  returnTypeId?: string;
  returnTypeDescription?: string;
  fromPartyId?: string;
  fromPartyName?: string;
  toPartyId?: string;
  toPartyName?: string;
  destinationFacilityId?: string;
  destinationFacilityName?: string;
  orderId?: string;
  itemCount?: number;
  totalAmount?: number;
  entryDate?: string;
  currencyUomId?: string;
}

interface ReturnItem {
  returnItemSeqId?: string;
  orderItemSeqId?: string;
  orderId?: string;
  orderTypeId?: string;
  shipmentId?: string;
  inventoryItemId?: string;
  inventoryItemIds?: string[];
  lotIds?: string[];
  productId?: string;
  productName?: string;
  returnType?: string;
  returnTypeDescription?: string;
  returnTypeId?: string;
  returnQuantity?: number;
  receivedQuantity?: number;
  returnPrice?: number;
  lineTotal?: number;
  statusId?: string;
  statusDescription?: string;
}

interface ReturnDetail {
  summary?: ReturnSummary;
  items?: ReturnItem[];
  statusHistory?: Array<{
    statusId?: string;
    statusDatetime?: string;
    changeByUserLoginId?: string;
  }>;
}

@Component({
  selector: 'app-return-detail',
  standalone: false,
  templateUrl: './return-detail.component.html',
  styleUrls: ['./return-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnDetailComponent implements OnInit {
  returnId = '';
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly statusHistoryEntries = signal<StatusHistoryEntry[]>([]);
  detail: ReturnDetail | null = null;
  errorMessage = '';
  displayedColumns = [
    'returnItemSeqId',
    'orderItemSeqId',
    'shipmentId',
    'inventory',
    'productName',
    'returnType',
    'returnQuantity',
    'receivedQuantity',
    'returnPrice',
    'lineTotal',
    'status',
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private returnService: ReturnService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.returnId = (params.get('returnId') || '').trim();
      if (!this.returnId) {
        return;
      }
      this.loadReturn(this.returnId);
    });
  }

  loadReturn(returnId: string): void {
    this.loading.set(true);
    this.errorMessage = '';
    this.cdr.markForCheck();
    this.returnService.getReturn(returnId)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.detail = response || null;
          this.statusHistoryEntries.set(this.mapStatusHistory(response?.statusHistory));
          this.errorMessage = '';
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.detail = null;
          this.statusHistoryEntries.set([]);
          this.errorMessage = error?.error?.detail || error?.error?.message || error?.message || 'Unable to load return details.';
          this.cdr.markForCheck();
        },
      });
  }

  getOrderLink(orderId?: string | null, orderTypeId?: string | null): string[] | null {
    const id = String(orderId || '').trim();
    if (!id) {
      return null;
    }
    const type = String(orderTypeId || '').toUpperCase();
    if (type.startsWith('PURCHASE')) {
      return ['/pos', id];
    }
    return ['/orders', id];
  }

  getPartyLink(partyId?: string | null, orderTypeId?: string | null, direction: 'from' | 'to' = 'from'): string[] | null {
    const id = String(partyId || '').trim();
    if (!id) {
      return null;
    }
    const type = String(orderTypeId || '').toUpperCase();
    if (type.startsWith('PURCHASE')) {
      return direction === 'from' ? ['/suppliers', id] : ['/customers', id];
    }
    return direction === 'from' ? ['/customers', id] : ['/suppliers', id];
  }

  canReceiveIntoInventory(): boolean {
    const statusId = String(this.detail?.summary?.statusId || '').toUpperCase();
    if (statusId !== 'RETURN_ACCEPTED' && statusId !== 'SUP_RETURN_ACCEPTED') {
      return false;
    }
    return Array.isArray(this.detail?.items)
      && this.detail.items.some((item: ReturnItem) => Number(item?.returnQuantity || 0) > Number(item?.receivedQuantity || 0));
  }

  canReviewReturn(): boolean {
    const statusId = String(this.detail?.summary?.statusId || '').toUpperCase();
    return statusId === 'RETURN_REQUESTED' || statusId === 'SUP_RETURN_REQUESTED';
  }

  acceptReturn(): void {
    if (!this.returnId || !this.canReviewReturn()) {
      return;
    }
    this.submitting.set(true);
    this.cdr.markForCheck();
    this.returnService.acceptReturn(this.returnId)
      .pipe(
        finalize(() => {
          this.submitting.set(false);
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.detail = response || null;
          this.statusHistoryEntries.set(this.mapStatusHistory(response?.statusHistory));
          this.errorMessage = '';
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = error?.error?.detail || error?.error?.message || error?.message || 'Unable to accept return.';
          this.cdr.markForCheck();
        },
      });
  }

  rejectReturn(): void {
    if (!this.returnId || !this.canReviewReturn()) {
      return;
    }
    this.submitting.set(true);
    this.cdr.markForCheck();
    this.returnService.rejectReturn(this.returnId)
      .pipe(
        finalize(() => {
          this.submitting.set(false);
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.detail = response || null;
          this.statusHistoryEntries.set(this.mapStatusHistory(response?.statusHistory));
          this.errorMessage = '';
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = error?.error?.detail || error?.error?.message || error?.message || 'Unable to reject return.';
          this.cdr.markForCheck();
        },
      });
  }

  getInventoryLink(inventoryItemId?: string | null): string[] | null {
    const id = String(inventoryItemId || '').trim();
    if (!id) {
      return null;
    }
    return ['/assets', id];
  }

  private mapStatusHistory(
    entries?: Array<{ statusId?: string; statusDatetime?: string; changeByUserLoginId?: string }> | null
  ): StatusHistoryEntry[] {
    if (!Array.isArray(entries)) {
      return [];
    }
    return entries
      .filter((entry) => !!entry?.statusId)
      .map((entry) => ({
        statusId: entry.statusId,
        statusLabel: this.humanizeCode(entry.statusId),
        changedAt: entry.statusDatetime,
        changedBy: entry.changeByUserLoginId,
      }));
  }

  private humanizeCode(value?: string | null): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return '-';
    }
    return normalized
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  trackByReturnItem = (_: number, item: any): string => item.returnItemSeqId;
}
