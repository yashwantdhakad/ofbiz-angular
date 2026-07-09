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
import { Component, input, output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PartyService } from '@ofbiz/services/oms/party/party.service'; // Replace with your service path

@Component({
  standalone: false,
  selector: 'app-customer-auto-complete',
  templateUrl: './customer-auto-complete.component.html',
  styleUrls: ['./customer-auto-complete.component.css'],
})
export class CustomerAutoCompleteComponent {
  value = input<string | number>();
  loading = input<boolean>(false);
  valueChange = output<string | number>();

  selectedCustomer: any;
  customerCtrl = new FormControl();
  filteredCustomers: any[] = [];
  customers: any[] = [];

  constructor(private partyService: PartyService) { }

  onCustomerSelected(customer: any): void {
    const { id } = customer || {};
    this.valueChange.emit(id || null);
  }
}
