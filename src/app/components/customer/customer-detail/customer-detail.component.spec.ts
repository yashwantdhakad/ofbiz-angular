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

import { CustomerDetailComponent } from './customer-detail.component';
import { AddEditBankAccountComponent } from '../../party/add-edit-bank-account/add-edit-bank-account.component';
import { AddEditCreditCardComponent } from '../../party/add-edit-credit-card/add-edit-credit-card.component';
import { AddEditEmailComponent } from '../../party/add-edit-email/add-edit-email.component';
import { AddEditPhoneComponent } from '../../party/add-edit-phone/add-edit-phone.component';
import { AddClassificationComponent } from '../../party/add-classification/add-classification.component';
import { AddIdentificationComponent } from '../../party/add-identification/add-identification.component';
import { AddRoleComponent } from '../../party/add-role/add-role.component';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';
import { PartyContentComponent } from '../../party/party-content/party-content.component';
import { PartyNoteComponent } from '../../party/party-note/party-note.component';
import { EditCustomerComponent } from '../edit-customer/edit-customer.component';
import { CommonService } from '@ofbiz/services/common/common.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { CustomerDetailResponse, EmailAddress, TelecomNumber } from '@ofbiz/models/party.model';

describe('CustomerDetailComponent', () => {
  let component: CustomerDetailComponent;
  let fixture: ComponentFixture<CustomerDetailComponent>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let commonServiceSpy: jasmine.SpyObj<CommonService>;
  let renderSchedulerSpy: jasmine.SpyObj<RenderSchedulerService>;

  const mockCustomerResponse: CustomerDetailResponse = {
    customerDetail: {
      partyRoleList: [{ partyRoleId: 'ROLE-1', roleTypeId: 'CUSTOMER' }],
      party: { partyId: 'TEST_ID', firstName: 'Test', lastName: 'Customer' },
      pcaaList: [{ classificationTypeEnumId: 'CLASS_A' }],
      partyIdentificationList: [{ partyIdentificationTypeId: 'GST', idValue: 'GST-123' }],
      emailAddressList: [
        { contactMechId: 'EMAIL-1', contactMechPurposeId: 'PRIMARY_EMAIL', emailAddress: 'primary@example.com' },
        { contactMechId: 'EMAIL-2', contactMechPurposeId: 'BILLING_EMAIL', emailAddress: 'shipping@example.com' },
      ],
      telecomNumberList: [
        { contactMechId: 'PHONE-1', contactMechPurposeId: 'PRIMARY_PHONE', contactNumber: '9999999999' },
        { contactMechId: 'PHONE-2', contactMechPurposeId: 'PHONE_PAYMENT', contactNumber: '8888888888' },
      ],
      postalAddressList: [{ contactMechId: 'ADDR-1', contactMechPurposeId: 'PRIMARY_LOCATION', address1: 'Street 1' }],
      payments: [
        {
          paymentMethod: { paymentMethodId: 'PM-1', paymentMethodTypeEnumId: 'PmtBankAccount', description: 'Bank account' },
          bankAccount: { bankName: 'Test Bank', routingNumber: '110000', accountNumber: '1234567890' },
          postalAddress: { address1: 'Street 1' },
          postalAddressStateGeo: { geoName: 'CA' },
        },
      ],
      partyNoteList: [{ noteId: 'NOTE-1', noteText: 'Existing note', createdBy: 'admin' }],
      contentList: [{ contentId: 'CONTENT-1', description: 'Profile doc', contentLocation: 'profile.pdf' }],
    },
  };

  beforeEach(async () => {
    partyServiceSpy = jasmine.createSpyObj('PartyService', [
      'getCustomer',
      'deleteIdentification',
      'deleteClassification',
      'deleteRole',
      'deleteContactMech',
      'deleteEmail',
      'deletePartyNote',
      'downloadPartyContent',
    ]);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    commonServiceSpy = jasmine.createSpyObj('CommonService', ['getLookupResults']);
    renderSchedulerSpy = jasmine.createSpyObj('RenderSchedulerService', ['deferMacrotask']);

    await TestBed.configureTestingModule({
      declarations: [CustomerDetailComponent],
      providers: [
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: CommonService, useValue: commonServiceSpy },
        { provide: RenderSchedulerService, useValue: renderSchedulerSpy },
        { provide: SnackbarService, useValue: jasmine.createSpyObj('SnackbarService', ['showError', 'showSuccess']) },
        { provide: MatDialog, useValue: dialogSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ partyId: 'TEST_ID' }),
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

    fixture = TestBed.createComponent(CustomerDetailComponent);
    component = fixture.componentInstance;

    commonServiceSpy.getLookupResults.and.returnValue(of([]));
    renderSchedulerSpy.deferMacrotask.and.callFake((task: () => void) => task());
    partyServiceSpy.getCustomer.and.returnValue(of(mockCustomerResponse));
  });

  function mockDialogClose(result: any) {
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(result),
    } as any);
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load customer detail on init from the route param', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(partyServiceSpy.getCustomer).toHaveBeenCalledWith('TEST_ID');
    expect(component.customerDetail?.partyId).toBe('TEST_ID');
    expect(component.partyNotes).toHaveSize(1);
    expect(component.contents).toHaveSize(1);
    expect(component.isLoading()).toBeFalse();
  }));

  it('should handle getCustomer error and stop loading', fakeAsync(() => {
    partyServiceSpy.getCustomer.and.returnValue(throwError(() => new Error('API error')));

    component.getCustomer('TEST_ID');
    tick();

    expect(component.isLoading()).toBeFalse();
  }));

  it('should open the personal detail edit dialog and refresh silently when saved', () => {
    fixture.detectChanges();
    const getCustomerSpy = spyOn(component, 'getCustomer');
    mockDialogClose({ partyId: 'TEST_ID' });

    component.editSupplierDialog();

    expect(dialogSpy.open).toHaveBeenCalledWith(EditCustomerComponent, {
      data: {
        customerDetail: component.customerDetail,
      },
    });
    expect(getCustomerSpy).toHaveBeenCalledWith('TEST_ID', false);
  });

  it('should open add dialogs with the current customer context and refresh the related section after save', () => {
    component.partyId = 'TEST_ID';
    component.postalAddressList = [{ contactMechId: 'ADDR-1' } as any];
    component.geoRecords.set({ geoList: [] });
    const getCustomerSpy = spyOn(component, 'getCustomer');

    mockDialogClose({ partyId: 'TEST_ID' });
    component.addIdentificationDialog({ partyIdentificationTypeId: 'GST' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddIdentificationComponent, {
      data: {
        identificationData: {
          partyIdentificationTypeId: 'GST',
          partyId: 'TEST_ID',
        },
      },
    });

    mockDialogClose({ partyId: 'TEST_ID' });
    component.addClassificationDialog({ classificationTypeEnumId: 'VIP' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddClassificationComponent, {
      data: {
        classificationData: {
          classificationTypeEnumId: 'VIP',
          partyId: 'TEST_ID',
        },
      },
    });

    mockDialogClose({ partyId: 'TEST_ID' });
    component.addRoleDialog({ roleTypeId: 'SUPPLIER' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddRoleComponent, {
      data: {
        roleData: {
          roleTypeId: 'SUPPLIER',
          partyId: 'TEST_ID',
        },
      },
    });

    mockDialogClose({ partyId: 'TEST_ID' });
    component.addEditPhoneDialog({ contactMechPurposeId: 'PRIMARY_PHONE' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditPhoneComponent, {
      data: {
        addEditPhoneData: {
          contactMechPurposeId: 'PRIMARY_PHONE',
          partyId: 'TEST_ID',
        },
      },
    });

    mockDialogClose({ partyId: 'TEST_ID' });
    component.addEditEmailDialog({ contactMechPurposeId: 'PRIMARY_EMAIL' });
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditEmailComponent, {
      data: {
        addEditEmailData: {
          contactMechPurposeId: 'PRIMARY_EMAIL',
          partyId: 'TEST_ID',
        },
      },
    });

    mockDialogClose({ partyId: 'TEST_ID' });
    component.addEditCreditCardDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditCreditCardComponent, {
      data: {
        creditCardData: jasmine.objectContaining({
          partyId: 'TEST_ID',
          postalAddressList: component.postalAddressList,
          roleTypeId: 'CUSTOMER',
        }),
      },
    });

    mockDialogClose({ partyId: 'TEST_ID' });
    component.addEditBankAccountDialog();
    expect(dialogSpy.open).toHaveBeenCalledWith(AddEditBankAccountComponent, {
      data: {
        bankAccountData: jasmine.objectContaining({
          partyId: 'TEST_ID',
          postalAddressList: component.postalAddressList,
          roleTypeId: 'CUSTOMER',
        }),
      },
    });

    mockDialogClose({ partyId: 'TEST_ID' });
    component.addUpdateNoteDialog({ noteId: 'NOTE-1' });
    expect(dialogSpy.open).toHaveBeenCalledWith(PartyNoteComponent, {
      data: {
        noteData: {
          noteId: 'NOTE-1',
          partyId: 'TEST_ID',
        },
      },
    });

    mockDialogClose({ partyId: 'TEST_ID' });
    component.addUpdateContentDialog({ description: 'Profile doc' });
    expect(dialogSpy.open).toHaveBeenCalledWith(PartyContentComponent, {
      data: {
        contentData: {
          description: 'Profile doc',
          partyId: 'TEST_ID',
        },
      },
    });

    expect(getCustomerSpy).toHaveBeenCalledTimes(9);
    expect(getCustomerSpy).toHaveBeenCalledWith('TEST_ID', false);
  });

  it('should skip silent refresh when add or edit dialogs close without a saved payload', () => {
    component.partyId = 'TEST_ID';
    const getCustomerSpy = spyOn(component, 'getCustomer');
    mockDialogClose(undefined);

    component.addEditPhoneDialog({ contactMechPurposeId: 'PRIMARY_PHONE' });
    component.addEditEmailDialog({ contactMechPurposeId: 'PRIMARY_EMAIL' });
    component.addRoleDialog({ roleTypeId: 'SUPPLIER' });

    expect(getCustomerSpy).not.toHaveBeenCalled();
  });

  it('should delete phone, email, role, identification, classification, and note then refresh the customer detail', () => {
    component.partyId = 'TEST_ID';
    const getCustomerSpy = spyOn(component, 'getCustomer');
    mockDialogClose(true);

    partyServiceSpy.deleteContactMech.and.returnValue(of({}));
    partyServiceSpy.deleteEmail.and.returnValue(of({}));
    partyServiceSpy.deleteRole.and.returnValue(of({}));
    partyServiceSpy.deleteIdentification.and.returnValue(of({}));
    partyServiceSpy.deleteClassification.and.returnValue(of({}));
    partyServiceSpy.deletePartyNote.and.returnValue(of({}));

    component.deletePhoneDialog({ partyId: 'TEST_ID', contactMechId: 'PHONE-1', contactMechPurposeId: 'PRIMARY_PHONE' });
    expect(partyServiceSpy.deleteContactMech).toHaveBeenCalledWith({
      partyId: 'TEST_ID',
      contactMechId: 'PHONE-1',
      contactMechPurposeId: 'PRIMARY_PHONE',
    });

    component.deleteEmailDialog({ partyId: 'TEST_ID', contactMechId: 'EMAIL-1', contactMechPurposeId: 'PRIMARY_EMAIL' });
    expect(partyServiceSpy.deleteEmail).toHaveBeenCalledWith({
      partyId: 'TEST_ID',
      contactMechId: 'EMAIL-1',
      contactMechPurposeId: 'PRIMARY_EMAIL',
    });

    component.deleteRoleDialog({ roleTypeId: 'SUPPLIER' });
    expect(partyServiceSpy.deleteRole).toHaveBeenCalledWith({
      partyId: 'TEST_ID',
      roleTypeId: 'SUPPLIER',
    });

    component.deleteIdentificationDialog({ partyId: 'TEST_ID', partyIdentificationTypeId: 'GST' });
    expect(partyServiceSpy.deleteIdentification).toHaveBeenCalledWith({
      partyId: 'TEST_ID',
      partyIdentificationTypeId: 'GST',
    });

    component.deleteClassificationDialog({ partyId: 'TEST_ID', classificationTypeEnumId: 'VIP' });
    expect(partyServiceSpy.deleteClassification).toHaveBeenCalledWith({
      partyId: 'TEST_ID',
      classificationTypeEnumId: 'VIP',
    });

    component.deleteNoteDialog({ noteId: 'NOTE-1' });
    expect(partyServiceSpy.deletePartyNote).toHaveBeenCalledWith({
      partyId: 'TEST_ID',
      noteId: 'NOTE-1',
    });

    expect(getCustomerSpy).toHaveBeenCalledTimes(6);
    expect(getCustomerSpy).toHaveBeenCalledWith('TEST_ID', false);
  });

  it('should not delete a role when the delete payload is incomplete', () => {
    mockDialogClose(true);

    component.deleteRoleDialog({});

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(partyServiceSpy.deleteRole).not.toHaveBeenCalled();
  });

  it('should open the confirmation dialog before destructive actions', () => {
    mockDialogClose(false);

    component.deletePhoneDialog({ partyId: 'TEST_ID' });
    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      data: {
        title: 'COMMON.PHONE',
        message: 'COMMON.DELETE_CONFIRMATION',
      },
    });
  });

  it('should filter email and telecom records by purpose', () => {
    expect(component.filterEmailAddressList(mockCustomerResponse.customerDetail?.emailAddressList as EmailAddress[], 'PRIMARY_EMAIL'))
      .toEqual([mockCustomerResponse.customerDetail?.emailAddressList?.[0]] as EmailAddress[]);
    expect(component.filterTelecomNumberList(mockCustomerResponse.customerDetail?.telecomNumberList as TelecomNumber[], 'PHONE_PAYMENT'))
      .toEqual([mockCustomerResponse.customerDetail?.telecomNumberList?.[1]] as TelecomNumber[]);
  });

  it('should mask bank account numbers and leave short values unchanged', () => {
    expect(component.maskAccountNumber('1234567890')).toBe('******7890');
    expect(component.maskAccountNumber('1234')).toBe('1234');
    expect(component.maskAccountNumber('')).toBe('');
  });

  it('should download and open party content when a content id exists', () => {
    component.partyId = 'TEST_ID';
    const blob = new Blob(['test'], { type: 'text/plain' });
    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:content');
    const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
    const windowOpenSpy = spyOn(window, 'open');
    const setTimeoutSpy = spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);
    partyServiceSpy.downloadPartyContent.and.returnValue(of(blob));

    component.openPartyContent({ contentId: 'CONTENT-1' });

    expect(partyServiceSpy.downloadPartyContent).toHaveBeenCalledWith('TEST_ID', 'CONTENT-1');
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(windowOpenSpy).toHaveBeenCalledWith('blob:content', '_blank', 'noopener');
    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:content');
  });

  it('should not download content when the customer or content id is missing', () => {
    component.partyId = undefined;

    component.openPartyContent({ contentId: 'CONTENT-1' });
    component.partyId = 'TEST_ID';
    component.openPartyContent({});

    expect(partyServiceSpy.downloadPartyContent).not.toHaveBeenCalled();
  });
});
