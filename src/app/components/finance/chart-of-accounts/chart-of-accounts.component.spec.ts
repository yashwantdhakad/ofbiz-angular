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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChartOfAccountsComponent } from './chart-of-accounts.component';
import { GlAccountService } from '@ofbiz/services/accounting/gl-account.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';

describe('ChartOfAccountsComponent', () => {
  let component: ChartOfAccountsComponent;
  let fixture: ComponentFixture<ChartOfAccountsComponent>;
  let glAccountService: jasmine.SpyObj<GlAccountService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;

  beforeEach(async () => {
    const glAccountSpy = jasmine.createSpyObj('GlAccountService', [
      'listGlAccounts',
      'listGlAccountTypes',
      'createGlAccount',
      'updateGlAccount',
      'deleteGlAccount',
    ]);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream']);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));
    translateSpy.stream.and.callFake((key: string) => of(key));
    Object.defineProperties(translateSpy, {
      onTranslationChange: { value: new EventEmitter(), configurable: true },
      onLangChange: { value: new EventEmitter(), configurable: true },
      onDefaultLangChange: { value: new EventEmitter(), configurable: true },
    });

    await TestBed.configureTestingModule({
      declarations: [ChartOfAccountsComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: GlAccountService, useValue: glAccountSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartOfAccountsComponent);
    component = fixture.componentInstance;
    glAccountService = TestBed.inject(GlAccountService) as jasmine.SpyObj<GlAccountService>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
  });

  it('loads and groups accounts by type on init', fakeAsync(() => {
    glAccountService.listGlAccounts.and.returnValue(of([
      { id: 1, glAccountId: '1000', glAccountTypeId: 'ASSET', accountCode: '1000', accountName: 'Cash' },
      { id: 2, glAccountId: '2000', glAccountTypeId: 'LIABILITY', accountCode: '2000', accountName: 'Payables' },
    ]));
    glAccountService.listGlAccountTypes.and.returnValue(of([
      { glAccountTypeId: 'ASSET', description: 'Asset' },
      { glAccountTypeId: 'LIABILITY', description: 'Liability' },
    ]));

    component.ngOnInit();
    tick();
    fixture.detectChanges();

    expect(component.accounts()).toHaveSize(2);
    expect(component.groupedAccounts().map((group) => group.label)).toEqual(['Asset', 'Liability']);
  }));

  it('creates an account from the dialog result', fakeAsync(() => {
    glAccountService.listGlAccounts.and.returnValue(of([]));
    glAccountService.listGlAccountTypes.and.returnValue(of([{ glAccountTypeId: 'ASSET', description: 'Asset' }]));
    dialog.open.and.returnValue({
      afterClosed: () => of({
        glAccountId: '1100',
        accountCode: '1100',
        accountName: 'Accounts Receivable',
        glAccountTypeId: 'ASSET',
        parentGlAccountId: null,
        description: 'Customer balances',
      }),
    } as any);
    glAccountService.createGlAccount.and.returnValue(of({
      id: 3,
      glAccountId: '1100',
      accountCode: '1100',
      accountName: 'Accounts Receivable',
      glAccountTypeId: 'ASSET',
    }));

    component.openCreateDialog();
    tick();

    expect(glAccountService.createGlAccount).toHaveBeenCalledWith(jasmine.objectContaining({
      glAccountId: '1100',
      accountCode: '1100',
      accountName: 'Accounts Receivable',
      glAccountTypeId: 'ASSET',
    }));
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('FINANCE.CREATED_SUCCESS');
  }));

  it('confirms and deletes an account', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    glAccountService.deleteGlAccount.and.returnValue(of(void 0));
    component.accounts.set([
      { id: 1, glAccountId: '1000', glAccountTypeId: 'ASSET', accountCode: '1000', accountName: 'Cash' },
    ]);
    component.types.set([{ glAccountTypeId: 'ASSET', description: 'Asset' }]);

    component.deleteAccount({ id: 1, glAccountId: '1000', glAccountTypeId: 'ASSET', accountCode: '1000', accountName: 'Cash' });
    tick();

    expect(glAccountService.deleteGlAccount).toHaveBeenCalledWith(1);
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('FINANCE.DELETED_SUCCESS');
  }));

  it('handles error on account delete', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    glAccountService.deleteGlAccount.and.returnValue(throwError(() => new Error('Delete failed')));
    component.accounts.set([
      { id: 1, glAccountId: '1000', glAccountTypeId: 'ASSET', accountCode: '1000', accountName: 'Cash' },
    ]);

    component.deleteAccount({ id: 1, glAccountId: '1000', glAccountTypeId: 'ASSET', accountCode: '1000', accountName: 'Cash' });
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('FINANCE.DELETE_ERROR');
  }));

  it('updates an account from the edit dialog result', fakeAsync(() => {
    dialog.open.and.returnValue({
      afterClosed: () => of({
        id: 1,
        glAccountId: '1000',
        accountCode: '1000',
        accountName: 'Updated Cash',
        glAccountTypeId: 'ASSET',
      }),
    } as any);
    glAccountService.updateGlAccount.and.returnValue(of({
      id: 1,
      glAccountId: '1000',
      accountCode: '1000',
      accountName: 'Updated Cash',
      glAccountTypeId: 'ASSET',
    }));

    component.openEditDialog({ id: 1, glAccountId: '1000', glAccountTypeId: 'ASSET', accountCode: '1000', accountName: 'Cash' });
    tick();

    expect(glAccountService.updateGlAccount).toHaveBeenCalledWith(1, jasmine.objectContaining({
      accountName: 'Updated Cash',
    }));
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('FINANCE.UPDATED_SUCCESS');
  }));

  it('handles error on create account failure', fakeAsync(() => {
    dialog.open.and.returnValue({
      afterClosed: () => of({ glAccountId: '1100', accountName: 'AR', glAccountTypeId: 'ASSET' }),
    } as any);
    glAccountService.createGlAccount.and.returnValue(throwError(() => new Error('Create failed')));

    component.openCreateDialog();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('FINANCE.CREATE_ERROR');
  }));

  it('handles error on update account failure', fakeAsync(() => {
    dialog.open.and.returnValue({
      afterClosed: () => of({ id: 1, glAccountId: '1000', accountName: 'Cash', glAccountTypeId: 'ASSET' }),
    } as any);
    glAccountService.updateGlAccount.and.returnValue(throwError(() => new Error('Update failed')));

    component.openEditDialog({ id: 1, glAccountId: '1000', glAccountTypeId: 'ASSET', accountCode: '1000', accountName: 'Cash' });
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('FINANCE.UPDATE_ERROR');
  }));

  it('verifies displayParent logic', () => {
    component.accounts.set([
      { id: 2, glAccountId: '2000', accountCode: '2000', accountName: 'Parent' },
    ]);
    expect(component.displayParent(null as any)).toBe('—');
    expect(component.displayParent({ glAccountId: '1000', parentGlAccountId: '2000' })).toBe('2000 - Parent');
    expect(component.displayParent({ glAccountId: '1000', parentGlAccountId: '9999' })).toBe('9999');
  });

  it('verifies formatTypeLabel logic', () => {
    component.types.set([{ glAccountTypeId: 'ASSET', description: 'Asset Description' }]);
    expect(component.formatTypeLabel(null)).toBe('');
    expect(component.formatTypeLabel('ASSET')).toBe('Asset Description');
    expect(component.formatTypeLabel('LIABILITY')).toBe('LIABILITY');
  });

  it('verifies resolveId logic', () => {
    expect((component as any).resolveId(null)).toBeNull();
    expect((component as any).resolveId({ id: '123' })).toBe(123);
    expect((component as any).resolveId({ id: 'bad' })).toBeNull();
  });

  it('groups and sorts accounts correctly', () => {
    const rawAccounts = [
      { glAccountId: '1000', glAccountTypeId: 'ASSET', accountCode: '1000', accountName: 'Cash' },
      { glAccountId: '1500', glAccountTypeId: 'ASSET', accountCode: '1500', accountName: 'AR' },
      { glAccountId: '3000', glAccountTypeId: 'REVENUE', accountCode: '3000', accountName: 'Sales' },
      { glAccountId: '9000', accountCode: '9000', accountName: 'No Type' },
    ];
    component.types.set([
      { glAccountTypeId: 'ASSET', description: 'Assets Group' },
      { glAccountTypeId: 'REVENUE', description: 'Revenue Group' },
    ]);

    const grouped = (component as any).groupAccounts(rawAccounts, component.types());
    expect(grouped).toHaveSize(3);
    expect(grouped[0].label).toBe('Assets Group');
    expect(grouped[2].label).toBe('UNASSIGNED');
  });
});
