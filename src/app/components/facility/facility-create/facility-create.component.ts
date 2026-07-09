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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { finalize } from 'rxjs';

interface FacilityType {
  facilityTypeId: string;
  description?: string;
}

interface GeoItem {
  geo_id?: string;
  geo_name?: string;
  geoName?: string;
  geo_type_id?: string;
  country_geo_id?: string;
  countryGeoId?: string;
  [key: string]: unknown;
}

interface ProductStore {
  payToPartyId?: string;
}
import { filterGeoRecords } from '@ofbiz/helpers/geo-type-helper';
import { FacilityService } from '@ofbiz/services/facility/facility.service';
import { OrderService } from '@ofbiz/services/order/order.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { loadGeos } from '@ofbiz/store/geo/geo.actions';
import { selectGeoList } from '@ofbiz/store/geo/geo.selector';
import { GeoState } from '@ofbiz/store/geo/geo.state';

@Component({
  standalone: false,
  selector: 'app-facility-create',
  templateUrl: './facility-create.component.html',
  styleUrls: ['./facility-create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityCreateComponent implements OnInit {
  readonly isLoading = signal(false);
  form: FormGroup;
  facilityTypes: FacilityType[] = [];
  countries: GeoItem[] = [];
  states: GeoItem[] = [];
  filteredStates: GeoItem[] = [];
  ownerPartyOptions: string[] = [];
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private facilityService: FacilityService,
    private orderService: OrderService,
    private snackbarService: SnackbarService,
    private router: Router,
    private store: Store<GeoState>
  ) {
    const required = Validators.required;
    this.form = this.fb.group({
      facilityId: ['', required],
      facilityName: ['', required],
      facilityTypeId: ['WAREHOUSE', required],
      requireInspection: [false],
      ownerPartyId: ['', required],
      toName: [''],
      address1: ['', required],
      address2: [''],
      city: ['', required],
      postalCode: ['', required],
      countryGeoId: ['USA', required],
      stateProvinceGeoId: ['UT', required],
    });
  }

  ngOnInit(): void {
    this.facilityService.getFacilityTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (types) => (this.facilityTypes = types as unknown as FacilityType[]),
      error: () => (this.facilityTypes = []),
    });
    this.loadOwnerPartyOptions();

    this.store.dispatch(loadGeos());
    this.store.pipe(select(selectGeoList), takeUntilDestroyed(this.destroyRef)).subscribe((geoListObject) => {
      if (!geoListObject) {
        return;
      }
       
      this.countries = filterGeoRecords(geoListObject as any, 'COUNTRY') as GeoItem[];
       
      this.states = filterGeoRecords(geoListObject as any, 'STATE') as GeoItem[];
      this.filteredStates = this.filterStatesByCountry(this.states);
    });

    this.form.get('countryGeoId')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.filteredStates = this.filterStatesByCountry(this.states);
      this.form.get('stateProvinceGeoId')?.setValue('');
    });
  }

  loadOwnerPartyOptions(): void {
    this.orderService.getProductStores().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (stores) => {
        const list: ProductStore[] = Array.isArray(stores) ? stores : [];
        const partyIds = list
          .map((store: ProductStore) => String(store?.payToPartyId || '').trim())
          .filter((partyId: string) => !!partyId);
        this.ownerPartyOptions = Array.from(new Set(partyIds));
        if (this.ownerPartyOptions.length > 0 && !this.form.get('ownerPartyId')?.value) {
          this.form.get('ownerPartyId')?.setValue(this.ownerPartyOptions[0]);
        }
      },
      error: () => {
        this.ownerPartyOptions = [];
      },
    });
  }

  filterStatesByCountry(states: GeoItem[] = []): GeoItem[] {
    const selectedCountryGeoId = this.form.get('countryGeoId')?.value || 'USA';
    return states.filter((state: GeoItem) => {
      const countryId = state.country_geo_id ?? state.countryGeoId;
      return !countryId || countryId === selectedCountryGeoId;
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const payload = {
      facilityId: value.facilityId,
      facilityName: value.facilityName,
      facilityTypeId: value.facilityTypeId,
      ownerPartyId: value.ownerPartyId,
      requireInspection: value.requireInspection ? 'Y' : 'N',
      address: {
        toName: value.toName || value.facilityName,
        address1: value.address1,
        address2: value.address2 || null,
        city: value.city,
        postalCode: value.postalCode,
        countryGeoId: value.countryGeoId,
        stateProvinceGeoId: value.stateProvinceGeoId,
      }
    };

    this.isLoading.set(true);
    this.facilityService
      .createFacility(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (result: any) => {
          const id = result?.facilityId || result?.id;
          if (id) {
            this.router.navigate(['/facilities', id]);
          } else {
            this.router.navigate(['/facilities']);
          }
        },
        error: (err: any) => {
          const message = err?.error?.message || err?.message || 'Failed to create warehouse.';
          this.snackbarService.showError(message);
        },
      });
  }
}
