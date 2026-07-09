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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ReportChartGridComponent } from './report-chart-grid.component';

describe('ReportChartGridComponent', () => {
  let component: ReportChartGridComponent;
  let fixture: ComponentFixture<ReportChartGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportChartGridComponent, TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportChartGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should track by label correctly with priority of fields', () => {
    expect(component.trackByLabel(0, { bucketDate: '2026-06-01' })).toBe('2026-06-01');
    expect(component.trackByLabel(1, { productId: 'P-100' })).toBe('P-100');
    expect(component.trackByLabel(2, { facilityId: 'FAC-1' })).toBe('FAC-1');
    expect(component.trackByLabel(3, { supplierPartyId: 'SUP-1' })).toBe('SUP-1');
    expect(component.trackByLabel(4, null)).toBe('4');
  });

  it('should format amount as locale string with 2 decimal places', () => {
    expect(component.formatAmount(1234.5)).toContain('1,234.50');
    expect(component.formatAmount(null)).toContain('0.00');
    expect(component.formatAmount(undefined)).toContain('0.00');
  });

  it('should format number with maximum fraction digits', () => {
    expect(component.formatNumber(123.456, 2)).toContain('123.46');
    expect(component.formatNumber(null)).toBe('0');
  });

  it('should calculate barWidth percentage based on maxValue', () => {
    expect(component.barWidth(50, 100)).toBe('50%');
    expect(component.barWidth(0, 100)).toBe('0%');
    expect(component.barWidth(50, 0)).toBe('0%');
    expect(component.barWidth(2, 100)).toBe('8%'); // Math.max(8, value)
  });

  it('should find the max value of a field in an items array', () => {
    const items = [
      { score: 10 },
      { score: 85 },
      { score: 45 }
    ];
    expect(component.maxValue(items, 'score')).toBe(85);
    expect(component.maxValue([], 'score')).toBe(0);
  });
});
