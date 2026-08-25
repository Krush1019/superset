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
import { GenericDataType } from '@apache-superset/core/common';
import { css, useTheme } from '@apache-superset/core/theme';
import { t } from '@apache-superset/core/translation';
import {
  BinaryQueryObjectFilterClause,
  DatasourceType,
  ensureIsArray,
  JsonObject,
  QueryFormData,
  safeHtmlSpan,
} from '@superset-ui/core';
import { EmptyState, Loading } from '@superset-ui/core/components';
import Table, {
  ColumnsType,
  TableSize,
} from '@superset-ui/core/components/Table';
import BooleanCell from '@superset-ui/core/components/Table/cell-renderers/BooleanCell';
import NullCell from '@superset-ui/core/components/Table/cell-renderers/NullCell';
import TimeCell from '@superset-ui/core/components/Table/cell-renderers/TimeCell';
import HeaderWithRadioGroup from '@superset-ui/core/components/Table/header-renderers/HeaderWithRadioGroup';
import {
  cloneElement,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useResizeDetector } from 'react-resize-detector';
import { getDatasourceSamples } from 'src/components/Chart/chartAction';
import { RootState } from 'src/dashboard/types';
import { useDatasetMetadataBar } from 'src/features/datasets/metadataBar/useDatasetMetadataBar';
import { Dataset } from '../types';
import TableControls from './DrillDetailTableControls';
import { ResultsPage } from './types';
import { getDrillPayload } from './utils';

const PAGE_SIZE = 50;
// Used until the modal body has a measured height. Avoids rendering the table
// at unbounded content height (which causes a visible grow-then-shrink).
const TABLE_HEIGHT_FALLBACK = 400;

interface DataType {
  [key: string]: any;
}

// Must be outside of the main component due to problems in
// react-resize-detector with conditional rendering
// https://github.com/maslianok/react-resize-detector/issues/178
function Resizable({ children }: { children: ReactElement }) {
  const { ref, height } = useResizeDetector({
    handleWidth: false,
  });
  const tableHeight = height && height > 0 ? height : TABLE_HEIGHT_FALLBACK;

  return (
    <div
      ref={ref}
      css={css`
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      `}
    >
      {cloneElement(children, { height: tableHeight })}
    </div>
  );
}

enum TimeFormatting {
  Original,
  Formatted,
}

