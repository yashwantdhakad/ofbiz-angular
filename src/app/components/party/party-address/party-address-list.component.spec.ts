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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartyAddressListComponent } from './party-address-list.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationDialogComponent } from '../../common/confirmation-dialog/confirmation-dialog.component';

describe('PartyAddressListComponent', () => {
  let component: PartyAddressListComponent;
  let fixture: ComponentFixture<PartyAddressListComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let partyServiceSpy: jasmine.SpyObj<PartyService>;
  let translateSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    partyServiceSpy = jasmine.createSpyObj('PartyService', ['deletePostalAddress']);
    translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get']);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));
    (translateSpy as any).onLangChange = of({});
    (translateSpy as any).onTranslationChange = of({});
    (translateSpy as any).onDefaultLangChange = of({});

    await TestBed.configureTestingModule({
      declarations: [PartyAddressListComponent],
      imports: [MatDialogModule],
      providers: [
        { provide: MatDialog, useValue: dialogSpy },
        { provide: PartyService, useValue: partyServiceSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA]  // Ignores unknown child components
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PartyAddressListComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('partyId', 'PARTY_001');
    fixture.componentRef.setInput('purposeId', 'PostalShipping');
    fixture.componentRef.setInput('addressList', [
      {
        toName: 'John Doe',
        address1: '123 Main St',
        city: 'NYC',
        countryGeoId: 'USA',
        postalCode: '10001',
        stateProvinceGeoId: 'USA_NY',
        contactMechPurposeId: 'PostalShipping',
      },
      {
        toName: 'Jane Smith',
        address1: '456 Other St',
        city: 'LA',
        countryGeoId: 'USA',
        postalCode: '90001',
        stateProvinceGeoId: 'USA_CA',
        contactMechPurposeId: 'Billing',
      }
    ]);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter addresses by purposeId', () => {
    const filtered = component.filteredAddresses();
    expect(filtered).toHaveSize(1);
    expect(filtered[0].toName).toBe('John Doe');
  });

  it('should open dialog and emit addressUpdated on result', () => {
    const afterClosed$ = of({ partyId: 'PARTY_001' });
    dialogSpy.open.and.returnValue({ afterClosed: () => afterClosed$ } as any);

    spyOn(component.addressUpdated, 'emit');

    component.editAddress(component.filteredAddresses()[0]);

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(component.addressUpdated.emit).toHaveBeenCalledWith('PARTY_001');
  });

  it('should not emit addressUpdated if dialog result has no partyId', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);

    spyOn(component.addressUpdated, 'emit');

    component.editAddress(component.filteredAddresses()[0]);

    expect(component.addressUpdated.emit).toHaveBeenCalledWith('PARTY_001');
  });

  it('should delete address when confirmed', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    partyServiceSpy.deletePostalAddress.and.returnValue(of({}));
    spyOn(component.addressUpdated, 'emit');

    const params = { contactMechId: 'ID', partyId: 'PARTY_001' };
    component.deleteAddressDialog(params);

    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, jasmine.objectContaining({
      data: {
        title: 'PARTY.DELETE_ADDRESS_TITLE',
        message: 'PARTY.DELETE_ADDRESS_CONFIRMATION',
      },
    }));
    expect(partyServiceSpy.deletePostalAddress).toHaveBeenCalledWith(params);
    expect(component.addressUpdated.emit).toHaveBeenCalledWith('PARTY_001');
  });

  it('should not delete address when cancelled', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);
    spyOn(component.addressUpdated, 'emit');

    const params = { contactMechId: 'ID', partyId: 'PARTY_001' };
    component.deleteAddressDialog(params);

    expect(partyServiceSpy.deletePostalAddress).not.toHaveBeenCalled();
    expect(component.addressUpdated.emit).not.toHaveBeenCalled();
  });
});
