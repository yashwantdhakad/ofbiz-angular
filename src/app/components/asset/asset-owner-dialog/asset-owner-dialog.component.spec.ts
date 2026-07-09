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
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { AssetOwnerDialogComponent } from './asset-owner-dialog.component';

describe('AssetOwnerDialogComponent', () => {
  let component: AssetOwnerDialogComponent;
  let fixture: ComponentFixture<AssetOwnerDialogComponent>;
  let partyService: jasmine.SpyObj<PartyService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AssetOwnerDialogComponent>>;

  beforeEach(async () => {
    partyService = jasmine.createSpyObj<PartyService>('PartyService', ['getCustomersAutocompleteFromWms']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<AssetOwnerDialogComponent>>('MatDialogRef', ['close']);
    partyService.getCustomersAutocompleteFromWms.and.returnValue(of({ resultList: [] } as any));

    await TestBed.configureTestingModule({
      declarations: [AssetOwnerDialogComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: PartyService, useValue: partyService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { ownerPartyId: 'OWNER-1' } },
      ],
    })
      .overrideComponent(AssetOwnerDialogComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(AssetOwnerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('prefills owner and displays party values', () => {
    expect(component.ownerControl.value).toBe('OWNER-1');
    expect(component.displayParty(null)).toBe('');
    expect(component.displayParty('OWNER-1')).toBe('OWNER-1');
    expect(component.displayParty({ partyId: 'OWNER-2' })).toBe('OWNER-2');
    expect(component.displayParty({ name: 'Demo Customer', partyId: 'OWNER-3' })).toBe('Demo Customer');
  });

  it('loads customer options after debounce and handles lookup errors', fakeAsync(() => {
    partyService.getCustomersAutocompleteFromWms.and.returnValues(
      of({ resultList: [{ partyId: 'OWNER-1', name: 'Owner One' }] } as any),
      throwError(() => new Error('failed'))
    );
    const emissions: any[][] = [];
    component.filteredParties$.subscribe((items) => emissions.push(items));

    tick(300);
    expect(emissions.at(-1)).toEqual([{ partyId: 'OWNER-1', name: 'Owner One' }]);

    component.ownerControl.setValue({ partyId: 'OWNER-2' });
    tick(300);

    expect(partyService.getCustomersAutocompleteFromWms).toHaveBeenCalledWith('OWNER-2');
    expect(emissions.at(-1)).toEqual([]);
  }));

  it('returns selected owner id or null on save', () => {
    component.ownerControl.setValue('  OWNER-9  ');
    component.onSave();
    expect(dialogRef.close).toHaveBeenCalledWith('OWNER-9');

    component.ownerControl.setValue({ partyId: 'OWNER-10' });
    component.onSave();
    expect(dialogRef.close).toHaveBeenCalledWith('OWNER-10');

    component.ownerControl.setValue('   ');
    component.onSave();
    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });

  it('closes without a value when cancelled', () => {
    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
