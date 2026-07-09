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
import { CommonService } from '@ofbiz/services/common/common.service';
import { ShipmentService } from '@ofbiz/services/shipment/shipment.service';

@Component({
  standalone: false,
  selector: 'app-shipment',
  templateUrl: './shipment.component.html',
  styleUrls: ['./shipment.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipmentComponent implements OnInit {
  isLoading = signal<boolean>(false);
  items = signal<any[]>([]);
  pages = signal<number>(0);

  queryString: string = '';
  pagination = {
    page: 1,
    rowsPerPage: 10,
  };

  shipmentTypeMap = new Map<string, string>();
  shipmentTypeOptions: Array<{ shipmentTypeId: string; description: string }> = [];
  selectedShipmentTypeId = '';
  displayedColumns: string[] = [
    'shipmentId',
    'statusId',
    'shipmentTypeId',
    'destinationFacilityId',
    'primaryOrderId',
    'estimatedShipDate',
  ];

  constructor(
    private shipmentService: ShipmentService,
    private commonService: CommonService
  ) { }

  ngOnInit(): void {
    this.loadLookups();
    this.isLoading.set(true);
    this.getShipments(1, '');
  }

  private loadLookups(): void {
    this.commonService.getShipmentTypes().subscribe({
      next: (shipmentTypes) => {
        this.shipmentTypeMap = new Map(
          (shipmentTypes || []).map((item: any) => [
            item.shipmentTypeId,
            item.description || item.shipmentTypeId,
          ])
        );
        this.shipmentTypeOptions = (shipmentTypes || [])
          .map((item: any) => ({
            shipmentTypeId: String(item?.shipmentTypeId || '').trim(),
            description: String(item?.description || item?.shipmentTypeId || '').trim(),
          }))
          .filter((item: any) => !!item.shipmentTypeId)
          .filter((item: any, index: number, list: any[]) =>
            list.findIndex((candidate: any) => candidate.shipmentTypeId === item.shipmentTypeId) === index
          )
          .sort((a: any, b: any) => a.description.localeCompare(b.description));
      },
      error: () => {
        this.shipmentTypeMap = new Map();
        this.shipmentTypeOptions = [];
      },
    });
  }

  getShipments(page: number, queryString: string): void {
    this.pagination.page = page;
    this.shipmentService
      .getShipments(page - 1, queryString, this.selectedShipmentTypeId || undefined)
      .subscribe({
        next: (response) => {
          const responseMap = response?.responseMap;
          this.items.set(responseMap?.resultList || []);
          this.pages.set(responseMap?.total ?? this.items().length);
          this.isLoading.set(false);
        },
        error: (_err) => {
          this.isLoading.set(false);
        },
      });
  }

  getStatusDescription(item: any): string {
    return item?.statusDescription || item?.statusId || '';
  }

  getShipmentTypeDescription(shipmentTypeId?: string): string {
    if (!shipmentTypeId) {
      return '';
    }
    return this.shipmentTypeMap.get(shipmentTypeId) || shipmentTypeId;
  }

  getDestinationFacilityLabel(item: any): string {
    const name = item?.destinationFacilityName || item?.facilityName;
    if (name) {
      return name;
    }
    const facilityId = item?.destinationFacilityId;
    return facilityId || '';
  }

  onShipmentTypeChange(): void {
    this.getShipments(1, this.queryString);
  }
}
