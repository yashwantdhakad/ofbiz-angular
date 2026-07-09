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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { RenderSchedulerService } from '@ofbiz/services/common/render-scheduler.service';
import { RequirementSupplierDialogComponent } from './requirement-supplier-dialog.component';

describe('RequirementSupplierDialogComponent', () => {
  let component: RequirementSupplierDialogComponent;
  let fixture: ComponentFixture<RequirementSupplierDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<RequirementSupplierDialogComponent>>;
  let partyService: jasmine.SpyObj<PartyService>;
  let renderScheduler: jasmine.SpyObj<RenderSchedulerService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<RequirementSupplierDialogComponent>>('MatDialogRef', ['close']);
    partyService = jasmine.createSpyObj<PartyService>('PartyService', [
      'getSuppliersAutocompleteFromWms',
      'getSupplier',
    ]);
    renderScheduler = jasmine.createSpyObj<RenderSchedulerService>('RenderSchedulerService', ['deferMacrotask']);
    renderScheduler.deferMacrotask.and.callFake((work: () => void) => work());

    await TestBed.configureTestingModule({
      declarations: [RequirementSupplierDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: PartyService, useValue: partyService },
        { provide: RenderSchedulerService, useValue: renderScheduler },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(RequirementSupplierDialogComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  function createComponent(data: any = {}): void {
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(RequirementSupplierDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('seeds the selected supplier and loads the name when editing an id-only display', () => {
    partyService.getSupplier.and.returnValue(of({ partyId: 'SUP-1', groupName: 'Acme' } as any));

    createComponent({
      supplierPartyId: 'SUP-1',
      supplierDisplayLabel: 'SUP-1 (SUP-1)',
    });

    expect(component.selectedSupplierPartyId).toBe('SUP-1');
    expect(component.selectedSupplierPartyName).toBe('Acme');
    expect(component.searchValue).toBe('SUP-1');
    expect(partyService.getSupplier).toHaveBeenCalledWith('SUP-1');
    expect(component.isLoading()).toBeFalse();
  });

  it('clears options when the search query is blank', () => {
    createComponent();
    component.supplierOptions = [{ partyId: 'SUP-1' }];
    component.isLoading.set(true);

    component.onSearchChange('   ');

    expect(component.supplierOptions).toEqual([]);
    expect(component.isLoading()).toBeFalse();
    expect(partyService.getSuppliersAutocompleteFromWms).not.toHaveBeenCalled();
  });

  it('loads supplier options and clears selection when searching', () => {
    partyService.getSuppliersAutocompleteFromWms.and.returnValue(
      of({ resultList: [{ partyId: 'SUP-1', groupName: 'Acme' }] })
    );
    createComponent();
    component.selectedSupplierPartyId = 'OLD';
    component.showError = true;

    component.onSearchChange('Acme');

    expect(component.selectedSupplierPartyId).toBe('');
    expect(component.showError).toBeFalse();
    expect(partyService.getSuppliersAutocompleteFromWms).toHaveBeenCalledWith('Acme');
    expect(component.supplierOptions).toHaveSize(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('keeps the dialog stable when supplier search fails', () => {
    partyService.getSuppliersAutocompleteFromWms.and.returnValue(throwError(() => new Error('search failed')));
    createComponent();
    component.supplierOptions = [{ partyId: 'SUP-1' }];

    component.onSearchChange('Acme');

    expect(component.supplierOptions).toEqual([]);
    expect(component.isLoading()).toBeFalse();
  });

  it('selects a supplier from the loaded options and closes with trimmed ids only when valid', () => {
    createComponent();
    component.supplierOptions = [{ partyId: 'SUP-1', groupName: 'Acme' }];

    component.selectSupplier('SUP-1');
    component.save();

    expect(component.searchValue).toBe('Acme(SUP-1)');
    expect(dialogRef.close).toHaveBeenCalledWith({
      supplierPartyId: 'SUP-1',
      supplierPartyName: 'Acme',
    });
  });

  it('shows an error instead of closing when no supplier is selected', () => {
    createComponent();

    component.save();

    expect(component.showError).toBeTrue();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('returns display values for both string and supplier objects', () => {
    createComponent();

    expect(component.displaySupplier('Acme')).toBe('Acme');
    expect(component.displaySupplier({ partyId: 'SUP-1', groupName: 'Acme' })).toBe('Acme(SUP-1)');
  });
});
