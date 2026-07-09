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
import { ChangeDetectionStrategy, Component, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

interface RequirementSupplierDialogData {
  supplierPartyId?: string;
  supplierPartyName?: string;
  supplierDisplayLabel?: string;
}

@Component({
  selector: 'app-requirement-supplier-dialog',
  standalone: false,
  templateUrl: './requirement-supplier-dialog.component.html',
  styleUrls: ['./requirement-supplier-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequirementSupplierDialogComponent implements OnInit {
  readonly isLoading = signal(false);
  searchValue = '';
  supplierOptions: any[] = [];
  selectedSupplierPartyId = '';
  selectedSupplierPartyName = '';
  showError = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RequirementSupplierDialogData,
    private dialogRef: MatDialogRef<RequirementSupplierDialogComponent>,
    private partyService: PartyService,
    private renderScheduler: RenderSchedulerService
  ) {}

  ngOnInit(): void {
    this.initializeFromData();
  }

  private initializeFromData(): void {
    const supplierPartyId = (this.data?.supplierPartyId || '').trim();
    const supplierPartyName = (this.data?.supplierPartyName || '').trim();
    const supplierDisplayLabel = (this.data?.supplierDisplayLabel || '').trim();
    // Keep dialog input predictable: default to partyId when editing an existing supplier.
    this.searchValue = supplierPartyId || supplierDisplayLabel || supplierPartyName || '';
    if (!supplierPartyId) {
      return;
    }
    this.selectedSupplierPartyId = supplierPartyId;
    this.selectedSupplierPartyName = supplierPartyName;
    if (!supplierPartyName && this.isIdOnlyDisplay(supplierDisplayLabel, supplierPartyId)) {
      this.fetchAndSetSupplierDisplay(supplierPartyId);
    }
  }

  onSearchChange(value: string): void {
    this.searchValue = value || '';
    this.selectedSupplierPartyId = '';
    this.showError = false;
    this.searchSuppliers(this.searchValue);
  }

  selectSupplier(partyId: string): void {
    const option = this.supplierOptions.find(
      (item: any) => (item?.partyId || '').toString() === (partyId || '').toString()
    );
    this.selectedSupplierPartyId = partyId || '';
    this.selectedSupplierPartyName = option ? this.getSupplierName(option) : '';
    this.searchValue = option ? this.getSupplierDisplayValue(option) : this.searchValue;
    this.showError = false;
  }

  save(): void {
    const partyId = this.selectedSupplierPartyId || '';
    if (!partyId) {
      this.showError = true;
      return;
    }
    this.dialogRef.close({
      supplierPartyId: partyId,
      supplierPartyName: this.selectedSupplierPartyName || undefined,
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  displaySupplier(option: any): string {
    if (typeof option === 'string') {
      return option;
    }
    return option ? this.getSupplierDisplayValue(option) : '';
  }

  private searchSuppliers(query: string): void {
    const normalized = (query || '').trim();
    if (!normalized) {
      this.deferUiUpdate(() => {
        this.supplierOptions = [];
        this.isLoading.set(false);
      });
      return;
    }
    this.deferUiUpdate(() => {
      this.isLoading.set(true);
    });
    this.partyService.getSuppliersAutocompleteFromWms(normalized).subscribe({
      next: (response) => {
        this.deferUiUpdate(() => {
          this.supplierOptions = Array.isArray(response?.resultList) ? response.resultList : [];
          this.isLoading.set(false);
        });
      },
      error: () => {
        this.deferUiUpdate(() => {
          this.supplierOptions = [];
          this.isLoading.set(false);
        });
      },
    });
  }

  private getSupplierDisplayValue(supplier: any): string {
    const name = this.getSupplierName(supplier);
    const partyId = supplier?.partyId ? `(${supplier.partyId})` : '';
    return `${name || ''}${partyId}`;
  }

  private getSupplierName(supplier: any): string {
    return (
      supplier?.name ||
      supplier?.groupName ||
      supplier?.partyName ||
      supplier?.partyGroup?.groupName ||
      supplier?.party?.partyGroup?.groupName ||
      supplier?.partyId ||
      ''
    );
  }

  private isIdOnlyDisplay(displayLabel: string, partyId: string): boolean {
    const normalized = (displayLabel || '').replace(/\s+/g, '');
    return normalized === `${partyId}(${partyId})`;
  }

  private fetchAndSetSupplierDisplay(partyId: string): void {
    this.deferUiUpdate(() => {
      this.isLoading.set(true);
    });
    this.partyService.getSupplier(partyId).subscribe({
      next: (supplier) => {
        const name = this.getSupplierName(supplier);
        this.deferUiUpdate(() => {
          this.selectedSupplierPartyName = name || this.selectedSupplierPartyName;
          this.isLoading.set(false);
        });
      },
      error: () => {
        this.deferUiUpdate(() => {
          this.isLoading.set(false);
        });
      },
    });
  }

  private deferUiUpdate(update: () => void): void {
    this.renderScheduler.deferMacrotask(() => {
      update();
    });
  }

  trackBySupplierOption = (_: number, supplier: any): any =>
    supplier?.partyId ?? supplier?.id ?? _;
}
