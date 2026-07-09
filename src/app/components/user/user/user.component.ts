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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatSort, Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '@ofbiz/services/common/auth.service';
import { SnackbarService } from '@ofbiz/services/common/snackbar.service';
import { UserService } from '@ofbiz/services/security/user.service';
import { UserListItem, UserListResponse } from '@ofbiz/models/user.model';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserComponent implements OnInit {
  @ViewChild(MatSort) sort?: MatSort;

  isLoading = signal<boolean>(false);
  queryString = '';
  searchControl = new FormControl('');
  pagination = {
    page: 1,
    rowsPerPage: 10,
  };
  items = signal<UserListItem[]>([]);
  pages = signal<number>(0);
  currentSort?: Sort;

  userColumns = [
    { key: 'userLoginId', header: 'USER.ID' },
    { key: 'name', header: 'USER.NAME' },
    { key: 'partyId', header: 'USER.PARTY_ID' },
    { key: 'enabled', header: 'USER.STATUS' },
    { key: 'roles', header: 'USER.ROLES' },
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private snackbarService: SnackbarService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        map((value) => (value ?? '').toString()),
        debounceTime(300),
        distinctUntilChanged(),
        tap((value) => {
          this.queryString = value;
          this.pagination.page = 1;
        }),
        switchMap((value) =>
          this.userService.listUsers(
            0,
            value,
            this.currentSort?.active,
            this.currentSort?.direction
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: UserListResponse) => {
          const { resultList, documentListCount } = response || {};
          this.items.set(Array.isArray(resultList) ? resultList : []);
          this.pages.set(documentListCount ?? 0);
        },
        error: () => {
          this.items.set([]);
          this.pages.set(0);
          this.snackbarService.showError(this.translate.instant('USER.FETCH_ERROR'));
        },
      });

    this.getUsers(1, '');
  }

  onPageChange(pageIndex: number): void {
    const page = pageIndex + 1;
    this.pagination.page = page;
    this.getUsers(page, this.queryString);
  }

  onSortChange(sort: Sort): void {
    let direction = sort.direction;
    if (!direction) {
      if (this.currentSort?.active === sort.active) {
        direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        direction = 'asc';
      }
    } else if (this.currentSort?.active === sort.active && this.currentSort.direction === direction) {
      direction = direction === 'asc' ? 'desc' : 'asc';
    }
    this.currentSort = { active: sort.active, direction };
    if (this.sort) {
      this.sort.active = sort.active;
      this.sort.direction = direction;
    }
    this.getUsers(this.pagination.page, this.queryString);
  }

  getUserColumnKeys(): string[] {
    return this.userColumns.map((col) => col.key);
  }

  getValue(element: UserListItem, key: string): unknown {
    if (key === 'roles') {
      return this.formatRoles((element as Record<string, unknown>)?.['roles'] as import('@ofbiz/models/user.model').UserRole[]);
    }
    if (key === 'name') {
      return [element.firstName, element.lastName].filter(Boolean).join(' ').trim();
    }
    return key.split('.').reduce((acc: unknown, part) => acc && (acc as Record<string, unknown>)[part], element);
  }

  private formatRoles(roles: import('@ofbiz/models/user.model').UserRole[] | undefined): string {
    if (!Array.isArray(roles)) {
      return '';
    }
    return roles
      .map((role) => role?.groupName || role?.groupId)
      .filter(Boolean)
      .join(', ');
  }

  private getUsers(page: number, query: string): void {
    this.isLoading.set(true);
    this.userService
      .listUsers(page - 1, query, this.currentSort?.active, this.currentSort?.direction)
      .subscribe({
        next: (response: UserListResponse) => {
          const { resultList, documentListCount } = response || {};
          this.items.set(Array.isArray(resultList) ? resultList : []);
          this.pages.set(documentListCount ?? 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.pages.set(0);
          this.snackbarService.showError(this.translate.instant('USER.FETCH_ERROR'));
          this.isLoading.set(false);
        },
      });
  }

  trackByUserColumn = (_: number, column: { key: string }): string => column.key;

  trackByUserRow = (_: number, item: UserListItem): string | number => item?.userLoginId ?? _;
}
