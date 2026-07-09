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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { PicklistAssignPickerDialogComponent } from './picklist-assign-picker-dialog.component';

describe('PicklistAssignPickerDialogComponent', () => {
  let component: PicklistAssignPickerDialogComponent;
  let fixture: ComponentFixture<PicklistAssignPickerDialogComponent>;
  let partyService: jasmine.SpyObj<PartyService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PicklistAssignPickerDialogComponent>>;

  beforeEach(async () => {
    partyService = jasmine.createSpyObj<PartyService>('PartyService', ['getPartyRoleSummaries']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<PicklistAssignPickerDialogComponent>>('MatDialogRef', ['close']);
    partyService.getPartyRoleSummaries.and.returnValue(of([] as any));

    await TestBed.configureTestingModule({
      declarations: [PicklistAssignPickerDialogComponent],
      providers: [
        { provide: PartyService, useValue: partyService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { picklistId: 'PK-1' } },
        { provide: RenderSchedulerService, useValue: { deferMacrotask: (fn: () => void) => fn() } },
      ],
    })
      .overrideComponent(PicklistAssignPickerDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(PicklistAssignPickerDialogComponent);
    component = fixture.componentInstance;
  });

  it('loads unique pickers and resolves display names', fakeAsync(() => {
    partyService.getPartyRoleSummaries.and.returnValue(of([
      { partyId: 'PICKER-1', firstName: 'Pat', lastName: 'Picker' },
      { partyId: 'PICKER-1', firstName: 'Duplicate' },
      { partyId: 'PICKER-2', groupName: 'Warehouse Team' },
      { partyId: 'PICKER-3', partyName: 'Fallback Party' },
      { partyId: '' },
    ] as any));

    component.ngOnInit();
    tick();

    expect(component.isLoading()).toBeFalse();
    expect(component.pickers).toEqual([
      { partyId: 'PICKER-1', name: 'Pat Picker' },
      { partyId: 'PICKER-2', name: 'Warehouse Team' },
      { partyId: 'PICKER-3', name: 'Fallback Party' },
    ]);
  }));

  it('clears picker options on load error', fakeAsync(() => {
    partyService.getPartyRoleSummaries.and.returnValue(throwError(() => new Error('failed')));

    component.ngOnInit();
    tick();

    expect(component.isLoading()).toBeFalse();
    expect(component.pickers).toEqual([]);
  }));

  it('closes with the selected picker only when a selection exists', () => {
    component.assign();
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.onSelect('PICKER-1');
    component.assign();

    expect(dialogRef.close).toHaveBeenCalledWith({ partyId: 'PICKER-1' });
    expect(component.trackByPicker(0, { partyId: 'PICKER-1' })).toBe('PICKER-1');
  });

  it('closes without a selection when cancelled', () => {
    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
