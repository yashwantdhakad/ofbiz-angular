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
import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CompanyService } from '../company/company.service';

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private latestSnapshot: RouterStateSnapshot | null = null;

  constructor(
    private readonly title: Title,
    private readonly translate: TranslateService,
    private readonly companyService: CompanyService
  ) {
    super();
    this.translate.onLangChange.subscribe(() => {
      if (this.latestSnapshot) {
        this.refresh(this.latestSnapshot);
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.latestSnapshot = snapshot;
    const routeTitle = this.buildTitle(snapshot);
    const translatedRouteTitle = this.translateKey(routeTitle);
    const companyName = (this.companyService.contextSignal()?.companyName || 'Ng ERP').trim() || 'Ng ERP';
    const nextTitle = translatedRouteTitle ? `${translatedRouteTitle} | ${companyName}` : companyName;
    this.title.setTitle(nextTitle);
  }

  refresh(snapshot: RouterStateSnapshot): void {
    this.updateTitle(snapshot);
  }

  private translateKey(value: string | undefined): string {
    const normalized = (value || '').trim();
    if (!normalized) {
      return '';
    }
    const translated = this.translate.instant(normalized);
    return translated && translated !== normalized ? translated : normalized;
  }
}
