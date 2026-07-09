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
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { SetConsumableInventoryDialogComponent } from './set-consumable-inventory-dialog.component';

describe('SetConsumableInventoryDialogComponent', () => {
  let component: SetConsumableInventoryDialogComponent;
  let fixture: ComponentFixture<SetConsumableInventoryDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SetConsumableInventoryDialogComponent>>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<SetConsumableInventoryDialogComponent>>('MatDialogRef', ['close']);
    manufacturingService = jasmine.createSpyObj<ManufacturingService>('ManufacturingService', [
      'getConsumableInventoryOptions',
      'reserveConsumable',
    ]);

    await TestBed.configureTestingModule({
      declarations: [SetConsumableInventoryDialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { workEffortId: 'JOB-1', wegsId: 11, productId: 'PROD-1', remainingQuantity: '3' },
        },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ManufacturingService, useValue: manufacturingService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(SetConsumableInventoryDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(SetConsumableInventoryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('loads options, seeds default reserve quantities, and selects the first option', () => {
    manufacturingService.getConsumableInventoryOptions.and.returnValue(
      of({
        inventoryOptions: [
          { inventoryItemId: 'INV-1', availableToPromiseTotal: '5' },
          { inventoryItemId: 'INV-2', availableToPromiseTotal: '2' },
        ],
      } as any)
    );

    createComponent();

    expect(manufacturingService.getConsumableInventoryOptions).toHaveBeenCalledWith('JOB-1', 11);
    expect(component.options).toHaveSize(2);
    expect(component.selectedInventoryItemId).toBe('INV-1');
    expect(component.reserveQtyByInventoryItemId).toEqual({ 'INV-1': '3', 'INV-2': '3' });
    expect(component.isLoading()).toBeFalse();
  });

  it('clears loading state on options load failure', () => {
    manufacturingService.getConsumableInventoryOptions.and.returnValue(throwError(() => new Error('load failed')));

    createComponent();

    expect(component.options).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  });

  it('supports selecting and unselecting rows', () => {
    manufacturingService.getConsumableInventoryOptions.and.returnValue(of({ inventoryOptions: [] } as any));
    createComponent();

    component.selectInventoryOption({ inventoryItemId: 'INV-2' });
    expect(component.isSelected({ inventoryItemId: 'INV-2' })).toBeTrue();

    component.onSelectionChanged({ inventoryItemId: 'INV-2' }, false);
    expect(component.selectedInventoryItemId).toBe('');

    component.onSelectionChanged({ inventoryItemId: 'INV-3' }, true);
    expect(component.selectedInventoryItemId).toBe('INV-3');
  });

  it('tracks reserve input updates and guards against rows without ids', () => {
    manufacturingService.getConsumableInventoryOptions.and.returnValue(of({ inventoryOptions: [] } as any));
    createComponent();

    component.updateReserveInput({ inventoryItemId: 'INV-1' }, '7');
    component.updateReserveInput({}, '9');

    expect(component.reserveInputForRow({ inventoryItemId: 'INV-1' })).toBe('7');
    expect(component.reserveInputForRow({ inventoryItemId: 'INV-X' })).toBe('');
  });

  it('computes reserve eligibility from selected item and ATP', () => {
    manufacturingService.getConsumableInventoryOptions.and.returnValue(
      of({ inventoryOptions: [{ inventoryItemId: 'INV-1', availableToPromiseTotal: '5' }] } as any)
    );
    createComponent();

    expect(component.selectedAtp()).toBe(5);
    expect(component.canReserve()).toBeTrue();

    component.updateReserveInput({ inventoryItemId: 'INV-1' }, '6');
    expect(component.canReserve()).toBeFalse();

    component.updateReserveInput({ inventoryItemId: 'INV-1' }, '0');
    expect(component.canReserve()).toBeFalse();
  });

  it('does not submit when reserve is invalid', () => {
    manufacturingService.getConsumableInventoryOptions.and.returnValue(of({ inventoryOptions: [] } as any));
    createComponent();
    component.selectedInventoryItemId = '';

    component.reserveSelected();

    expect(manufacturingService.reserveConsumable).not.toHaveBeenCalled();
  });

  it('submits the selected reservation payload and closes on success', () => {
    manufacturingService.getConsumableInventoryOptions.and.returnValue(
      of({ inventoryOptions: [{ inventoryItemId: 'INV-1', availableToPromiseTotal: '5' }] } as any)
    );
    manufacturingService.reserveConsumable.and.returnValue(of({} as any));
    createComponent();

    component.reserveSelected();

    expect(manufacturingService.reserveConsumable).toHaveBeenCalledWith('JOB-1', 11, {
      inventoryItemId: 'INV-1',
      quantity: '3',
      reserveOrderEnumId: 'INVRO_FIFO_REC',
    });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(component.isSaving()).toBeFalse();
  });

  it('resets saving state when reserve fails', () => {
    manufacturingService.getConsumableInventoryOptions.and.returnValue(
      of({ inventoryOptions: [{ inventoryItemId: 'INV-1', availableToPromiseTotal: '5' }] } as any)
    );
    manufacturingService.reserveConsumable.and.returnValue(throwError(() => new Error('reserve failed')));
    createComponent();

    component.reserveSelected();

    expect(component.isSaving()).toBeFalse();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
