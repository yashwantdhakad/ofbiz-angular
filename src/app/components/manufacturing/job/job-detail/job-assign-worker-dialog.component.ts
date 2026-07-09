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
import { ChangeDetectionStrategy, Component, DestroyRef, Inject, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { AssignWorkerDialogResult } from '@ofbiz/models/manufacturing.model';
import { PartyService } from '@ofbiz/services/oms/party/party.service';

interface WorkerRoleDto {
  partyId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  groupName?: string;
  partyName?: string;
}

@Component({
  standalone: false,
  selector: 'app-job-assign-worker-dialog',
  templateUrl: './job-assign-worker-dialog.component.html',
  styleUrls: ['./job-assign-worker-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobAssignWorkerDialogComponent implements OnInit {
  readonly isLoading = signal(true);
  readonly workers = signal<{ partyId: string; name: string }[]>([]);
  selectedPartyId: string | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private partyService: PartyService,
    private dialogRef: MatDialogRef<JobAssignWorkerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { workEffortId: string; selectedPartyId?: string | null }
  ) {}

  ngOnInit(): void {
    this.selectedPartyId = this.data?.selectedPartyId || null;
    this.loadWorkers();
  }

  loadWorkers(): void {
    this.partyService
      .getPartyRoleSummaries('WORKER')
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: unknown) => {
          const roles: WorkerRoleDto[] = Array.isArray(response) ? (response as WorkerRoleDto[]) : [];
          const seen = new Set<string>();
          this.workers.set(
            roles
              .filter((role: WorkerRoleDto) => role?.partyId)
              .filter((role: WorkerRoleDto) => {
                if (seen.has(role.partyId)) {
                  return false;
                }
                seen.add(role.partyId);
                return true;
              })
              .map((role: WorkerRoleDto) => ({
                partyId: role.partyId,
                name: this.getWorkerDisplayName(role),
              }))
          );
        },
        error: () => {
          this.workers.set([]);
        },
      });
  }

  private getWorkerDisplayName(role: WorkerRoleDto): string {
    const fullName = [role?.firstName, role?.lastName].filter(Boolean).join(' ').trim();
    return fullName || role?.name || role?.groupName || role?.partyName || role?.partyId;
  }

  assign(): void {
    if (!this.selectedPartyId) {
      return;
    }
    const result: AssignWorkerDialogResult = { partyId: this.selectedPartyId };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  trackByWorker = (index: number, worker: { partyId: string }): string =>
    worker?.partyId ?? String(index);
}
