/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { buildExtraJsonObject } from './index';

test('buildExtraJsonObject preserves hidden_from_drill from column', () => {
  const result = JSON.parse(
    buildExtraJsonObject({
      id: 1,
      column_name: 'customer_id',
      type: 'INTEGER',
      filterable: true,
      groupby: true,
      is_active: true,
      is_dttm: false,
      extra: '{"hidden_from_drill": true, "custom_key": "keep-me"}',
      hidden_from_drill: false,
    }),
  );

  expect(result.hidden_from_drill).toBe(false);
  expect(result.custom_key).toBe('keep-me');
});

test('buildExtraJsonObject keeps existing hidden_from_drill when not flattened', () => {
  const result = JSON.parse(
    buildExtraJsonObject({
      id: 1,
      column_name: 'customer_id',
      type: 'INTEGER',
      filterable: true,
      groupby: true,
      is_active: true,
      is_dttm: false,
      extra: '{"hidden_from_drill": true}',
    }),
  );

  expect(result.hidden_from_drill).toBe(true);
});
