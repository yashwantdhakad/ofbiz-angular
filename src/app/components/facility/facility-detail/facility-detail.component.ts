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
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { FacilityAddressDialogComponent } from '../facility-address-dialog/facility-address-dialog.component';
import { FacilityLocationDialogComponent } from '../facility-location-dialog/facility-location-dialog.component';
import { FacilityNameDialogComponent } from '../facility-name-dialog/facility-name-dialog.component';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import {
  FacilityAddress,
  FacilityDetail,
  FacilityDetailResponse,
  FacilityLocation,
} from '@ofbiz/models/facility.model';

@Component({
  standalone: false,
  selector: 'app-facility-detail',
  templateUrl: './facility-detail.component.html',
  styleUrls: ['./facility-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityDetailComponent implements OnInit {
  isLoading = signal(false);
  facilityId: string | undefined;
  facilityDetail = signal<FacilityDetail | null>(null);
  facilityAddress = signal<FacilityAddress | null>(null);
  facilityTypeLabel = signal<string | undefined>(undefined);
  facilityTypeMap = new Map<string, string>();
  geoMap = new Map<string, string>();
  locationTypeMap = new Map<string, string>();
  locations = signal<FacilityLocation[]>([]);
  dataSource = new MatTableDataSource<FacilityLocation>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  locationColumns: string[] = [
    'locationSeqId',
    'locationType',
    'areaId',
    'aisleId',
    'sectionId',
    'levelId',
    'positionId',
    'actions'
  ];
  locationSeqIdFilter = '';
  locationNameFilter = '';
  locationPageSize = 10;
  locationPageIndex = 0;
  locationTotal = signal(0);

  constructor(
    private facilityService: FacilityService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private renderScheduler: RenderSchedulerService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.facilityId = params['facilityId'];
      if (this.facilityId) {
        this.getFacility(this.facilityId);
      }
    });
  }

  getFacility(facilityId: string, showLoader: boolean = true): void {
    if (showLoader) {
      this.renderScheduler.deferMacrotask(() => {
        this.isLoading.set(true);
      });
    }
    this.facilityService.getFacility(facilityId)
      .subscribe({
        next: (response: FacilityDetailResponse) => {
          this.renderScheduler.deferMacrotask(() => {
            const detail: FacilityDetail = response?.facility ?? (response as unknown as FacilityDetail);
            const responseAny = response as any;
            const locationList = Array.isArray(response?.locations) ? response.locations : [];
            const facilityTypeId = detail?.facilityTypeId;
            this.facilityDetail.set(detail);
            this.facilityTypeLabel.set(
              response?.facilityTypeLabel
              || (facilityTypeId ? responseAny?.facilityTypeMap?.[facilityTypeId] : undefined)
              || facilityTypeId
            );
            this.geoMap = new Map(
              Object.entries(response?.geoMap || {}).map(([geoId, geoName]) => [geoId, String(geoName)])
            );
            this.locationTypeMap = new Map(
              Object.entries(response?.locationTypeMap || {}).map(([enumId, description]) => [enumId, String(description)])
            );
            this.locations.set(locationList);
            this.dataSource.data = locationList;
            this.locationPageIndex = 0;
            this.locationTotal.set(response?.locationTotal ?? locationList.length);
            this.facilityAddress.set(this.resolveFacilityAddress(response));
            if (this.paginator) {
              this.paginator.length = this.locationTotal();
            }
            if (showLoader) {
              this.isLoading.set(false);
            }
          });
        },
        error: () => {
          this.renderScheduler.deferMacrotask(() => {
            this.facilityDetail.set(null);
            this.locations.set([]);
            this.dataSource.data = [];
            this.locationTotal.set(0);
            this.facilityAddress.set(null);
            if (showLoader) {
              this.isLoading.set(false);
            }
          });
        },
      });
  }

  loadLocations(): void {
    if (!this.facilityId) {
      return;
    }
    this.facilityService.getFacilityLocations(
      this.facilityId,
      this.locationPageIndex,
      this.locationPageSize,
      this.locationSeqIdFilter,
      this.locationNameFilter
    ).subscribe({
      next: (response) => {
        const list = Array.isArray(response?.content) ? response.content : [];
        this.renderScheduler.deferMacrotask(() => {
          this.locations.set(list);
          this.dataSource.data = list;
          this.locationTotal.set(response?.totalElements ?? response?.page?.totalElements ?? list.length);
          if (this.paginator) {
            this.paginator.length = this.locationTotal();
          }
        });
      },
      error: () => {
        this.renderScheduler.deferMacrotask(() => {
          this.locations.set([]);
          this.dataSource.data = [];
          this.locationTotal.set(0);
        });
      },
    });
  }

  applyLocationFilters(): void {
    this.locationPageIndex = 0;
    this.loadLocations();
  }

  clearLocationFilters(): void {
    this.locationSeqIdFilter = '';
    this.locationNameFilter = '';
    this.locationPageIndex = 0;
    this.loadLocations();
  }

  onLocationPage(event: PageEvent): void {
    this.locationPageIndex = event.pageIndex;
    this.locationPageSize = event.pageSize;
    this.loadLocations();
  }

  private resolveFacilityAddress(response: FacilityDetailResponse): FacilityAddress | null {
    const detail = response || {};
    const addresses = Array.isArray(detail?.addresses) ? detail.addresses : [];
    return addresses.find((address) => !!address?.address1) || addresses[0] || null;
  }

  openLocationDialog(location?: FacilityLocation): void {
    const dialogRef = this.dialog.open(FacilityLocationDialogComponent, {
      width: '520px',
      data: { facilityId: this.facilityId, ...(location || {}) },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const locationId = typeof result.id === 'number' ? result.id : Number(result.id);
        const request = result.id && !Number.isNaN(locationId)
          ? this.facilityService.updateFacilityLocation(locationId, result)
          : this.facilityService.createFacilityLocation(result);
        request.subscribe(() => {
          if (this.facilityId) {
            this.getFacility(this.facilityId, false);
          }
        });
      }
    });
  }

  openFacilityNameDialog(): void {
    const dialogRef = this.dialog.open(FacilityNameDialogComponent, {
      width: '420px',
      data: { facilityName: this.facilityDetail()?.facilityName || '' },
    });
    dialogRef.afterClosed().subscribe((facilityName) => {
      if (!facilityName || !this.facilityId) {
        return;
      }
      const payload = {
        ...(this.facilityDetail() || {}),
        facilityName,
      };
      this.facilityService.updateFacility(this.facilityId, payload).subscribe({
        next: () => {
          if (this.facilityId) {
            this.getFacility(this.facilityId, false);
          }
          this.snackbarService.showSuccess(this.translate.instant('FACILITY.NAME_UPDATED'));
        },
        error: (error) => {
          this.snackbarService.showError(
            error?.error?.message || this.translate.instant('FACILITY.NAME_UPDATE_ERROR')
          );
        },
      });
    });
  }

  openFacilityAddressDialog(): void {
    const dialogRef = this.dialog.open(FacilityAddressDialogComponent, {
      width: '720px',
      data: { address: this.facilityAddress() || {} },
    });
    dialogRef.afterClosed().subscribe((addressPayload) => {
      if (!addressPayload || !this.facilityId) {
        return;
      }
      this.facilityService.updateFacilityAddress(this.facilityId, addressPayload).subscribe({
        next: () => {
          if (this.facilityId) {
            this.getFacility(this.facilityId, false);
          }
          this.snackbarService.showSuccess(this.translate.instant('FACILITY.ADDRESS_UPDATED'));
        },
        error: (error) => {
          this.snackbarService.showError(
            error?.error?.message || this.translate.instant('FACILITY.ADDRESS_UPDATE_ERROR')
          );
        },
      });
    });
  }

  getGeoLabel(geoId?: string): string {
    if (!geoId) {
      return '';
    }
    return this.geoMap.get(geoId) || geoId;
  }

  getLocationTypeLabel(locationTypeEnumId?: string): string {
    if (!locationTypeEnumId) {
      return '';
    }
    return this.locationTypeMap.get(locationTypeEnumId) || locationTypeEnumId;
  }

  isInspectionRequired(): boolean {
    const value = String(this.facilityDetail()?.requireInspection || '').trim().toUpperCase();
    return value === 'Y' || value === 'YES' || value === 'TRUE' || value === '1';
  }

  updateRequireInspection(checked: boolean): void {
    if (!this.facilityId || !this.facilityDetail()) {
      return;
    }
    const payload = {
      ...this.facilityDetail(),
      requireInspection: checked ? 'Y' : 'N',
    };
    this.facilityService.updateFacility(this.facilityId, payload).subscribe({
      next: () => {
        this.facilityDetail.set({
          ...this.facilityDetail(),
          requireInspection: checked ? 'Y' : 'N',
        });
        this.snackbarService.showSuccess(this.translate.instant('FACILITY.INSPECTION_UPDATED'));
      },
      error: (error) => {
        this.snackbarService.showError(
          error?.error?.message || this.translate.instant('FACILITY.INSPECTION_UPDATE_ERROR')
        );
      },
    });
  }
}
