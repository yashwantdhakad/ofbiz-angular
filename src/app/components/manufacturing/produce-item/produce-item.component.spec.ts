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
import { of, throwError } from 'rxjs';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { ProduceItemComponent } from './produce-item.component';

describe('ProduceItemComponent', () => {
  let component: ProduceItemComponent;
  let fixture: ComponentFixture<ProduceItemComponent>;
  let facilityService: jasmine.SpyObj<FacilityService>;
  let manufacturingService: jasmine.SpyObj<ManufacturingService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ProduceItemComponent>>;

  beforeEach(async () => {
    facilityService = jasmine.createSpyObj('FacilityService', ['getFacilityLocations']);
    manufacturingService = jasmine.createSpyObj('ManufacturingService', ['produceItem']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    const renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);
    renderSchedulerSpy.deferMacrotask.and.callFake((fn: () => void) => fn());

    facilityService.getFacilityLocations.and.returnValue(of({
      content: [
        { facilityId: 'FAC_1', locationSeqId: 'L1' },
        { facilityId: 'FAC_2', locationSeqId: 'L2' },
      ],
    }));
    manufacturingService.produceItem.and.returnValue(of({ inventoryItemId: 'AST_1' }));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [ProduceItemComponent],
      providers: [
        { provide: FacilityService, useValue: facilityService },
        { provide: ManufacturingService, useValue: manufacturingService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            produceData: {
              workEffortId: 'JOB_1',
              productId: 'FG_100',
              productName: 'Finished Good',
              facilityId: 'FAC_1',
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ProduceItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load facility locations filtered by facility id', () => {
    expect(facilityService.getFacilityLocations).toHaveBeenCalledWith('FAC_1', 0, 1000);
    expect(component.facilityLocations).toHaveSize(2);
    expect(component.facilityLocations[0].facilityId).toBe('FAC_1');
  });

  it('should call produceItem and close dialog on success', () => {
    component.produceForm.patchValue({
      workEffortId: 'JOB_1',
      productId: 'FG_100',
      quantity: '2',
      locationSeqId: 'L1',
    });

    component.produce();

    expect(manufacturingService.produceItem).toHaveBeenCalledWith('JOB_1', {
      productId: 'FG_100',
      quantity: '2',
      locationSeqId: 'L1',
      lotId: '',
      containerId: '',
    });
    expect(dialogRef.close).toHaveBeenCalledWith({ inventoryItemId: 'AST_1' });
  });

  it('should not call produceItem when form is invalid', () => {
    component.produceForm.patchValue({ locationSeqId: '' });
    component.produce();
    expect(manufacturingService.produceItem).not.toHaveBeenCalled();
  });

  it('should handle facility location loading error', () => {
    facilityService.getFacilityLocations.and.returnValue(throwError(() => new Error('load failed')));
    fixture = TestBed.createComponent(ProduceItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.facilityLocations).toEqual([]);
  });
});
