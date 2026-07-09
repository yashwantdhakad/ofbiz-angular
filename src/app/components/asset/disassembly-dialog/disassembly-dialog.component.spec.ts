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
import { AssetService } from '@ofbiz/services/asset/asset.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { DisassemblyDialogComponent } from './disassembly-dialog.component';

describe('DisassemblyDialogComponent', () => {
  let component: DisassemblyDialogComponent;
  let fixture: ComponentFixture<DisassemblyDialogComponent>;
  let assetService: jasmine.SpyObj<AssetService>;
  let snackbar: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DisassemblyDialogComponent>>;

  beforeEach(async () => {
    assetService = jasmine.createSpyObj<AssetService>('AssetService', ['startRepairJob']);
    snackbar = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showError']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<DisassemblyDialogComponent>>('MatDialogRef', ['close']);
    assetService.startRepairJob.and.returnValue(of({ jobId: 'JOB-1' } as any));

    await TestBed.configureTestingModule({
      declarations: [DisassemblyDialogComponent],
      providers: [
        { provide: AssetService, useValue: assetService },
        { provide: SnackbarService, useValue: snackbar },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { inventoryItemId: 'INV-1', productId: 'PROD-1' } },
      ],
    })
      .overrideComponent(DisassemblyDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(DisassemblyDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts the repair job and stores the created job id', fakeAsync(() => {
    component.executeRepairJob();
    tick();

    expect(assetService.startRepairJob).toHaveBeenCalledWith('INV-1');
    expect(component.isLoading()).toBeFalse();
    expect(component.jobId()).toBe('JOB-1');
    expect(component.isComplete()).toBeTrue();
  }));

  it('falls back to work effort id from the repair job response', fakeAsync(() => {
    assetService.startRepairJob.and.returnValue(of({ workEffortId: 'WE-1' } as any));

    component.executeRepairJob();
    tick();

    expect(component.jobId()).toBe('WE-1');
    expect(component.isComplete()).toBeTrue();
  }));

  it('shows backend error message when repair job creation fails', fakeAsync(() => {
    assetService.startRepairJob.and.returnValue(throwError(() => ({ error: { error: 'Cannot disassemble' } })));

    component.executeRepairJob();
    tick();

    expect(component.isLoading()).toBeFalse();
    expect(snackbar.showError).toHaveBeenCalledWith('Cannot disassemble');
  }));

  it('closes with completion result only after the job is created', () => {
    component.close();
    expect(dialogRef.close).toHaveBeenCalledWith(null);

    component.jobId.set('JOB-1');
    component.isComplete.set(true);
    component.close();

    expect(dialogRef.close).toHaveBeenCalledWith({ jobId: 'JOB-1' });
  });
});
