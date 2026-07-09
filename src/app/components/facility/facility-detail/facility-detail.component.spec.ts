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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { FacilityDetailComponent } from './facility-detail.component';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { ActivatedRoute } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { FacilityLocationDialogComponent } from '../facility-location-dialog/facility-location-dialog.component';
import { FacilityNameDialogComponent } from '../facility-name-dialog/facility-name-dialog.component';
import { FacilityAddressDialogComponent } from '../facility-address-dialog/facility-address-dialog.component';

describe('FacilityDetailComponent', () => {
  let component: FacilityDetailComponent;
  let fixture: ComponentFixture<FacilityDetailComponent>;
  let facilityService: jasmine.SpyObj<FacilityService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let translateSpy: jasmine.SpyObj<TranslateService>;
  let routeSubject: Subject<any>;

  const facilityResponse = {
    facility: {
      facilityId: 'F1',
      facilityTypeId: 'WAREHOUSE',
      facilityName: 'Main Warehouse',
      requireInspection: 'Y',
    },
    facilityTypeLabel: 'Warehouse',
    geoMap: { IN: 'India', US: 'United States' },
    locationTypeMap: { STORAGE: 'Storage' },
    addresses: [{ address1: 'Street 1', countryGeoId: 'US' }],
    locations: [{ id: 'LOC-1', locationSeqId: 'A-01', locationTypeEnumId: 'STORAGE' }],
    locationTotal: 1,
  };

  beforeEach(async () => {
    const facilitySpy = jasmine.createSpyObj('FacilityService', [
      'getFacility',
      'createFacilityLocation',
      'updateFacilityLocation',
      'getFacilityLocations',
      'updateFacility',
      'updateFacilityAddress',
    ]);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateSpy.instant.and.callFake((key: string) => key);

    facilitySpy.getFacilityLocations.and.returnValue(of({
      content: [{ id: 'LOC-2', locationSeqId: 'B-01', locationTypeEnumId: 'STORAGE' }],
      totalElements: 1,
    }));
    facilitySpy.updateFacility.and.returnValue(of({}));
    facilitySpy.updateFacilityAddress.and.returnValue(of({}));
    facilitySpy.createFacilityLocation.and.returnValue(of({}));
    facilitySpy.updateFacilityLocation.and.returnValue(of({}));
    renderSchedulerSpy.deferMacrotask.and.callFake((task: () => void) => task());
    routeSubject = new Subject();

    await TestBed.configureTestingModule({
      declarations: [FacilityDetailComponent],
      providers: [
        { provide: FacilityService, useValue: facilitySpy },
        { provide: ActivatedRoute, useValue: { params: routeSubject.asObservable() } },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(FacilityDetailComponent, {
        set: { template: '' },
      })
      .compileComponents();

    facilityService = TestBed.inject(FacilityService) as jasmine.SpyObj<FacilityService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityDetailComponent);
    component = fixture.componentInstance;
  });

  function mockDialogClose(result: any) {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as any);
  }

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should load facility on init from route params', fakeAsync(() => {
    facilityService.getFacility.and.returnValue(of(facilityResponse));

    fixture.detectChanges();
    routeSubject.next({ facilityId: 'F1' });
    tick();

    expect(facilityService.getFacility).toHaveBeenCalledWith('F1');
    expect(component.facilityId).toBe('F1');
    expect(component.facilityDetail()?.facilityId).toBe('F1');
    expect(component.facilityTypeLabel()).toBe('Warehouse');
    expect(component.locations()).toHaveSize(1);
    expect(component.locationTotal()).toBe(1);
    expect(component.facilityAddress()?.address1).toBe('Street 1');
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle error when fetching facility fails', () => {
    facilityService.getFacility.and.returnValue(throwError(() => new Error('Error')));

    component.getFacility('F1');

    expect(component.facilityDetail()).toBeNull();
    expect(component.locations()).toEqual([]);
    expect(component.locationTotal()).toBe(0);
    expect(component.facilityAddress()).toBeNull();
  });

  it('should load filtered locations and clear them on service failure', () => {
    component.facilityId = 'F1';
    component.locationSeqIdFilter = 'B';
    component.locationNameFilter = 'Bin';

    component.loadLocations();

    expect(facilityService.getFacilityLocations).toHaveBeenCalledWith('F1', 0, 10, 'B', 'Bin');
    expect(component.locations()).toHaveSize(1);
    expect(component.locationTotal()).toBe(1);

    facilityService.getFacilityLocations.and.returnValue(throwError(() => new Error('location load failed')));
    component.loadLocations();

    expect(component.locations()).toEqual([]);
    expect(component.locationTotal()).toBe(0);
  });

  it('should apply and clear location filters by resetting pagination', () => {
    const loadLocationsSpy = spyOn(component, 'loadLocations');
    component.locationPageIndex = 5;
    component.locationSeqIdFilter = 'X';
    component.locationNameFilter = 'Y';

    component.applyLocationFilters();
    expect(component.locationPageIndex).toBe(0);
    expect(loadLocationsSpy).toHaveBeenCalled();

    loadLocationsSpy.calls.reset();
    component.clearLocationFilters();
    expect(component.locationSeqIdFilter).toBe('');
    expect(component.locationNameFilter).toBe('');
    expect(component.locationPageIndex).toBe(0);
    expect(loadLocationsSpy).toHaveBeenCalled();
  });

  it('should change location pagination and reload locations', () => {
    const loadLocationsSpy = spyOn(component, 'loadLocations');

    component.onLocationPage({ pageIndex: 2, pageSize: 25, length: 50 } as any);

    expect(component.locationPageIndex).toBe(2);
    expect(component.locationPageSize).toBe(25);
    expect(loadLocationsSpy).toHaveBeenCalled();
  });

  it('should open location dialog, create new locations, and refresh facility detail', () => {
    component.facilityId = 'F1';
    const getFacilitySpy = spyOn(component, 'getFacility');
    mockDialogClose({ locationSeqId: 'A-02', locationTypeEnumId: 'STORAGE' });

    component.openLocationDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(FacilityLocationDialogComponent, {
      width: '520px',
      data: { facilityId: 'F1' },
    });
    expect(facilityService.createFacilityLocation).toHaveBeenCalledWith({
      locationSeqId: 'A-02',
      locationTypeEnumId: 'STORAGE'
    });
    expect(getFacilitySpy).toHaveBeenCalledWith('F1', false);
  });

  it('should update existing facility locations from the location dialog', () => {
    component.facilityId = 'F1';
    const getFacilitySpy = spyOn(component, 'getFacility');
    mockDialogClose({ id: 1, locationSeqId: 'A-01', locationTypeEnumId: 'STORAGE' });

    component.openLocationDialog({ id: 1, locationSeqId: 'A-01' } as any);

    expect(facilityService.updateFacilityLocation).toHaveBeenCalledWith(1, {
      id: 1,
      locationSeqId: 'A-01',
      locationTypeEnumId: 'STORAGE'
    });
    expect(getFacilitySpy).toHaveBeenCalledWith('F1', false);
  });

  it('should update facility name and show success feedback', () => {
    component.facilityId = 'F1';
    component.facilityDetail.set({ facilityId: 'F1', facilityName: 'Main Warehouse' });
    const getFacilitySpy = spyOn(component, 'getFacility');
    mockDialogClose('Updated Warehouse');

    component.openFacilityNameDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(FacilityNameDialogComponent, {
      width: '420px',
      data: { facilityName: 'Main Warehouse' },
    });
    expect(facilityService.updateFacility).toHaveBeenCalledWith('F1', {
      facilityId: 'F1',
      facilityName: 'Updated Warehouse',
    });
    expect(getFacilitySpy).toHaveBeenCalledWith('F1', false);
    expect(translateSpy.instant).toHaveBeenCalledWith('FACILITY.NAME_UPDATED');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('FACILITY.NAME_UPDATED');
  });

  it('should update facility address and show success feedback', () => {
    component.facilityId = 'F1';
    component.facilityAddress.set({ address1: 'Street 1' });
    const getFacilitySpy = spyOn(component, 'getFacility');
    mockDialogClose({ address1: 'New Street', countryGeoId: 'US' });

    component.openFacilityAddressDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(FacilityAddressDialogComponent, {
      width: '720px',
      data: { address: { address1: 'Street 1' } },
    });
    expect(facilityService.updateFacilityAddress).toHaveBeenCalledWith('F1', {
      address1: 'New Street',
      countryGeoId: 'US'
    });
    expect(getFacilitySpy).toHaveBeenCalledWith('F1', false);
    expect(translateSpy.instant).toHaveBeenCalledWith('FACILITY.ADDRESS_UPDATED');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('FACILITY.ADDRESS_UPDATED');
  });

  it('should update inspection requirement and mutate facility detail on success', () => {
    component.facilityId = 'F1';
    component.facilityDetail.set({ facilityId: 'F1', requireInspection: 'N' });

    component.updateRequireInspection(true);

    expect(facilityService.updateFacility).toHaveBeenCalledWith('F1', {
      facilityId: 'F1',
      requireInspection: 'Y',
    });
    expect(component.facilityDetail()?.requireInspection).toBe('Y');
    expect(translateSpy.instant).toHaveBeenCalledWith('FACILITY.INSPECTION_UPDATED');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('FACILITY.INSPECTION_UPDATED');
  });

  it('should report update failures for facility name, address, and inspection setting', () => {
    component.facilityId = 'F1';
    component.facilityDetail.set({ facilityId: 'F1', facilityName: 'Main Warehouse', requireInspection: 'N' });
    facilityService.updateFacility.and.returnValue(throwError(() => ({ error: { message: 'update failed' } })));
    facilityService.updateFacilityAddress.and.returnValue(throwError(() => ({ error: { message: 'address failed' } })));

    mockDialogClose('Broken Update');
    component.openFacilityNameDialog();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('update failed');

    mockDialogClose({ address1: 'Broken Address' });
    component.openFacilityAddressDialog();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('address failed');

    component.updateRequireInspection(true);
    expect(snackbarSpy.showError).toHaveBeenCalledWith('update failed');
  });

  it('should resolve geo and location labels and inspection flags', () => {
    component.geoMap = new Map([['US', 'United States']]);
    component.locationTypeMap = new Map([['STORAGE', 'Storage']]);
    component.facilityDetail.set({ requireInspection: 'YES' });

    expect(component.getGeoLabel('US')).toBe('United States');
    expect(component.getGeoLabel('CA')).toBe('CA');
    expect(component.getLocationTypeLabel('STORAGE')).toBe('Storage');
    expect(component.getLocationTypeLabel('UNKNOWN')).toBe('UNKNOWN');
    expect(component.isInspectionRequired()).toBeTrue();
  });
});
