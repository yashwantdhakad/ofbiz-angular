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
// party-address-list.component.ts
import { Component, ChangeDetectionStrategy, DestroyRef, input, output, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { AddEditAddressComponent } from '../add-edit-address/add-edit-address.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-party-address-list',
  templateUrl: './party-address-list.component.html',
  styleUrls: ['./party-address-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartyAddressListComponent {
  addressList = input<any[]>([]);
  countries = input<any[]>([]);
  states = input<any[]>([]);
  partyId = input<string>('');
  editable = input<boolean>(true);
  purposeId = input<string>('');  // Example: 'PostalShipping'

  addressUpdated = output<string>();

  showAllAddresses = signal(false);

  filteredAddresses = computed(() => {
    return (this.addressList() || []).filter(
      addr => addr?.contactMechPurposeId === this.purposeId()
    );
  });

  visibleAddresses = computed(() => {
    const list = this.filteredAddresses();
    return this.showAllAddresses() ? list : list.slice(0, 2);
  });

  canToggleAddresses = computed(() => {
    return this.filteredAddresses().length > 2;
  });

  constructor(
    private dialog: MatDialog,
    private partyService: PartyService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) { }

  toggleAddresses(): void {
    this.showAllAddresses.update(v => !v);
  }

  editAddress(primaryAddress: any = {}): void {
    const addressData = {
      toName: primaryAddress?.toName || '',
      contactMechId: primaryAddress?.contactMechId || '',
      address1: primaryAddress?.address1 || '',
      address2: primaryAddress?.address2 || '',
      city: primaryAddress?.city || '',
      postalCode: primaryAddress?.postalCode || '',
      countryGeoId: primaryAddress?.countryGeoId || 'USA',
      stateProvinceGeoId: primaryAddress?.stateProvinceGeoId || 'UT',
      contactMechPurposeId:
        primaryAddress?.contactMechPurposeId || this.purposeId(),

      partyId: this.partyId(),
      countries: this.countries(),
      states: this.states(),
    };
    this.dialog
      .open(AddEditAddressComponent, {
        data: { addressData },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((_result) => {
        if (this.partyId()) {
          this.addressUpdated.emit(this.partyId());
        }
      });
  }

  async deleteAddressDialog(params: any): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant('PARTY.DELETE_ADDRESS_TITLE'),
        message: this.translate.instant('PARTY.DELETE_ADDRESS_CONFIRMATION'),
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result && this.partyId()) {
          this.partyService
            .deletePostalAddress(params)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.addressUpdated.emit(this.partyId());
            });
        }
      });
  }

}
