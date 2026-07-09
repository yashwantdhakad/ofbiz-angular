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
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { PartyService } from '@ofbiz/services/oms/party/party.service';

@Component({
  standalone: false,
  selector: 'app-asset-owner-dialog',
  templateUrl: './asset-owner-dialog.component.html',
  styleUrls: ['./asset-owner-dialog.component.css'],
})
export class AssetOwnerDialogComponent implements OnInit {
  ownerControl: FormControl;
  filteredParties$: Observable<any[]> = of([]);

  constructor(
    private dialogRef: MatDialogRef<AssetOwnerDialogComponent>,
    private partyService: PartyService,
    @Inject(MAT_DIALOG_DATA) public data: { ownerPartyId?: string }
  ) {
    this.ownerControl = new FormControl(data?.ownerPartyId || '');
  }

  ngOnInit(): void {
    this.filteredParties$ = this.ownerControl.valueChanges.pipe(
      startWith(this.ownerControl.value || ''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: any) => this.getPartiesFromService(value))
    );
  }

  displayParty(party: any): string {
    if (!party) {
      return '';
    }
    if (typeof party === 'string') {
      return party;
    }
    return party.name || party.partyId || '';
  }

  private getPartiesFromService(value: any): Observable<any[]> {
    const query = typeof value === 'string' ? value : value?.partyId ?? '';
    if (!query) {
      return of([]);
    }
    return this.partyService.getCustomersAutocompleteFromWms(query).pipe(
      map((res: any) => res?.resultList ?? []),
      catchError(() => of([]))
    );
  }

  onSave(): void {
    const raw = this.ownerControl.value;
    const ownerPartyId = typeof raw === 'string' ? raw.trim() : (raw?.partyId || '');
    this.dialogRef.close(ownerPartyId || null);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
