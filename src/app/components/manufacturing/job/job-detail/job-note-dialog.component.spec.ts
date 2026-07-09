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
import { JobNoteDialogComponent } from './job-note-dialog.component';

describe('JobNoteDialogComponent', () => {
  let component: JobNoteDialogComponent;
  let fixture: ComponentFixture<JobNoteDialogComponent>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<JobNoteDialogComponent>>;

  beforeEach(async () => {
    manufacturingService = jasmine.createSpyObj<ManufacturingService>('ManufacturingService', [
      'createJobNote',
      'updateJobNote',
    ]);
    snackbarService = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showSuccess', 'showError']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<JobNoteDialogComponent>>('MatDialogRef', ['close']);
    manufacturingService.createJobNote.and.returnValue(of({ id: 'NOTE-2', noteText: 'Created' } as any));
    manufacturingService.updateJobNote.and.returnValue(of({ id: 'NOTE-1', noteText: 'Updated' } as any));

    await TestBed.configureTestingModule({
      declarations: [JobNoteDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { noteData: { workEffortId: 'JOB-1', id: 1, noteText: 'Existing note' } },
        },
      ],
    })
      .overrideComponent(JobNoteDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(JobNoteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('prefills the note text from the selected note', () => {
    expect(component.noteForm.value.noteText).toBe('Existing note');
  });

  it('does not submit invalid or already saving forms', () => {
    component.noteForm.patchValue({ noteText: '' });

    component.save();

    expect(manufacturingService.updateJobNote).not.toHaveBeenCalled();

    component.noteForm.patchValue({ noteText: 'Ready' });
    component.isSaving = true;
    component.save();

    expect(manufacturingService.updateJobNote).not.toHaveBeenCalled();
  });

  it('updates an existing note with trimmed note text', fakeAsync(() => {
    component.noteForm.patchValue({ noteText: '  Updated note  ' });

    component.save();
    tick();

    expect(manufacturingService.updateJobNote).toHaveBeenCalledWith('JOB-1', 1, { noteText: 'Updated note' });
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('MANUFACTURING.JOB_NOTE_SAVE_SUCCESS');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'NOTE-1', noteText: 'Updated' } as any);
    expect(component.isSaving).toBeFalse();
  }));

  it('creates a new note when no note id is present', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [JobNoteDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: SnackbarService, useValue: snackbarService },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { noteData: { workEffortId: 'JOB-1', internalNote: 'Draft' } } },
      ],
    }).overrideComponent(JobNoteDialogComponent, { set: { template: '' } });
    const createFixture = TestBed.createComponent(JobNoteDialogComponent);
    const createComponent = createFixture.componentInstance;
    createComponent.noteForm.patchValue({ noteText: 'New note' });

    createComponent.save();
    tick();

    expect(manufacturingService.createJobNote).toHaveBeenCalledWith('JOB-1', { noteText: 'New note' });
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'NOTE-2', noteText: 'Created' } as any);
  }));

  it('shows an error and keeps dialog open when save fails', fakeAsync(() => {
    manufacturingService.updateJobNote.and.returnValue(throwError(() => new Error('failed')));

    component.save();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('MANUFACTURING.JOB_NOTE_SAVE_ERROR');
    expect(component.isSaving).toBeFalse();
  }));
});
