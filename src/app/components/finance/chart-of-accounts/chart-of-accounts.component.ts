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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { finalize, forkJoin } from 'rxjs';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { GlAccount, GlAccountService, GlAccountType } from '@ofbiz/services/accounting/gl-account.service';
import { GlAccountDialogComponent, GlAccountDialogData } from '../gl-account-dialog/gl-account-dialog.component';

interface AccountGroup {
  typeId: string;
  label: string;
  accounts: GlAccount[];
}

@Component({
  standalone: false,
  selector: 'app-chart-of-accounts',
  templateUrl: './chart-of-accounts.component.html',
  styleUrls: ['./chart-of-accounts.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartOfAccountsComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly accounts = signal<GlAccount[]>([]);
  readonly types = signal<GlAccountType[]>([]);
  readonly groupedAccounts = computed<AccountGroup[]>(() => this.groupAccounts(this.accounts(), this.types()));
  readonly displayedColumns = ['glAccountId', 'accountCode', 'accountName', 'parentGlAccountId', 'description', 'actions'];
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private glAccountService: GlAccountService,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      accounts: this.glAccountService.listGlAccounts(),
      types: this.glAccountService.listGlAccountTypes(),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: ({ accounts, types }) => {
        this.accounts.set(Array.isArray(accounts) ? accounts : []);
        this.types.set(Array.isArray(types) ? types : []);
      },
      error: () => {
        this.accounts.set([]);
        this.types.set([]);
        this.error.set(this.translate.instant('FINANCE.LOAD_ERROR'));
        this.snackbarService.showError(this.translate.instant('FINANCE.LOAD_ERROR'));
      },
    });
  }

  openCreateDialog(): void {
    this.openDialog();
  }

  openEditDialog(account: GlAccount): void {
    this.openDialog(account);
  }

  deleteAccount(account: GlAccount): void {
    const id = this.resolveId(account);
    if (!id) {
      return;
    }
    const message = this.translate.instant('FINANCE.CONFIRM_DELETE');
    if (!window.confirm(message)) {
      return;
    }
    this.glAccountService.deleteGlAccount(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.snackbarService.showSuccess(this.translate.instant('FINANCE.DELETED_SUCCESS'));
        this.loadData();
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('FINANCE.DELETE_ERROR'));
      },
    });
  }

  displayParent(account: GlAccount): string {
    if (!account?.parentGlAccountId) {
      return '—';
    }
    const parent = this.accounts().find((candidate) => candidate.glAccountId === account.parentGlAccountId);
    return parent ? this.formatAccountLabel(parent) : account.parentGlAccountId;
  }

  formatTypeLabel(typeId?: string | null): string {
    if (!typeId) {
      return '';
    }
    const match = this.types().find((type) => type.glAccountTypeId === typeId);
    return match?.description || match?.glAccountTypeId || typeId;
  }

  formatAccountLabel(account: GlAccount): string {
    return [account.accountCode, account.accountName].filter(Boolean).join(' - ') || account.glAccountId || '';
  }

  trackByGroup = (_index: number, group: AccountGroup): string => group.typeId;

  trackByAccount = (_index: number, account: GlAccount): string => String(account.id ?? account.glAccountId ?? _index);

  private openDialog(account?: GlAccount): void {
    const data: GlAccountDialogData = {
      account: account || null,
      types: this.types(),
      parentAccounts: account
        ? this.accounts().filter((candidate) => candidate.glAccountId !== account.glAccountId)
        : this.accounts(),
    };
    const dialogRef = this.dialog.open(GlAccountDialogComponent, {
      width: '760px',
      data,
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result?: GlAccount) => {
      if (!result) {
        return;
      }
      const id = this.resolveId(account);
      const request = id ? this.glAccountService.updateGlAccount(id, result) : this.glAccountService.createGlAccount(result);
      request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.snackbarService.showSuccess(this.translate.instant(id ? 'FINANCE.UPDATED_SUCCESS' : 'FINANCE.CREATED_SUCCESS'));
          this.loadData();
        },
        error: () => {
          this.snackbarService.showError(this.translate.instant(id ? 'FINANCE.UPDATE_ERROR' : 'FINANCE.CREATE_ERROR'));
        },
      });
    });
  }

  private resolveId(account?: GlAccount | null): number | null {
    if (!account?.id) {
      return null;
    }
    const parsed = typeof account.id === 'number' ? account.id : Number(account.id);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private groupAccounts(accounts: GlAccount[], types: GlAccountType[]): AccountGroup[] {
    const typeMap = new Map(types.map((type) => [type.glAccountTypeId || '', type]));
    const grouped = new Map<string, GlAccount[]>();
    accounts.forEach((account) => {
      const typeId = account.glAccountTypeId || 'UNASSIGNED';
      const bucket = grouped.get(typeId) || [];
      bucket.push(account);
      grouped.set(typeId, bucket);
    });
    return Array.from(grouped.entries())
      .map(([typeId, items]) => ({
        typeId,
        label: typeMap.get(typeId)?.description || typeMap.get(typeId)?.glAccountTypeId || typeId,
        accounts: items.slice().sort((left, right) => {
          const leftCode = left.accountCode || '';
          const rightCode = right.accountCode || '';
          return leftCode.localeCompare(rightCode);
        }),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }
}
