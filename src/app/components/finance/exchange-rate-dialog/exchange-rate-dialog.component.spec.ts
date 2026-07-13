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
import { NO_ERRORS_SCHEMA, EventEmitter } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ExchangeRateDialogComponent } from './exchange-rate-dialog.component';

describe('ExchangeRateDialogComponent', () => {
  let component: ExchangeRateDialogComponent;
  let fixture: ComponentFixture<ExchangeRateDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ExchangeRateDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream']);
    translateSpy.instant.and.callFake((key: string) => key);
    translateSpy.get.and.callFake((key: string) => of(key));
    translateSpy.stream.and.callFake((key: string) => of(key));
    Object.defineProperties(translateSpy, {
      onTranslationChange: { value: new EventEmitter(), configurable: true },
      onLangChange: { value: new EventEmitter(), configurable: true },
      onDefaultLangChange: { value: new EventEmitter(), configurable: true },
    });

    await TestBed.configureTestingModule({
      declarations: [ExchangeRateDialogComponent],
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { currencies: [{ uomId: 'INR', description: 'Indian Rupee' }, { uomId: 'USD' }] } },
        { provide: TranslateService, useValue: translateSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ExchangeRateDialogComponent);
    component = fixture.componentInstance;
  });

  it('refuses to save while invalid', () => {
    component.save();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('rejects the same currency on both sides', () => {
    component.form.patchValue({ uomId: 'INR', uomIdTo: 'INR', conversionFactor: 1 });
    expect(component.form.hasError('sameCurrency')).toBeTrue();
    component.save();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with a normalized payload when valid', () => {
    component.form.patchValue({ uomId: 'INR', uomIdTo: 'USD', conversionFactor: '0.012', withReverse: true });
    component.save();
    expect(dialogRef.close).toHaveBeenCalledWith({
      uomId: 'INR', uomIdTo: 'USD', conversionFactor: 0.012, withReverse: 'Y',
    });
  });

  it('formats currency labels with descriptions', () => {
    expect(component.displayCurrency({ uomId: 'INR', description: 'Indian Rupee' })).toBe('INR — Indian Rupee');
    expect(component.displayCurrency({ uomId: 'USD' })).toBe('USD');
  });

  it('closes without a result on cancel', () => {
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
