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
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { SecurityStore } from '@ofbiz/services/common/security.store';

@Directive({
  standalone: false,
  selector: '[hasPermission]',
})
export class HasPermissionDirective {
  private requiredPermissions: string[] = [];

  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  @Input()
  set hasPermission(permission: string | string[] | null | undefined) {
    if (Array.isArray(permission)) {
      this.requiredPermissions = permission;
    } else if (typeof permission === 'string' && permission.trim().length > 0) {
      this.requiredPermissions = [permission];
    } else {
      this.requiredPermissions = [];
    }
    this.updateView();
  }

  private updateView(): void {
    this.viewContainer.clear();
    if (this.authService.hasAnyPermission(this.requiredPermissions)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}

/**
 * *appCanManage="'WMS'" — shows the element only when the user has MANAGE
 * access to the given ERP feature area. When enforcement is off, always shows.
 */
@Directive({
  standalone: false,
  selector: '[appCanManage]',
})
export class AppCanManageDirective {
  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private securityStore: SecurityStore
  ) {}

  @Input()
  set appCanManage(feature: string | null | undefined) {
    this.viewContainer.clear();
    if (this.securityStore.canManage(feature)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}

/**
 * *appCanApprove="'ACCT'" — shows the element only when the user has APPROVE
 * access to the given ERP feature area. When enforcement is off, always shows.
 */
@Directive({
  standalone: false,
  selector: '[appCanApprove]',
})
export class AppCanApproveDirective {
  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private securityStore: SecurityStore
  ) {}

  @Input()
  set appCanApprove(feature: string | null | undefined) {
    this.viewContainer.clear();
    if (this.securityStore.canApprove(feature)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
