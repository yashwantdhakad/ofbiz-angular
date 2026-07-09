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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { JobAssignWorkerDialogComponent } from './job-assign-worker-dialog.component';

describe('JobAssignWorkerDialogComponent', () => {
  let component: JobAssignWorkerDialogComponent;
  let fixture: ComponentFixture<JobAssignWorkerDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<JobAssignWorkerDialogComponent>>;
  let partyService: jasmine.SpyObj<PartyService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    partyService = jasmine.createSpyObj('PartyService', ['getPartyRoleSummaries']);

    await TestBed.configureTestingModule({
      declarations: [JobAssignWorkerDialogComponent],
      providers: [
        { provide: PartyService, useValue: partyService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { workEffortId: 'JOB-1', selectedPartyId: 'P-1' } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(JobAssignWorkerDialogComponent, { set: { template: '' } })
      .compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(JobAssignWorkerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('loads workers, deduplicates party ids, and builds display names', () => {
    partyService.getPartyRoleSummaries.and.returnValue(
      of([
        { partyId: 'P-1', firstName: 'John', lastName: 'Doe' },
        { partyId: 'P-1', firstName: 'Duplicate', lastName: 'Worker' },
        { partyId: 'P-2', name: 'Named Worker' },
        { partyId: 'P-3', groupName: 'Group Worker' },
        { partyId: 'P-4', partyName: 'Party Worker' },
        { partyId: 'P-5' },
      ] as any)
    );

    createComponent();

    expect(component.selectedPartyId).toBe('P-1');
    expect(component.workers()).toEqual([
      { partyId: 'P-1', name: 'John Doe' },
      { partyId: 'P-2', name: 'Named Worker' },
      { partyId: 'P-3', name: 'Group Worker' },
      { partyId: 'P-4', name: 'Party Worker' },
      { partyId: 'P-5', name: 'P-5' },
    ]);
    expect(component.isLoading()).toBeFalse();
  });

  it('falls back to an empty worker list on load error', () => {
    partyService.getPartyRoleSummaries.and.returnValue(throwError(() => new Error('load failed')));

    createComponent();

    expect(component.workers()).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  });

  it('only assigns when a worker is selected', () => {
    partyService.getPartyRoleSummaries.and.returnValue(of([] as any));
    createComponent();

    component.selectedPartyId = null;
    component.assign();
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.selectedPartyId = 'P-2';
    component.assign();
    expect(dialogRef.close).toHaveBeenCalledWith({ partyId: 'P-2' });
  });

  it('closes without payload on cancel and tracks workers by party id', () => {
    partyService.getPartyRoleSummaries.and.returnValue(of([] as any));
    createComponent();

    expect(component.trackByWorker(0, { partyId: 'P-1' })).toBe('P-1');
    expect(component.trackByWorker(2, {} as any)).toBe('2');

    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
