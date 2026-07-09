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
import { of, throwError } from 'rxjs';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { SteelCuttingDialogComponent } from './steel-cutting-dialog.component';

describe('SteelCuttingDialogComponent', () => {
  let component: SteelCuttingDialogComponent;
  let fixture: ComponentFixture<SteelCuttingDialogComponent>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SteelCuttingDialogComponent>>;

  beforeEach(async () => {
    manufacturingService = jasmine.createSpyObj<ManufacturingService>('ManufacturingService', [
      'getInventoryItemWithLot',
      'executeSteelCutting',
    ]);
    dialogRef = jasmine.createSpyObj<MatDialogRef<SteelCuttingDialogComponent>>('MatDialogRef', ['close']);
    manufacturingService.getInventoryItemWithLot.and.returnValue(of({
      inventoryItemId: 'PLATE-1',
      productId: 'STEEL-PLATE',
      lotId: 'LOT-1',
    } as any));
    manufacturingService.executeSteelCutting.and.returnValue(of({
      generatedInventoryItemIds: ['CUT-1', 'SCRAP-1'],
    } as any));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, SteelCuttingDialogComponent],
      providers: [
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { workEffortId: 'JOB-1', sourcePlateInventoryItemId: 'PLATE-1' } },
      ],
    })
      .overrideComponent(SteelCuttingDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(SteelCuttingDialogComponent);
    component = fixture.componentInstance;
  });

  it('loads the source plate on init and adds the default section', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(manufacturingService.getInventoryItemWithLot).toHaveBeenCalledWith('PLATE-1');
    expect(component.sourcePlate?.productId).toBe('STEEL-PLATE');
    expect(component.sections).toHaveSize(1);
    expect(component.sections.at(0).value.productId).toBe('STEEL-PLATE');
    expect(component.isLookingUpPlate()).toBeFalse();
  }));

  it('handles source plate lookup failures without blocking manual entry', fakeAsync(() => {
    manufacturingService.getInventoryItemWithLot.and.returnValue(throwError(() => new Error('not found')));

    component.lookupPlate();
    tick();

    expect(component.sourcePlate).toBeNull();
    expect(component.isLookingUpPlate()).toBeFalse();
  }));

  it('adds and removes section rows', () => {
    component.addSection('SCRAP');
    component.addSection();
    component.removeSection(0);

    expect(component.sections).toHaveSize(1);
    expect(component.sections.at(0).value.sectionType).toBe('CUT_SECTION');
  });

  it('marks the form touched when confirm is attempted without required data', () => {
    component.addSection();
    const markAllAsTouched = spyOn(component.form, 'markAllAsTouched').and.callThrough();

    component.onConfirm();

    expect(markAllAsTouched).toHaveBeenCalled();
    expect(manufacturingService.executeSteelCutting).not.toHaveBeenCalled();
  });

  it('executes steel cutting and stores generated ids', fakeAsync(() => {
    component.ngOnInit();
    tick();
    component.sections.at(0).patchValue({
      serialNumber: 'CUT-001',
      productId: 'STEEL-CUT',
      lengthMm: '10',
      widthMm: '5',
    });

    component.onConfirm();
    tick();

    expect(manufacturingService.executeSteelCutting).toHaveBeenCalledWith({
      workEffortId: 'JOB-1',
      sourcePlateInventoryItemId: 'PLATE-1',
      cutSections: [jasmine.objectContaining({
        serialNumber: 'CUT-001',
        productId: 'STEEL-CUT',
        sectionType: 'CUT_SECTION',
      })],
    });
    expect(component.generatedIds).toEqual(['CUT-1', 'SCRAP-1']);
    expect(component.isLoading()).toBeFalse();
  }));

  it('shows an error message when cutting fails', fakeAsync(() => {
    manufacturingService.executeSteelCutting.and.returnValue(throwError(() => new Error('failed')));
    component.addSection();
    component.form.patchValue({ sourcePlateId: 'PLATE-1' });
    component.sections.at(0).patchValue({ serialNumber: 'CUT-001', productId: 'STEEL-CUT' });

    component.onConfirm();
    tick();

    expect(component.errorMessage).toContain('Failed to record cut sections');
    expect(component.isLoading()).toBeFalse();
  }));

  it('returns generated ids only when they exist', () => {
    component.onClose();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);

    component.generatedIds = ['CUT-1'];
    component.onClose();

    expect(dialogRef.close).toHaveBeenCalledWith({ generatedIds: ['CUT-1'] });
  });
});
