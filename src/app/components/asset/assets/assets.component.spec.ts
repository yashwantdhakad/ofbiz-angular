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
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AssetsComponent } from './assets.component';
import { AssetService } from '@ofbiz/services/asset/asset.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PreferredFacilityService } from '@ofbiz/services/common/preferred-facility.service';
import { TranslateService } from '@ngx-translate/core';

describe('AssetsComponent', () => {
  let component: AssetsComponent;
  let fixture: ComponentFixture<AssetsComponent>;
  let assetService: jasmine.SpyObj<AssetService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let preferredFacilityService: jasmine.SpyObj<PreferredFacilityService>;
  let referenceDataStoreStub: {
    facilities: ReturnType<typeof signal>;
    ensureFacilitiesLoaded: jasmine.Spy;
  };

  async function configure(routePath: string = 'assets', routeSegments: Array<{ path: string }> = []): Promise<void> {
    const assetServiceSpy = jasmine.createSpyObj('AssetService', [
      'getAssets',
      'getInventoryItemTypes',
      'bulkInspectionDecision',
    ]);
    assetServiceSpy.getInventoryItemTypes.and.returnValue(of([]));
    assetServiceSpy.bulkInspectionDecision.and.returnValue(of({}));

    const snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    const preferredFacilityServiceSpy = jasmine.createSpyObj('PreferredFacilityService', ['resolveInitialFacilityId']);
    preferredFacilityServiceSpy.resolveInitialFacilityId.and.returnValue('FAC1');
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateServiceSpy.instant.and.callFake((key: string) => key);
    translateServiceSpy.get.and.callFake((key: string) => of(key));

    referenceDataStoreStub = {
      facilities: signal([]),
      ensureFacilitiesLoaded: jasmine.createSpy('ensureFacilitiesLoaded'),
    };

    await TestBed.configureTestingModule({
      declarations: [AssetsComponent],
      providers: [
        { provide: AssetService, useValue: assetServiceSpy },
        { provide: SnackbarService, useValue: snackbarServiceSpy },
        { provide: ReferenceDataStore, useValue: referenceDataStoreStub },
        { provide: PreferredFacilityService, useValue: preferredFacilityServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: ActivatedRoute, useValue: { url: of(routeSegments), snapshot: { routeConfig: { path: routePath } } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(AssetsComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(AssetsComponent);
    component = fixture.componentInstance;
    assetService = TestBed.inject(AssetService) as jasmine.SpyObj<AssetService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    preferredFacilityService = TestBed.inject(PreferredFacilityService) as jasmine.SpyObj<PreferredFacilityService>;
  }

  beforeEach(async () => {
    await configure();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads lookups and preferred facilities on init without auto-searching normal assets', () => {
    assetService.getInventoryItemTypes.and.returnValue(
      of([{ inventoryItemTypeId: 'NON_SERIAL_INV_ITEM', description: 'Non Serial Item' }] as any)
    );
    referenceDataStoreStub.facilities.set([{ facilityId: 'FAC1', facilityName: 'Main Warehouse' }]);

    fixture.detectChanges();

    expect(assetService.getInventoryItemTypes).toHaveBeenCalled();
    expect(referenceDataStoreStub.ensureFacilitiesLoaded).toHaveBeenCalled();
    expect(preferredFacilityService.resolveInitialFacilityId).toHaveBeenCalled();
    expect(component.selectedFacilityId).toBe('FAC1');
    expect(component.facilities()).toHaveSize(1);
    expect(component.getInventoryItemTypeLabel('NON_SERIAL_INV_ITEM')).toBe('Non Serial Item');
    expect(assetService.getAssets).not.toHaveBeenCalled();
  });

  it('adds selection column for inspection queue and does not auto-load results', async () => {
    TestBed.resetTestingModule();
    await configure('inspection', [{ path: 'inspection' }]);

    fixture.detectChanges();

    expect(component.isInspectionQueue()).toBeTrue();
    expect(component.displayedColumnKeys[0]).toBe('select');
    expect(component.hasSearched()).toBeFalse();
    expect(assetService.getAssets).not.toHaveBeenCalled();
  });

  it('searches assets with facility and inspection filters and keeps selected ids present in results', () => {
    component.selectedFacilityId = 'FAC1';
    component.productId = ' TST_PROD_001 ';
    component.isInspectionQueue.set(true);
    component.selectedAssetIds.set(new Set(['INV1', 'INV3']));
    assetService.getAssets.and.returnValue(of({
      responseMap: {
        resultList: [
          { inventoryItemId: 'INV1', statusId: 'INV_INSP_PENDING' },
          { inventoryItemId: 'INV2', statusDescription: 'Pending' },
        ],
        total: 2,
      },
    } as any));

    component.getAssets(2, 'widget');

    expect(assetService.getAssets).toHaveBeenCalledWith(1, 'widget', 'FAC1', 'INV_PENDING_INSP', 'TST_PROD_001');
    expect(component.items()).toHaveSize(2);
    expect(component.pages()).toBe(2);
    expect(Array.from(component.selectedAssetIds())).toEqual(['INV1']);
    expect(component.isLoading()).toBeFalse();
  });

  it('handles load errors and inspection facility validation', () => {
    assetService.getAssets.and.returnValue(throwError(() => new Error('API error')));
    component.selectedFacilityId = 'FAC1';

    component.getAssets(1, '');

    expect(component.items()).toEqual([]);
    expect(component.pages()).toBe(0);
    expect(component.isLoading()).toBeFalse();
    expect(snackbarService.showError).toHaveBeenCalledWith('ASSET.LOAD_ERROR');

    snackbarService.showError.calls.reset();
    component.isInspectionQueue.set(true);
    component.selectedFacilityId = '';
    component.onSearch();

    expect(snackbarService.showError).toHaveBeenCalledWith('ASSET.SELECT_FACILITY_REQUIRED');
  });

  it('resets state on facility change and paginates only after search', () => {
    component.items.set([{ inventoryItemId: 'INV1' } as any]);
    component.pages.set(5);
    component.hasSearched.set(true);
    component.selectedAssetIds.set(new Set(['INV1']));

    component.onFacilityChange('FAC2');

    expect(component.selectedFacilityId).toBe('FAC2');
    expect(component.items()).toEqual([]);
    expect(component.pages()).toBe(0);
    expect(component.hasSearched()).toBeFalse();
    expect(component.selectedAssetIds().size).toBe(0);

    component.onPageChange(2);
    expect(assetService.getAssets).not.toHaveBeenCalled();

    component.hasSearched.set(true);
    assetService.getAssets.and.returnValue(of({ responseMap: { resultList: [], total: 0 } } as any));
    component.onPageChange(2);
    expect(assetService.getAssets).toHaveBeenCalledWith(2, '', 'FAC2', undefined, undefined);
  });

  it('manages row selection helpers and bulk inspection branches', () => {
    component.items.set([
      { inventoryItemId: 'INV1' },
      { inventoryItemId: 'INV2' },
    ] as any);

    component.toggleAssetSelection('INV1', true);
    component.toggleAssetSelection('INV2', true);
    expect(component.isSelected('INV1')).toBeTrue();
    expect(component.isAllSelected()).toBeTrue();

    component.toggleSelectAll(false);
    expect(component.selectedAssetIds().size).toBe(0);

    component.toggleSelectAll(true);
    expect(Array.from(component.selectedAssetIds())).toEqual(['INV1', 'INV2']);

    component.selectedAssetIds.set(new Set());
    component.runBulkInspection('ACCEPT');
    expect(snackbarService.showError).toHaveBeenCalledWith('ASSET.SELECT_INVENTORY_REQUIRED');

    snackbarService.showError.calls.reset();
    component.selectedAssetIds.set(new Set(['INV1']));
    assetService.getAssets.and.returnValue(of({ responseMap: { resultList: [], total: 0 } } as any));
    component.runBulkInspection('ACCEPT');
    expect(assetService.bulkInspectionDecision).toHaveBeenCalledWith('ACCEPT', ['INV1']);
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('ASSET.INSPECTION_ACCEPT_COMPLETED');

    assetService.bulkInspectionDecision.and.returnValue(throwError(() => new Error('boom')));
    component.selectedAssetIds.set(new Set(['INV2']));
    component.runBulkInspection('REJECT');
    expect(snackbarService.showError).toHaveBeenCalledWith('ASSET.INSPECTION_REJECT_ERROR');
    expect(component.isBulkUpdating()).toBeFalse();
  });

  it('covers display helpers and lookup failures defensively', () => {
    assetService.getInventoryItemTypes.and.returnValue(throwError(() => new Error('types failed')));

    fixture.detectChanges();

    expect(component.inventoryItemTypeMap().size).toBe(0);
    expect(component.getInventoryItemTypeLabel()).toBe('');
    expect(component.getInventoryItemTypeLabel('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE');
    expect(component.getStatusLabel(undefined)).toBe('');
    expect(component.getStatusLabel({ statusId: 'INV_NS_UNAVAILABLE' })).toBe('Inv Ns Unavailable');
    expect(component.getStatusLabel({ statusDescription: 'Unavailable' })).toBe('Unavailable');
    expect(component.getFacilityLabel({ facilityId: 'FAC1', facilityName: 'Main' })).toBe('Main');
    expect(component.getFacilityLabel({ facilityId: 'FAC2' })).toBe('FAC2');
    expect(component.getFacilityLabel({})).toBe('');
  });
});
