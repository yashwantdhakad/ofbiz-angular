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
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';

interface DialogData {
  workEffortId: string;
  wegsId: number;
  productId: string;
  remainingQuantity: string;
}

@Component({
  standalone: false,
  selector: 'app-set-consumable-inventory-dialog',
  templateUrl: './set-consumable-inventory-dialog.component.html',
  styleUrls: ['./set-consumable-inventory-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetConsumableInventoryDialogComponent implements OnInit {
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  options: any[] = [];
  selectedInventoryItemId = '';
  reserveQtyByInventoryItemId: Record<string, string> = {};
  reserveOrderEnumId = 'INVRO_FIFO_REC';

  readonly displayedColumns: string[] = [
    'select',
    'component',
    'association',
    'inventoryItemNo',
    'itemCondition',
    'locationSeqId',
    'atp',
    'reserve',
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public readonly dialogRef: MatDialogRef<SetConsumableInventoryDialogComponent>,
    private readonly manufacturingService: ManufacturingService
  ) { }

  ngOnInit(): void {
    this.loadOptions();
  }

  loadOptions(): void {
    this.isLoading.set(true);
    this.manufacturingService
      .getConsumableInventoryOptions(this.data.workEffortId, this.data.wegsId)
      .subscribe({
        next: (response) => {
          this.options = (response as unknown as Record<string, any>)?.['inventoryOptions'] || [];
          if (!this.selectedInventoryItemId && this.options.length > 0) {
            this.selectedInventoryItemId = this.options[0].inventoryItemId;
          }
          const defaultQty = this.data?.remainingQuantity || '';
          this.reserveQtyByInventoryItemId = this.options.reduce((acc: Record<string, string>, item: any) => {
            if (item?.inventoryItemId) {
              acc[item.inventoryItemId] = defaultQty;
            }
            return acc;
          }, {});
        },
        complete: () => {
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  selectInventoryOption(row: any): void {
    this.selectedInventoryItemId = row?.inventoryItemId || '';
  }

  isSelected(row: any): boolean {
    return row?.inventoryItemId === this.selectedInventoryItemId;
  }

  onSelectionChanged(row: any, checked: boolean): void {
    if (!checked) {
      if (this.selectedInventoryItemId === row?.inventoryItemId) {
        this.selectedInventoryItemId = '';
      }
      return;
    }
    this.selectedInventoryItemId = row?.inventoryItemId || '';
  }

  reserveInputForRow(row: any): string {
    return this.reserveQtyByInventoryItemId[row?.inventoryItemId] || '';
  }

  updateReserveInput(row: any, value: string): void {
    if (!row?.inventoryItemId) {
      return;
    }
    this.reserveQtyByInventoryItemId[row.inventoryItemId] = value;
  }

  canReserve(): boolean {
    if (!this.selectedInventoryItemId) {
      return false;
    }
    const qty = this.toNumber(this.reserveQtyByInventoryItemId[this.selectedInventoryItemId]);
    const atp = this.selectedAtp();
    return qty > 0 && qty <= atp;
  }

  reserveSelected(): void {
    if (!this.canReserve()) {
      return;
    }
    this.isSaving.set(true);
    const payload = {
      inventoryItemId: this.selectedInventoryItemId,
      quantity: this.reserveQtyByInventoryItemId[this.selectedInventoryItemId],
      reserveOrderEnumId: this.reserveOrderEnumId,
    };
    this.manufacturingService
      .reserveConsumable(this.data.workEffortId, this.data.wegsId, payload)
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        complete: () => {
          this.isSaving.set(false);
        },
        error: () => {
          this.isSaving.set(false);
        },
      });
  }

  selectedAtp(): number {
    if (!this.selectedInventoryItemId) {
      return 0;
    }
    const row = this.options.find((item: any) => item?.inventoryItemId === this.selectedInventoryItemId);
    return this.toNumber(row?.availableToPromiseTotal);
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
