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
export interface UserLoginInfo {
  userLoginId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled?: boolean | string;
  requirePasswordChange?: boolean;
  partyId?: string;
}

export interface UserRole {
  groupId?: string;
  groupName?: string;
}

export interface UserPermission {
  permissionId?: string;
  description?: string;
}

export interface UserDetailData {
  user?: UserLoginInfo;
  roles?: UserRole[];
  permissions?: UserPermission[];
}

export interface UserDetailResponse {
  userDetail?: UserDetailData;
}

export interface PoApprovalAssignment {
  bandId?: string;
  label?: string;
  unlimited?: boolean;
  maxAmount?: number | null;
}

export interface PoApprovalPolicy {
  enabled?: boolean;
  bands?: PoApprovalAssignment[];
}

export interface UserListItem extends UserLoginInfo {
  name?: string;
}

export interface UserListResponse {
  resultList?: UserListItem[];
  documentListCount?: number;
  totalCount?: number;
}

export interface SecurityGroup {
  groupId?: string;
  groupName?: string;
  description?: string;
}

export interface SecurityPermission {
  permissionId?: string;
  description?: string;
}

export interface UserCreatePayload {
  userLoginId?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  currentPassword?: string;
  roleIds?: string[];
  [key: string]: unknown;
}

export interface UserUpdatePayload {
  firstName?: string;
  lastName?: string;
  password?: string;
  enabled?: boolean | string;
  requirePasswordChange?: boolean;
  permissionIds?: string[];
  roleIds?: string[];
  [key: string]: unknown;
}

export interface UserAvailabilityResponse {
  available?: boolean;
}

export type ErpFeature = 'WMS' | 'ORDER' | 'MFG' | 'ACCT' | 'SECURITY';

export interface ErpFeatureAccess {
  view: boolean;
  manage: boolean;
  approve: boolean;
}

export interface SecurityFeaturesResponse {
  groups: string[];
  permissions: string[];
  features: Record<ErpFeature, ErpFeatureAccess>;
  isAdmin: boolean;
}

