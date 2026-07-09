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
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { PartyContentComponent } from './party-content.component';
import { PartyService } from '@ofbiz/services/oms/party/party.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { TranslateService } from '@ngx-translate/core';

describe('PartyContentComponent', () => {
  let component: PartyContentComponent;
  let fixture: ComponentFixture<PartyContentComponent>;
  let partyService: jasmine.SpyObj<PartyService>;
  let snackbarService: jasmine.SpyObj<SnackbarService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PartyContentComponent>>;
  let translateService: jasmine.SpyObj<TranslateService>;

  const mockData = {
    contentData: {
      partyId: 'PARTY123',
    },
  };

  beforeEach(async () => {
    const partySpy = jasmine.createSpyObj('PartyService', ['createPartyContent']);
    const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showSuccess', 'showError']);
    const dialogSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream']);
    translateSpy.get.and.callFake((key: string) => of(key));
    translateSpy.stream.and.callFake((key: string) => of(key));
    (translateSpy as any).onLangChange = of({});
    (translateSpy as any).onTranslationChange = of({});
    (translateSpy as any).onDefaultLangChange = of({});

    await TestBed.configureTestingModule({
      declarations: [PartyContentComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: PartyService, useValue: partySpy },
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: MatDialogRef, useValue: dialogSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ]
    })
      .overrideComponent(PartyContentComponent, {
        set: { template: '' },
      })
      .compileComponents();

    partyService = TestBed.inject(PartyService) as jasmine.SpyObj<PartyService>;
    snackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<PartyContentComponent>>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PartyContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize fileForm with required controls', () => {
    expect(component.fileForm.contains('contentFile')).toBeTrue();
    expect(component.fileForm.contains('description')).toBeTrue();
    expect(component.isLoading()).toBeFalse();
    expect(component.fileForm.get('description')?.hasError('required')).toBeTrue();
  });

  it('should update form control value on file change', () => {
    const file = new File(['dummy'], 'test.txt');
    const event = { target: { files: [file] } };

    component.onFileChange(event);

    expect(component.fileForm.get('contentFile')?.value).toBe(file);
  });

  it('should call createPartyContent on valid form submission', fakeAsync(() => {
    const fakeFile = new File(['dummy'], 'file.pdf', { type: 'application/pdf' });
    translateService.instant.and.returnValue('Success');

    component.fileForm.setValue({
      contentFile: fakeFile,
      description: 'Some note',
    });

    partyService.createPartyContent.and.returnValue(of({}));

    component.createPartyContent();
    tick();

    expect(partyService.createPartyContent).toHaveBeenCalled();
    expect(snackbarService.showSuccess).toHaveBeenCalledWith('Success');
    expect(dialogRef.close).toHaveBeenCalledWith(mockData.contentData);
  }));

  it('should handle error in createPartyContent', fakeAsync(() => {
    translateService.instant.and.returnValue('Upload failed');

    const fakeFile = new File(['dummy'], 'fail.txt');

    component.fileForm.setValue({
      contentFile: fakeFile,
      description: 'Desc',
    });

    partyService.createPartyContent.and.returnValue(throwError(() => new Error('Upload Error')));

    component.createPartyContent();
    tick();

    expect(snackbarService.showError).toHaveBeenCalledWith('Upload failed');
  }));

  it('should mark fields touched and not submit when description is missing', () => {
    const fakeFile = new File(['dummy'], 'file.pdf', { type: 'application/pdf' });
    component.fileForm.setValue({
      contentFile: fakeFile,
      description: '',
    });

    component.createPartyContent();

    expect(component.fileForm.get('description')?.touched).toBeTrue();
    expect(partyService.createPartyContent).not.toHaveBeenCalled();
  });
});
