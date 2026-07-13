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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { PicklistDetailComponent } from './picklist-detail.component';
import { PicklistService } from '@ofbiz/services/picklist/picklist.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { PicklistAssignPickerDialogComponent } from './picklist-assign-picker-dialog.component';

describe('PicklistDetailComponent', () => {
  let component: PicklistDetailComponent;
  let fixture: ComponentFixture<PicklistDetailComponent>;
  let picklistServiceSpy: jasmine.SpyObj<PicklistService>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    picklistServiceSpy = jasmine.createSpyObj<PicklistService>('PicklistService', [
      'assignPicker',
      'createShipmentFromPicklist',
      'getPicklist',
      'getPicklistPdf',
      'markPicked',
    ]);
    picklistServiceSpy.getPicklist.and.returnValue(of({ picklist: { picklistId: 'PK-1' }, bins: [] } as any));
    picklistServiceSpy.getPicklistPdf.and.returnValue(of('<html>picklist</html>'));
    picklistServiceSpy.markPicked.and.returnValue(of({}));
    picklistServiceSpy.createShipmentFromPicklist.and.returnValue(of({ shipmentId: 'SHIP-1' }));
    partyServiceSpy = jasmine.createSpyObj<PartyService>('PartyService', ['getPartyRoleSummaries']);
    partyServiceSpy.getPartyRoleSummaries.and.returnValue(of([] as any));
    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    snackbarSpy = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showError', 'showSuccess']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [PicklistDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { params: of({}) } },
        { provide: Router, useValue: routerSpy },
        { provide: PicklistService, useValue: picklistServiceSpy },
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: RenderSchedulerService, useValue: { deferMacrotask: (fn: () => void) => fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    })
      .overrideComponent(PicklistDetailComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(PicklistDetailComponent);
    component = fixture.componentInstance;
  });

  it('shows status actions for existing input picklists that already have a picker', () => {
    component.picklistDetail = {
      picklist: { picklistId: 'PK-1', statusId: 'PICKLIST_INPUT' },
      pickerId: 'PICKER-1',
      bins: [],
    };

    expect(component.canMarkPicked()).toBeTrue();
    expect(component.canPrintPicklist()).toBeTrue();
    expect(component.canAssignPicker()).toBeTrue();
  });

  it('does not show mark picked for input picklists without a picker', () => {
    component.picklistDetail = {
      picklist: { picklistId: 'PK-1', statusId: 'PICKLIST_INPUT' },
      bins: [],
    };

    expect(component.canMarkPicked()).toBeFalse();
    expect(component.canPrintPicklist()).toBeFalse();
    expect(component.canAssignPicker()).toBeTrue();
  });

  it('reloads picklist after assigning a picker', () => {
    component.picklistId = 'PK-1';
    component.picklistDetail = {
      picklist: { picklistId: 'PK-1', statusId: 'PICKLIST_INPUT' },
      bins: [],
    };
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ partyId: 'PICKER-1' }) } as any);
    picklistServiceSpy.assignPicker.and.returnValue(of({}));
    spyOn(component, 'loadPicklist');

    component.openAssignPickerDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(PicklistAssignPickerDialogComponent, jasmine.objectContaining({
      data: { picklistId: 'PK-1' },
    }));
    expect(picklistServiceSpy.assignPicker).toHaveBeenCalledWith('PK-1', 'PICKER-1');
    expect(component.loadPicklist).toHaveBeenCalledWith('PK-1', false);
  });

  it('loads picklist detail, expands bins, maps history, and resolves picker names', () => {
    picklistServiceSpy.getPicklist.and.returnValue(of({
      picklist: {
        picklistId: 'PK-1',
        facilityId: 'FAC-1',
        facilityName: 'Main Warehouse',
        statusId: 'PICKLIST_ASSIGNED',
        pickerId: 'PICKER-1',
      },
      pickerId: 'PICKER-2',
      bins: [
        {
          picklistBinId: 'BIN-1',
          items: [{ orderId: 'SO-1', orderItemSeqId: '00001', shipGroupSeqId: '00001', inventoryItemId: 'INV-1' }],
        },
      ],
      statusHistory: [{ statusId: 'PICKLIST_ASSIGNED', statusDate: '2026-07-09T10:00:00', changeByUserLoginId: 'admin' }],
    } as any));
    partyServiceSpy.getPartyRoleSummaries.and.returnValue(of([
      { partyId: 'PICKER-1', firstName: 'Pat', lastName: 'Picker' },
      { partyId: 'PICKER-2', groupName: 'Backup Team' },
    ] as any));

    component.loadPicklist('PK-1');

    expect(component.picklistDetail?.picklist?.picklistId).toBe('PK-1');
    expect(component.bins).toHaveSize(1);
    expect(component.statusHistoryEntries()[0]).toEqual(jasmine.objectContaining({
      statusId: 'PICKLIST_ASSIGNED',
      statusLabel: 'PICKLIST_ASSIGNED',
      changedBy: 'admin',
    }));
    expect(partyServiceSpy.getPartyRoleSummaries).toHaveBeenCalledWith('PICKER', ['PICKER-2', 'PICKER-1']);
    expect(component.getPickerName('PICKER-1')).toBe('Pat Picker');
    expect(component.getPickerName('PICKER-2')).toBe('Backup Team');
    expect(component.isBinExpanded('BIN-1')).toBeTrue();
    expect(component.getFacilityLabel('FAC-1')).toBe('Main Warehouse');
  });

  it('clears picklist state when load fails or picker lookup fails', () => {
    picklistServiceSpy.getPicklist.and.returnValue(of({
      picklist: { picklistId: 'PK-1', statusId: 'PICKLIST_INPUT', pickerId: 'PICKER-1' },
      bins: null,
    } as any));
    partyServiceSpy.getPartyRoleSummaries.and.returnValue(throwError(() => new Error('lookup failed')));

    component.loadPicklist('PK-1');

    expect(component.bins).toEqual([]);
    expect(component.getPickerName('PICKER-1')).toBe('PICKER-1');

    picklistServiceSpy.getPicklist.and.returnValue(throwError(() => new Error('load failed')));

    component.loadPicklist('PK-1');

    expect(component.picklistDetail).toBeNull();
    expect(component.bins).toEqual([]);
    expect(component.statusHistoryEntries()).toEqual([]);
  });

  it('marks picked only when workflow allows it and reports failures', () => {
    component.picklistId = 'PK-1';
    component.picklistDetail = { picklist: { statusId: 'PICKLIST_ASSIGNED' }, bins: [] };

    component.markPicked();

    expect(picklistServiceSpy.markPicked).toHaveBeenCalledWith('PK-1');

    component.picklistDetail = { picklist: { statusId: 'PICKLIST_ASSIGNED' }, bins: [] };
    picklistServiceSpy.markPicked.and.returnValue(throwError(() => new Error('failed')));

    component.markPicked();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('PICKLIST.MARK_PICKED_ERROR');

    picklistServiceSpy.markPicked.calls.reset();
    component.picklistDetail = { picklist: { statusId: 'PICKLIST_INPUT' }, bins: [] };

    component.markPicked();

    expect(picklistServiceSpy.markPicked).not.toHaveBeenCalled();
  });

  it('creates shipment and navigates when backend returns a shipment id', () => {
    component.picklistId = 'PK-1';
    component.picklistDetail = { picklist: { statusId: 'PICKLIST_PICKED' }, bins: [] };

    component.createShipment();

    expect(picklistServiceSpy.createShipmentFromPicklist).toHaveBeenCalledWith('PK-1');
    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('PICKLIST.SHIPMENT_CREATED');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/shipments/sales', 'SHIP-1']);
    expect(component.isLoading()).toBeFalse();
  });

  it('reloads or shows an error for create shipment alternate outcomes', () => {
    component.picklistId = 'PK-1';
    component.picklistDetail = { picklist: { statusId: 'PICKLIST_ASSIGNED' }, bins: [] };
    picklistServiceSpy.createShipmentFromPicklist.and.returnValue(of({}));
    spyOn(component, 'loadPicklist');

    component.createShipment();

    expect(component.loadPicklist).toHaveBeenCalledWith('PK-1', false);

    picklistServiceSpy.createShipmentFromPicklist.and.returnValue(of({ shipmentIds: ['SHIP-1', 'SHIP-2'] }));
    routerSpy.navigate.calls.reset();

    component.createShipment();

    expect(snackbarSpy.showSuccess).toHaveBeenCalledWith('PICKLIST.SHIPMENTS_CREATED');
    expect(component.loadPicklist).toHaveBeenCalledWith('PK-1', false);
    expect(routerSpy.navigate).not.toHaveBeenCalled();

    picklistServiceSpy.createShipmentFromPicklist.and.returnValue(throwError(() => new Error('failed')));

    component.createShipment();

    expect(snackbarSpy.showError).toHaveBeenCalledWith('PICKLIST.SHIPMENT_CREATE_ERROR');
    expect(component.isLoading()).toBeFalse();
  });

  it('prints pdf content and handles empty, blocked, and failed pdf branches', () => {
    component.picklistId = 'PK-1';
    component.picklistDetail = { picklist: { statusId: 'PICKLIST_ASSIGNED' }, bins: [] };
    const mockWin = { location: { href: '' } };
    spyOn(window, 'open').and.returnValue(mockWin as any);
    const createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:picklist');

    component.printPdf();

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(mockWin.location.href).toBe('blob:picklist');

    picklistServiceSpy.getPicklistPdf.and.returnValue(of(''));
    component.printPdf();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('PICKLIST.PDF_GENERATE_ERROR');

    picklistServiceSpy.getPicklistPdf.and.returnValue(of('<html>blocked</html>'));
    (window.open as jasmine.Spy).and.returnValue(null);
    component.printPdf();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('PICKLIST.PDF_POPUP_BLOCKED');

    picklistServiceSpy.getPicklistPdf.and.returnValue(throwError(() => new Error('failed')));
    component.printPdf();
    expect(snackbarSpy.showError).toHaveBeenCalledWith('PICKLIST.PDF_GENERATE_ERROR');
  });

  it('covers display, expansion, and tracking helpers', () => {
    component.picklistDetail = { picklist: { statusId: 'PICKLIST_COMPLETE' }, bins: [] };

    expect(component.canPrintPicklist()).toBeTrue();
    expect(component.canCreateShipment()).toBeFalse();
    expect(component.getFacilityLabel('FAC-1')).toBe('FAC-1');
    expect(component.getPicklistStatusLabel('PICKLIST_COMPLETE', 'Complete')).toBe('Complete');
    expect(component.getItemStatusLabel('ITEM_PICKED', 'Picked')).toBe('Picked');
    expect(component.getPickerName()).toBe('');
    expect(component.trackByBin(3, { id: 'BIN-X' } as any)).toBe('BIN-X');
    expect(component.trackByBin(4, {} as any)).toBe(4);
    expect(component.trackByPicklistItem(0, {
      orderId: 'SO-1',
      orderItemSeqId: '00001',
      shipGroupSeqId: '00002',
      inventoryItemId: 'INV-1',
    } as any)).toBe('SO-1|00001|00002|INV-1');

    component.onBinOpened('BIN-1');
    expect(component.isBinExpanded('BIN-1')).toBeTrue();
    component.onBinClosed('BIN-1');
    expect(component.isBinExpanded('BIN-1')).toBeFalse();
    component.onBinOpened();
    component.onBinClosed();
    expect(component.isBinExpanded()).toBeFalse();
  });
});