export default function DrillDetailPane({
  formData,
  initialFilters,
  dataset,
}: {
  formData: QueryFormData;
  initialFilters: BinaryQueryObjectFilterClause[];
  dataset?: Dataset;
}) {
  const theme = useTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const lastPageIndex = useRef(pageIndex);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [responseError, setResponseError] = useState('');
  const [resultsPages, setResultsPages] = useState<Map<number, ResultsPage>>(
    new Map(),
  );
  const [timeFormatting, setTimeFormatting] = useState<
    Record<string, TimeFormatting>
  >({});

  const dashboardId = useSelector<RootState, number>(
    ({ dashboardInfo }) => dashboardInfo.id,
  );

  const SAMPLES_ROW_LIMIT = useSelector(
    (state: { common: { conf: JsonObject } }) =>
      state.common.conf.SAMPLES_ROW_LIMIT,
  );

  // Extract datasource ID/type from string ID
  const [datasourceId, datasourceType] = useMemo(
    () => formData.datasource.split('__'),
    [formData.datasource],
  );

  const { metadataBar: metadataBarComponent } = useDatasetMetadataBar({
    dataset,
  });

  // Get page of results
  const resultsPage = useMemo(() => {
    const nextResultsPage = resultsPages.get(pageIndex);
    if (nextResultsPage) {
      lastPageIndex.current = pageIndex;
      return nextResultsPage;
    }

    return resultsPages.get(lastPageIndex.current);
  }, [pageIndex, resultsPages]);

  const hiddenColumns = useMemo(
    () => new Set(ensureIsArray(dataset?.hidden_columns)),
    [dataset?.hidden_columns],
  );

  const allowHTML = formData.allow_render_html ?? true;

  const mappedColumns: ColumnsType<DataType> = useMemo(
    () =>
      resultsPage?.colNames
        .map((column, index) => ({ column, index }))
        .filter(({ column }) => !hiddenColumns.has(column))
        .map(({ column, index }) => {
          const isTemporal =
            resultsPage?.colTypes[index] === GenericDataType.Temporal;
          const headerLabel = dataset?.verbose_map?.[column] || column;

          return {
            key: column,
            dataIndex: column,
            ellipsis: true,
            title: isTemporal ? (
              <HeaderWithRadioGroup
                headerTitle={headerLabel}
                groupTitle={t('Formatting')}
                groupOptions={[
                  {
                    label: t('Original value'),
                    value: TimeFormatting.Original,
                  },
                  {
                    label: t('Formatted value'),
                    value: TimeFormatting.Formatted,
                  },
                ]}
                value={
                  timeFormatting[column] === TimeFormatting.Original
                    ? TimeFormatting.Original
                    : TimeFormatting.Formatted
                }
                onChange={value =>
                  setTimeFormatting(state => ({
                    ...state,
                    [column]: parseInt(value, 10) as TimeFormatting,
                  }))
                }
              />
            ) : (
              headerLabel
            ),
            render: (value: unknown) => {
              if (value === true || value === false) {
                return <BooleanCell value={value} />;
              }
              if (value === null) {
                return <NullCell />;
              }
              if (
                isTemporal &&
                timeFormatting[column] !== TimeFormatting.Original &&
                (typeof value === 'number' || value instanceof Date)
              ) {
                return <TimeCell value={value} />;
              }
              if (typeof value === 'string' && allowHTML) {
                return safeHtmlSpan(value);
              }
              return String(value);
            },
            // Temporal headers include a settings control; give them more room.
            width: isTemporal ? 200 : 150,
          };
        }) || [],
    [
      resultsPage?.colNames,
      resultsPage?.colTypes,
      timeFormatting,
      dataset?.verbose_map,
      hiddenColumns,
      allowHTML,
    ],
  );

  const data: DataType[] = useMemo(
    () =>
      resultsPage?.data.map((row, index) =>
        resultsPage?.colNames.reduce(
          (acc, curr) => ({ ...acc, [curr]: row[curr] }),
          {
            key: index,
          },
        ),
      ) || [],
    [resultsPage?.colNames, resultsPage?.data],
  );

  // Clear cache on reload button click
  const handleReload = useCallback(() => {
    setResponseError('');
    setResultsPages(new Map());
    setPageIndex(0);
  }, []);

  // Clear cache and reset page index if filters change
  useEffect(() => {
    setResponseError('');
    setResultsPages(new Map());
    setPageIndex(0);
  }, [filters]);

  // Update cache order if page in cache
  useEffect(() => {
    if (
      resultsPages.has(pageIndex) &&
      [...resultsPages.keys()].at(-1) !== pageIndex
    ) {
      const nextResultsPages = new Map(resultsPages);
      nextResultsPages.delete(pageIndex);
      setResultsPages(
        nextResultsPages.set(
          pageIndex,
          resultsPages.get(pageIndex) as ResultsPage,
        ),
      );
    }
  }, [pageIndex, resultsPages]);

  // Download page of results & trim cache if page not in cache
  useEffect(() => {
    if (!responseError && !isLoading && !resultsPages.has(pageIndex)) {
      setIsLoading(true);
      const jsonPayload = getDrillPayload(formData, filters) ?? {};
      const cachePageLimit = Math.ceil(SAMPLES_ROW_LIMIT / PAGE_SIZE);
      getDatasourceSamples(
        datasourceType as DatasourceType,
        Number(datasourceId),
        false,
        jsonPayload,
        PAGE_SIZE,
        pageIndex + 1,
        dashboardId,
      )
        .then(response => {
          setResultsPages(
            new Map([
              ...[...resultsPages.entries()].slice(-cachePageLimit + 1),
              [
                pageIndex,
                {
                  total: response.total_count,
                  data: response.data,
                  colNames: ensureIsArray(response.colnames),
                  colTypes: ensureIsArray(response.coltypes),
                },
              ],
            ]),
          );
          setResponseError('');
        })
        .catch(error => {
          setResponseError(`${error.name}: ${error.message}`);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [
    SAMPLES_ROW_LIMIT,
    datasourceId,
    datasourceType,
    filters,
    formData,
    isLoading,
    pageIndex,
    responseError,
    resultsPages,
  ]);

  const bootstrapping = !responseError && !resultsPages.size;

  let tableContent = null;
  if (responseError) {
    // Render error if page download failed
    tableContent = (
      <pre
        css={css`
          margin-top: ${theme.sizeUnit * 4}px;
        `}
      >
        {responseError}
      </pre>
    );
  } else if (bootstrapping) {
    // Render loading if first page hasn't loaded
    tableContent = <Loading />;
  } else if (resultsPage?.total === 0) {
    // Render empty state if no results are returned for page
    const title = t('No rows were returned for this dataset');
    tableContent = <EmptyState image="document.svg" title={title} />;
  } else {
    // Render table if at least one page has successfully loaded.
    // Do not use `virtualize` here: VirtualTable (antd header + react-window body)
    // desyncs column headers from cells in the drill modal. PAGE_SIZE is small
    // enough for the standard table. Avoid experimental `resizable` for the same reason.
    tableContent = (
      <Resizable>
        <Table
          data={data}
          columns={mappedColumns}
          size={TableSize.Small}
          defaultPageSize={PAGE_SIZE}
          recordCount={resultsPage?.total}
          usePagination
          loading={isLoading}
          onChange={pagination =>
            setPageIndex(pagination.current ? pagination.current - 1 : 0)
          }
          sticky
        />
      </Resizable>
    );
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        height: 100%;
      `}
    >
      {!bootstrapping && metadataBarComponent}
      {!bootstrapping && (
        <TableControls
          filters={filters}
          setFilters={setFilters}
          totalCount={resultsPage?.total}
          loading={isLoading}
          onReload={handleReload}
          hiddenColumns={dataset?.hidden_columns}
        />
      )}
      {tableContent}
    </div>
  );
}
