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
import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin } from 'rxjs';
import { CommonService } from '@ofbiz/services/common/common.service';
import { FacilityService } from '@ofbiz/services/facility/facility.service';

@Component({
  standalone: false,
  selector: 'app-facility',
  templateUrl: './facility.component.html',
  styleUrls: ['./facility.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityComponent implements OnInit {
  isLoading = signal<boolean>(false);
  items = signal<any[]>([]);
  facilityTypeMap = signal<Map<string, string>>(new Map());
  displayedColumns: string[] = ['facilityId', 'facilityName', 'facilityTypeId', 'ownerPartyId'];

  pageIndex = signal<number>(0);
  pageSize = signal<number>(20);

  pagedItems = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.items().slice(start, start + this.pageSize());
  });

  constructor(
    private facilityService: FacilityService,
    private commonService: CommonService
  ) { }

  ngOnInit(): void {
    this.loadFacilities();
  }

  loadFacilities(): void {
    this.isLoading.set(true);
    forkJoin({
      facilities: this.facilityService.getFacilities(),
      types: this.facilityService.getFacilityTypes(),
    })
      .subscribe({
        next: ({ facilities, types }) => {
          const typeList = Array.isArray(types) ? types : [];
          this.facilityTypeMap.set(new Map(
            typeList.map((type: any) => [
              type.facilityTypeId,
              type.description || type.facilityTypeId,
            ])
          ));
          this.items.set(Array.isArray(facilities) ? facilities : []);
          this.pageIndex.set(0);
          this.isLoading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.facilityTypeMap.set(new Map());
          this.isLoading.set(false);
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  getFacilityTypeDescription(facilityTypeId?: string): string {
    if (!facilityTypeId) return '';
    return this.facilityTypeMap().get(facilityTypeId) || facilityTypeId;
  }
}
