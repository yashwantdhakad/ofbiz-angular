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
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap, timeout } from 'rxjs/operators';
import { ReturnService } from '@ofbiz/services/return/return.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  selector: 'app-return-create',
  standalone: false,
  templateUrl: './return-create.component.html',
  styleUrls: ['./return-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnCreateComponent implements OnInit {
  private readonly defaultReturnTypeLabels = ['refund immediately'];
  private readonly defaultReturnReasonLabels = ['did not want item'];
  private readonly defaultReturnItemTypeLabels = ['return product item'];
  private readonly defaultReturnTypeIds = ['RTN_REFUND_IMMED', 'REFUND_IMMEDIATELY'];
  private readonly defaultReturnReasonIds = ['RRC_DID_NOT_WANT', 'DID_NOT_WANT_ITEM'];
  private readonly defaultReturnItemTypeIds = ['RITM_RETURN_ITEM', 'RETURN_PRODUCT_ITEM'];

  orderControl = new FormControl('');
  orderTypeId = 'SALES_ORDER';
  readonly orderOptions = signal<any[]>([]);
  readonly selectedOrder = signal<any | null>(null);
  readonly orderItems = signal<any[]>([]);
  readonly loadingOrderCandidates = signal(false);

  readonly returnTypes = signal<any[]>([]);
  readonly returnReasons = signal<any[]>([]);
  readonly returnItemTypes = signal<any[]>([]);

  readonly loadingOrder = signal(false);
  readonly creatingReturn = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  displayedColumns = [
    'select',
    'productId',
    'productName',
    'orderedQty',
    'returnQty',
    'returnType',
    'returnReason',
    'returnItemType',
    'price',
  ];

  constructor(
    private returnService: ReturnService,
    private route: ActivatedRoute,
    private router: Router,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const orderId = (params.get('orderId') || '').trim();
      const orderTypeId = (params.get('orderTypeId') || '').trim();
      if (orderTypeId) {
        this.orderTypeId = orderTypeId;
      }
      if (orderId) {
        this.orderControl.setValue(orderId, { emitEvent: false });
        this.loadOrder(orderId);
      }
    });

    this.loadLookups();

    this.orderControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((value) => {
          const query = this.normalizeOrderQuery(value);
          if (!query || query.length < 3) {
            this.loadingOrderCandidates.set(false);
            return of([]);
          }
          this.loadingOrderCandidates.set(true);
          return this.returnService.searchOrderCandidates(this.orderTypeId, query).pipe(
            timeout(10000),
            catchError(() => of([])),
            finalize(() => this.loadingOrderCandidates.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.orderOptions.set(Array.isArray(items) ? items : []);
      });
  }

  loadLookups(): void {
    this.returnService.listReturnTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.returnTypes.set(Array.isArray(items) ? items : []);
        this.applyDefaultsToOrderItems();
      },
    });
    this.returnService.listReturnReasons().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.returnReasons.set(Array.isArray(items) ? items : []);
        this.applyDefaultsToOrderItems();
      },
    });
    this.returnService.listReturnItemTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.returnItemTypes.set(Array.isArray(items) ? items : []);
        this.applyDefaultsToOrderItems();
      },
    });
  }

  selectOrder(order: any): void {
    if (!order?.orderId) {
      return;
    }
    this.orderControl.setValue(order.orderId, { emitEvent: false });
    this.loadOrder(order.orderId);
  }

  loadOrderFromInput(): void {
    const orderId = String(this.orderControl.value || '').trim();
    if (!orderId) {
      return;
    }
    this.loadOrder(orderId);
  }

  loadOrder(orderId: string): void {
    this.loadingOrder.set(true);
    this.returnService.getOrderForReturn(orderId)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.loadingOrder.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (order) => {
          this.selectedOrder.set(order || null);
          this.orderOptions.set([]);
          const items = Array.isArray(order?.items) ? order.items : [];
          const defaultReturnTypeId = this.resolveDefaultOptionId(this.returnTypes(), this.defaultReturnTypeLabels, this.defaultReturnTypeIds);
          const defaultReturnReasonId = this.resolveDefaultOptionId(this.returnReasons(), this.defaultReturnReasonLabels, this.defaultReturnReasonIds);
          const defaultReturnItemTypeId = this.resolveDefaultOptionId(this.returnItemTypes(), this.defaultReturnItemTypeLabels, this.defaultReturnItemTypeIds);
          this.orderItems.set(items.map((item: any) => ({
            ...item,
            selected: false,
            returnQuantity: 1,
            returnTypeId: defaultReturnTypeId,
            returnReasonId: defaultReturnReasonId,
            returnItemTypeId: defaultReturnItemTypeId,
          })));
          this.applyDefaultsToOrderItems();
        },
        error: (error) => {
          this.selectedOrder.set(null);
          this.orderItems.set([]);
          const message = error?.error?.message || this.translate.instant('RETURN.LOAD_ORDER_ERROR');
          this.snackbarService.showError(message);
        },
      });
  }

  canCreate(): boolean {
    return this.orderItems().some((item) => item.selected && Number(item.returnQuantity) > 0) && !this.creatingReturn();
  }

  createReturn(): void {
    const selectedOrder = this.selectedOrder();
    if (!selectedOrder?.orderId) {
      return;
    }

    const selectedItems = this.orderItems()
      .filter((item) => item.selected && Number(item.returnQuantity) > 0)
      .map((item) => ({
        orderItemSeqId: item.orderItemSeqId,
        productId: item.productId,
        returnQuantity: Number(item.returnQuantity),
        returnTypeId: item.returnTypeId || null,
        returnReasonId: item.returnReasonId || null,
        returnItemTypeId: item.returnItemTypeId || null,
        returnPrice: item.unitAmount ?? 0,
        description: item.itemDescription || null,
      }));

    if (!selectedItems.length) {
      return;
    }

    this.creatingReturn.set(true);
    const payload = {
      orderId: selectedOrder.orderId,
      orderTypeId: selectedOrder.orderTypeId || this.orderTypeId,
      fromPartyId: selectedOrder.customerPartyId || selectedOrder.vendorPartyId,
      toPartyId: selectedOrder.vendorPartyId || selectedOrder.customerPartyId,
      destinationFacilityId: selectedOrder.facilityId,
      currencyUomId: selectedOrder.currencyUom || 'USD',
      items: selectedItems,
    };

    this.returnService.createReturn(payload)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.creatingReturn.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const returnId = response?.summary?.returnId;
          if (returnId) {
            this.router.navigate(['/returns', returnId]);
            return;
          }
          this.snackbarService.showSuccess(this.translate.instant('RETURN.CREATE_SUCCESS'));
        },
        error: (error) => {
          const message = error?.error?.message || this.translate.instant('RETURN.CREATE_ERROR');
          this.snackbarService.showError(message);
        },
      });
  }

  displayOrder(option: any): string {
    return option?.orderId || '';
  }

  private normalizeOrderQuery(value: unknown): string {
    if (value && typeof value === 'object') {
      return String((value as any).orderId || '').trim();
    }
    return String(value || '').trim();
  }

  private applyDefaultsToOrderItems(): void {
    const orderItems = this.orderItems();
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return;
    }
    const defaultReturnTypeId = this.resolveDefaultOptionId(this.returnTypes(), this.defaultReturnTypeLabels, this.defaultReturnTypeIds);
    const defaultReturnReasonId = this.resolveDefaultOptionId(this.returnReasons(), this.defaultReturnReasonLabels, this.defaultReturnReasonIds);
    const defaultReturnItemTypeId = this.resolveDefaultOptionId(this.returnItemTypes(), this.defaultReturnItemTypeLabels, this.defaultReturnItemTypeIds);

    this.orderItems.set(orderItems.map((item) => {
      const next = { ...item };
      if (!String(next.returnTypeId || '').trim() && defaultReturnTypeId) {
        next.returnTypeId = defaultReturnTypeId;
      }
      if (!String(next.returnReasonId || '').trim() && defaultReturnReasonId) {
        next.returnReasonId = defaultReturnReasonId;
      }
      if (!String(next.returnItemTypeId || '').trim() && defaultReturnItemTypeId) {
        next.returnItemTypeId = defaultReturnItemTypeId;
      }
      return next;
    }));
  }

  private resolveDefaultOptionId(options: any[], descriptions: string[], preferredIds: string[]): string {
    if (!Array.isArray(options) || options.length === 0) {
      return '';
    }
    const normalizedDescriptions = descriptions.map((v) => v.toLowerCase());
    const byDescription = options.find((item: any) => {
      const desc = String(item?.description || '').trim().toLowerCase();
      return normalizedDescriptions.some((target) => desc.includes(target));
    });
    if (byDescription?.id) {
      return String(byDescription.id);
    }

    const normalizedIds = preferredIds.map((v) => v.toLowerCase());
    const byId = options.find((item: any) => {
      const id = String(item?.id || '').trim().toLowerCase();
      return normalizedIds.includes(id);
    });
    if (byId?.id) {
      return String(byId.id);
    }
    return String(options[0]?.id || '');
  }
}
