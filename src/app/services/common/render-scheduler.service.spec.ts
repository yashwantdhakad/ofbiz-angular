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
import { RenderSchedulerService } from './render-scheduler.service';

describe('RenderSchedulerService', () => {
  let service: RenderSchedulerService;

  beforeEach(() => {
    service = new RenderSchedulerService();
  });

  it('defers work with queueMicrotask when available', (done) => {
    const originalQueueMicrotask = globalThis.queueMicrotask;
    const queueSpy = jasmine.createSpy('queueMicrotask').and.callFake((task: VoidFunction) => task());
    (globalThis as any).queueMicrotask = queueSpy;

    service.defer(() => {
      expect(queueSpy).toHaveBeenCalled();
      (globalThis as any).queueMicrotask = originalQueueMicrotask;
      done();
    });
  });

  it('falls back to Promise resolution when queueMicrotask is unavailable', (done) => {
    const originalQueueMicrotask = globalThis.queueMicrotask;
    (globalThis as any).queueMicrotask = undefined;
    const task = jasmine.createSpy('task');

    service.defer(() => {
      task();
      expect(task).toHaveBeenCalled();
      (globalThis as any).queueMicrotask = originalQueueMicrotask;
      done();
    });
  });

  it('marks for check and detects changes through deferred callbacks', (done) => {
    const cdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck', 'detectChanges']);
    let completed = 0;

    const finish = () => {
      completed += 1;
      if (completed === 2) {
        expect(cdr.markForCheck).toHaveBeenCalled();
        expect(cdr.detectChanges).toHaveBeenCalled();
        done();
      }
    };

    service.markForCheck(cdr as any);
    service.detectChanges(cdr as any);

    setTimeout(finish, 0);
    setTimeout(finish, 0);
  });

  it('defers macrotasks with setTimeout', () => {
    const timeoutSpy = spyOn(window, 'setTimeout').and.callFake(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as any);
    const task = jasmine.createSpy('task');

    service.deferMacrotask(task);

    expect(timeoutSpy).toHaveBeenCalled();
    expect(task).toHaveBeenCalled();
  });
});
