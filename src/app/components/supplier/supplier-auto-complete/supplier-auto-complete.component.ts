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
// autocomplete.component.ts
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { startWith, switchMap, map } from 'rxjs/operators';
import { PartyListItem } from '@ofbiz/models/party.model';
import { PartyService } from '@ofbiz/services/oms/party/party.service';

@Component({
  standalone: false,
  selector: 'app-supplier-auto-complete',
  templateUrl: './supplier-auto-complete.component.html',
  styleUrls: ['./supplier-auto-complete.component.css']
})
export class SupplierAutoCompleteComponent implements OnInit {
  countryCtrl = new FormControl();
  filteredSuppliers$: Observable<string[]> | undefined;

  constructor(private partyService: PartyService) {}

  ngOnInit() {
    this.filteredSuppliers$ = this.countryCtrl.valueChanges.pipe(
      startWith(''),
      switchMap((value) => this.partyService.getSuppliersAutocompleteFromWms(value)),
      map((response) => (response?.resultList ?? []).map((item: PartyListItem) => item.name ?? '')),
    );
  }
}

