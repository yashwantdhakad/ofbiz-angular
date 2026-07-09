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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, effect, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { CompanyService } from '@ofbiz/services/company/company.service';
import { UserService } from '@ofbiz/services/security/user.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { ReferenceDataStore } from '@ofbiz/services/common/reference-data.store';
import { PartyRole } from '@ofbiz/models/party.model';
import { AddRoleComponent } from '../../party/add-role/add-role.component';
import {
  PoApprovalAssignment,
  PoApprovalPolicy,
  UserDetailData,
} from '@ofbiz/models/user.model';
import { EditUserComponent } from '../edit-user/edit-user.component';
import { AddUserRoleComponent } from '../add-user-role/add-user-role.component';
import { AddUserPermissionComponent } from '../add-user-permission/add-user-permission.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { SetPoApprovalComponent } from '../set-po-approval/set-po-approval.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-user-detail',
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailComponent implements OnInit {
  userLoginId = '';
  isLoading = signal<boolean>(false);
  userDetail = signal<UserDetailData | null>(null);
  partyRoles = signal<PartyRole[]>([]);
  poApprovalAssignment = signal<PoApprovalAssignment | null>(null);
  poApprovalPolicy = signal<PoApprovalPolicy | null>(null);
  groupPermissionsMapping = signal<any[]>([]);
  activePermissions = computed(() => {
    const detail = this.userDetail();
    if (!detail) {
      return [];
    }

    const assignedGroupIds = new Set(
      Array.isArray(detail.roles)
        ? detail.roles.map((r) => r.groupId).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : []
    );

    const directPermissions = Array.isArray(detail.permissions) ? detail.permissions : [];
    const directPermissionIds = new Set(
      directPermissions.map((p) => p.permissionId).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    );

    const mappings = this.groupPermissionsMapping();
    const inheritedPermissionIds = new Set<string>();
    if (Array.isArray(mappings)) {
      mappings.forEach((item) => {
        if (item?.groupId && assignedGroupIds.has(item.groupId) && item.permissionId) {
          inheritedPermissionIds.add(item.permissionId);
        }
      });
    }

    const allPermissionIds = new Set([...directPermissionIds, ...inheritedPermissionIds]);
    
    const refPermissions = this.referenceDataStore.permissions() || [];
    const refPermissionMap = new Map<string, string>(
      refPermissions
        .filter((p) => !!p.permissionId)
        .map((p) => [p.permissionId!, p.description || ''])
    );

    const directPermissionMap = new Map<string, string>(
      directPermissions
        .filter((p) => !!p.permissionId)
        .map((p) => [p.permissionId!, p.description || ''])
    );

    return Array.from(allPermissionIds).map((id) => {
      const isInherited = inheritedPermissionIds.has(id);
      const description = directPermissionMap.get(id) || refPermissionMap.get(id) || id;
      return {
        permissionId: id,
        description,
        isInherited,
      };
    }).sort((a, b) => a.permissionId.localeCompare(b.permissionId));
  });

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private partyService: PartyService,
    private companyService: CompanyService,
    private authService: AuthService,
    private snackbarService: SnackbarService,
    private dialog: MatDialog,
    private translate: TranslateService,
    private referenceDataStore: ReferenceDataStore
  ) {
    effect(() => {
      const companyPartyId = (this.companyService.contextSignal()?.companyPartyId || '').trim();
      if (companyPartyId && this.userLoginId) {
        this.loadPurchaseOrderApprovalContext();
      }
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.userLoginId = params['userLoginId'];
      if (this.userLoginId) {
        this.companyService.loadContext();
        this.loadUser();
      }
    });
  }

  loadUser(showLoader: boolean = true): void {
    if (showLoader) {
      this.isLoading.set(true);
    }
    this.userService
      .getUser(this.userLoginId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (showLoader) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (response: { userDetail?: UserDetailData }) => {
          this.userDetail.set(response?.userDetail ?? null);
          this.loadPartyRoles();
          this.loadPurchaseOrderApprovalContext();
          this.loadGroupPermissions();
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant('USER.LOAD_ERROR'));
          this.router.navigate(['/users']);
        },
      });
  }

  loadGroupPermissions(): void {
    this.userService.listGroupPermissions().subscribe({
      next: (mappings) => this.groupPermissionsMapping.set(mappings || []),
      error: () => this.groupPermissionsMapping.set([]),
    });
    this.referenceDataStore.ensurePermissionsLoaded();
  }

  private refreshUserSilently(): void {
    this.loadUser(false);
  }

  private loadPurchaseOrderApprovalContext(): void {
    const companyPartyId = (this.companyService.contextSignal()?.companyPartyId || '').trim();
    if (!companyPartyId || !this.userLoginId) {
      this.poApprovalAssignment.set(null);
      this.poApprovalPolicy.set(null);
      return;
    }
    this.userService.getPurchaseOrderApprovalAssignment(this.userLoginId, companyPartyId).subscribe({
      next: (response: PoApprovalAssignment) => this.poApprovalAssignment.set(response || null),
      error: () => this.poApprovalAssignment.set(null),
    });
    this.userService.getPurchaseOrderApprovalPolicy(companyPartyId).subscribe({
      next: (response: PoApprovalPolicy) => this.poApprovalPolicy.set(response || null),
      error: () => this.poApprovalPolicy.set(null),
    });
  }

  openEditDialog(): void {
    const detail = this.userDetail() || {};
    const user = detail.user || {};

    this.dialog
      .open(EditUserComponent, {
        data: {
          userLoginId: this.userLoginId,
          user,
        },
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          this.refreshUserSilently();
        }
      });
  }

  openRoleDialog(): void {
    const detail = this.userDetail() || {};
    const selectedRoleIds = Array.isArray(detail.roles) ? detail.roles.map((role) => role.groupId) : [];
    this.dialog
      .open(AddUserRoleComponent, {
        data: {
          userLoginId: this.userLoginId,
          selectedRoleIds,
        },
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          this.refreshUserSilently();
        }
      });
  }

  openPermissionDialog(): void {
    const detail = this.userDetail() || {};
    const selectedPermissionIds = Array.isArray(detail.permissions)
      ? detail.permissions.map((permission) => permission.permissionId)
      : [];
    const selectedRoleIds = Array.isArray(detail.roles)
      ? detail.roles.map((role) => role.groupId)
      : [];
    this.dialog
      .open(AddUserPermissionComponent, {
        data: {
          userLoginId: this.userLoginId,
          selectedPermissionIds,
          selectedRoleIds,
        },
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          this.refreshUserSilently();
        }
      });
  }

  removePermission(permissionId: string): void {
    const selectedPermissionId = (permissionId || '').trim();
    if (!selectedPermissionId) {
      return;
    }
    const permissions = this.userDetail()?.permissions;
    const existingPermissionIds = Array.isArray(permissions)
      ? permissions
        .map((permission) => permission?.permissionId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];
    const updatedPermissionIds = existingPermissionIds.filter((id: string) => id !== selectedPermissionId);

    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          title: this.translate.instant('USER.PERMISSION_TITLE'),
          message: this.translate.instant('USER.REMOVE_PERMISSION_CONFIRM', { permissionId: selectedPermissionId }),
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.userService.updateUser(this.userLoginId, { permissionIds: updatedPermissionIds }).subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('USER.PERMISSION_REMOVE_SUCCESS'));
            this.refreshUserSilently();
          },
          error: () => {
            this.snackbarService.showError(this.translate.instant('USER.PERMISSION_REMOVE_ERROR'));
          },
        });
      });
  }

  removeSecurityGroup(groupId?: string): void {
    const targetGroupId = (groupId || '').trim();
    if (!targetGroupId) {
      return;
    }
    const roles = this.userDetail()?.roles;
    const existingGroupIds = Array.isArray(roles)
      ? roles
        .map((role) => role?.groupId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];
    const updatedGroupIds = existingGroupIds.filter((id: string) => id !== targetGroupId);

    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          title: this.translate.instant('USER.SECURITY_GROUPS'),
          message: this.translate.instant('USER.REMOVE_GROUP_CONFIRM', { groupId: targetGroupId }),
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.userService.updateUser(this.userLoginId, { roleIds: updatedGroupIds }).subscribe({
          next: () => {
            this.snackbarService.showSuccess(this.translate.instant('USER.GROUP_REMOVE_SUCCESS'));
            this.refreshUserSilently();
          },
          error: () => {
            this.snackbarService.showError(this.translate.instant('USER.GROUP_REMOVE_ERROR'));
          },
        });
      });
  }

  openPoApprovalDialog(): void {
    const companyPartyId = (this.companyService.contextSignal()?.companyPartyId || '').trim();
    if (!companyPartyId) {
      this.snackbarService.showError(this.translate.instant('USER.COMPANY_CONTEXT_UNAVAILABLE'));
      return;
    }
    this.dialog
      .open(SetPoApprovalComponent, {
        data: {
          userLoginId: this.userLoginId,
          companyPartyId,
          currentAssignment: this.poApprovalAssignment(),
          policy: this.poApprovalPolicy(),
        },
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          this.loadPurchaseOrderApprovalContext();
        }
      });
  }

  loadPartyRoles(): void {
    const partyId = this.userDetail()?.user?.partyId;
    if (!partyId) {
      this.partyRoles.set([]);
      return;
    }
    this.partyService.getPartyRolesByPartyId(partyId).subscribe({
      next: (roles) => this.partyRoles.set(roles || []),
      error: () => this.partyRoles.set([]),
    });
  }

  addPartyRoleDialog(): void {
    const partyId = this.userDetail()?.user?.partyId;
    if (!partyId) {
      return;
    }
    this.dialog
      .open(AddRoleComponent, {
        data: {
          roleData: { partyId },
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadPartyRoles();
        }
      });
  }

  deletePartyRoleDialog(role: any): void {
    const partyId = this.userDetail()?.user?.partyId;
    const roleTypeId = role?.roleTypeId;
    if (!partyId || !roleTypeId) {
      return;
    }
    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          title: this.translate.instant('PARTY.DELETE_ROLE_TITLE') || 'Delete Role',
          message: this.translate.instant('PARTY.DELETE_ROLE_MESSAGE') || 'Are you sure you want to delete role?',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.partyService.deleteRole({ partyId, roleTypeId }).subscribe({
            next: () => {
              this.snackbarService.showSuccess(this.translate.instant('COMMON.DELETE_SUCCESS'));
              this.loadPartyRoles();
            },
            error: () => {
              this.snackbarService.showError(this.translate.instant('COMMON.DELETE_ERROR') || 'Failed to delete role.');
            },
          });
        }
      });
  }
}
