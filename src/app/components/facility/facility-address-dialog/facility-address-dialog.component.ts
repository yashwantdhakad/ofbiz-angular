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
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonService } from '@ofbiz/services/common/common.service';
import { FacilityAddress } from '@ofbiz/models/facility.model';

interface GeoItem {
  geo_id?: string;
  geoId?: string;
  geo_type_id?: string;
  geoName?: string;
  geo_name?: string;
  country_geo_id?: string;
  countryGeoId?: string;
}

interface FacilityAddressDialogData {
  address?: FacilityAddress & { contactMechId?: string };
  facilityId?: string;
}

@Component({
  selector: 'app-facility-address-dialog',
  standalone: false,
  templateUrl: './facility-address-dialog.component.html',
  styleUrls: ['./facility-address-dialog.component.css']
})
export class FacilityAddressDialogComponent implements OnInit {
  form: FormGroup;
  countries: GeoItem[] = [];
  states: GeoItem[] = [];
  filteredStates: GeoItem[] = [];

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private dialogRef: MatDialogRef<FacilityAddressDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FacilityAddressDialogData
  ) {
    const address = data?.address || {};
    this.form = this.fb.group({
      contactMechId: [address.contactMechId || null],
      toName: [address.toName || ''],
      address1: [address.address1 || '', Validators.required],
      address2: [address.address2 || ''],
      city: [address.city || '', Validators.required],
      stateProvinceGeoId: [address.stateProvinceGeoId || ''],
      postalCode: [address.postalCode || '', Validators.required],
      countryGeoId: [address.countryGeoId || 'USA', Validators.required],
    });
  }

  ngOnInit(): void {
    this.commonService.getGeos().subscribe({
      next: (geos) => {
        const list = Array.isArray(geos) ? geos : [];
        this.countries = list.filter((geo: GeoItem) => geo?.geo_type_id === 'COUNTRY');
        this.states = list.filter((geo: GeoItem) => geo?.geo_type_id === 'STATE');
        this.onCountryChange();
      },
      error: () => {
        this.countries = [];
        this.states = [];
        this.filteredStates = [];
      },
    });
  }

  onCountryChange(): void {
    const selectedCountry = this.form.get('countryGeoId')?.value;
    this.filteredStates = this.states.filter((state) => {
      const countryId = state?.country_geo_id ?? state?.countryGeoId;
      return !countryId || countryId === selectedCountry;
    });
    const currentState = this.form.get('stateProvinceGeoId')?.value;
    const stateExists = this.filteredStates.some((state) => state?.geo_id === currentState);
    if (!stateExists) {
      this.form.patchValue({ stateProvinceGeoId: '' });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.value);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  trackByGeoId = (index: number, geo: GeoItem): string =>
    geo?.geo_id ?? geo?.geoId ?? String(index);
}
