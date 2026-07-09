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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, EventEmitter } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { JournalEntriesComponent } from './journal-entries.component';
import { AcctgTransService } from '@ofbiz/services/accounting/acctg-trans.service';
import { GlAccountService } from '@ofbiz/services/accounting/gl-account.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { SharedFormatPipesModule } from '../../common/material/shared-format-pipes.module';

describe('JournalEntriesComponent', () => {
  let component: JournalEntriesComponent;
  let fixture: ComponentFixture<JournalEntriesComponent>;
  let acctgTransService: jasmine.SpyObj<AcctgTransService>;
  let glAccountService: jasmine.SpyObj<GlAccountService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    const acctgSpy = jasmine.createSpyObj('AcctgTransService', [
      'listTransactions',
      'listEntries',
      'searchTransactions',
      'listEntriesByTransactionIds',
      'createTransaction',
      'updateTransaction',
      'deleteTransaction',
      'createEntry',
      'updateEntry',
      'deleteEntry',
    ]);
    const glAccountSpy = jasmine.createSpyObj('GlAccountService', ['listGlAccounts', 'listGlAccountTypes']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream']);
    const translations: Record<string, string> = {
      'FINANCE.DETAILS': 'Details',
      'FINANCE.DEBIT': 'Debit',
      'FINANCE.CREDIT': 'Credit',
    };
    translateSpy.instant.and.callFake((key: string) => translations[key] || key);
    translateSpy.get.and.callFake((key: string) => of(translations[key] || key));
    translateSpy.stream.and.callFake((key: string) => of(translations[key] || key));
    Object.defineProperties(translateSpy, {
      onTranslationChange: { value: new EventEmitter(), configurable: true },
      onLangChange: { value: new EventEmitter(), configurable: true },
      onDefaultLangChange: { value: new EventEmitter(), configurable: true },
    });

    await TestBed.configureTestingModule({
      declarations: [JournalEntriesComponent],
      imports: [FormsModule, ReactiveFormsModule, TranslateModule.forRoot(), SharedFormatPipesModule],
      providers: [
        { provide: AcctgTransService, useValue: acctgSpy },
        { provide: GlAccountService, useValue: glAccountSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(JournalEntriesComponent);
    component = fixture.componentInstance;
    acctgTransService = TestBed.inject(AcctgTransService) as jasmine.SpyObj<AcctgTransService>;
    glAccountService = TestBed.inject(GlAccountService) as jasmine.SpyObj<GlAccountService>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    acctgTransService.searchTransactions.and.returnValue(of({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
    }));
    acctgTransService.listEntriesByTransactionIds.and.returnValue(of([]));
    glAccountService.listGlAccounts.and.returnValue(of([]));
    glAccountService.listGlAccountTypes.and.returnValue(of([]));
  });

  it('loads transactions, entries, and accounts on init', fakeAsync(() => {
    acctgTransService.searchTransactions.and.returnValue(of({
      content: [
        { id: 1, acctgTransId: 'JRN-1', description: 'Manual entry', isPosted: false },
        { id: 2, acctgTransId: 'JRN-2', description: 'Posted entry', isPosted: true },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
    }));
    acctgTransService.listEntriesByTransactionIds.and.returnValue(of([
      { id: 11, acctgTransId: 'JRN-1', glAccountId: '1000', amount: 10, debitCreditFlag: true },
      { id: 12, acctgTransId: 'JRN-1', glAccountId: '2000', amount: 10, debitCreditFlag: false },
    ]));
    glAccountService.listGlAccounts.and.returnValue(of([
      { glAccountId: '1000', accountCode: '1000', accountName: 'Cash' },
      { glAccountId: '2000', accountCode: '2000', accountName: 'Payables' },
    ]));
    glAccountService.listGlAccountTypes.and.returnValue(of([]));

    component.ngOnInit();
    tick();
    fixture.detectChanges();

    expect(component.transactions()).toHaveSize(2);
    expect(component.totalElements()).toBe(2);
    expect(component.selectedEntries()).toHaveSize(2);
    expect(acctgTransService.searchTransactions).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      query: undefined,
      posted: undefined,
    });
    expect(acctgTransService.listEntriesByTransactionIds).toHaveBeenCalledWith(['JRN-1', 'JRN-2']);
  }));

  it('loads the requested page with server-side filters', fakeAsync(() => {
    acctgTransService.searchTransactions.and.returnValue(of({
      content: [{ id: 3, acctgTransId: 'JRN-3', description: 'Posted result', isPosted: true }],
      totalElements: 41,
      totalPages: 3,
      size: 20,
      number: 1,
    }));
    acctgTransService.listEntriesByTransactionIds.and.returnValue(of([]));

    component.queryString.set('invoice');
    component.statusFilter.set('POSTED');
    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 41 });
    tick();

    expect(acctgTransService.searchTransactions).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      query: 'invoice',
      posted: true,
    });
    expect(component.totalElements()).toBe(41);
  }));

  it('renders translated detail and entry amount labels', fakeAsync(() => {
    acctgTransService.searchTransactions.and.returnValue(of({
      content: [{ id: 1, acctgTransId: 'JRN-1', description: 'Manual entry', isPosted: true }],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    }));
    acctgTransService.listEntriesByTransactionIds.and.returnValue(of([
      { id: 11, acctgTransId: 'JRN-1', glAccountId: '1000', amount: 10, debitCreditFlag: true },
    ]));
    glAccountService.listGlAccounts.and.returnValue(of([]));
    glAccountService.listGlAccountTypes.and.returnValue(of([]));

    component.ngOnInit();
    tick();
    fixture.detectChanges();

    const detailTitle = fixture.nativeElement.querySelector('.details-card mat-card-title')?.textContent?.trim();
    const headers = Array.from(fixture.nativeElement.querySelectorAll('.details-card th'))
      .map((header: any) => header.textContent?.trim());

    expect(detailTitle).toBe('Details');
    expect(headers).toContain('Debit');
    expect(headers).toContain('Credit');
    expect(headers).not.toContain('FINANCE.DEBIT');
    expect(headers).not.toContain('FINANCE.CREDIT');
  }));

  it('approves a transaction by posting it', fakeAsync(() => {
    component.transactions.set([{ id: 1, acctgTransId: 'JRN-1', description: 'Manual entry', isPosted: false }]);
    component.entries.set([]);
    acctgTransService.updateTransaction.and.returnValue(of({
      id: 1,
      acctgTransId: 'JRN-1',
      description: 'Manual entry',
      isPosted: true,
    }));

    component.approve({ id: 1, acctgTransId: 'JRN-1', description: 'Manual entry', isPosted: false });
    tick();

    expect(acctgTransService.updateTransaction).toHaveBeenCalledWith(1, jasmine.objectContaining({
      isPosted: true,
    }));
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('FINANCE.JOURNAL_APPROVED_SUCCESS');
  }));

  it('opens the dialog and creates a transaction', fakeAsync(() => {
    component.accounts.set([{ glAccountId: '1000', accountCode: '1000', accountName: 'Cash' }]);
    component.accountTypes.set([]);
    dialog.open.and.returnValue({
      afterClosed: () => of({
        transaction: {
          acctgTransId: 'JRN-100',
          description: 'Manual journal',
          transactionDate: '2026-06-06',
          isPosted: false,
        },
        entries: [
          { glAccountId: '1000', description: 'Debit cash', amount: 50, debitCreditFlag: true, currencyUomId: 'USD' },
          { glAccountId: '1000', description: 'Credit cash', amount: 50, debitCreditFlag: false, currencyUomId: 'USD' },
        ],
      }),
    } as any);
    acctgTransService.createTransaction.and.returnValue(of({
      id: 3,
      acctgTransId: 'JRN-100',
      description: 'Manual journal',
      isPosted: false,
    }));
    acctgTransService.createEntry.and.returnValue(of({
      id: 31,
      acctgTransId: 'JRN-100',
      amount: 50,
    }));

    component.openCreateDialog();
    tick();

    expect(acctgTransService.createTransaction).toHaveBeenCalled();
    expect(acctgTransService.createEntry).toHaveBeenCalled();
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('FINANCE.JOURNAL_CREATED_SUCCESS');
  }));

  it('handles load errors and malformed transaction entry responses', fakeAsync(() => {
    acctgTransService.searchTransactions.and.returnValue(of({
      content: [{ id: 4, acctgTransId: 'JRN-4', description: 'No entries' }],
      totalElements: undefined,
    } as any));
    acctgTransService.listEntriesByTransactionIds.and.returnValue(of(null as any));

    component.loadTransactions();
    tick();

    expect(component.transactions()).toHaveSize(1);
    expect(component.entries()).toEqual([]);
    expect(component.totalElements()).toBe(1);
    expect(component.selectedTransactionId()).toBe(4);

    acctgTransService.searchTransactions.and.returnValue(throwError(() => new Error('load failed')));

    component.loadTransactions();
    tick();

    expect(component.transactions()).toEqual([]);
    expect(component.entries()).toEqual([]);
    expect(component.totalElements()).toBe(0);
    expect(component.selectedTransactionId()).toBeNull();
    expect(component.isLoading()).toBeFalse();
    expect(snackbarService.showError).toHaveBeenCalledWith('FINANCE.JOURNAL_LOAD_ERROR');
  }));

  it('handles reference data errors without blocking transactions', fakeAsync(() => {
    glAccountService.listGlAccounts.and.returnValue(throwError(() => new Error('accounts failed')));
    glAccountService.listGlAccountTypes.and.returnValue(of([{ glAccountTypeId: 'ASSET', description: 'Asset' }] as any));

    component.loadData();
    tick();

    expect(component.accounts()).toEqual([]);
    expect(component.accountTypes()).toEqual([]);
    expect(acctgTransService.searchTransactions).toHaveBeenCalled();
  }));

  it('searches, clears filters, selects transactions, and formats amounts', fakeAsync(() => {
    component.queryString.set('  payment  ');
    component.statusFilter.set('DRAFT');
    component.pageIndex.set(3);

    component.search();
    tick();

    expect(component.pageIndex()).toBe(0);
    expect(acctgTransService.searchTransactions).toHaveBeenCalledWith(jasmine.objectContaining({
      query: 'payment',
      posted: false,
    }));

    component.queryString.set('anything');
    component.statusFilter.set('POSTED');
    component.pageIndex.set(2);

    component.clearFilters();
    tick();

    expect(component.queryString()).toBe('');
    expect(component.statusFilter()).toBe('ALL');
    expect(component.pageIndex()).toBe(0);

    component.transactions.set([{ id: 9, acctgTransId: 'JRN-9', isPosted: true } as any]);
    component.entries.set([
      { id: 91, acctgTransId: 'JRN-9', amount: 12.5, debitCreditFlag: true } as any,
      { id: 92, acctgTransId: 'JRN-9', amount: '7.5' as any, debitCreditFlag: false } as any,
      { id: 93, acctgTransId: 'OTHER', amount: 99, debitCreditFlag: true } as any,
    ]);

    component.selectTransaction({ id: 9, acctgTransId: 'JRN-9' } as any);

    expect(component.selectedTransaction()?.acctgTransId).toBe('JRN-9');
    expect(component.selectedEntries()).toHaveSize(2);
    expect(component.amountFromEntry({ amount: 4, debitCreditFlag: true } as any, 'debit')).toBe(4);
    expect(component.amountFromEntry({ amount: 4, debitCreditFlag: true } as any, 'credit')).toBe(0);
    expect(component.amountFromEntry({ amount: 4, debitCreditFlag: false } as any, 'debit')).toBe(0);
    expect(component.amountFromEntry({ amount: 4, debitCreditFlag: false } as any, 'credit')).toBe(4);
    expect(component.transactionDebitTotal(component.selectedTransaction())).toBe(12.5);
    expect(component.transactionCreditTotal(component.selectedTransaction())).toBe(7.5);
    expect(component.transactionDebitTotal(null)).toBe(0);
    expect(component.transactionCreditTotal({} as any)).toBe(0);
    expect(component.formatStatus(component.selectedTransaction())).toBe('FINANCE.POSTED');
    expect(component.formatStatus({ isPosted: false } as any)).toBe('FINANCE.DRAFT');
  }));

  it('formats account labels with fallbacks', () => {
    component.accounts.set([{ glAccountId: '1000', accountCode: '1000', accountName: 'Cash' } as any]);

    expect(component.displayAccount(null)).toBe('-');
    expect(component.displayAccount('1000')).toBe('1000 - Cash');
    expect(component.displayAccount('9999')).toBe('9999');

    component.accounts.set([{ glAccountId: '2000', accountName: 'Payables' } as any]);

    expect(component.displayAccount('2000')).toBe('Payables');
  });

  it('handles approve errors and invalid transaction ids', fakeAsync(() => {
    component.approve({ id: null as any, acctgTransId: 'JRN-X' } as any);
    expect(acctgTransService.updateTransaction).not.toHaveBeenCalled();

    acctgTransService.updateTransaction.and.returnValue(throwError(() => new Error('approve failed')));

    component.approve({ id: '12' as any, acctgTransId: 'JRN-12', isPosted: false } as any);
    tick();

    expect(acctgTransService.updateTransaction).toHaveBeenCalledWith(12, jasmine.objectContaining({ isPosted: true }));
    expect(component.isSaving()).toBeFalse();
    expect(snackbarService.showError).toHaveBeenCalledWith('FINANCE.JOURNAL_APPROVE_ERROR');
  }));

  it('deletes transactions through confirm branches', fakeAsync(() => {
    component.transactions.set([{ id: 1, acctgTransId: 'JRN-1' } as any]);
    component.pageIndex.set(2);
    spyOn(window, 'confirm').and.returnValue(false);

    component.delete({ id: 1, acctgTransId: 'JRN-1' } as any);
    tick();

    expect(acctgTransService.deleteTransaction).not.toHaveBeenCalled();

    (window.confirm as jasmine.Spy).and.returnValue(true);
    acctgTransService.deleteTransaction.and.returnValue(of(void 0));
    spyOn(component, 'loadTransactions');

    component.delete({ id: 1, acctgTransId: 'JRN-1' } as any);
    tick();

    expect(acctgTransService.deleteTransaction).toHaveBeenCalledWith(1);
    expect(component.pageIndex()).toBe(1);
    expect(component.loadTransactions).toHaveBeenCalled();
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('FINANCE.JOURNAL_DELETED_SUCCESS');

    acctgTransService.deleteTransaction.and.returnValue(throwError(() => new Error('delete failed')));

    component.delete({ id: 1, acctgTransId: 'JRN-1' } as any);
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('FINANCE.JOURNAL_DELETE_ERROR');
  }));

  it('updates an existing transaction, replaces old entries, and tolerates entry delete errors', fakeAsync(() => {
    component.transactions.set([{ id: 2, acctgTransId: 'JRN-2', description: 'Old' } as any]);
    component.entries.set([
      { id: 21, acctgTransId: 'JRN-2', amount: 10 } as any,
      { id: 22, acctgTransId: 'JRN-2', amount: 20 } as any,
    ]);
    dialog.open.and.returnValue({
      afterClosed: () => of({
        transaction: { acctgTransId: 'JRN-2', description: 'Updated' },
        entries: [{ glAccountId: '1000', amount: 30, debitCreditFlag: true }],
      }),
    } as any);
    acctgTransService.updateTransaction.and.returnValue(of({ id: 2, acctgTransId: 'JRN-2', description: 'Updated' } as any));
    acctgTransService.deleteEntry.and.callFake((entryId: number) =>
      entryId === 21 ? throwError(() => new Error('delete one failed')) : of(void 0)
    );
    acctgTransService.createEntry.and.returnValue(of({ id: 23, acctgTransId: 'JRN-2', amount: 30 } as any));

    component.openEditDialog({ id: 2, acctgTransId: 'JRN-2', description: 'Old' } as any);
    tick();

    expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
      data: jasmine.objectContaining({
        entries: jasmine.arrayContaining([jasmine.objectContaining({ id: 21 })]),
      }),
    }));
    expect(acctgTransService.updateTransaction).toHaveBeenCalledWith(2, jasmine.objectContaining({ description: 'Updated' }));
    expect(acctgTransService.deleteEntry).toHaveBeenCalledTimes(2);
    expect(acctgTransService.createEntry).toHaveBeenCalledWith(jasmine.objectContaining({
      acctgTransEntrySeqId: '00001',
      acctgTransId: 'JRN-2',
    }));
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('FINANCE.JOURNAL_UPDATED_SUCCESS');
  }));

  it('shows create and update errors from the dialog flow', fakeAsync(() => {
    dialog.open.and.returnValue({
      afterClosed: () => of({
        transaction: { acctgTransId: 'JRN-BAD', description: 'Bad' },
        entries: [],
      }),
    } as any);
    acctgTransService.createTransaction.and.returnValue(throwError(() => new Error('create failed')));

    component.openCreateDialog();
    tick();

    expect(component.isSaving()).toBeFalse();
    expect(snackbarService.showError).toHaveBeenCalledWith('FINANCE.JOURNAL_CREATE_ERROR');

    acctgTransService.updateTransaction.and.returnValue(throwError(() => new Error('update failed')));

    component.openEditDialog({ id: 5, acctgTransId: 'JRN-5' } as any);
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('FINANCE.JOURNAL_UPDATE_ERROR');
  }));
});
