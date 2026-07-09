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
import { TranslateModule } from '@ngx-translate/core';
import { CommonService } from '@ofbiz/services/common/common.service';
import { FacilityAddressDialogComponent } from './facility-address-dialog.component';

describe('FacilityAddressDialogComponent', () => {
  let component: FacilityAddressDialogComponent;
  let fixture: ComponentFixture<FacilityAddressDialogComponent>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FacilityAddressDialogComponent>>;

  beforeEach(async () => {
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getGeos']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<FacilityAddressDialogComponent>>('MatDialogRef', ['close']);
    commonService.getGeos.and.returnValue(of([
      { geo_id: 'USA', geo_type_id: 'COUNTRY', geo_name: 'United States' },
      { geo_id: 'IND', geo_type_id: 'COUNTRY', geo_name: 'India' },
      { geo_id: 'CA', geo_type_id: 'STATE', geo_name: 'California', country_geo_id: 'USA' },
      { geo_id: 'KA', geo_type_id: 'STATE', geo_name: 'Karnataka', country_geo_id: 'IND' },
    ]));

    await TestBed.configureTestingModule({
      declarations: [FacilityAddressDialogComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: CommonService, useValue: commonService },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            address: {
              contactMechId: 'CM-1',
              toName: 'Warehouse',
              address1: 'Line 1',
              city: 'San Jose',
              stateProvinceGeoId: 'CA',
              postalCode: '95112',
              countryGeoId: 'USA',
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FacilityAddressDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads countries and filters states for the selected country', () => {
    expect(commonService.getGeos).toHaveBeenCalled();
    expect(component.countries.map((item) => item.geo_id)).toEqual(['USA', 'IND']);
    expect(component.filteredStates.map((item) => item.geo_id)).toEqual(['CA']);
  });

  it('resets state when the selected country no longer matches', () => {
    component.form.patchValue({ countryGeoId: 'IND', stateProvinceGeoId: 'CA' });

    component.onCountryChange();

    expect(component.filteredStates.map((item) => item.geo_id)).toEqual(['KA']);
    expect(component.form.get('stateProvinceGeoId')?.value).toBe('');
  });

  it('closes with the form value on save when valid', () => {
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(component.form.value);
  });

  it('marks the form as touched and does not close when save is invalid', () => {
    component.form.patchValue({ address1: '' });
    const markAllAsTouchedSpy = spyOn(component.form, 'markAllAsTouched').and.callThrough();

    component.save();

    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes without a value on cancel', () => {
    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('clears geo lists when loading geos fails', () => {
    commonService.getGeos.and.returnValue(throwError(() => new Error('boom')));

    component.countries = [{ geo_id: 'USA', geo_type_id: 'COUNTRY' }];
    component.states = [{ geo_id: 'CA', geo_type_id: 'STATE' }];
    component.filteredStates = [{ geo_id: 'CA', geo_type_id: 'STATE' }];

    component.ngOnInit();

    expect(component.countries).toEqual([]);
    expect(component.states).toEqual([]);
    expect(component.filteredStates).toEqual([]);
  });

  it('falls back to geoId or index in trackByGeoId', () => {
    expect(component.trackByGeoId(2, { geoId: 'ALT-1' })).toBe('ALT-1');
    expect(component.trackByGeoId(3, {})).toBe('3');
  });
});
