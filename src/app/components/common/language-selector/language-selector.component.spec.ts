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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LanguageSelectorComponent } from './language-selector.component';

describe('LanguageSelectorComponent', () => {
  let component: LanguageSelectorComponent;
  let fixture: ComponentFixture<LanguageSelectorComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<LanguageSelectorComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<LanguageSelectorComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [LanguageSelectorComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            current: 'fr',
            languages: [
              { code: 'en', labelKey: 'COMMON.ENGLISH' },
              { code: 'fr', labelKey: 'COMMON.FRENCH' },
            ],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeds the current language and option list from dialog data', () => {
    expect(component.selectedLanguage).toBe('fr');
    expect(component.languages).toEqual([
      { code: 'en', labelKey: 'COMMON.ENGLISH' },
      { code: 'fr', labelKey: 'COMMON.FRENCH' },
    ]);
  });

  it('falls back to the first option or english when current is missing', async () => {
    await TestBed.resetTestingModule();
    dialogRef = jasmine.createSpyObj<MatDialogRef<LanguageSelectorComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [LanguageSelectorComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            current: '',
            languages: [{ code: 'de', labelKey: 'COMMON.GERMAN' }],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.selectedLanguage).toBe('de');
  });

  it('closes with the selected language on apply', () => {
    component.selectedLanguage = 'en';

    component.apply();

    expect(dialogRef.close).toHaveBeenCalledWith('en');
  });
});
