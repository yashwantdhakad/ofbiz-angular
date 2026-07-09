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
import { OrderService } from '@ofbiz/services/order/order.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

export interface ShortageLine {
  orderId: string;
  orderItemSeqId: string;
  orderDate?: string;
  orderStatusId?: string;
  customerPartyId?: string;
  customerName?: string;
  facilityId?: string;
  productId: string;
  productName?: string;
  orderedQuantity: number;
  reservedQuantity: number;
  issuedQuantity: number;
  shortageQuantity: number;
  facilityAtp: number;
  totalAtp: number;
  canFulfillFromStock?: string;
}

@Component({
  standalone: false,
  selector: 'app-shortages',
  templateUrl: './shortages.component.html',
  styleUrls: ['./shortages.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShortagesComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly shortages = signal<ShortageLine[]>([]);

  readonly columns = [
    'orderId',
    'customerName',
    'productId',
    'orderedQuantity',
    'reservedQuantity',
    'shortageQuantity',
    'facilityAtp',
    'canFulfill',
  ];

  constructor(
    private readonly orderService: OrderService,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.orderService.getOrderShortages()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (rows) => this.shortages.set(rows),
        error: () => {
          this.snackbarService.showError(this.translate.instant('SHORTAGE.LOAD_ERROR'));
        },
      });
  }
}
