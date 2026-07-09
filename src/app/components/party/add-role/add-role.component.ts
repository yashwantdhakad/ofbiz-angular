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
import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { CommonService } from '@ofbiz/services/common/common.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { finalize } from 'rxjs/operators';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

@Component({
  standalone: false,
  selector: 'app-add-role',
  templateUrl: './add-role.component.html',
  styleUrls: ['./add-role.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRoleComponent {
  roleForm: FormGroup;
  roleTypes = signal<any[] | undefined>(undefined);
  isLoading = signal<boolean>(false);

  constructor(
    private commonService: CommonService,
    private partyService: PartyService,
    private snackbarService: SnackbarService,
    public dialogRef: MatDialogRef<AddRoleComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { roleData: any },
    private fb: FormBuilder,
    private renderScheduler: RenderSchedulerService,
    private translate: TranslateService
  ) {
    this.roleForm = this.fb.group({
      partyId: [data?.roleData?.partyId || null],
      roleTypeId: [data?.roleData?.roleTypeId, Validators.required],
    });

    this.getRoleTypes();
  }

  getRoleTypes(): void {
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });
    this.commonService.getLookupResults({}, 'roletypes').subscribe({
      next: (response) => {
        const roles = Array.isArray(response) ? response : [response];
        this.renderScheduler.deferMacrotask(() => {
          this.roleTypes.set(roles);
          this.isLoading.set(false);
        });
      },
      error: () => {
        this.renderScheduler.deferMacrotask(() => {
          this.isLoading.set(false);
        });
      }
    });
  }

  addRole(): void {
    if (!this.roleForm.valid) return;

    const values = this.roleForm.value;
    this.renderScheduler.deferMacrotask(() => {
      this.isLoading.set(true);
    });

    this.partyService.addRole(values).pipe(
      finalize(() => this.renderScheduler.deferMacrotask(() => {
        this.isLoading.set(false);
      }))
    ).subscribe({
      next: () => {
        this.snackbarService.showSuccess(this.translate.instant('PARTY.ROLE_ADD_SUCCESS'));
        this.roleForm.reset({ roleTypeId: '' });
        this.dialogRef.close(values);
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('PARTY.ROLE_ADD_ERROR'));
      }
    });
  }

  trackByRoleType = (_: number, role: any): any =>
    role?.roleTypeId ?? role?.id ?? _;
}
