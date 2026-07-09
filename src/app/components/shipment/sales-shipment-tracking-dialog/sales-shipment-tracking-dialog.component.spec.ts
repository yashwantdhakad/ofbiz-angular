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
import { SalesShipmentTrackingDialogComponent } from './sales-shipment-tracking-dialog.component';

describe('SalesShipmentTrackingDialogComponent', () => {
  let component: SalesShipmentTrackingDialogComponent;
  let fixture: ComponentFixture<SalesShipmentTrackingDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SalesShipmentTrackingDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<SalesShipmentTrackingDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [SalesShipmentTrackingDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { packageSeqId: '00001', currentTrackingCode: ' TRACK-1 ' } },
      ],
    })
      .overrideComponent(SalesShipmentTrackingDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(SalesShipmentTrackingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('prefills and saves a trimmed tracking code', () => {
    expect(component.form.value.trackingCode).toBe(' TRACK-1 ');

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith('TRACK-1');
  });

  it('saves an empty string when tracking code is nullish', () => {
    component.form.patchValue({ trackingCode: null });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith('');
  });

  it('closes without a value', () => {
    component.close();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
