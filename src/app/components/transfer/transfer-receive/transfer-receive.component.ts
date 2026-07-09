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
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderService } from '@ofbiz/services/order/order.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { forkJoin, of } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';

interface OrderHeader {
  orderId?: string;
  statusId?: string;
  [key: string]: unknown;
}

interface FacilityLocation {
  locationSeqId?: string;
  facilityId?: string;
  description?: string;
  [key: string]: unknown;
}

interface OrderPart {
  facility?: { facilityId?: string };
  facilityId?: string;
  items?: OrderItem[];
  orderPartSeqId?: string;
  [key: string]: unknown;
}

interface OrderItem {
  orderItemSeqId?: string;
  productId?: string;
  product?: { productName?: string };
  quantity?: number;
  receivedQuantity?: number;
  remainingQuantity?: number;
  [key: string]: unknown;
}

function firstArray<T>(...candidates: unknown[]): T[] {
  return (candidates.find((candidate) => Array.isArray(candidate)) as T[] | undefined) ?? [];
}

@Component({
  standalone: false,
  selector: 'app-transfer-receive',
  templateUrl: './transfer-receive.component.html',
  styleUrls: ['./transfer-receive.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferReceiveComponent implements OnInit {
  orderId: string | undefined;
  orderPrimaryId: string | undefined;
  readonly isLoading = signal(false);
  itemsForm: FormGroup;
  orderHeader: OrderHeader | undefined;
  facilityId: string | undefined;
  fromFacilityId: string | undefined;
  fromFacilityName: string | undefined;
  toFacilityName: string | undefined;
  shippingInstructions: string | undefined;
  shipGroupSeqId: string | undefined;
  allFacilityLocations: FacilityLocation[] = [];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private fb: FormBuilder,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private facilityService: FacilityService
  ) {
    this.itemsForm = this.fb.group({
      items: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    const paramsObservable = this.route.parent ? this.route.parent.params : this.route.params;
    paramsObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.orderPrimaryId = params['id'];
      if (this.orderPrimaryId) {
        this.loadOrderById(this.orderPrimaryId);
      }
    });
  }

  get items(): FormArray {
    return this.itemsForm.get('items') as FormArray;
  }

  loadOrderById(id: string): void {
    this.isLoading.set(true);

    forkJoin({
      displayInfo: this.orderService.getOrderDisplayInfoById(id),
      orderDetail: this.orderService.getOrderById(id),
    })
      .pipe(
        switchMap(({ displayInfo, orderDetail }) => {
          this.orderHeader = displayInfo.orderHeader;
          this.orderId = this.orderHeader?.orderId;
          this.facilityId = displayInfo?.firstPart?.facilityId;
          this.shipGroupSeqId = displayInfo?.firstPart?.orderPartSeqId || '00001';
          this.fromFacilityId = (displayInfo?.orderHeader as Record<string, unknown>)?.['originFacilityId'] as string | undefined;
          this.shippingInstructions = displayInfo?.firstPart?.shippingInstructions;
          this.fromFacilityName = (displayInfo?.firstPart as Record<string, unknown>)?.['originFacilityName'] as string | undefined
            || this.fromFacilityId;
          this.toFacilityName = displayInfo?.firstPart?.facility?.facilityName || this.facilityId;

          const facilityIds: string[] = Array.from(
            new Set<string>(
              [
                ...(orderDetail?.parts || []).map(
                  (part: OrderPart) => part?.facility?.facilityId || part?.facilityId
                ),
                this.facilityId,
              ].filter((fId): fId is string => !!fId)
            )
          );

          if (!facilityIds.length) {
            return of({ orderDetail, allLocations: [] as FacilityLocation[] });
          }

          return forkJoin(
            facilityIds.map((fId: string) =>
              this.facilityService.getFacilityLocations(fId, 0, 1000)
            )
          ).pipe(
            map((locationResponses: { content?: FacilityLocation[]; resultList?: FacilityLocation[] }[]) => ({
              orderDetail,
              allLocations: locationResponses.flatMap((response) =>
                firstArray<FacilityLocation>(response?.content, response?.resultList)
              ),
            }))
          );
        }),
        finalize(() => {
          this.isLoading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ orderDetail, allLocations }) => {
          this.allFacilityLocations = allLocations;

          const itemsFlat: (OrderItem & { facilityId?: string })[] = (
            orderDetail?.parts || []
          ).flatMap((part: OrderPart) =>
            (part.items || []).map((item: OrderItem) => ({
              ...item,
              facilityId: part?.facility?.facilityId || part?.facilityId || this.facilityId,
            }))
          );

          this.items.clear();
          itemsFlat.forEach((item) => {
            this.items.push(
              this.fb.group({
                orderItemSeqId: [item.orderItemSeqId],
                productId: [item.productId],
                productName: [item?.product?.productName],
                quantity: [item.quantity],
                receivedQuantity: [item.receivedQuantity || 0],
                remainingQuantity: [item.remainingQuantity || 0],
                receiveQuantity: [
                  item.remainingQuantity || 0,
                  [Validators.required, Validators.min(0)],
                ],
                locationSeqId: [null],
                lotId: [''],
                expirationDate: [''],
                facilityId: [item.facilityId],
              })
            );
          });
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('TRANSFER.ERROR_LOAD'));
        },
      });
  }

  receiveItems(): void {
    if (!this.orderId || this.itemsForm.invalid) {
      this.itemsForm.markAllAsTouched();
      return;
    }

    const payloadItems = this.items.controls
      .map((group) => group.value)
      .filter((item) => item.receiveQuantity > 0)
      .map((item) => ({
        orderItemSeqId: item.orderItemSeqId,
        productId: item.productId,
        quantity: item.receiveQuantity,
        locationSeqId: item.locationSeqId,
        lotId: item.lotId,
        expirationDate: this.toLocalDateTime(item.expirationDate),
      }));

    if (!payloadItems.length) {
      this.snackbarService.showError(this.translate.instant('TRANSFER.NO_QUANTITIES'));
      return;
    }

    const payload: Record<string, unknown> = {
      facilityId: this.facilityId,
      shipGroupSeqId: this.shipGroupSeqId,
      items: payloadItems,
    };

    this.isLoading.set(true);
    this.orderService
      .receiveTransferOrder(this.orderId, payload)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant('TRANSFER.RECEIVED'));
          if (this.orderPrimaryId) {
            this.router.navigate([`/transfers/${this.orderPrimaryId}`]);
          }
        },
        error: (err: HttpErrorResponse) => {
          const msg = err?.error?.detail || err?.error?.message || this.translate.instant('TRANSFER.ERROR_RECEIVE');
          this.snackbarService.showError(msg);
        },
      });
  }

  getLocationsForItem(row: { value?: { facilityId?: string } }): FacilityLocation[] {
    const fId = row?.value?.facilityId || this.facilityId;
    if (!fId) {
      return this.allFacilityLocations;
    }
    return this.allFacilityLocations.filter(
      (location: FacilityLocation) => location.facilityId === fId
    );
  }

  cancel(): void {
    if (this.orderPrimaryId) {
      this.router.navigate([`/transfers/${this.orderPrimaryId}`]);
    } else {
      this.router.navigate(['/transfers']);
    }
  }

  private toLocalDateTime(value: Date | string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
  }

  trackByIndex = (index: number): number => index;
}
