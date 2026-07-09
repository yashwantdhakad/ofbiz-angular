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
import { EditRoutingDialogComponent } from './edit-routing-dialog.component';

describe('EditRoutingDialogComponent', () => {
  let component: EditRoutingDialogComponent;
  let fixture: ComponentFixture<EditRoutingDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<EditRoutingDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<EditRoutingDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [EditRoutingDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            routing: {
              workEffortName: 'Routing A',
              description: 'Default description',
              quantityToProduce: '10',
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(EditRoutingDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(EditRoutingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds the form from dialog data', () => {
    expect(component.form.value).toEqual({
      workEffortName: 'Routing A',
      description: 'Default description',
      quantityToProduce: '10',
    });
  });

  it('marks the form touched and skips save when invalid', () => {
    spyOn(component.form, 'markAllAsTouched');
    component.form.patchValue({ workEffortName: '' });

    component.save();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with the edited routing payload on save', () => {
    component.form.patchValue({
      workEffortName: 'Routing B',
      description: 'Updated description',
      quantityToProduce: '25',
    });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      workEffortName: 'Routing B',
      description: 'Updated description',
      quantityToProduce: '25',
    });
  });

  it('closes without payload on close', () => {
    component.close();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
