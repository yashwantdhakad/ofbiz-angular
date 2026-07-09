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
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { CompleteTaskDialogComponent } from './complete-task-dialog.component';

describe('CompleteTaskDialogComponent', () => {
  let component: CompleteTaskDialogComponent;
  let fixture: ComponentFixture<CompleteTaskDialogComponent>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CompleteTaskDialogComponent>>;

  beforeEach(async () => {
    manufacturingService = jasmine.createSpyObj<ManufacturingService>('ManufacturingService', ['completeJobTask']);
    snackbarService = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<CompleteTaskDialogComponent>>('MatDialogRef', ['close']);
    manufacturingService.completeJobTask.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      declarations: [CompleteTaskDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { workEffortId: 'JOB-1', taskId: 'TASK-1', estimatedHours: 2 } },
      ],
    })
      .overrideComponent(CompleteTaskDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(CompleteTaskDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('prefills estimated hours and previews labor cost', () => {
    component.form.patchValue({ actualSetupHours: 1, hourlyRate: 25 });

    expect(component.form.value.actualHours).toBe(2);
    expect(component.laborCostPreview).toBe(75);
  });

  it('does not submit an invalid or already saving form', () => {
    component.form.patchValue({ actualHours: -1 });

    component.complete();

    expect(manufacturingService.completeJobTask).not.toHaveBeenCalled();

    component.form.patchValue({ actualHours: 1 });
    component.isSaving = true;
    component.complete();

    expect(manufacturingService.completeJobTask).not.toHaveBeenCalled();
  });

  it('submits normalized labor payload and closes on success', fakeAsync(() => {
    component.form.patchValue({ actualHours: 2, actualSetupHours: 0.5, hourlyRate: 30 });

    component.complete();
    tick();

    expect(manufacturingService.completeJobTask).toHaveBeenCalledWith('JOB-1', 'TASK-1', {
      actualHours: 2,
      actualSetupHours: 0.5,
      hourlyRate: 30,
    });
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('MANUFACTURING.TASK_COMPLETE_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(component.isSaving).toBeFalse();
  }));

  it('shows backend error message and keeps the dialog open on failure', fakeAsync(() => {
    manufacturingService.completeJobTask.and.returnValue(throwError(() => ({
      error: { errorMessage: 'Task is already closed' },
    })));

    component.complete();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('Task is already closed');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.isSaving).toBeFalse();
  }));
});
