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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { AddOperationDialogComponent } from './add-operation-dialog.component';

describe('AddOperationDialogComponent', () => {
  let component: AddOperationDialogComponent;
  let fixture: ComponentFixture<AddOperationDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddOperationDialogComponent>>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<AddOperationDialogComponent>>('MatDialogRef', ['close']);
    manufacturingService = jasmine.createSpyObj<ManufacturingService>('ManufacturingService', ['getWorkEfforts']);

    await TestBed.configureTestingModule({
      declarations: [AddOperationDialogComponent],
      providers: [
        FormBuilder,
        { provide: MAT_DIALOG_DATA, useValue: { sequenceNum: '20' } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ManufacturingService, useValue: manufacturingService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AddOperationDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(AddOperationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('loads operations and exposes a filtered list', fakeAsync(() => {
    manufacturingService.getWorkEfforts.and.returnValue(
      of([
        { workEffortId: 'OP-1', workEffortName: 'Cutting', description: 'Cut parts' },
        { workEffortId: 'OP-2', workEffortName: 'Welding', description: 'Join parts' },
      ] as any)
    );

    createComponent();
    tick(200);

    expect(manufacturingService.getWorkEfforts).toHaveBeenCalledWith({
      workEffortTypeIds: 'ROU_TASK,ROUTING_TASK',
      size: 500,
    });
    expect(component.isLoading()).toBeFalse();
    expect(component.operations).toHaveSize(2);
    expect((component as any).filterOperations('weld')).toEqual([
      { workEffortId: 'OP-2', workEffortName: 'Welding', description: 'Join parts' },
    ]);
    expect((component as any).filterOperations('')).toEqual([
      { workEffortId: 'OP-1', workEffortName: 'Cutting', description: 'Cut parts' },
      { workEffortId: 'OP-2', workEffortName: 'Welding', description: 'Join parts' },
    ]);
  }));

  it('falls back to all operations for blank search and clears loading on failure', fakeAsync(() => {
    manufacturingService.getWorkEfforts.and.returnValue(throwError(() => new Error('load failed')) as any);

    createComponent();
    tick(200);

    expect(component.operations).toEqual([]);
    expect(component.isLoading()).toBeFalse();

    component.operations = [{ workEffortId: 'OP-1', workEffortName: 'Cutting' } as any];
    let emitted: any[] = [];
    component.filteredOperations$.subscribe((items) => {
      emitted = items;
    });
    component.form.get('operationSearch')?.setValue('   ');
    tick(200);

    expect(emitted).toEqual([{ workEffortId: 'OP-1', workEffortName: 'Cutting' }]);
  }));

  it('selects an operation, clears search-derived ids, and formats display values', () => {
    manufacturingService.getWorkEfforts.and.returnValue(of([] as any));
    createComponent();

    component.selectOperation({ workEffortId: 'OP-9', workEffortName: 'Polishing' } as any);
    expect(component.form.value.operationWorkEffortId).toBe('OP-9');
    expect(component.displayOperation(component.form.value.operationSearch)).toBe('Polishing');

    component.onOperationInputChange('manual text');
    expect(component.form.value.operationWorkEffortId).toBe('');

    expect(component.displayOperation('Raw text')).toBe('Raw text');
    expect(component.displayOperation(null)).toBe('');
    expect(component.displayOperation({ workEffortId: 'OP-8' } as any)).toBe('OP-8');
  });

  it('filters using object and text input, and clears the selected id on string input', fakeAsync(() => {
    manufacturingService.getWorkEfforts.and.returnValue(of([] as any));
    createComponent();
    component.operations = [
      { workEffortId: 'OP-1', workEffortName: 'Cutting', description: 'Cut parts' },
      { workEffortId: 'OP-2', workEffortName: 'Welding', description: 'Join parts' },
    ] as any;

    let emitted: any[] = [];
    component.filteredOperations$.subscribe((items) => {
      emitted = items;
    });
    tick(200);
    emitted = [];

    component.form.get('operationSearch')?.setValue({ workEffortId: 'OP-2', workEffortName: 'Welding' } as any);
    tick(200);

    expect(emitted).toEqual([{ workEffortId: 'OP-2', workEffortName: 'Welding', description: 'Join parts' }]);

    component.selectOperation({ workEffortId: 'OP-2', workEffortName: 'Welding' } as any);
    component.onOperationInputChange('manual text');
    expect(component.form.value.operationWorkEffortId).toBe('');

    emitted = [];
    component.form.get('operationSearch')?.setValue('cut parts');
    tick(200);
    expect(emitted).toEqual([{ workEffortId: 'OP-1', workEffortName: 'Cutting', description: 'Cut parts' }]);
  }));

  it('keeps the selected id when the input change receives an object value', () => {
    manufacturingService.getWorkEfforts.and.returnValue(of([] as any));
    createComponent();

    component.selectOperation({ workEffortId: 'OP-7', workEffortName: 'Inspecting' } as any);
    component.onOperationInputChange({ workEffortId: 'OP-7', workEffortName: 'Inspecting' } as any);

    expect(component.form.value.operationWorkEffortId).toBe('OP-7');
  });

  it('marks the form touched when invalid and closes with the payload when valid', () => {
    manufacturingService.getWorkEfforts.and.returnValue(of([] as any));
    createComponent();
    spyOn(component.form, 'markAllAsTouched');

    component.save();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.form.patchValue({
      operationWorkEffortId: 'OP-1',
      sequenceNum: '30',
      fromDate: new Date('2026-04-08T00:00:00Z'),
      thruDate: new Date('2026-04-09T00:00:00Z'),
      operationSearch: { workEffortId: 'OP-1', workEffortName: 'Cutting' },
    });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      operationWorkEffortId: 'OP-1',
      sequenceNum: '30',
      fromDate: jasmine.any(Date),
      thruDate: jasmine.any(Date),
    });
  });

  it('closes without payload on explicit close', () => {
    manufacturingService.getWorkEfforts.and.returnValue(of([] as any));
    createComponent();

    component.close();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
