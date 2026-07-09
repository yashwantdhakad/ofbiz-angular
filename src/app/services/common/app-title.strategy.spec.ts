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
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { CompanyService } from '../company/company.service';
import { AppTitleStrategy } from './app-title.strategy';

describe('AppTitleStrategy', () => {
  let title: jasmine.SpyObj<Title>;
  let translate: jasmine.SpyObj<TranslateService> & { onLangChange: Subject<LangChangeEvent> };
  let companyService: jasmine.SpyObj<CompanyService>;
  let strategy: AppTitleStrategy;

  beforeEach(() => {
    title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    translate = Object.assign(
      jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']),
      { onLangChange: new Subject<LangChangeEvent>() }
    );
    companyService = jasmine.createSpyObj<CompanyService>('CompanyService', ['contextSignal']);
    companyService.contextSignal.and.returnValue({ companyName: ' Terrachayu Logistics ' } as any);

    strategy = new AppTitleStrategy(title, translate, companyService);
  });

  it('uses the translated route title when available', () => {
    spyOn(strategy as any, 'buildTitle').and.returnValue('COMMON.ORDERS');
    translate.instant.and.returnValue('Orders');

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(translate.instant).toHaveBeenCalledWith('COMMON.ORDERS');
    expect(title.setTitle).toHaveBeenCalledWith('Orders | Terrachayu Logistics');
  });

  it('falls back to the raw title when translation is unchanged', () => {
    spyOn(strategy as any, 'buildTitle').and.returnValue('Inventory');
    translate.instant.and.returnValue('Inventory');

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(title.setTitle).toHaveBeenCalledWith('Inventory | Terrachayu Logistics');
  });

  it('falls back to the company name when no route title exists', () => {
    spyOn(strategy as any, 'buildTitle').and.returnValue('');
    translate.instant.and.returnValue('');

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(title.setTitle).toHaveBeenCalledWith('Terrachayu Logistics');
  });

  it('uses the default app name when company name is blank', () => {
    spyOn(strategy as any, 'buildTitle').and.returnValue('');
    companyService.contextSignal.and.returnValue({ companyName: '   ' } as any);

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(title.setTitle).toHaveBeenCalledWith('Ng ERP');
  });

  it('refreshes the latest snapshot when the language changes', () => {
    const snapshot = {} as RouterStateSnapshot;
    spyOn(strategy as any, 'buildTitle').and.returnValues('COMMON.ORDERS', 'COMMON.ORDERS');
    translate.instant.and.returnValues('Orders', 'Pedidos');

    strategy.updateTitle(snapshot);
    translate.onLangChange.next({ lang: 'es', translations: {} });

    expect(title.setTitle).toHaveBeenCalledWith('Pedidos | Terrachayu Logistics');
  });
});
