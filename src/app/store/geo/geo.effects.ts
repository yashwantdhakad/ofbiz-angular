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
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import * as GeoActions from './geo.actions'; // Make sure this path is correct
import { CommonService } from '../../services/common/common.service'; // Adjust path if needed
import { GeoRecord } from './geo.state';

@Injectable()
export class GeoEffects {
  constructor(
    private actions$: Actions,
    private commonService: CommonService
  ) { }

  loadGeos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GeoActions.loadGeos),
      switchMap(() =>
        this.commonService.getLookupResults({}, 'geo').pipe(
          map((geos: GeoRecord[]) => GeoActions.loadGeosSuccess({ geos })),
          catchError((error: any) =>
            of(GeoActions.loadGeosFailure({ error: error.message || 'Unknown error' }))
          )
        )
      )
    )
  );
}
