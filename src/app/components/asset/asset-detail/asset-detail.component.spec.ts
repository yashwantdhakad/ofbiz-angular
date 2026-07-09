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
import { AssetDetailComponent } from './asset-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { AssetService } from '@ofbiz/services/asset/asset.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CommonService } from '@ofbiz/services/common/common.service';
import { MatDialog } from '@angular/material/dialog';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { VarianceDialogComponent } from '../variance-dialog/variance-dialog.component';
import { AssetLocationDialogComponent } from '../asset-location-dialog/asset-location-dialog.component';
import { AssetUnitCostDialogComponent } from '../asset-unit-cost-dialog/asset-unit-cost-dialog.component';
import { AssetStatusDialogComponent } from '../asset-status-dialog/asset-status-dialog.component';
import { AssetOwnerDialogComponent } from '../asset-owner-dialog/asset-owner-dialog.component';
import { DateUpdateDialogComponent } from '../../common/date-update-dialog/date-update-dialog.component';
import { DisassemblyDialogComponent } from '../disassembly-dialog/disassembly-dialog.component';

describe('AssetDetailComponent', () => {
  let component: AssetDetailComponent;
  let fixture: ComponentFixture<AssetDetailComponent>;
  let assetService: jasmine.SpyObj<AssetService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let routeSubject: Subject<any>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let translateSpy: jasmine.SpyObj<TranslateService>;

  const assetResponse = {
    asset: { inventoryItemId: 'A001', statusId: 'INV_PENDING_INSP', inventoryItemTypeId: 'SERIALIZED_INV_ITEM', facilityId: 'FAC-1', unitCost: '12.50', expireDate: '2026-03-24T00:00:00.000Z' },
    details: [{ inventoryItemDetailSeqId: 'D1', orderId: 'TN1-PO-10001', receiptId: 'R1', quantityOnHandDiff: '100', availableToPromiseDiff: '100' }],
    receipts: [{ receiptId: 'R1' }],
    variances: [{ varianceReasonId: 'COUNT_VAR', quantityOnHandVar: 1 }],
    facilityLocations: [{ locationSeqId: 'A01' }],
    orderReservations: [{ orderId: 'ORD1' }],
    workEffortReservations: [{ workEffortId: 'JOB1' }],
    facilityName: 'Main Facility',
  };

  beforeEach(async () => {
    const assetSpy = jasmine.createSpyObj('AssetService', [
      'getAsset',
      'getInventoryItemTypes',
      'getVarianceReasons',
      'getOrderReservations',
      'getWorkEffortReservations',
      'updateAsset',
      'acceptInspection',
      'rejectInspection',
      'getAssetChildren',
      'disassembleAsset',
    ]);
    commonService = jasmine.createSpyObj('CommonService', ['getAllStatusItems', 'getLookupResults']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', [
      'deferMacrotask',
      'defer',
      'markForCheck',
      'detectChanges',
    ]);
    translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream']);
    const referenceDataStoreSpy = jasmine.createSpyObj('ReferenceDataStore', ['ensureAllStatusesLoaded', 'statusDescriptionMap']);

    renderSchedulerSpy.deferMacrotask.and.callFake((fn: () => void) => fn());
    renderSchedulerSpy.defer.and.callFake((fn: () => void) => fn());
    renderSchedulerSpy.markForCheck.and.stub();
    renderSchedulerSpy.detectChanges.and.stub();
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));
    translateSpy.stream.and.callFake((key: string) => of(key));
    (translateSpy as any).onTranslationChange = of({});
    (translateSpy as any).onLangChange = of({});
    (translateSpy as any).onDefaultLangChange = of({});
    referenceDataStoreSpy.statusDescriptionMap.and.returnValue(new Map([['INV_PENDING_INSP', 'Inspection Pending']]));

    assetSpy.getInventoryItemTypes.and.returnValue(of([
      { inventoryItemTypeId: 'SERIALIZED_INV_ITEM', description: 'Serialized' }
    ]));
    commonService.getLookupResults.and.returnValue(of([
      { varianceReasonId: 'COUNT_VAR', description: 'Count variance' }
    ]));
    assetSpy.getOrderReservations.and.returnValue(of([]));
    assetSpy.getWorkEffortReservations.and.returnValue(of([]));
    assetSpy.getAsset.and.returnValue(of(assetResponse));
    assetSpy.updateAsset.and.returnValue(of(assetResponse));
    assetSpy.acceptInspection.and.returnValue(of(assetResponse));
    assetSpy.rejectInspection.and.returnValue(of(assetResponse));
    assetSpy.getAssetChildren.and.returnValue(of([]));
    assetSpy.disassembleAsset.and.returnValue(of({
      childItemIds: ['CHILD-1'],
      workEffortId: 'JOB-1',
      workflowMode: 'BOM_DISASSEMBLY',
    }));
    commonService.getAllStatusItems.and.returnValue(of([]));
    routeSubject = new Subject();

    await TestBed.configureTestingModule({
      declarations: [AssetDetailComponent],
      providers: [
        { provide: AssetService, useValue: assetSpy },
        { provide: CommonService, useValue: commonService },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: ReferenceDataStore, useValue: referenceDataStoreSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            params: routeSubject.asObservable(),
            snapshot: { params: { assetId: 'A001' } },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    assetService = TestBed.inject(AssetService) as jasmine.SpyObj<AssetService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssetDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function mockDialogClose(result: any) {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as any);
  }

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call getAsset when assetId is present in route', () => {
    expect(component.assetId).toBe('A001');
    expect(assetService.getAsset).toHaveBeenCalledWith('A001');
  });

  it('should assign data correctly on getAsset success', () => {
    component.getAsset('A001');

    expect(component.assetDetail()).toEqual(assetResponse.asset);
    expect(component.details()).toHaveSize(1);
    expect(component.receipts()).toHaveSize(1);
    expect(component.variances()).toHaveSize(1);
    expect(component.facilityLocations()).toHaveSize(1);
    expect(component.orderReservations()).toHaveSize(1);
    expect(component.workEffortReservations()).toHaveSize(1);
    expect(component.facilityName()).toBe('Main Facility');
    expect(component.isLoading()).toBeFalse();
  });

  it('should handle error in getAsset and call showError', () => {
    assetService.getAsset.and.returnValue(throwError(() => new Error('Failed')));

    component.getAsset('A001');

    expect(translateSpy.instant).toHaveBeenCalledWith('ASSET.DETAIL_LOAD_ERROR');
    expect(snackbarService.showError).toHaveBeenCalledWith('ASSET.DETAIL_LOAD_ERROR');
    expect(component.isLoading()).toBeFalse();
  });

  it('should load lookup maps and reset them on service errors', fakeAsync(() => {
    tick();
    expect(component.getInventoryItemTypeLabel('SERIALIZED_INV_ITEM')).toBe('Serialized');
    expect(component.getVarianceReasonLabel('COUNT_VAR')).toBe('Count variance');
    expect(component.getStatusLabel('INV_PENDING_INSP')).toBe('Inspection Pending');

    assetService.getInventoryItemTypes.and.returnValue(throwError(() => new Error('types failed')));
    commonService.getLookupResults.and.returnValue(throwError(() => new Error('reasons failed')));
    component.ngOnInit();
    tick();

    expect(component.getInventoryItemTypeLabel('SERIALIZED_INV_ITEM')).toBe('SERIALIZED_INV_ITEM');
    expect(component.getVarianceReasonLabel('COUNT_VAR')).toBe('COUNT_VAR');
  }));

  it('should normalize wrapped variance reason lookup responses', fakeAsync(() => {
    commonService.getLookupResults.and.returnValue(of({
      resultList: [
        { variance_reason_id: 'VAR_LOST', description: 'Lost' },
        { id: 'VAR_STOLEN', label: 'Stolen' }
      ]
    } as any));

    component.ngOnInit();
    tick();

    expect(component.getVarianceReasonLabel('VAR_LOST')).toBe('Lost');
    expect(component.getVarianceReasonLabel('VAR_STOLEN')).toBe('Stolen');
  }));

  it('should open variance dialog and refresh inventory sections after create', () => {
    component.assetId = 'A001';
    component.assetDetail.set({ inventoryItemId: 'A001' });
    component.variances.set([{ varianceReasonId: 'COUNT_VAR' } as any]);
    mockDialogClose({ created: true, variance: { varianceReasonId: 'DAMAGE_VAR' } });
    const refreshSpy = spyOn<any>(component, 'refreshInventorySections').and.stub();

    component.openVarianceDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(VarianceDialogComponent, {
      width: '600px',
      data: {
        assetId: 'A001',
        inventoryItemId: 'A001'
      }
    });
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('should open location, unit cost, and expire date dialogs then update the asset', () => {
    component.assetId = 'A001';
    component.assetDetail.set({ inventoryItemId: 'A001', locationSeqId: 'A01', unitCost: '12.50', expireDate: '2026-03-24T00:00:00.000Z' });
    component.facilityLocations.set([{ locationSeqId: 'A01' }]);

    mockDialogClose('B01');
    component.openLocationDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(AssetLocationDialogComponent, {
      width: '540px',
      data: {
        locationSeqId: 'A01',
        locations: [{ locationSeqId: 'A01' }],
      },
    });
    expect(assetService.updateAsset).toHaveBeenCalledWith('A001', { locationSeqId: 'B01' });

    mockDialogClose('18.25');
    component.openUnitCostDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(AssetUnitCostDialogComponent, {
      width: '480px',
      data: { unitCost: '12.50' },
    });
    expect(assetService.updateAsset).toHaveBeenCalledWith('A001', { unitCost: '18.25' });

    mockDialogClose('2026-03-30');
    component.openExpireDateDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(DateUpdateDialogComponent, {
      width: '480px',
      data: {
        title: 'ASSET.EXPIRATION_DATE',
        date: '2026-03-24T00:00:00.000Z',
      },
    });
    expect(assetService.updateAsset).toHaveBeenCalled();
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('COMMON.SAVE_SUCCESS');

    component.assetDetail.set({ inventoryItemId: 'A001', statusId: 'INV_AVAILABLE' });
    mockDialogClose('INV_NS_DEFECTIVE');
    component.openStatusDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(AssetStatusDialogComponent, {
      width: '480px',
      data: {
        statusId: 'INV_AVAILABLE',
        statusMap: component.statusMap(),
      },
    });
    expect(assetService.updateAsset).toHaveBeenCalledWith('A001', { statusId: 'INV_NS_DEFECTIVE' });
  });

  it('should open owner and status dialogs then update the asset', () => {
    component.assetId = 'A001';
    component.assetDetail.set({ inventoryItemId: 'A001', ownerPartyId: 'OWNER-1', statusId: 'INV_AVAILABLE' });

    mockDialogClose('OWNER-2');
    component.openOwnerDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(AssetOwnerDialogComponent, {
      width: '540px',
      data: { ownerPartyId: 'OWNER-1' },
    });
    expect(assetService.updateAsset).toHaveBeenCalledWith('A001', { ownerPartyId: 'OWNER-2' });

    mockDialogClose(undefined);
    component.openOwnerDialog();

    expect(assetService.updateAsset).toHaveBeenCalledTimes(1);

    component.assetDetail.set({ inventoryItemId: 'A001', ownerPartyId: 'OWNER-2', statusId: 'INV_AVAILABLE' });
    mockDialogClose('INV_NS_DEFECTIVE');
    component.openStatusDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(AssetStatusDialogComponent, {
      width: '480px',
      data: {
        statusId: 'INV_AVAILABLE',
        statusMap: component.statusMap(),
      },
    });
    expect(assetService.updateAsset).toHaveBeenCalledWith('A001', { statusId: 'INV_NS_DEFECTIVE' });
  });

  it('should accept and reject inspection when inspection is pending', () => {
    component.assetId = 'A001';
    component.assetDetail.set({ inventoryItemId: 'A001', statusId: 'INV_PENDING_INSP' });

    // The note dialog closes with a (possibly empty) payload before the call
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ inspectionNote: 'ok' }) } as any);

    component.acceptInspection();
    expect(assetService.acceptInspection).toHaveBeenCalledWith('A001', { inspectionNote: 'ok' });
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('ASSET.INSPECTION_ACCEPTED');

    component.rejectInspection();
    expect(assetService.rejectInspection).toHaveBeenCalledWith('A001', { inspectionNote: 'ok' });
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('ASSET.INSPECTION_REJECTED');

    // Cancelling the dialog must not call the service again
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.acceptInspection();
    expect(assetService.acceptInspection).toHaveBeenCalledTimes(1);
  });

  it('should not run inspection actions when status is not pending', () => {
    component.assetId = 'A001';
    component.assetDetail.set({ inventoryItemId: 'A001', statusId: 'INV_AVAILABLE' });

    component.acceptInspection();
    component.rejectInspection();

    expect(assetService.acceptInspection).not.toHaveBeenCalled();
    expect(assetService.rejectInspection).not.toHaveBeenCalled();
  });

  it('should report update failures for inspection and partial asset saves', () => {
    component.assetId = 'A001';
    component.assetDetail.set({ inventoryItemId: 'A001', statusId: 'INV_PENDING_INSP', unitCost: '10' });
    assetService.updateAsset.and.returnValue(throwError(() => new Error('save failed')));
    assetService.acceptInspection.and.returnValue(throwError(() => new Error('accept failed')));
    assetService.rejectInspection.and.returnValue(throwError(() => new Error('reject failed')));

    mockDialogClose('11.00');
    component.openUnitCostDialog();
    expect(snackbarService.showError).toHaveBeenCalledWith('COMMON.ERROR');

    component.acceptInspection();
    component.rejectInspection();
    expect(snackbarService.showError).toHaveBeenCalledWith('COMMON.ERROR');
    expect(component.isInspectionUpdating()).toBeFalse();
  });

  it('should route inbound asset detail orders to purchase orders', () => {
    expect(component.getDetailOrderRoute({
      orderId: 'TN1-PO-10001',
      receiptId: '1',
      quantityOnHandDiff: '100',
      availableToPromiseDiff: '100',
    })).toEqual(['/pos', 'TN1-PO-10001']);
  });

  it('should route reservation and shipment asset detail orders to sales orders', () => {
    expect(component.getDetailOrderRoute({
      orderId: 'TN1-ORD-10000',
      description: 'Reserve inventory',
      quantityOnHandDiff: '0',
      availableToPromiseDiff: '-1.00',
    })).toEqual(['/orders', 'TN1-ORD-10000']);
  });

  it('should cover helper fallbacks and inspection decision guards', () => {
    component.assetDetail.set({ statusId: 'INV_AVAILABLE' });
    component.isInspectionUpdating.set(true);

    expect(component.getInventoryItemTypeLabel()).toBe('');
    expect(component.getStatusLabel()).toBe('');
    expect(component.getVarianceReasonLabel()).toBe('');
    expect(component.canRunInspectionDecision()).toBeFalse();
    expect(component.getDetailOrderRoute({})).toEqual(['/orders']);
    expect((component as any).isInboundOrderDetail({ receiptId: '' , description: 'Cycle count', quantityOnHandDiff: '0', availableToPromiseDiff: '0' })).toBeFalse();
    expect((component as any).toLocalDateTime('bad-date')).toBeNull();
  });

  it('should skip dialog update flows when dialogs close without changes', () => {
    component.assetId = 'A001';
    component.assetDetail.set({ inventoryItemId: 'A001', locationSeqId: 'A01', unitCost: '12.50', expireDate: null });
    component.facilityLocations.set([{ locationSeqId: 'A01' }]);
    mockDialogClose(undefined);

    component.openLocationDialog();
    component.openUnitCostDialog();
    component.openExpireDateDialog();

    expect(assetService.updateAsset).not.toHaveBeenCalled();
  });

  it('should merge partial asset update responses and keep prior collections when missing', () => {
    component.assetId = 'A001';
    component.assetDetail.set({ inventoryItemId: 'A001', facilityId: 'FAC-1' });
    component.details.set([{ inventoryItemDetailSeqId: 'D1' } as any]);
    component.receipts.set([{ receiptId: 'R1' } as any]);
    component.variances.set([{ varianceReasonId: 'COUNT_VAR' } as any]);
    component.facilityLocations.set([{ locationSeqId: 'A01' } as any]);
    component.orderReservations.set([{ orderId: 'ORD1' } as any]);
    component.workEffortReservations.set([{ workEffortId: 'JOB1' } as any]);
    assetService.updateAsset.and.returnValue(of({ asset: { inventoryItemId: 'A001', facilityId: 'FAC-9' } }));

    mockDialogClose('11.00');
    component.openUnitCostDialog();

    expect(component.assetDetail()).toEqual(jasmine.objectContaining({ inventoryItemId: 'A001', facilityId: 'FAC-9' }));
    expect(component.details()).toHaveSize(1);
    expect(component.receipts()).toHaveSize(1);
    expect(component.variances()).toHaveSize(1);
    expect(component.facilityLocations()).toHaveSize(1);
    expect(component.orderReservations()).toHaveSize(1);
    expect(component.workEffortReservations()).toHaveSize(1);
    expect(component.facilityName()).toBe('FAC-9');
  });

  it('should cover toggleVarianceForm and background refresh fallback paths', () => {
    component.assetId = 'A001';
    const varianceSpy = spyOn(component, 'openVarianceDialog').and.stub();
    assetService.getAsset.and.returnValue(throwError(() => new Error('refresh failed')));

    component.toggleVarianceForm();
    expect(varianceSpy).toHaveBeenCalled();

    component.details.set([{ inventoryItemDetailSeqId: 'D1' } as any]);
    (component as any).refreshInventorySections();

    expect(component.details()).toHaveSize(1);
  });

  it('should cover helper branches for inbound detection and local date conversion', () => {
    expect((component as any).isInboundOrderDetail({
      receiptId: '',
      description: 'Cycle count adjustment',
      quantityOnHandDiff: '1',
      availableToPromiseDiff: '0',
    })).toBeTrue();
    expect((component as any).isInboundOrderDetail(null)).toBeFalse();

    const converted = (component as any).toLocalDateTime(new Date('2026-04-09T10:20:30.000Z'));
    expect(converted).toMatch(/^2026-04-(08|09)T/);
  });

  it('should send assets to inspection, start repair, and mark installed when allowed', () => {
    component.assetId = 'A001';

    component.assetDetail.set({ inventoryItemId: 'A001', statusId: 'INV_AVAILABLE' });
    component.sendToInspection();
    expect(assetService.updateAsset).toHaveBeenCalledWith('A001', { statusId: 'INV_PENDING_INSP' });
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('Asset sent to inspection queue');

    component.assetDetail.set({ inventoryItemId: 'A001', statusId: 'INV_NS_DEFECTIVE' });
    component.startRepair();
    expect(assetService.updateAsset).toHaveBeenCalledWith('A001', { statusId: 'INV_IN_REPAIR' });
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('Asset marked In Repair — disassembly is now available');

    component.assetDetail.set({ inventoryItemId: 'A001', statusId: 'INV_READY_INSTALL' } as any);
    component.markInstalled();
    expect(assetService.updateAsset).toHaveBeenCalledWith('A001', { statusId: 'INV_AVAILABLE' });
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('ASSET.INSTALLED_SUCCESS');
    expect(component.isInspectionUpdating()).toBeFalse();
  });

  it('should block inspection workflow actions when status or id is not eligible and report update errors', () => {
    component.assetId = undefined;
    component.assetDetail.set({ inventoryItemId: 'A001', statusId: 'INV_AVAILABLE' });

    component.sendToInspection();
    component.startRepair();
    component.markInstalled();

    expect(assetService.updateAsset).not.toHaveBeenCalledWith(undefined as any, jasmine.anything());

    component.assetId = 'A001';
    component.assetDetail.set({ inventoryItemId: 'A001', statusId: 'INV_AVAILABLE' });
    assetService.updateAsset.and.returnValue(throwError(() => new Error('workflow failed')));

    component.sendToInspection();

    expect(snackbarService.showError).toHaveBeenCalledWith('COMMON.ERROR');
    expect(component.isInspectionUpdating()).toBeFalse();
  });

  it('should load child items and clear them on failure or malformed responses', () => {
    assetService.getAssetChildren.and.returnValue(of([{ inventoryItemId: 'CHILD-1' }] as any));

    component.loadChildItems('A001');

    expect(assetService.getAssetChildren).toHaveBeenCalledWith('A001');
    expect(component.childItems()).toEqual([{ inventoryItemId: 'CHILD-1' }] as any);

    assetService.getAssetChildren.and.returnValue(of({ content: [] } as any));
    component.loadChildItems('A001');
    expect(component.childItems()).toEqual([]);

    assetService.getAssetChildren.and.returnValue(throwError(() => new Error('children failed')));
    component.loadChildItems('A001');
    expect(component.childItems()).toEqual([]);
  });

  it('should open disassembly dialog and reload when a repair job is created', () => {
    component.assetDetail.set({
      inventoryItemId: 'A001',
      productId: 'PROD-1',
      ownerPartyId: 'OWNER-1',
    });
    mockDialogClose({ jobId: 'JOB-1' });

    component.openDisassemblyDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(DisassemblyDialogComponent, {
      width: '640px',
      maxWidth: '96vw',
      data: {
        inventoryItemId: 'A001',
        productId: 'PROD-1',
        ownerPartyId: 'OWNER-1',
      },
    });
    expect(assetService.getAsset).toHaveBeenCalledWith('A001');
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('Repair job JOB-1 created and item issued');

    dialogSpy.open.calls.reset();
    component.assetDetail.set({});
    component.openDisassemblyDialog();
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });
});
