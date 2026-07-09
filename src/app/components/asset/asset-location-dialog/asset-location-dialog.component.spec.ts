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
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AssetLocationDialogComponent } from './asset-location-dialog.component';

describe('AssetLocationDialogComponent', () => {
  let component: AssetLocationDialogComponent;
  let fixture: ComponentFixture<AssetLocationDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AssetLocationDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<AssetLocationDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [AssetLocationDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            locationSeqId: 'WH-A1',
            locations: [
              { locationSeqId: 'WH-A1' },
              { locationSeqId: 'WH-B2' },
            ],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetLocationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds the selected location and filters matching options', () => {
    expect(component.displayLocation(component.locationControl.value)).toBe('WH-A1');

    const filtered = component['filterLocations']('b2');

    expect(filtered).toEqual([{ locationSeqId: 'WH-B2' }]);
  });

  it('returns the raw string from displayLocation when needed', () => {
    expect(component.displayLocation('WH-C3')).toBe('WH-C3');
    expect(component.displayLocation(null)).toBe('');
  });

  it('closes with a trimmed location id on save', () => {
    component.locationControl.setValue('  WH-C3  ');

    component.onSave();

    expect(dialogRef.close).toHaveBeenCalledWith('WH-C3');
  });

  it('closes with null when the selected option is blank', () => {
    component.locationControl.setValue({ locationSeqId: '' });

    component.onSave();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });

  it('closes without payload on cancel', () => {
    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
