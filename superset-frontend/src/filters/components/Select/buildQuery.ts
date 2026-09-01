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
import {
  buildQueryContext,
  getColumnLabel,
  isPhysicalColumn,
  QueryObject,
  QueryObjectFilterClause,
  BuildQuery,
} from '@superset-ui/core';
import { GenericDataType } from '@apache-superset/core/common';
import { DEFAULT_FORM_DATA, PluginFilterSelectQueryFormData } from './types';

const buildQuery: BuildQuery<PluginFilterSelectQueryFormData> = (
  formData: PluginFilterSelectQueryFormData,
  options,
) => {
  const { search, coltypeMap } = options?.ownState || {};
  const { sortAscending, sortMetric, labelColumn } = {
    ...DEFAULT_FORM_DATA,
    ...formData,
  };
  return buildQueryContext(formData, baseQueryObject => {
    const { columns = [], filters = [] } = baseQueryObject;
    const queryColumns = [...columns];
    if (labelColumn && !queryColumns.includes(labelColumn)) {
      queryColumns.push(labelColumn);
    }
    const extraFilters: QueryObjectFilterClause[] = [];
    if (search) {
      const searchColumns = labelColumn ? [labelColumn] : columns;
      searchColumns.filter(isPhysicalColumn).forEach(column => {
        const label = getColumnLabel(column);
        if (
          !coltypeMap ||
          coltypeMap[label] === undefined ||
          coltypeMap[label] === GenericDataType.String ||
          (coltypeMap[label] === GenericDataType.Numeric &&
            !Number.isNaN(Number(search)))
        ) {
          extraFilters.push({
            col: column,
            op: 'ILIKE',
            val: `%${search}%`,
          });
        }
      });
    }

    const sortColumns = sortMetric
      ? [sortMetric]
      : labelColumn
        ? [labelColumn]
        : queryColumns;
    const query: QueryObject[] = [
      {
        ...baseQueryObject,
        columns: queryColumns,
        metrics: sortMetric ? [sortMetric] : [],
        filters: filters.concat(extraFilters),
        orderby:
          sortMetric || sortAscending !== undefined
            ? sortColumns.map(column => [column, !!sortAscending])
            : [],
      },
    ];
    return query;
  });
};

export default buildQuery;
