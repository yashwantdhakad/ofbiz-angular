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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { provideMockStore } from '@ngrx/store/testing';
import { of, throwError } from 'rxjs';

import { SupplierDetailComponent } from './supplier-detail.component';
import { AddEditBankAccountComponent } from '../../party/add-edit-bank-account/add-edit-bank-account.component';
import { AddEditCreditCardComponent } from '../../party/add-edit-credit-card/add-edit-credit-card.component';
import { AddEditEmailComponent } from '../../party/add-edit-email/add-edit-email.component';
import { AddEditPhoneComponent } from '../../party/add-edit-phone/add-edit-phone.component';
import { AddIdentificationComponent } from '../../party/add-identification/add-identification.component';
import { AddRoleComponent } from '../../party/add-role/add-role.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { PartyContentComponent } from '../../party/party-content/party-content.component';
import { PartyNoteComponent } from '../../party/party-note/party-note.component';
import { EditSupplierComponent } from '../edit-supplier/edit-supplier.component';
import { SupplierProductDialogComponent } from '../supplier-product-dialog/supplier-product-dialog.component';
import { CommonService } from '@ofbiz/services/common/common.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SupplierProductService } from '@ofbiz/services/supplier-product/supplier-product.service';

describe('SupplierDetailComponent', () => {
  let component: SupplierDetailComponent;
  let fixture: ComponentFixture<SupplierDetailComponent>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let supplierProductServiceSpy: jasmine.SpyObj<SupplierProductService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;

  const mockSupplierResponse = {
    supplierDetail: {
      partyRoleList: [{ partyRoleId: 'ROLE-1', roleTypeId: 'SUPPLIER' }],
      party: { partyId: 'SUP123', groupName: 'Test Supplier' },
      partyIdentificationList: [{ partyIdentificationTypeId: 'GST', idValue: 'GST-123' }],
      emailAddressList: [
        { contactMechId: 'EMAIL-1', contactMechPurposeId: 'PRIMARY_EMAIL', emailAddress: 'primary@supplier.com' },
      ],
      telecomNumberList: [
        { contactMechId: 'PHONE-1', contactMechPurposeId: 'PRIMARY_PHONE', contactNumber: '9999999999' },
      ],
      postalAddressList: [{ contactMechId: 'ADDR-1', contactMechPurposeId: 'PRIMARY_LOCATION', address1: 'Street 1' }],
      payments: [
        {
          paymentMethod: { paymentMethodId: 'PM-1', paymentMethodTypeEnumId: 'PmtBankAccount', description: 'Bank account' },
          bankAccount: { bankName: 'Test Bank', routingNumber: '110000', accountNumber: '1234567890' },
        },
      ],
      partyNoteList: [{ noteId: 'NOTE-1', noteText: 'Existing note', createdBy: 'admin' }],
      contentList: [{ contentId: 'CONTENT-1', description: 'Vendor certificate', contentLocation: 'vendor.pdf' }],
      supplierProducts: [{ id: 'SP-1', productId: 'PROD-1' }],
      supplierProductsTotal: 1,
      supplierProductsPageIndex: 0,
      supplierProductsPageSize: 20,
    },
  };

  beforeEach(async () => {
    partyServiceSpy = jasmine.createSpyObj('PartyService', [
      'getSupplier',
      'deleteIdentification',
      'deleteContactMech',
      'deleteRole',
      'deleteEmail',
      'deletePartyNote',
      'downloadPartyContent',
    ]);
    supplierProductServiceSpy = jasmine.createSpyObj('SupplierProductService', ['listByPartyPaged', 'delete']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    commonServiceSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);

    await TestBed.configureTestingModule({
      declarations: [SupplierDetailComponent],
      providers: [
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: SupplierProductService, useValue: supplierProductServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: CommonService, useValue: commonServiceSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: SnackbarService, useValue: jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']) },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ partyId: 'SUP123' }),
          },
        },
        provideMockStore({
          initialState: {
            geo: {
              geoList: [],
            },
          },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierDetailComponent);
    component = fixture.componentInstance;

    commonServiceSpy.getLookupResults.and.returnValue(of([]));
    renderSchedulerSpy.deferMacrotask.and.callFake((task: () => void) => task());
    partyServiceSpy.getSupplier.and.returnValue(of(mockSupplierResponse));
    supplierProductServiceSpy.listByPartyPaged.and.returnValue(of({
      resultList: [{ id: 'SP-1', productId: 'PROD-1' }],
      documentListCount: 1,
      pageIndex: 0,
      pageSize: 20,
    }));
  });

  function mockDialogClose(result: any) {
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(result),
    } as any);
  }

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load supplier detail on init from the route param', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.partyId).toBe('SUP123');
    expect(partyServiceSpy.getSupplier).toHaveBeenCalledWith('SUP123');
    expect(component.supplierDetail?.partyId).toBe('SUP123');
    expect(component.partyNotes).toHaveSize(1);
    expect(component.contents).toHaveSize(1);
    expect(component.supplierProducts).toHaveSize(1);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle getSupplier error and stop loading', fakeAsync(() => {
    partyServiceSpy.getSupplier.and.returnValue(throwError(() => new Error('API error')));

    component.getSupplier('SUP123');
    tick();

    expect(component.isLoading()).toBeFalse();
  }));

  it('should open supplier detail dialogs and silently refresh after save', () => {
    component.partyId = 'SUP123';
    component.postalAddressList = [{ contactMechId: 'ADDR-1' }];
    component.geoRecords.set({ geoList: [] });
    const getSupplierSpy = spyOn(component, 'getSupplier');

    mockDialogClose({ partyId: 'SUP123' });
    component.editSupplierDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(EditSupplierComponent, {
      data: { supplierDetail: component.supplierDetail },
    });

    mockDialogClose({ partyId: 'SUP123' });
    component.addIdentificationDialog({ partyIdentificationTypeId: 'GST' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddIdentificationComponent, {
      data: {
        identificationData: {
          partyIdentificationTypeId: 'GST',
          partyId: 'SUP123',
        },
      },
    });

    mockDialogClose({ partyId: 'SUP123' });
    component.addRoleDialog({ roleTypeId: 'CUSTOMER' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddRoleComponent, {
      data: {
        roleData: {
          roleTypeId: 'CUSTOMER',
          partyId: 'SUP123',
        },
      },
    });

    mockDialogClose({ partyId: 'SUP123' });
    component.addEditPhoneDialog({ contactMechPurposeId: 'PRIMARY_PHONE' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditPhoneComponent, {
      data: {
        addEditPhoneData: {
          contactMechPurposeId: 'PRIMARY_PHONE',
          partyId: 'SUP123',
        },
      },
    });

    mockDialogClose({ partyId: 'SUP123' });
    component.addEditEmailDialog({ contactMechPurposeId: 'PRIMARY_EMAIL' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditEmailComponent, {
      data: {
        addEditEmailData: {
          contactMechPurposeId: 'PRIMARY_EMAIL',
          partyId: 'SUP123',
        },
      },
    });

    mockDialogClose({ partyId: 'SUP123' });
    component.addEditCreditCardDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditCreditCardComponent, {
      data: {
        creditCardData: jasmine.objectContaining({
          partyId: 'SUP123',
          postalAddressList: component.postalAddressList,
          roleTypeId: 'SUPPLIER',
        }),
      },
    });

    mockDialogClose({ partyId: 'SUP123' });
    component.addEditBankAccountDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditBankAccountComponent, {
      data: {
        bankAccountData: jasmine.objectContaining({
          partyId: 'SUP123',
          postalAddressList: component.postalAddressList,
          roleTypeId: 'SUPPLIER',
        }),
      },
    });

    mockDialogClose({ partyId: 'SUP123' });
    component.addUpdateNoteDialog({ noteId: 'NOTE-1' });
    expect(dialogSpy.open).toHaveBeenCalledWith(PartyNoteComponent, {
      data: {
        noteData: {
          noteId: 'NOTE-1',
          partyId: 'SUP123',
        },
      },
    });

    mockDialogClose({ partyId: 'SUP123' });
    component.addUpdateContentDialog({ description: 'Vendor certificate' });
    expect(dialogSpy.open).toHaveBeenCalledWith(PartyContentComponent, {
      data: {
        contentData: {
          description: 'Vendor certificate',
          partyId: 'SUP123',
        },
      },
    });

    expect(getSupplierSpy).toHaveBeenCalledTimes(9);
    expect(getSupplierSpy).toHaveBeenCalledWith('SUP123', false);
  });

  it('should open supplier product dialog and reload the paged section after save', () => {
    component.partyId = 'SUP123';
    component.supplierProductsPageIndex = 2;
    component.supplierProductsPageSize = 50;
    const loadSupplierProductsSpy = spyOn(component, 'loadSupplierProducts');
    mockDialogClose({ id: 'SP-2' });

    component.addSupplierProductDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(SupplierProductDialogComponent, {
      data: { partyId: 'SUP123' },
    });
    expect(loadSupplierProductsSpy).toHaveBeenCalledWith('SUP123', 2, 50);
  });

  it('should delete supplier products after confirmation and reload the section', () => {
    component.partyId = 'SUP123';
    component.supplierProductsPageIndex = 1;
    component.supplierProductsPageSize = 10;
    const loadSupplierProductsSpy = spyOn(component, 'loadSupplierProducts');
    mockDialogClose(true);
    supplierProductServiceSpy.delete.and.returnValue(of({}));

    component.deleteSupplierProduct({ id: 1 } as any);

    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      data: {
        title: 'SUPPLIER.DELETE_SUPPLIER_PRODUCT_TITLE',
        message: 'SUPPLIER.DELETE_SUPPLIER_PRODUCT_MESSAGE',
      },
    });
    expect(supplierProductServiceSpy.delete).toHaveBeenCalledWith(1);
    expect(loadSupplierProductsSpy).toHaveBeenCalledWith('SUP123', 1, 10);
  });

  it('should delete phone, email, role, identification, and note then refresh supplier detail', () => {
    component.partyId = 'SUP123';
    const getSupplierSpy = spyOn(component, 'getSupplier');
    mockDialogClose(true);

    partyServiceSpy.deleteContactMech.and.returnValue(of({}));
    partyServiceSpy.deleteEmail.and.returnValue(of({}));
    partyServiceSpy.deleteRole.and.returnValue(of({}));
    partyServiceSpy.deleteIdentification.and.returnValue(of({}));
    partyServiceSpy.deletePartyNote.and.returnValue(of({}));

    component.deletePhoneDialog({ partyId: 'SUP123', contactMechId: 'PHONE-1', contactMechPurposeId: 'PRIMARY_PHONE' });
    expect(partyServiceSpy.deleteContactMech).toHaveBeenCalledWith({
      partyId: 'SUP123',
      contactMechId: 'PHONE-1',
      contactMechPurposeId: 'PRIMARY_PHONE',
    });

    component.deleteEmailDialog({ partyId: 'SUP123', contactMechId: 'EMAIL-1', contactMechPurposeId: 'PRIMARY_EMAIL' });
    expect(partyServiceSpy.deleteEmail).toHaveBeenCalledWith({
      partyId: 'SUP123',
      contactMechId: 'EMAIL-1',
      contactMechPurposeId: 'PRIMARY_EMAIL',
    });

    component.deleteRoleDialog({ roleTypeId: 'CUSTOMER' });
    expect(partyServiceSpy.deleteRole).toHaveBeenCalledWith({
      partyId: 'SUP123',
      roleTypeId: 'CUSTOMER',
    });

    component.deleteIdentificationDialog({ partyId: 'SUP123', partyIdentificationTypeId: 'GST' });
    expect(partyServiceSpy.deleteIdentification).toHaveBeenCalledWith({
      partyId: 'SUP123',
      partyIdentificationTypeId: 'GST',
    });

    component.deleteNoteDialog({ noteId: 'NOTE-1' });
    expect(partyServiceSpy.deletePartyNote).toHaveBeenCalledWith({
      partyId: 'SUP123',
      noteId: 'NOTE-1',
    });

    expect(getSupplierSpy).toHaveBeenCalledTimes(5);
    expect(getSupplierSpy).toHaveBeenCalledWith('SUP123', false);
  });

  it('should skip role deletion when required identifiers are missing', () => {
    mockDialogClose(true);

    component.deleteRoleDialog({});

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(partyServiceSpy.deleteRole).not.toHaveBeenCalled();
  });

  it('should load supplier products for page changes and clear them on service failure', () => {
    component.partyId = 'SUP123';
    component.onSupplierProductsPageChange({ pageIndex: 3, pageSize: 25, length: 0 } as any);
    expect(supplierProductServiceSpy.listByPartyPaged).toHaveBeenCalledWith('SUP123', 3, 25);

    supplierProductServiceSpy.listByPartyPaged.and.returnValue(throwError(() => new Error('load failed')));
    component.loadSupplierProducts('SUP123', 0, 20);

    expect(component.supplierProducts).toEqual([]);
    expect(component.supplierProductsTotal).toBe(0);
  });

  it('should filter contact data, mask bank account numbers, and open supplier content', () => {
    component.partyId = 'SUP123';
    const blob = new Blob(['test'], { type: 'text/plain' });
    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:supplier');
    const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
    const windowOpenSpy = spyOn(window, 'open');
    spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);
    partyServiceSpy.downloadPartyContent.and.returnValue(of(blob));

    expect(component.filterEmailAddressList(mockSupplierResponse.supplierDetail.emailAddressList, 'PRIMARY_EMAIL'))
      .toEqual([mockSupplierResponse.supplierDetail.emailAddressList[0]]);
    expect(component.filterTelecomNumberList(mockSupplierResponse.supplierDetail.telecomNumberList, 'PRIMARY_PHONE'))
      .toEqual([mockSupplierResponse.supplierDetail.telecomNumberList[0]]);
    expect(component.maskAccountNumber('1234567890')).toBe('******7890');

    component.openPartyContent({ contentId: 'CONTENT-1' });

    expect(partyServiceSpy.downloadPartyContent).toHaveBeenCalledWith('SUP123', 'CONTENT-1');
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(windowOpenSpy).toHaveBeenCalledWith('blob:supplier', '_blank', 'noopener');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:supplier');
  });
});
