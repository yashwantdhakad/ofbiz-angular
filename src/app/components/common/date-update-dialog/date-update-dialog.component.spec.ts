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
import { TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DateUpdateDialogComponent } from './date-update-dialog.component';
import { AuthService } from '@ofbiz/services/common/auth.service';

describe('DateUpdateDialogComponent', () => {
    const dialogRef = {
        close: jasmine.createSpy('close')
    };
    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['getUserLoginId']);

    function createComponent(data: { title: string, date: Date | string | null, timeZone?: string }) {
        TestBed.configureTestingModule({
            imports: [DateUpdateDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: AuthService, useValue: authService }
            ]
        });

        const fixture = TestBed.createComponent(DateUpdateDialogComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();
        return { fixture, component };
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
        dialogRef.close.calls.reset();
        authService.getUserLoginId.calls.reset();
        localStorage.clear();
    });

    it('uses the provided time zone and initial date', () => {
        authService.getUserLoginId.and.returnValue('admin');

        const { component } = createComponent({
            title: 'Update date',
            date: '2026-04-08T00:00:00Z',
            timeZone: 'Asia/Kolkata'
        });

        expect(component.title).toBe('Update date');
        expect(component.timeZone).toBe('Asia/Kolkata');
        expect(component.dateControl.value).toEqual(jasmine.any(Date));
        expect(component.previewDate).not.toBe('-');
    });

    it('resolves the scoped stored time zone when one is not provided', () => {
        authService.getUserLoginId.and.returnValue('admin');
        localStorage.setItem('user_pref:admin:timezone', 'America/New_York');

        const { component } = createComponent({
            title: 'Stored zone',
            date: null
        });

        expect(component.timeZone).toBe('America/New_York');
    });

    it('falls back to the global stored time zone when scoped value is absent', () => {
        authService.getUserLoginId.and.returnValue(null);
        localStorage.setItem('timezone', 'Europe/London');

        const { component } = createComponent({
            title: 'Global zone',
            date: null
        });

        expect(component.timeZone).toBe('Europe/London');
    });

    it('returns placeholder preview for invalid dates', () => {
        authService.getUserLoginId.and.returnValue('admin');

        const { component } = createComponent({
            title: 'Invalid',
            date: null
        });
        component.dateControl.setValue('not-a-date');

        expect(component.previewDate).toBe('-');
    });

    it('closes without payload on cancel', () => {
        authService.getUserLoginId.and.returnValue('admin');

        const { component } = createComponent({
            title: 'Cancel',
            date: null
        });

        component.onCancel();

        expect(dialogRef.close).toHaveBeenCalledWith();
    });

    it('closes with the selected date on save', () => {
        authService.getUserLoginId.and.returnValue('admin');
        const selectedDate = new Date('2026-04-09T00:00:00Z');

        const { component } = createComponent({
            title: 'Save',
            date: null
        });
        component.dateControl.setValue(selectedDate);

        component.onSave();

        expect(dialogRef.close).toHaveBeenCalledWith(selectedDate);
    });
});
