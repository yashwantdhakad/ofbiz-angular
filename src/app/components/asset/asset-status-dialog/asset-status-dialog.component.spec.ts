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
import { AssetStatusDialogComponent } from './asset-status-dialog.component';

describe('AssetStatusDialogComponent', () => {
  let component: AssetStatusDialogComponent;
  let fixture: ComponentFixture<AssetStatusDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AssetStatusDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<AssetStatusDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [AssetStatusDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            statusId: 'INV_IN_REPAIR',
            statusMap: new Map([['INV_IN_REPAIR', 'Repair In Progress']]),
          },
        },
      ],
    })
      .overrideComponent(AssetStatusDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(AssetStatusDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('prefills status and applies status-map labels', () => {
    expect(component.statusControl.value).toBe('INV_IN_REPAIR');
    expect(component.statuses.find((status) => status.statusId === 'INV_IN_REPAIR')?.label).toBe('Repair In Progress');
  });

  it('saves the selected status', () => {
    component.statusControl.setValue('INV_AVAILABLE');

    component.onSave();

    expect(dialogRef.close).toHaveBeenCalledWith('INV_AVAILABLE');
  });

  it('closes without a value when cancelled', () => {
    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
