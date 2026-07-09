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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, Inject, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';

interface PickerRoleDto {
  partyId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  groupName?: string;
  partyName?: string;
}

@Component({
  standalone: false,
  selector: 'app-picklist-assign-picker-dialog',
  templateUrl: './picklist-assign-picker-dialog.component.html',
  styleUrls: ['./picklist-assign-picker-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicklistAssignPickerDialogComponent implements OnInit {
  readonly isLoading = signal(true);
  pickers: { partyId: string; name: string }[] = [];
  selectedPartyId: string | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private partyService: PartyService,
    private dialogRef: MatDialogRef<PicklistAssignPickerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { picklistId: string },
    private renderScheduler: RenderSchedulerService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPickers();
  }

  loadPickers(): void {
    this.partyService
      .getPartyRoleSummaries('PICKER')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.renderScheduler.deferMacrotask(() => {
            this.isLoading.set(false);
            this.cdr.markForCheck();
          });
        })
      )
      .subscribe({
        next: (response: unknown) => {
          const roles: PickerRoleDto[] = Array.isArray(response) ? (response as PickerRoleDto[]) : [];
          const seen = new Set<string>();
          this.renderScheduler.deferMacrotask(() => {
            this.pickers = roles
              .filter((role) => role?.partyId)
              .filter((role) => {
                if (seen.has(role.partyId)) {
                  return false;
                }
                seen.add(role.partyId);
                return true;
              })
              .map((role) => ({
                partyId: role.partyId,
                name: this.getPickerDisplayName(role),
              }));
            this.cdr.markForCheck();
          });
        },
        error: () => {
          this.renderScheduler.deferMacrotask(() => {
            this.pickers = [];
            this.cdr.markForCheck();
          });
        },
      });
  }

  private getPickerDisplayName(role: PickerRoleDto): string {
    const fullName = [role?.firstName, role?.lastName].filter(Boolean).join(' ').trim();
    return fullName || role?.name || role?.groupName || role?.partyName || role?.partyId;
  }

  onSelect(partyId: string): void {
    this.selectedPartyId = partyId;
  }

  assign(): void {
    if (!this.selectedPartyId) {
      return;
    }
    this.dialogRef.close({ partyId: this.selectedPartyId });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  trackByPicker = (_: number, picker: { partyId: string }): string => picker.partyId;
}
