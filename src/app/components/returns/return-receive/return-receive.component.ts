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
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap, timeout } from 'rxjs/operators';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReturnService } from '@ofbiz/services/return/return.service';

interface ReturnSummary {
  statusId?: string;
  destinationFacilityId?: string;
  destinationFacilityName?: string;
}

interface ReturnItem {
  returnItemSeqId?: string;
  orderItemSeqId?: string;
  productId?: string;
  productName?: string;
  returnQuantity?: number;
  receivedQuantity?: number;
}

interface ReturnDetail {
  summary?: ReturnSummary;
  items?: ReturnItem[];
}

interface FacilityLocation {
  locationSeqId?: string;
  facilityId?: string;
  description?: string;
}

@Component({
  standalone: false,
  selector: 'app-return-receive',
  templateUrl: './return-receive.component.html',
  styleUrls: ['./return-receive.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnReceiveComponent implements OnInit {
  returnId = '';
  readonly isLoading = signal(false);
  itemsForm: FormGroup;
  readonly detail = signal<ReturnDetail | null>(null);
  readonly facilityId = signal<string | null>(null);
  readonly allFacilityLocations = signal<FacilityLocation[]>([]);

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private returnService: ReturnService,
    private facilityService: FacilityService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {
    this.itemsForm = this.fb.group({
      items: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.returnId = (params.get('returnId') || '').trim();
      if (this.returnId) {
        this.loadReturn(this.returnId);
      }
    });
  }

  get items(): FormArray {
    return this.itemsForm.get('items') as FormArray;
  }

  loadReturn(returnId: string): void {
    this.isLoading.set(true);
    this.returnService.getReturn(returnId).pipe(
      switchMap((detail) => {
        this.detail.set(detail || null);
        const facilityId = detail?.summary?.destinationFacilityId || null;
        this.facilityId.set(facilityId);
        if (!facilityId) {
          return of({ detail, locations: { content: [] } });
        }
        return forkJoin({
          detail: of(detail),
          locations: this.facilityService.getFacilityLocations(facilityId, 0, 1000),
        });
      }),
      timeout(20000),
      finalize(() => {
        this.isLoading.set(false);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ detail, locations }) => {
        const statusId = String(detail?.summary?.statusId || '').toUpperCase();
        const items: ReturnItem[] = Array.isArray(detail?.items) ? detail.items : [];
        const eligibleItems = items.filter((item: ReturnItem) =>
          Number(item?.returnQuantity || 0) > Number(item?.receivedQuantity || 0)
        );
        if (statusId !== 'RETURN_ACCEPTED' && statusId !== 'SUP_RETURN_ACCEPTED') {
          this.snackbarService.showError(this.translate.instant('RETURN.RECEIVE_ONLY_ACCEPTED'));
          this.router.navigate(['/returns', returnId]);
          return;
        }
        if (!eligibleItems.length) {
          this.snackbarService.showError(this.translate.instant('RETURN.RECEIVE_NO_REMAINING'));
          this.router.navigate(['/returns', returnId]);
          return;
        }

        this.allFacilityLocations.set(Array.isArray(locations?.content) ? locations.content : []);
        this.items.clear();
        eligibleItems.forEach((item: ReturnItem) => {
          const remainingQuantity = Number(item?.returnQuantity || 0) - Number(item?.receivedQuantity || 0);
          this.items.push(this.fb.group({
            returnItemSeqId: [item.returnItemSeqId],
            orderItemSeqId: [item.orderItemSeqId],
            productId: [item.productId],
            productName: [item.productName],
            returnQuantity: [item.returnQuantity],
            receivedQuantity: [item.receivedQuantity || 0],
            remainingQuantity: [remainingQuantity],
            receiveQuantity: [remainingQuantity, [Validators.required, Validators.min(0)]],
            locationSeqId: [null, Validators.required],
            lotId: [''],
            expirationDate: [''],
          }));
        });
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('RETURN.LOAD_ERROR'));
      },
    });
  }

  receiveItems(): void {
    const facilityId = this.facilityId();
    if (!this.returnId || !facilityId || this.itemsForm.invalid) {
      this.itemsForm.markAllAsTouched();
      return;
    }

    const payloadItems = this.items.controls
      .map((group) => group.value)
      .filter((item) => Number(item.receiveQuantity) > 0)
      .map((item) => ({
        returnItemSeqId: item.returnItemSeqId,
        orderItemSeqId: item.orderItemSeqId,
        productId: item.productId,
        quantity: String(item.receiveQuantity),
        locationSeqId: item.locationSeqId,
        lotId: item.lotId,
        expirationDate: this.toLocalDateTime(item.expirationDate),
      }));

    if (!payloadItems.length) {
      this.snackbarService.showError(this.translate.instant('RETURN.RECEIVE_NO_QUANTITY'));
      return;
    }

    this.isLoading.set(true);
    this.returnService.receiveReturn(this.returnId, {
      facilityId,
      items: payloadItems,
    }).pipe(
      timeout(20000),
      finalize(() => {
        this.isLoading.set(false);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.snackbarService.showSuccess(this.translate.instant('RETURN.RECEIVE_SUCCESS'));
        this.router.navigate(['/returns', this.returnId]);
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('RETURN.RECEIVE_ERROR'));
      },
    });
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
}
