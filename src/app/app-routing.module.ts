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
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { homeGuardFn } from './home.guard';
import { permissionGuardFn } from './permission.guard';
import { subscriptionGuardFn } from './subscription.guard';

const routes: Routes = [
  {
    path: 'home',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadComponent: () => import('./components/home/home.component').then((m) => m.HomeComponent),
    data: { title: 'MENU.HOME' }
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent),
    data: { title: 'LOGIN_TITLE' }
  },
  {
    path: 'change-password',
    canActivate: [homeGuardFn],
    loadComponent: () => import('./components/login/change-password/change-password.component').then((m) => m.ChangePasswordComponent),
    data: { title: 'CHANGE_PASSWORD.TITLE' }
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./components/forbidden/forbidden.component').then((m) => m.ForbiddenComponent),
    data: { title: 'FORBIDDEN.TITLE' }
  },
  {
    path: 'about',
    loadComponent: () => import('./components/about/about.component').then((m) => m.AboutComponent),
    data: { title: 'APP.TITLE' }
  },
  {
    path: 'company',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/company/company.module').then((m) => m.CompanyModule),
  },
  {
    path: 'customers',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/customer/customer.module').then((m) => m.CustomerModule),
  },
  {
    path: 'crm',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/crm/crm.module').then((m) => m.CrmModule),
  },
  {
    path: 'suppliers',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/supplier/supplier.module').then((m) => m.SupplierModule),
  },
  {
    path: 'users',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/user/user.module').then((m) => m.UserModule),
  },
  {
    path: 'products',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/product/product.module').then((m) => m.ProductModule),
  },
  {
    path: 'features',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/feature/feature.module').then((m) => m.FeatureModule),
  },
  // {
  //   path: 'featuregroups',
  //   loadChildren: () =>
  //     import('./components/featuregroup/featuregroup.module').then((m) => m.FeaturegroupModule),
  // },
  {
    path: 'category',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/category/category.module').then((m) => m.CategoryModule),
  },
  {
    path: 'orders',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/so/so.module').then((m) => m.SOModule),
  },
  {
    path: 'quotes',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/quote/quote.module').then((m) => m.QuoteModule),
  },
  {
    path: 'pos',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/po/po.module').then((m) => m.POModule),
  },
  {
    path: 'shipments',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/shipment/shipment.module').then((m) => m.ShipmentModule),
  },
  {
    path: 'invoices',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/invoice/invoice.module').then((m) => m.InvoiceModule),
  },
  {
    path: 'finance',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/finance/finance.module').then((m) => m.FinanceModule),
  },
  {
    path: 'payments',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/payment/payment.module').then((m) => m.PaymentModule),
  },
  {
    path: 'system',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/system/system.module').then((m) => m.SystemModule),
  },
  {
    path: 'assets',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/asset/asset.module').then((m) => m.AssetModule),
  },
  {
    path: 'fixed-assets',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/fixed-asset/fixed-asset.module').then((m) => m.FixedAssetModule),
  },
  {
    path: 'facilities',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/facility/facility.module').then((m) => m.FacilityModule),
  },
  {
    path: 'jobs',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/manufacturing/manufacturing.module').then((m) => m.ManufacturingModule),
  },
  {
    path: 'boms',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/manufacturing/bom/bom.module').then((m) => m.BomModule),
  },
  {
    path: 'routings',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/manufacturing/routing/routing.module').then((m) => m.RoutingModule),
  },
  {
    path: 'operations',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/manufacturing/operation/operation.module').then((m) => m.OperationModule),
  },
  {
    path: 'lots',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/lot/lot.module').then((m) => m.LotModule),
  },
  {
    path: 'picklists',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/picklist/picklist.module').then((m) => m.PicklistModule),
  },
  {
    path: 'data-exchange',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/data-exchange/data-exchange.module').then((m) => m.DataExchangeModule),
  },
  {
    path: 'async-services',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/async-service/async-service.module').then((m) => m.AsyncServiceModule),
  },
  {
    path: 'cycle-count',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/cycle-count/cycle-count.module').then((m) => m.CycleCountModule),
  },
  {
    path: 'replenishment',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/replenishment/replenishment.module').then((m) => m.ReplenishmentModule),
  },
  {
    path: 'requirements',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/requirement/requirement.module').then((m) => m.RequirementModule),
  },
  {
    path: 'timesheets',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/timesheet/timesheet.module').then((m) => m.TimesheetModule),
  },
  {
    path: 'projects',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/project/project.module').then((m) => m.ProjectModule),
  },
  {
    path: 'returns',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/returns/returns.module').then((m) => m.ReturnsModule),
  },
  {
    path: 'reports',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadComponent: () =>
      import('./components/report/report-dashboard/report-dashboard.component').then((m) => m.ReportDashboardComponent),
    data: { title: 'REPORTS.TITLE' },
  },
  {
    path: 'reports/cashflow-forecast',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadComponent: () =>
      import('./components/report/cashflow-forecast/cashflow-forecast.component').then((m) => m.CashflowForecastComponent),
    data: { title: 'REPORTS.CASHFLOW_FORECAST_TITLE' },
  },
  {
    path: 'reports/vendor-performance',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadComponent: () =>
      import('./components/report/vendor-performance/vendor-performance.component').then((m) => m.VendorPerformanceComponent),
    data: { title: 'REPORTS.VENDOR_PERFORMANCE_TITLE' },
  },
  {
    path: 'reports/trial-balance',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadComponent: () =>
      import('./components/report/trial-balance-report/trial-balance-report.component').then((m) => m.TrialBalanceReportComponent),
    data: { title: 'REPORTS.TRIAL_BALANCE_TITLE' },
  },
  {
    path: 'finance/trial-balance',
    redirectTo: 'reports/trial-balance',
    pathMatch: 'full',
  },
  {
    path: 'transfers',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/transfer/transfer.module').then((m) => m.TransferModule),
  },
  {
    path: 'support',
    canActivate: [homeGuardFn, subscriptionGuardFn, permissionGuardFn],
    loadChildren: () =>
      import('./components/support/support.module').then((m) => m.SupportModule),
  },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
