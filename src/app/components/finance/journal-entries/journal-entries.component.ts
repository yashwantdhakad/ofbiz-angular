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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin, of, switchMap } from 'rxjs';
import { AcctgTrans, AcctgTransEntry, AcctgTransService } from '@ofbiz/services/accounting/acctg-trans.service';
import { GlAccount, GlAccountService, GlAccountType } from '@ofbiz/services/accounting/gl-account.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';
import { JournalEntryDialogComponent, JournalEntryDialogData, JournalEntryDialogResult } from '../journal-entry-dialog/journal-entry-dialog.component';

type JournalStatusFilter = 'ALL' | 'DRAFT' | 'POSTED';

@Component({
  standalone: false,
  selector: 'app-journal-entries',
  templateUrl: './journal-entries.component.html',
  styleUrls: ['./journal-entries.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalEntriesComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly transactions = signal<AcctgTrans[]>([]);
  readonly entries = signal<AcctgTransEntry[]>([]);
  readonly accounts = signal<GlAccount[]>([]);
  readonly accountTypes = signal<GlAccountType[]>([]);
  readonly selectedTransactionId = signal<number | null>(null);
  readonly queryString = signal('');
  readonly statusFilter = signal<JournalStatusFilter>('ALL');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly totalElements = signal(0);
  readonly pageSizeOptions = [10, 20, 50, 100];

  readonly selectedTransaction = computed(() => {
    const id = this.selectedTransactionId();
    if (!id) {
      return null;
    }
    return this.transactions().find((transaction) => transaction.id === id) || null;
  });

  readonly selectedEntries = computed(() => {
    const transactionId = this.selectedTransaction()?.acctgTransId;
    if (!transactionId) {
      return [];
    }
    return this.entries().filter((entry) => entry.acctgTransId === transactionId);
  });

  readonly displayedColumns = ['acctgTransId', 'transactionDate', 'description', 'glJournalId', 'status', 'debit', 'credit', 'actions'];

  constructor(
    private acctgTransService: AcctgTransService,
    private glAccountService: GlAccountService,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReferenceData();
    this.loadTransactions();
  }

  loadData(): void {
    this.loadReferenceData();
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.isLoading.set(true);
    const status = this.statusFilter();
    const posted = status === 'ALL' ? undefined : status === 'POSTED';
    this.acctgTransService.searchTransactions({
      page: this.pageIndex(),
      size: this.pageSize(),
      query: this.queryString().trim() || undefined,
      posted,
    }).pipe(
      switchMap((page) => {
        const transactions = Array.isArray(page?.content) ? page.content : [];
        const transactionIds = transactions
          .map((transaction) => transaction.acctgTransId)
          .filter((id): id is string => !!id);
        return (transactionIds.length
          ? this.acctgTransService.listEntriesByTransactionIds(transactionIds)
          : of([])
        ).pipe(switchMap((entries) => of({ page, transactions, entries })));
      })
    ).subscribe({
      next: ({ page, transactions, entries }) => {
        this.transactions.set(transactions);
        this.entries.set(Array.isArray(entries) ? entries : []);
        this.totalElements.set(Number(page?.totalElements ?? transactions.length));
        this.selectedTransactionId.set(transactions[0]?.id ?? null);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.transactions.set([]);
        this.entries.set([]);
        this.totalElements.set(0);
        this.selectedTransactionId.set(null);
        this.isLoading.set(false);
        this.snackbarService.showError(this.translate.instant('FINANCE.JOURNAL_LOAD_ERROR'));
        this.cdr.markForCheck();
      },
    });
  }

  private loadReferenceData(): void {
    forkJoin({
      accounts: this.glAccountService.listGlAccounts(),
      types: this.glAccountService.listGlAccountTypes(),
    }).subscribe({
      next: ({ accounts, types }) => {
        this.accounts.set(Array.isArray(accounts) ? accounts : []);
        this.accountTypes.set(Array.isArray(types) ? types : []);
        this.cdr.markForCheck();
      },
      error: () => {
        this.accounts.set([]);
        this.accountTypes.set([]);
        this.cdr.markForCheck();
      },
    });
  }

  search(): void {
    this.pageIndex.set(0);
    this.loadTransactions();
  }

  clearFilters(): void {
    this.queryString.set('');
    this.statusFilter.set('ALL');
    this.pageIndex.set(0);
    this.loadTransactions();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadTransactions();
  }

  openCreateDialog(): void {
    this.openDialog();
  }

  openEditDialog(transaction: AcctgTrans): void {
    this.openDialog(transaction);
  }

  selectTransaction(transaction: AcctgTrans): void {
    if (transaction?.id != null) {
      this.selectedTransactionId.set(transaction.id);
    }
  }

  approve(transaction: AcctgTrans): void {
    const id = this.resolveId(transaction);
    if (!id) {
      return;
    }
    this.isSaving.set(true);
    this.acctgTransService.updateTransaction(id, {
      ...transaction,
      isPosted: true,
      postedDate: new Date().toISOString(),
    }).subscribe({
      next: (updated) => {
        this.patchTransaction(updated);
        this.isSaving.set(false);
        this.snackbarService.showSuccess(this.translate.instant('FINANCE.JOURNAL_APPROVED_SUCCESS'));
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSaving.set(false);
        this.snackbarService.showError(this.translate.instant('FINANCE.JOURNAL_APPROVE_ERROR'));
        this.cdr.markForCheck();
      },
    });
  }

  delete(transaction: AcctgTrans): void {
    const id = this.resolveId(transaction);
    if (!id) {
      return;
    }
    if (!window.confirm(this.translate.instant('FINANCE.CONFIRM_DELETE'))) {
      return;
    }
    this.acctgTransService.deleteTransaction(id).subscribe({
      next: () => {
        this.snackbarService.showSuccess(this.translate.instant('FINANCE.JOURNAL_DELETED_SUCCESS'));
        if (this.transactions().length === 1 && this.pageIndex() > 0) {
          this.pageIndex.update((page) => page - 1);
        }
        this.loadTransactions();
        this.cdr.markForCheck();
      },
      error: () => {
        this.snackbarService.showError(this.translate.instant('FINANCE.JOURNAL_DELETE_ERROR'));
        this.cdr.markForCheck();
      },
    });
  }

  displayAccount(accountId?: string | null): string {
    if (!accountId) {
      return '-';
    }
    const account = this.accounts().find((candidate) => candidate.glAccountId === accountId);
    return account ? [account.accountCode, account.accountName].filter(Boolean).join(' - ') : accountId;
  }

  amountFromEntry(entry: AcctgTransEntry, direction: 'debit' | 'credit'): number {
    const amount = Number(entry.amount || 0);
    if (direction === 'debit') {
      return entry.debitCreditFlag === false ? 0 : amount;
    }
    return entry.debitCreditFlag === false ? amount : 0;
  }

  transactionDebitTotal(transaction?: AcctgTrans | null): number {
    const acctgTransId = transaction?.acctgTransId;
    if (!acctgTransId) {
      return 0;
    }
    return this.entries()
      .filter((entry) => entry.acctgTransId === acctgTransId && entry.debitCreditFlag !== false)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }

  transactionCreditTotal(transaction?: AcctgTrans | null): number {
    const acctgTransId = transaction?.acctgTransId;
    if (!acctgTransId) {
      return 0;
    }
    return this.entries()
      .filter((entry) => entry.acctgTransId === acctgTransId && entry.debitCreditFlag === false)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }

  formatStatus(transaction?: AcctgTrans | null): string {
    if (transaction?.isPosted) {
      return this.translate.instant('FINANCE.POSTED');
    }
    return this.translate.instant('FINANCE.DRAFT');
  }

  private openDialog(transaction?: AcctgTrans): void {
    const data: JournalEntryDialogData = {
      transaction: transaction || null,
      entries: transaction?.acctgTransId
        ? this.entries().filter((entry) => entry.acctgTransId === transaction.acctgTransId)
        : [],
      accounts: this.accounts(),
      types: this.accountTypes(),
    };
    const dialogRef = this.dialog.open(JournalEntryDialogComponent, {
      width: '1024px',
      data,
    });

    dialogRef.afterClosed().subscribe((result?: JournalEntryDialogResult) => {
      if (!result) {
        return;
      }
      this.isSaving.set(true);
      const txId = this.resolveId(transaction);
      const transactionRequest = result.transaction;
      const tx$ = txId
        ? this.acctgTransService.updateTransaction(txId, transactionRequest)
        : this.acctgTransService.createTransaction(transactionRequest);

      tx$.subscribe({
        next: (savedTransaction) => {
          const resolvedTransId = savedTransaction.acctgTransId || transactionRequest.acctgTransId || '';
          const existingEntries = transaction?.acctgTransId
            ? this.entries().filter((entry) => entry.acctgTransId === transaction.acctgTransId)
            : [];
          const deleteExisting = existingEntries.length
            ? existingEntries.map((entry) => entry.id).filter((id): id is number => typeof id === 'number')
            : [];
          this.persistDialogEntries(resolvedTransId, result.entries, deleteExisting);
          this.patchTransaction(savedTransaction);
          this.selectedTransactionId.set(savedTransaction.id ?? this.selectedTransactionId());
          this.isSaving.set(false);
          this.snackbarService.showSuccess(this.translate.instant(transaction ? 'FINANCE.JOURNAL_UPDATED_SUCCESS' : 'FINANCE.JOURNAL_CREATED_SUCCESS'));
          if (!transaction) {
            this.pageIndex.set(0);
            this.loadTransactions();
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSaving.set(false);
          this.snackbarService.showError(this.translate.instant(transaction ? 'FINANCE.JOURNAL_UPDATE_ERROR' : 'FINANCE.JOURNAL_CREATE_ERROR'));
          this.cdr.markForCheck();
        },
      });
    });
  }

  private persistDialogEntries(
    resolvedTransId: string,
    entries: JournalEntryDialogResult['entries'],
    deleteExisting: number[]
  ): void {
    if (deleteExisting.length === 0) {
      this.createDialogEntries(resolvedTransId, entries);
      return;
    }
    let remaining = deleteExisting.length;
    const onSettled = () => {
      remaining -= 1;
      if (remaining === 0) {
        this.createDialogEntries(resolvedTransId, entries);
      }
      this.cdr.markForCheck();
    };
    deleteExisting.forEach((entryId) => {
      this.acctgTransService.deleteEntry(entryId).subscribe({
        complete: onSettled,
        error: onSettled,
      });
    });
  }

  private createDialogEntries(resolvedTransId: string, entries: JournalEntryDialogResult['entries']): void {
    const payloadEntries = entries.map((entry) => ({
      ...entry,
      acctgTransId: resolvedTransId,
    }));
    payloadEntries.forEach((entry, index) => {
      this.acctgTransService.createEntry({
        ...entry,
        acctgTransEntrySeqId: String(index + 1).padStart(5, '0'),
      }).subscribe({
        next: (savedEntry) => {
          this.upsertEntry(savedEntry);
          this.cdr.markForCheck();
        },
      });
    });
  }

  private patchTransaction(transaction: AcctgTrans): void {
    const next = [...this.transactions().filter((item) => item.id !== transaction.id), transaction];
    next.sort((left, right) => Number(right.id ?? 0) - Number(left.id ?? 0));
    this.transactions.set(next);
  }

  private upsertEntry(entry: AcctgTransEntry): void {
    const next = [...this.entries().filter((item) => item.id !== entry.id), entry];
    this.entries.set(next);
  }

  private resolveId(transaction?: AcctgTrans | null): number | null {
    if (!transaction?.id) {
      return null;
    }
    const parsed = typeof transaction.id === 'number' ? transaction.id : Number(transaction.id);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
