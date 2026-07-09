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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InspectionNoteDialogComponent } from './inspection-note-dialog.component';

describe('InspectionNoteDialogComponent', () => {
  let component: InspectionNoteDialogComponent;
  let fixture: ComponentFixture<InspectionNoteDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<InspectionNoteDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<InspectionNoteDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [InspectionNoteDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { decision: 'ACCEPT', inventoryItemId: 'INV-1' } },
      ],
    })
      .overrideComponent(InspectionNoteDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(InspectionNoteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('confirms trimmed note and measurement values', () => {
    component.inspectionNote = '  Looks good  ';
    component.inspectionMeasurements = '  10mm  ';

    component.confirm();

    expect(dialogRef.close).toHaveBeenCalledWith({
      inspectionNote: 'Looks good',
      inspectionMeasurements: '10mm',
    });
  });

  it('confirms an empty result when no optional values are entered', () => {
    component.confirm();

    expect(dialogRef.close).toHaveBeenCalledWith({});
  });

  it('closes with null when cancelled', () => {
    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});
