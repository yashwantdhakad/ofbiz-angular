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
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TitleStrategy } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { DatePipe } from '@angular/common';

import { AppShellCoreMaterialModule } from './components/common/material/app-shell-core-material.module';

import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { SnackbarService } from './services/common/snackbar.service';
import { EnumEffects } from './store/enum/enum.effects';
import { enumReducer } from './store/enum/enum.reducer';
import { GeoEffects } from './store/geo/geo.effects';
import { geoReducer } from './store/geo/geo.reducer';

import { AuthService } from './services/common/auth.service';
import { apiLatencyInterceptorFn } from './services/common/api-latency.interceptor';
import { lookupCacheInterceptorFn } from './services/common/lookup-cache.interceptor';
import { tokenInterceptorFn } from './services/common/token.interceptor';
import { AppTitleStrategy } from './services/common/app-title.strategy';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    AppShellCoreMaterialModule,
    AppRoutingModule,
    StoreModule.forRoot({ geo: geoReducer, enum: enumReducer }),
    EffectsModule.forRoot([GeoEffects, EnumEffects]),
  ],
  providers: [
    AuthService,
    DatePipe,
    SnackbarService,
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    { provide: AppTitleStrategy, useExisting: TitleStrategy },
    provideHttpClient(withInterceptors([tokenInterceptorFn, apiLatencyInterceptorFn, lookupCacheInterceptorFn])),
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
