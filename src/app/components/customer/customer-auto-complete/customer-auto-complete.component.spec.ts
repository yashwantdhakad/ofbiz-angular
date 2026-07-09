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
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CustomerAutoCompleteComponent } from './customer-auto-complete.component';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('CustomerAutoCompleteComponent', () => {
  let component: CustomerAutoCompleteComponent;
  let fixture: ComponentFixture<CustomerAutoCompleteComponent>;

  beforeEach(async () => {
    const partySpy = jasmine.createSpyObj('PartyService', ['getCustomers']);

    await TestBed.configureTestingModule({
      declarations: [CustomerAutoCompleteComponent],
      imports: [ReactiveFormsModule, FormsModule],
      providers: [{ provide: PartyService, useValue: partySpy }],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(CustomerAutoCompleteComponent, {
        set: { template: '' },
      })
      .compileComponents();

  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomerAutoCompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should bind @Input value correctly', () => {
    fixture.componentRef.setInput('value', 'CUST123');
    fixture.detectChanges();
    expect(component.value()).toBe('CUST123');
  });

  it('should emit valueChange on customer selection', () => {
    spyOn(component.valueChange, 'emit');
    const customer = { id: 'CUST001', name: 'Test Customer' };

    component.onCustomerSelected(customer);

    expect(component.valueChange.emit).toHaveBeenCalledWith('CUST001');
  });

  it('should handle null customer in selection gracefully', () => {
    spyOn(component.valueChange, 'emit');
    component.onCustomerSelected(null);

    expect(component.valueChange.emit).toHaveBeenCalled();
    expect((component.valueChange.emit as jasmine.Spy).calls.mostRecent().args[0]).toBeNull();
  });

  it('should initialize customer control', () => {
    expect(component.customerCtrl).toBeDefined();
  });
});
