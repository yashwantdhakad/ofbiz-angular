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
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AddRoutingContentDialogComponent } from './add-routing-content-dialog.component';

describe('AddRoutingContentDialogComponent', () => {
  let component: AddRoutingContentDialogComponent;
  let fixture: ComponentFixture<AddRoutingContentDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddRoutingContentDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<AddRoutingContentDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [AddRoutingContentDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { contentType: 'IMAGE' } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddRoutingContentDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AddRoutingContentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds the dialog with the provided content type', () => {
    expect(component.form.value.workEffortContentTypeId).toBe('IMAGE');
  });

  it('marks the form touched and skips save when invalid', () => {
    spyOn(component.form, 'markAllAsTouched');

    component.save();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('patches the uploaded file when one is selected', () => {
    const file = new File(['hello'], 'routing.txt', { type: 'text/plain' });
    const event = { target: { files: [file] } } as unknown as Event;

    component.onFileChange(event);

    expect(component.form.value.contentFile).toBe(file);
  });

  it('ignores file changes when no file is selected', () => {
    const event = { target: { files: [] } } as unknown as Event;

    component.onFileChange(event);

    expect(component.form.value.contentFile).toBeNull();
  });

  it('closes with form data on save and closes empty on cancel', () => {
    const file = new File(['hello'], 'routing.txt', { type: 'text/plain' });
    component.form.patchValue({ contentFile: file });

    component.save();

    const payload = dialogRef.close.calls.argsFor(0)[0];
    expect(payload.workEffortContentTypeId).toBe('IMAGE');
    expect(payload.formData.get('uploadedFile')).toBe(file);

    component.close();

    expect(dialogRef.close.calls.mostRecent().args).toEqual([]);
  });
});
