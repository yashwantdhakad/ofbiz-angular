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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CompanyService } from '@ofbiz/services/company/company.service';
import { AddEditAddressComponent } from '@ofbiz/components/party/add-edit-address/add-edit-address.component';
import { PostalAddress } from '@ofbiz/models/party.model';
import { ChangeDetectorRef } from '@angular/core';
import { CompanyNameDialogComponent } from '../company-name-dialog/company-name-dialog.component';

@Component({
  standalone: false,
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyComponent implements OnInit {
  context = computed(() => this.companyService.contextSignal());
  isLoading = computed(() => !!this.context()?.loading);
  readonly companyAddressLine = computed(() => this.getAddressLine(this.context()?.companyAddress));
  readonly hasCompanyAddress = computed(() => this.hasAddress(this.context()?.companyAddress));
  selectedLogoFile = signal<File | null>(null);
  isUploadingLogo = signal<boolean>(false);
  isSavingName = signal<boolean>(false);

  private readonly destroyRef = inject(DestroyRef);
  private initialLoadDone = false;

  constructor(
    private readonly companyService: CompanyService,
    private readonly snackbarService: SnackbarService,
    private readonly translate: TranslateService,
    private readonly dialog: MatDialog,
    private readonly cdr: ChangeDetectorRef
  ) {
    effect(() => {
      const ctx = this.context();
      if (ctx && !ctx.loading && !this.initialLoadDone) {
        this.initialLoadDone = true;
      }
    });
  }

  ngOnInit(): void {
    this.companyService.loadContext();
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input?.files;
    this.selectedLogoFile.set(files && files.length > 0 ? files[0] : null);
  }

  uploadLogo(): void {
    const partyId = this.context()?.companyPartyId;
    const logoFile = this.selectedLogoFile();
    if (!partyId || !logoFile) {
      this.snackbarService.showError(this.translate.instant('COMPANY.LOGO_SELECT_REQUIRED'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // dataUrl is "data:<mimeType>;base64,<data>"
      const [meta, base64] = dataUrl.split(',');
      const mimeType = meta.replace('data:', '').replace(';base64', '');
      this.isUploadingLogo.set(true);
      this.companyService.uploadCompanyLogo(partyId, base64, mimeType, logoFile.name)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isUploadingLogo.set(false);
            this.snackbarService.showSuccess(this.translate.instant('COMPANY.LOGO_UPLOAD_SUCCESS'));
            this.selectedLogoFile.set(null);
            this.companyService.refreshContext();
            this.cdr.markForCheck();
          },
          error: () => {
            this.isUploadingLogo.set(false);
            this.snackbarService.showError(this.translate.instant('COMPANY.LOGO_UPLOAD_ERROR'));
            this.cdr.markForCheck();
          },
        });
    };
    reader.readAsDataURL(logoFile);
  }

  startEditName(): void {
    const currentName = this.context()?.companyName || '';
    const dialogRef = this.dialog.open(CompanyNameDialogComponent, {
      width: '400px',
      data: { companyName: currentName }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newName: string | undefined) => {
        if (newName !== undefined && newName.trim() !== currentName.trim()) {
          this.saveCompanyName(newName.trim());
        }
      });
  }

  saveCompanyName(name: string): void {
    const partyId = this.context()?.companyPartyId;
    if (!name || !partyId || this.isSavingName()) return;

    this.isSavingName.set(true);
    this.companyService.updateCompanyName(partyId, name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSavingName.set(false);
          this.snackbarService.showSuccess(this.translate.instant('COMPANY.NAME_UPDATE_SUCCESS'));
          this.companyService.refreshContext();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSavingName.set(false);
          this.snackbarService.showError(this.translate.instant('COMPANY.NAME_UPDATE_ERROR'));
          this.cdr.markForCheck();
        },
      });
  }

  getAddressLine(address: PostalAddress | null | undefined): string {
    if (!address) {
      return '--';
    }
    const parts = [
      address.toName,
      address.address1,
      address.address2,
      address.city,
      address.stateProvinceGeoId,
      address.postalCode,
      address.countryGeoId,
    ].filter((value) => value && value.toString().trim().length > 0);
    return parts.join(', ');
  }

  openCompanyAddressDialog(): void {
    const partyId = (this.context()?.companyPartyId || '').toString().trim();
    if (!partyId) {
      return;
    }
    const address = this.context()?.companyAddress || {};
    this.dialog.open(AddEditAddressComponent, {
      data: {
        addressData: {
          partyId,
          contactMechId: address?.postalAddressId || null,
          contactMechPurposeId: address?.contactMechPurposeId || 'PRIMARY_LOCATION',
          defaultPurpose: 'PRIMARY_LOCATION',
          toName: address?.toName || '',
          address1: address?.address1 || '',
          address2: address?.address2 || '',
          city: address?.city || '',
          postalCode: address?.postalCode || '',
          countryGeoId: address?.countryGeoId || 'USA',
          stateProvinceGeoId: address?.stateProvinceGeoId || '',
        },
      },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!result) {
            return;
          }
          this.companyService.refreshContext();
        },
      });
  }

  private hasAddress(address: PostalAddress | null | undefined): boolean {
    if (!address) {
      return false;
    }
    const fields = [
      address.postalAddressId,
      address.toName,
      address.address1,
      address.address2,
      address.city,
      address.stateProvinceGeoId,
      address.postalCode,
      address.countryGeoId,
    ];
    return fields.some((value) => !!value && value.toString().trim().length > 0);
  }

}
