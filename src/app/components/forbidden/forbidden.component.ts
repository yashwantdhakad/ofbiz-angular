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
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AppShellMaterialModule } from '../common/material/app-shell-material.module';
import { AuthService } from '@ofbiz/services/common/auth.service';

@Component({
  standalone: true,
  selector: 'app-forbidden',
  imports: [CommonModule, TranslateModule, AppShellMaterialModule],
  templateUrl: './forbidden.component.html',
  styleUrls: ['./forbidden.component.css'],
})
export class ForbiddenComponent {
  requestedUrl = '';

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService) {
    this.route.queryParamMap.subscribe((params) => {
      this.requestedUrl = params.get('from') ?? '';
    });
  }

  canGoHome(): boolean {
    return this.authService.hasPermission('MENU_HOME_VIEW');
  }

  goHome(): void {
    this.router.navigateByUrl('/home');
  }
}
