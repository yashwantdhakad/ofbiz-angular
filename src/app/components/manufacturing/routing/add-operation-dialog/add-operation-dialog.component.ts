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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ManufacturingService } from '@ofbiz/services/manufacturing/manufacturing.service';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import {
  AddOperationDialogData,
  AddOperationDialogResult,
  WorkEffortLookupItem,
} from '@ofbiz/models/manufacturing.model';

@Component({
  standalone: false,
  selector: 'app-add-operation-dialog',
  templateUrl: './add-operation-dialog.component.html',
  styleUrls: ['./add-operation-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddOperationDialogComponent implements OnInit {
  form: FormGroup;
  operations: WorkEffortLookupItem[] = [];
  filteredOperations$: Observable<WorkEffortLookupItem[]> = of([]);
  readonly isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddOperationDialogComponent, AddOperationDialogResult | undefined>,
    private manufacturingService: ManufacturingService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: AddOperationDialogData
  ) {
    this.form = this.fb.group({
      operationWorkEffortId: ['', Validators.required],
      sequenceNum: [data?.sequenceNum || '10', [Validators.required, Validators.min(0)]],
      fromDate: [new Date()],
      thruDate: [null],
      operationSearch: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadOperations();
    this.filteredOperations$ = this.form.get('operationSearch')!.valueChanges.pipe(
      startWith(''),
      debounceTime(150),
      distinctUntilChanged(),
      map((value) => this.filterOperations(typeof value === 'string' ? value : value?.workEffortId || ''))
    );
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const result: AddOperationDialogResult = {
      operationWorkEffortId: this.form.value.operationWorkEffortId,
      sequenceNum: this.form.value.sequenceNum,
      fromDate: this.form.value.fromDate,
      thruDate: this.form.value.thruDate,
    };
    this.dialogRef.close(result);
  }

  close(): void {
    this.dialogRef.close();
  }

  selectOperation(operation: WorkEffortLookupItem): void {
    this.form.patchValue({
      operationWorkEffortId: operation?.workEffortId || '',
      operationSearch: operation,
    });
  }

  onOperationInputChange(value: string | WorkEffortLookupItem | null): void {
    if (typeof value === 'string') {
      this.form.patchValue({ operationWorkEffortId: '' }, { emitEvent: false });
    }
  }

  displayOperation(operation: string | WorkEffortLookupItem | null): string {
    if (!operation) {
      return '';
    }
    if (typeof operation === 'string') {
      return operation;
    }
    return operation?.workEffortName || operation?.workEffortId || '';
  }

  private loadOperations(): void {
    this.isLoading.set(true);
    this.manufacturingService.getWorkEfforts({
      workEffortTypeIds: 'ROU_TASK,ROUTING_TASK',
      size: 500,
    }).subscribe({
      next: (response) => {
        this.operations = Array.isArray(response)
          ? response as WorkEffortLookupItem[]
          : response.resultList ?? response.documentList ?? [];
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.operations = [];
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private filterOperations(query: string): WorkEffortLookupItem[] {
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) {
      return [...this.operations];
    }
    return this.operations.filter((item: WorkEffortLookupItem) => {
      const id = String(item?.workEffortId || '').toLowerCase();
      const name = String(item?.workEffortName || '').toLowerCase();
      const desc = String(item?.description || '').toLowerCase();
      return id.includes(normalized) || name.includes(normalized) || desc.includes(normalized);
    });
  }
}
