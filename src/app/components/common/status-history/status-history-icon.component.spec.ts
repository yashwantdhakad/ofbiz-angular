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
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { StatusHistoryIconComponent } from './status-history-icon.component';

describe('StatusHistoryIconComponent', () => {
  let component: StatusHistoryIconComponent;
  let fixture: ComponentFixture<StatusHistoryIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        StatusHistoryIconComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateFakeLoader },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusHistoryIconComponent);
    component = fixture.componentInstance;
  });

  it('hides the icon when there is no history', () => {
    component.entries = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.status-history-trigger')).toBeNull();
  });

  it('opens when history entries are present', () => {
    component.entries = [
      {
        statusId: 'ORDER_APPROVED',
        statusLabel: 'Approved',
        changedAt: '2026-04-07T10:30:00',
        changedBy: 'super_admin',
        reason: 'Approved by workflow',
      },
    ];
    fixture.detectChanges();

    expect(component.hasEntries).toBeTrue();
    expect(component.showReasonColumn).toBeTrue();

    component.open();

    expect(component.isOpen).toBeTrue();
  });

  it('toggles closed and guards when no entries exist', () => {
    component.entries = [];
    component.isOpen = true;

    const event = jasmine.createSpyObj<Event>('Event', ['preventDefault', 'stopPropagation']);
    component.toggle(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.isOpen).toBeTrue();

    component.entries = [{ statusId: 'ORDER_CREATED' }];
    component.toggle(event);
    expect(component.isOpen).toBeFalse();
    component.toggle(event);
    expect(component.isOpen).toBeTrue();
  });

  it('closes on escape and tracks rows by index', () => {
    component.entries = [{ statusId: 'ORDER_CREATED', reason: null }];
    component.isOpen = true;

    expect(component.showReasonColumn).toBeFalse();
    expect(component.trackByIndex(3)).toBe(3);

    component.handleEscape();

    expect(component.isOpen).toBeFalse();
  });

  it('closes when clicking outside the component', () => {
    component.entries = [{ statusId: 'ORDER_CREATED' }];
    component.isOpen = true;
    fixture.detectChanges();

    const event = new MouseEvent('click');
    Object.defineProperty(event, 'target', { value: document.body });

    component.handleDocumentClick(event);

    expect(component.isOpen).toBeFalse();
  });

  it('keeps the panel open when clicking inside the component', () => {
    component.entries = [{ statusId: 'ORDER_CREATED' }];
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('.status-history') as HTMLElement;
    component.isOpen = true;

    host.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(component.isOpen).toBeTrue();
  });
});
