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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CommonService } from '@ofbiz/services/common/common.service';
import { ShipmentService } from '@ofbiz/services/shipment/shipment.service';
import { StatusLookupItem } from '@ofbiz/models/order.model';
import {
  ShipmentDetail,
  ShipmentDetailResponse,
  ShipmentItem,
  ShipmentMethodTypeLookupItem,
  ShipmentReceipt,
  ShipmentRouteSegment,
  ShipmentStatusHistoryEntry,
  ShipmentTypeLookupItem,
} from '@ofbiz/models/shipment.model';
import { StatusHistoryEntry } from '../../common/status-history/status-history-icon.component';

@Component({
  standalone: false,
  selector: 'app-shipment-detail',
  templateUrl: './shipment-detail.component.html',
  styleUrls: ['./shipment-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipmentDetailComponent implements OnInit {
  isLoading = signal<boolean>(false);
  shipmentId = signal<string | undefined>(undefined);

  shipmentDetail = signal<ShipmentDetail | null>(null);
  items = signal<ShipmentItem[]>([]);
  receipts = signal<ShipmentReceipt[]>([]);
  invoiceIds = signal<string[]>([]);
  statusHistoryEntries = signal<StatusHistoryEntry[]>([]);
  statusMap = signal<Map<string, string>>(new Map());
  shipmentTypeMap = signal<Map<string, string>>(new Map());
  shipmentMethodTypeMap = signal<Map<string, string>>(new Map());
  itemColumns: string[] = [
    'shipmentItemSourceId',
    'orderId',
    'orderItemSeqId',
    'quantity',
    'quantityNotHandled',
    'status',
  ];

  shipmentRouteSegments = signal<ShipmentRouteSegment[]>([]);
  shipmentRouteSegColumns: string[] = [
    'routeSegSeqId',
    'destFacility',
    'destTelecom',
    'destPostal',
  ];
  receiptColumns: string[] = [
    'receiptId',
    'returnId',
    'inventoryItemId',
    'productId',
    'quantityAccepted',
    'datetimeReceived',
  ];

  constructor(
    private readonly shipmentService: ShipmentService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly commonService: CommonService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.route.params.subscribe((params) => {
      const id = params['shipmentId'];
      this.shipmentId.set(id);
      if (id) {
        this.getShipment(id);
      }
    });
  }

  getShipment(shipmentId: string): void {
    this.isLoading.set(true);
    this.shipmentService.getShipment(shipmentId, true)
      .subscribe({
        next: (response: ShipmentDetailResponse) => {
          const detail: ShipmentDetail = response?.shipment ?? (response as unknown as ShipmentDetail);
          this.shipmentDetail.set(detail);
          if (detail?.shipmentTypeId === 'SALES_SHIPMENT') {
            this.router.navigate(['/shipments/sales', detail?.shipmentId || shipmentId]);
            return;
          }
          this.items.set(Array.isArray(response?.items) ? response.items : []);
          this.receipts.set(Array.isArray(response?.receipts) ? response.receipts : []);
          this.invoiceIds.set(Array.isArray(response?.invoiceIds) ? response.invoiceIds : []);
          this.shipmentRouteSegments.set(Array.isArray(response?.routeSegments) ? response.routeSegments : []);
          this.statusHistoryEntries.set(this.mapStatusHistory(response?.statuses));
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.invoiceIds.set([]);
          this.statusHistoryEntries.set([]);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  private loadLookups(): void {
    forkJoin({
      statuses: this.commonService.getAllStatusItems(),
      shipmentTypes: this.commonService.getShipmentTypes(),
      shipmentMethodTypes: this.commonService.getShipmentMethodTypes(),
    }).subscribe({
      next: ({ statuses, shipmentTypes, shipmentMethodTypes }) => {
        this.statusMap.set(this.toLookupMap(
          Array.isArray(statuses) ? statuses as StatusLookupItem[] : [],
          (item) => item.statusId,
          (item) => item.description || item.statusId
        ));
        this.shipmentTypeMap.set(this.toLookupMap(
          Array.isArray(shipmentTypes) ? shipmentTypes as ShipmentTypeLookupItem[] : [],
          (item) => item.shipmentTypeId,
          (item) => item.description || item.shipmentTypeId
        ));
        this.shipmentMethodTypeMap.set(this.toLookupMap(
          Array.isArray(shipmentMethodTypes) ? shipmentMethodTypes as ShipmentMethodTypeLookupItem[] : [],
          (item) => item.shipmentMethodTypeId,
          (item) => item.description || item.shipmentMethodTypeId
        ));
        this.cdr.markForCheck();
      },
      error: () => {
        this.statusMap.set(new Map());
        this.shipmentTypeMap.set(new Map());
        this.shipmentMethodTypeMap.set(new Map());
        this.cdr.markForCheck();
      },
    });
  }

  getStatusDescription(statusId?: string): string {
    if (!statusId) {
      return '';
    }
    return this.statusMap().get(statusId) || statusId;
  }

  getShipmentTypeDescription(shipmentTypeId?: string): string {
    if (!shipmentTypeId) {
      return '';
    }
    return this.shipmentTypeMap().get(shipmentTypeId) || shipmentTypeId;
  }

  getShipmentMethodDescription(shipmentMethodTypeId?: string): string {
    if (!shipmentMethodTypeId) {
      return '';
    }
    return this.shipmentMethodTypeMap().get(shipmentMethodTypeId) || shipmentMethodTypeId;
  }

  getCurrentDateTime(): string {
    return new Date().toString();
  }

  isPurchaseShipment(): boolean {
    return this.shipmentDetail()?.shipmentTypeId === 'PURCHASE_SHIPMENT';
  }

  private toLookupMap<T>(
    items: T[],
    keySelector: (item: T) => string | undefined,
    valueSelector: (item: T) => string | undefined
  ): Map<string, string> {
    const entries: Array<[string, string]> = [];
    items.forEach((item) => {
      const key = keySelector(item);
      if (!key) {
        return;
      }
      entries.push([key, valueSelector(item) || key]);
    });
    return new Map(entries);
  }

  private mapStatusHistory(statuses?: ShipmentStatusHistoryEntry[] | null): StatusHistoryEntry[] {
    if (!Array.isArray(statuses)) {
      return [];
    }
    return statuses
      .filter((entry) => !!entry?.statusId)
      .map((entry) => ({
        statusId: entry.statusId,
        statusLabel: this.getStatusDescription(entry.statusId),
        changedAt: entry.statusDate,
        changedBy: entry.changeByUserLoginId,
      }));
  }
}
