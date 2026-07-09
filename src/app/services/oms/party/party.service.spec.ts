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
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PartyService } from './party.service';
import { ApiService } from '../../common/api.service';

describe('PartyService', () => {
  let service: PartyService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', [
      'get', 'post', 'put', 'delete', 'getOms', 'postOms', 'putOms', 'deleteOms', 'getWms', 'getOmsBlob', 'postOmsFormData', 'postFormData',
    ]);

    TestBed.configureTestingModule({
      providers: [
        PartyService,
        { provide: ApiService, useValue: spy },
      ],
    });

    service = TestBed.inject(PartyService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call customers endpoint and map customer name', () => {
    apiServiceSpy.get.and.returnValue(of({
      data: {
        resultList: [{ partyId: 'C1', firstName: 'John', lastName: 'Doe' }],
      },
    }));

    service.getCustomers(1, 'john').subscribe((response) => {
      expect(response.resultList?.[0]?.name).toBe('John Doe');
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/customers?page=1&query=john');
  });

  it('should call OFBiz classification lookup endpoint', () => {
    apiServiceSpy.get.and.returnValue(of({ data: { resultList: [{ partyClassificationGroupId: 'VIP' }] } } as any));

    service.getClassifications({ classificationTypeEnumId: 'PcltCustomer' }).subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/services/restGetPartyClassificationGroups?parentTypeId=PcltCustomer');
  });

  it('should call suppliers endpoint and map supplier name', () => {
    apiServiceSpy.get.and.returnValue(of({
      data: {
        resultList: [{ partyId: 'S1', groupName: 'Terrachayu' }],
      },
    }));

    service.getSuppliers(2, 'north').subscribe((response) => {
      expect(response.resultList?.[0]?.name).toBe('Terrachayu');
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/suppliers?page=2&query=north');
  });

  it('should call WMS autocomplete for customers', () => {
    apiServiceSpy.get.and.returnValue(of({ data: { resultList: [] } }));

    service.getCustomersAutocompleteFromWms('abc', 10).subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/intra/customers/autocomplete?query=abc&limit=10');
  });

  it('should call WMS autocomplete for suppliers and normalize fallback fields', () => {
    apiServiceSpy.get.and.returnValue(of({
      data: { resultList: [{ partyId: 'S1', roleTypeId: 'SUPPLIER' }] },
    }));

    service.getSuppliersAutocompleteFromWms('', 5).subscribe((response) => {
      expect(response.resultList?.[0]).toEqual(jasmine.objectContaining({
        name: 'S1',
        type: 'SUPPLIER',
        typeLabel: 'Supplier',
      }));
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/intra/suppliers/autocomplete?query=&limit=5');
  });

  it('should create and update customer', () => {
    apiServiceSpy.post.and.returnValue(of({ data: { partyId: 'C100' } }));
    apiServiceSpy.put.and.returnValue(of({ data: { partyId: 'C100' } }));

    service.createCustomer({ firstName: 'A', lastName: 'B' }).subscribe();
    service.updateCustomer({ partyId: 'C100', firstName: 'A' }).subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/customers', { firstName: 'A', lastName: 'B' });
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/customers/C100', { firstName: 'A' });
  });

  it('should create and update supplier', () => {
    apiServiceSpy.post.and.returnValue(of({ data: { partyId: 'S100' } }));
    apiServiceSpy.put.and.returnValue(of({ data: { partyId: 'S100' } }));

    service.createSupplier({ groupName: 'A' }).subscribe();
    service.updateSupplier({ partyId: 'S100', groupName: 'A' }).subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/suppliers', { groupName: 'A' });
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/suppliers/S100', { groupName: 'A' });
  });

  it('should fetch parties and role summaries', () => {
    apiServiceSpy.getOms.and.callFake(((url: string) => {
      if (url === '/rest/s1/commerce/parties?page=3&roleTypeId=Supplier&pageSize=25&anyField=north') {
        return of({ resultList: [{ partyId: 'P1' }] });
      }
      if (url === '/party-roles?roleTypeId=Supplier') {
        return of([{ roleTypeId: 'Supplier' }]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any);
    apiServiceSpy.get.and.callFake(((url: string) => {
      if (url === '/common/party-roles/summary?roleTypeId=Supplier&partyIds=P1%2CP2') {
        return of({ data: { resultList: [{ roleTypeId: 'Supplier' }] } });
      }
      if (url === '/common/party-roles/summary') {
        return of({ data: { resultList: [{ roleTypeId: 'Customer' }] } });
      }
      if (url === '/common/party-roles/by-party/P1') {
        return of({ data: { resultList: [{ roleTypeId: 'Supplier' }] } });
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any);

    service.getParties(3, 25, 'north').subscribe((response) => {
      expect(response.resultList?.[0]?.partyId).toBe('P1');
    });
    service.getPartyRoles('Supplier').subscribe();
    service.getPartyRoleSummaries('Supplier', ['P1', 'P2']).subscribe();
    service.getPartyRoleSummaries().subscribe();
    service.getPartyRolesByPartyId('P1').subscribe();

    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/rest/s1/commerce/parties?page=3&roleTypeId=Supplier&pageSize=25&anyField=north');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/party-roles?roleTypeId=Supplier');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/party-roles/summary?roleTypeId=Supplier&partyIds=P1%2CP2');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/party-roles/summary');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/party-roles/by-party/P1');
  });

  it('should manage postal address endpoints', () => {
    apiServiceSpy.post.and.returnValue(of({}));
    apiServiceSpy.put.and.returnValue(of({}));

    service.addAddress({ partyId: 'P1', address1: 'x' }).subscribe();
    service.updateAddress({ partyId: 'P1', contactMechId: 'CM1', address1: 'y' }).subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/addresses', { address1: 'x' });
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/parties/P1/addresses/CM1', { address1: 'y' });
  });

  it('should manage email and phone endpoints', () => {
    apiServiceSpy.post.and.returnValue(of({}));
    apiServiceSpy.put.and.returnValue(of({}));
    apiServiceSpy.delete.and.returnValue(of({}));

    service.addEmail({ partyId: 'P1', emailAddress: 'a@b.com' }).subscribe();
    service.addPhone({ partyId: 'P1', contactNumber: '123' }).subscribe();
    service.updatePhoneNumber({ partyId: 'P1', contactMechId: 'CM1', contactNumber: '999' }).subscribe();
    service.deleteContactMech({ partyId: 'P1', contactMechId: 'CM1' }).subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/emails', jasmine.objectContaining({ emailAddress: 'a@b.com' }));
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/phones', jasmine.objectContaining({ contactNumber: '123' }));
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/parties/P1/phones/CM1', jasmine.objectContaining({ contactNumber: '999' }));
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/parties/P1/contacts/CM1');
  });

  it('should manage direct postal and email endpoint variants', () => {
    apiServiceSpy.post.and.returnValue(of({}));
    apiServiceSpy.put.and.returnValue(of({}));
    apiServiceSpy.delete.and.returnValue(of({}));
    apiServiceSpy.get.and.returnValue(of({ data: { customerDetail: { postalAddressList: [], telecomNumberList: [] } } } as any));
    apiServiceSpy.getOms.and.returnValue(of({ contactMechId: 'ADDR1' } as any));

    service.addPostalAddress('P1', { address1: 'Line 1' }).subscribe();
    service.updatePostalAddress('P1', 'CM1', { address1: 'Line 2' }).subscribe();
    service.addEmail({ partyId: 'P1', emailAddress: 'a@b.com' }).subscribe();
    service.addEmail({ partyId: 'P1', contactMechId: 'CM1', emailAddress: 'b@c.com' }).subscribe();
    service.updateEmailAddress({ partyId: 'P1', contactMechId: 'CM1', emailAddress: 'c@d.com' } as any).subscribe();
    service.deleteEmail({ partyId: 'P1', contactMechId: 'CM1' } as any).subscribe();
    service.deletePostalAddress({ partyId: 'P1', contactMechId: 'CM2' } as any).subscribe();
    service.getPostalAddressByContactMechId('CM2').subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/addresses', { address1: 'Line 1' });
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/parties/P1/addresses/CM1', { address1: 'Line 2' });
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/emails', jasmine.objectContaining({ emailAddress: 'a@b.com' }));
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/parties/P1/emails/CM1', jasmine.objectContaining({ emailAddress: 'b@c.com' }));
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/parties/P1/emails/CM1', jasmine.objectContaining({ emailAddress: 'c@d.com' }));
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/parties/P1/contacts/CM1');
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/parties/P1/contacts/CM2');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/postal-addresses/by-contact-mech/CM2');
  });

  it('should fetch customer and supplier detail endpoints', () => {
    apiServiceSpy.get.and.returnValues(
      of({ data: { customerDetail: { partyId: 'C1' } } }),
      of({ data: { supplierDetail: { partyId: 'S1' } } })
    );

    service.getCustomer('C1').subscribe();
    service.getSupplier('S1').subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/customers/C1');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/suppliers/S1');
  });

  it('should manage roles', () => {
    apiServiceSpy.post.and.returnValue(of({}));
    apiServiceSpy.delete.and.returnValue(of({}));

    service.addRole({ partyId: 'P1', roleTypeId: 'CUSTOMER' }).subscribe();
    service.deleteRole({ partyId: 'P1', roleTypeId: 'CUSTOMER' }).subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/roles', { roleTypeId: 'CUSTOMER' });
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/parties/P1/roles/CUSTOMER');
  });

  it('should cover identification, payment, and note/content endpoints', () => {
    apiServiceSpy.get.and.returnValue(of({}));
    apiServiceSpy.post.and.returnValues(of({}), of({}), of({}), of({}), of({}));
    apiServiceSpy.put.and.returnValue(of({}));
    apiServiceSpy.delete.and.returnValue(of({}));
    apiServiceSpy.getOms.and.callFake(((url: string) => {
      if (url === '/rest/s1/commerce/paymentGatewayConfigList') {
        return of({});
      }
      return of({});
    }) as any);
    apiServiceSpy.postFormData.and.returnValue(of({}));
    apiServiceSpy.getOmsBlob.and.returnValue(of(new Blob(['x'])));
    apiServiceSpy.postOms.and.returnValue(of({}));

    service.addIdentification({ partyId: 'P1', idValue: 'ID1' } as any).subscribe();
    service.deleteIdentification({ partyId: 'P1', idValue: 'ID1' } as any).subscribe();
    service.getPaymentGatewayConfig().subscribe();
    service.createUpdatePaymentMethod({ paymentMethodTypeId: 'CARD' }).subscribe();
    service.createCreditCard('P1', { cardNumber: '4111' }).subscribe();
    service.createBankAccount('P1', { bankName: 'Bank' }).subscribe();
    service.deletePaymentMethod({ paymentMethodId: 'PM1' }).subscribe();
    service.createPartyNote({ partyId: 'P1', noteText: 'note' }).subscribe();
    service.updatePartyNote({ partyId: 'P1', noteId: 'N1', noteText: 'updated' }).subscribe();
    service.deletePartyNote({ partyId: 'P1', noteId: 'N1' }).subscribe();

    const formData = new FormData();
    formData.append('partyId', 'P1');
    service.createPartyContent(formData).subscribe();
    service.downloadPartyContent('P1', 'C1').subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/services/restCreatePartyIdentification', {
      partyId: 'P1',
      idValue: 'ID1',
    } as any);
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/services/restDeletePartyIdentification', {
      partyId: 'P1',
      idValue: 'ID1',
    } as any);
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/notes', jasmine.objectContaining({ note: 'note' }));
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/parties/P1/notes/N1', jasmine.objectContaining({ note: 'updated' }));
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/parties/P1/notes/N1');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/rest/s1/commerce/paymentGatewayConfigList');
    expect(apiServiceSpy.postOms).toHaveBeenCalledWith('/rest/s1/commerce/paymentMethod', { paymentMethodTypeId: 'CARD' });
    expect(apiServiceSpy.postOms).toHaveBeenCalledWith('/parties/P1/payment-methods/credit-cards', { cardNumber: '4111' });
    expect(apiServiceSpy.postOms).toHaveBeenCalledWith('/parties/P1/payment-methods/bank-accounts', { bankName: 'Bank' });
    expect(apiServiceSpy.postFormData).toHaveBeenCalledWith('/common/parties/P1/contents', formData);
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/parties/P1/contents/C1');
  });

  it('should filter postal and telecom contact mechanisms by purpose and party type', () => {
    apiServiceSpy.get.and.callFake(((url: string) => {
      if (url === '/common/customers/P1') {
        return of({
          data: {
            customerDetail: {
              postalAddressList: [
                { contactMechPurposeId: 'BILLING', address1: 'Billing' },
                { contactMechPurposeTypeId: 'SHIPPING', address1: 'Shipping' },
              ],
            },
          },
        });
      }
      if (url === '/common/customers/P3') {
        return of({
          data: {
            customerDetail: {
              postalAddressList: [{ contactMechPurposeId: 'SHIP', address1: 'Ship' }],
            },
          },
        });
      }
      if (url === '/common/suppliers/P2') {
        return of({
          data: {
            supplierDetail: {
              telecomNumberList: [
                { contactMechPurposeId: 'PHONE', contactNumber: '111' },
                { contactMechPurposeTypeId: 'FAX', contactNumber: '222' },
              ],
            },
          },
        });
      }
      if (url === '/common/suppliers/P4') {
        return of({
          data: {
            supplierDetail: {
              telecomNumberList: [{ contactMechPurposeId: 'FAX', contactNumber: '333' }],
            },
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any);

    service.getPartyPostalContactMechByPurpose('P1', 'BILLING', 'customer').subscribe((res) => {
      expect(res).toEqual([{ contactMechPurposeId: 'BILLING', address1: 'Billing' } as any]);
    });
    service.getPartyTelecomContactMechByPurpose('P2', 'PHONE', 'supplier').subscribe((res) => {
      expect(res).toEqual([{ contactMechPurposeId: 'PHONE', contactNumber: '111' } as any]);
    });
    service.getPartyPostalContactMechByPurpose('P3', '', 'customer').subscribe((res) => {
      expect(res).toHaveSize(1);
    });
    service.getPartyTelecomContactMechByPurpose('P4', '', 'supplier').subscribe((res) => {
      expect(res).toHaveSize(1);
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/customers/P1');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/suppliers/P2');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/customers/P3');
    expect(apiServiceSpy.get).toHaveBeenCalledWith('/common/suppliers/P4');
  });

  it('should normalize contact purpose fields on customer and supplier details', () => {
    apiServiceSpy.get.and.returnValues(
      of({
        data: {
          customerDetail: {
            postalAddressList: [{ contactMechPurposeTypeId: 'PRIMARY_LOCATION', address1: 'Main' }],
            emailAddressList: [{ contactMechPurposeTypeId: 'PRIMARY_EMAIL', emailAddress: 'a@b.com' }],
            telecomNumberList: [{ contactMechPurposeTypeId: 'PRIMARY_PHONE', contactNumber: '123' }],
          },
        },
      }),
      of({
        data: {
          supplierDetail: {
            postalAddressList: [{ contactMechPurposeTypeId: 'BILLING_LOCATION', address1: 'Bill' }],
            emailAddressList: [{ contactMechPurposeTypeId: 'PRIMARY_EMAIL', emailAddress: 'x@y.com' }],
            telecomNumberList: [{ contactMechPurposeTypeId: 'PHONE_SHIP_ORIG', contactNumber: '456' }],
          },
        },
      })
    );

    service.getCustomer('C1').subscribe((response) => {
      expect(response.customerDetail?.postalAddressList?.[0]?.contactMechPurposeId).toBe('PRIMARY_LOCATION');
      expect(response.customerDetail?.emailAddressList?.[0]?.contactMechPurposeId).toBe('PRIMARY_EMAIL');
      expect(response.customerDetail?.telecomNumberList?.[0]?.contactMechPurposeId).toBe('PRIMARY_PHONE');
    });

    service.getSupplier('S1').subscribe((response) => {
      expect(response.supplierDetail?.postalAddressList?.[0]?.contactMechPurposeId).toBe('BILLING_LOCATION');
      expect(response.supplierDetail?.emailAddressList?.[0]?.contactMechPurposeId).toBe('PRIMARY_EMAIL');
      expect(response.supplierDetail?.telecomNumberList?.[0]?.contactMechPurposeId).toBe('PHONE_SHIP_ORIG');
    });
  });

  it('should fetch payment method types and enumerations', () => {
    apiServiceSpy.getOms.and.callFake(((url: string) => {
      if (url === '/accounting/payment-method-types') {
        return of([{ paymentMethodTypeId: 'CC' }]);
      }
      if (url === '/parties/enumerations/GENDER') {
        return of([{ enumId: '1' }]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any);

    service.getPaymentMethodTypes().subscribe((res) => {
      expect(res[0].paymentMethodTypeId).toBe('CC');
    });
    service.getEnumerations('GENDER').subscribe((res) => {
      expect(res[0].enumId).toBe('1');
    });

    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/accounting/payment-method-types');
    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/parties/enumerations/GENDER');
  });

  it('should manage party note endpoints', () => {
    apiServiceSpy.post.and.returnValue(of({}));
    apiServiceSpy.put.and.returnValue(of({}));
    apiServiceSpy.delete.and.returnValue(of({}));

    service.createPartyNote({ partyId: 'P1', noteText: 'n' }).subscribe();
    service.updatePartyNote({ partyId: 'P1', noteId: 'N1', noteText: 'u' }).subscribe();
    service.deletePartyNote({ partyId: 'P1', noteId: 'N1' }).subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/notes', jasmine.objectContaining({ note: 'n' }));
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/parties/P1/notes/N1', jasmine.objectContaining({ note: 'u' }));
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/parties/P1/notes/N1');
  });

  it('should call classification endpoints', () => {
    apiServiceSpy.get.and.returnValue(of({ data: { resultList: [] } } as any));
    apiServiceSpy.post.and.returnValue(of({}));

    service.getClassifications({ a: 1 } as any).subscribe();
    service.addClassification({ b: 2 } as any).subscribe();
    service.deleteClassification({ c: 3 } as any).subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledWith('/services/restGetPartyClassificationGroups');
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/services/restCreatePartyClassification', { b: 2 });
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/services/restDeletePartyClassification', { c: 3 });
  });

  it('should map OFBiz identification payloads', () => {
    apiServiceSpy.post.and.returnValue(of({}));

    service.addIdentification({ partyId: 'P1', partyIdTypeEnumId: 'TAX_ID', idValue: 'ID1' } as any).subscribe();
    service.deleteIdentification({ partyId: 'P1', partyIdTypeEnumId: 'TAX_ID', idValue: 'ID1' } as any).subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/services/restCreatePartyIdentification', {
      partyId: 'P1',
      idValue: 'ID1',
      partyIdentificationTypeId: 'TAX_ID',
    });
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/services/restDeletePartyIdentification', {
      partyId: 'P1',
      idValue: 'ID1',
      partyIdentificationTypeId: 'TAX_ID',
    });
  });

  it('should map OFBiz contact and note payloads', () => {
    apiServiceSpy.post.and.returnValue(of({}));
    apiServiceSpy.put.and.returnValue(of({}));
    apiServiceSpy.delete.and.returnValue(of({}));

    service.addClassification({ partyId: 'P1', partyClassificationId: 'VIP' } as any).subscribe();
    service.addAddress({ partyId: 'P1', contactMechPurposeId: 'PRIMARY_LOCATION', address1: 'x' } as any).subscribe();
    service.updateAddress({ partyId: 'P1', contactMechId: 'CM1', contactMechPurposeId: 'BILLING_LOCATION', address1: 'y' } as any).subscribe();
    service.updateEmailAddress({ partyId: 'P1', contactMechId: 'EM1', contactMechPurposeId: 'PRIMARY_EMAIL', emailAddress: 'a@b.com' } as any).subscribe();
    service.addPhone({ partyId: 'P1', contactMechPurposeId: 'PRIMARY_PHONE', contactNumber: '123' } as any).subscribe();
    service.createPartyNote({ partyId: 'P1', noteText: 'note' }).subscribe();
    service.updatePartyNote({ partyId: 'P1', noteId: 'N1', noteText: 'updated' }).subscribe();
    service.deletePartyNote({ partyId: 'P1', noteId: 'N1' }).subscribe();

    expect(apiServiceSpy.post).toHaveBeenCalledWith('/services/restCreatePartyClassification', {
      partyId: 'P1',
      partyClassificationGroupId: 'VIP',
    });
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/addresses', {
      address1: 'x',
      contactMechPurposeTypeId: 'PRIMARY_LOCATION',
    });
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/parties/P1/addresses/CM1', {
      address1: 'y',
      contactMechPurposeTypeId: 'BILLING_LOCATION',
    });
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/parties/P1/emails/EM1', jasmine.objectContaining({
      partyId: 'P1',
      emailAddress: 'a@b.com',
      contactMechId: 'EM1',
      contactMechPurposeTypeId: 'PRIMARY_EMAIL',
    }));
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/phones', jasmine.objectContaining({
      partyId: 'P1',
      contactNumber: '123',
      contactMechPurposeTypeId: 'PRIMARY_PHONE',
    }));
    expect(apiServiceSpy.post).toHaveBeenCalledWith('/common/parties/P1/notes', jasmine.objectContaining({
      partyId: 'P1',
      note: 'note',
    }));
    expect(apiServiceSpy.put).toHaveBeenCalledWith('/common/parties/P1/notes/N1', jasmine.objectContaining({
      partyId: 'P1',
      noteId: 'N1',
      note: 'updated',
    }));
    expect(apiServiceSpy.delete).toHaveBeenCalledWith('/common/parties/P1/notes/N1');
  });

  it('should call payment method endpoints', () => {
    apiServiceSpy.getOms.and.returnValue(of({}));
    apiServiceSpy.postOms.and.returnValue(of({}));

    service.getPaymentGatewayConfig().subscribe();
    service.createUpdatePaymentMethod({ a: 1 }).subscribe();
    service.createBankAccount('P1', { c: 3 }).subscribe();
    service.deletePaymentMethod({ b: 2 }).subscribe();

    expect(apiServiceSpy.getOms).toHaveBeenCalledWith('/rest/s1/commerce/paymentGatewayConfigList');
    expect(apiServiceSpy.postOms).toHaveBeenCalledWith('/rest/s1/commerce/paymentMethod', { a: 1 });
    expect(apiServiceSpy.postOms).toHaveBeenCalledWith('/parties/P1/payment-methods/bank-accounts', { c: 3 });
    expect(apiServiceSpy.postOms).toHaveBeenCalledWith('/rest/s1/commerce/deletePaymentMethod', { b: 2 });
  });
});
