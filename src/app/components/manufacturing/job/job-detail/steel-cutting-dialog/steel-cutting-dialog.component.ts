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
import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { InventoryItemWithLot, CutSectionEntry } from '@ofbiz/models/lot.model';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';

export interface SteelCuttingDialogData {
  workEffortId?: string | null;
  sourcePlateInventoryItemId?: string;
}

export interface SteelCuttingDialogResult {
  generatedIds: string[];
}

@Component({
  standalone: true,
  selector: 'app-steel-cutting-dialog',
  templateUrl: './steel-cutting-dialog.component.html',
  styleUrls: ['./steel-cutting-dialog.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatSelectModule,
  ],
})
export class SteelCuttingDialogComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isLookingUpPlate = signal(false);
  sourcePlate: InventoryItemWithLot | null = null;
  generatedIds: string[] = [];
  errorMessage = '';

  form: FormGroup;

  readonly sectionTypeOptions = [
    { value: 'CUT_SECTION', label: 'Cut Section' },
    { value: 'SCRAP', label: 'Scrap' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly manufacturingService: ManufacturingService,
    private readonly dialogRef: MatDialogRef<SteelCuttingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: SteelCuttingDialogData
  ) {
    this.form = this.fb.group({
      sourcePlateId: [data.sourcePlateInventoryItemId || '', Validators.required],
      sections: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    if (this.data.sourcePlateInventoryItemId) {
      this.lookupSourcePlate(this.data.sourcePlateInventoryItemId);
    }
    this.addSection();
  }

  get sections(): FormArray {
    return this.form.get('sections') as FormArray;
  }

  addSection(type: 'CUT_SECTION' | 'SCRAP' = 'CUT_SECTION'): void {
    this.sections.push(this.fb.group({
      serialNumber: ['', Validators.required],
      productId: [this.sourcePlate?.productId || '', Validators.required],
      sectionType: [type],
      lengthMm: [''],
      widthMm: [''],
      thicknessMm: [''],
      weightKg: [''],
    }));
  }

  removeSection(index: number): void {
    this.sections.removeAt(index);
  }

  lookupPlate(): void {
    const id = this.form.get('sourcePlateId')?.value?.trim();
    if (id) this.lookupSourcePlate(id);
  }

  private lookupSourcePlate(id: string): void {
    this.isLookingUpPlate.set(true);
    this.sourcePlate = null;
    this.manufacturingService.getInventoryItemWithLot(id).subscribe({
      next: (item) => {
        this.sourcePlate = item;
        this.isLookingUpPlate.set(false);
        this.sections.controls.forEach((ctrl) => {
          if (!ctrl.get('productId')?.value) {
            ctrl.get('productId')?.setValue(item.productId || '');
          }
        });
      },
      error: () => {
        this.sourcePlate = null;
        this.isLookingUpPlate.set(false);
      },
    });
  }

  onConfirm(): void {
    if (this.form.invalid || this.sections.length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const sourcePlateId = this.form.get('sourcePlateId')?.value;
    const cutSections: CutSectionEntry[] = this.sections.value;

    this.isLoading.set(true);
    this.errorMessage = '';

    this.manufacturingService.executeSteelCutting({
      workEffortId: this.data.workEffortId || undefined,
      sourcePlateInventoryItemId: sourcePlateId,
      cutSections,
    }).subscribe({
      next: (result) => {
        this.generatedIds = result?.generatedInventoryItemIds || [];
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage = 'Failed to record cut sections. Please check the data and try again.';
        this.isLoading.set(false);
      },
    });
  }

  onClose(): void {
    this.dialogRef.close(this.generatedIds.length > 0 ? { generatedIds: this.generatedIds } : undefined);
  }
}
