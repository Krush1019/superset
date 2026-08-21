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
import { css, styled } from '@apache-superset/core/theme';
import { t } from '@apache-superset/core/translation';
import { isDefined, QueryData } from '@superset-ui/core';
import Tabs from '@superset-ui/core/components/Tabs';
import { SingleQueryResultPane } from 'src/explore/components/DataTablesPane/components/SingleQueryResultPane';

const ResultContainer = styled.div`
  ${() => css`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  `}
`;

export const useResultsTableView = (
  chartDataResult: QueryData[] | undefined,
  datasourceId: string,
  canDownload: boolean,
  hiddenColumns?: string[],
) => {
  const hiddenColumnSet = new Set(hiddenColumns || []);

  const filterQueryResult = (res: QueryData): QueryData => {
    const colnames = (res.colnames ?? []) as string[];
    const coltypes = res.coltypes ?? [];
    const visibleIndexes = colnames
      .map((name: string, index: number) => ({ name, index }))
      .filter(({ name }) => !hiddenColumnSet.has(name))
      .map(({ index }) => index);
    return {
      ...res,
      colnames: visibleIndexes.map((i: number) => colnames[i]),
      coltypes: visibleIndexes.map((i: number) => coltypes[i]),
    };
  };

  if (!isDefined(chartDataResult)) {
    return <div />;
  }
  if (chartDataResult.length === 1) {
    const filtered = filterQueryResult(chartDataResult[0]);
    return (
      <ResultContainer data-test="drill-by-results-table">
        <SingleQueryResultPane
          colnames={filtered.colnames}
          coltypes={filtered.coltypes}
          rowcount={filtered.sql_rowcount}
          data={filtered.data}
          datasourceId={datasourceId}
          isVisible
          canDownload={canDownload}
        />
      </ResultContainer>
    );
  }
  return (
    <Tabs
      defaultActiveKey="result-tab-0"
      items={chartDataResult.map((res, index) => {
        const filtered = filterQueryResult(res);
        return {
          key: `result-tab-${index}`,
          label: t('Results %s', index + 1),
          children: (
            <ResultContainer>
              <SingleQueryResultPane
                colnames={filtered.colnames}
                coltypes={filtered.coltypes}
                data={filtered.data}
                rowcount={filtered.sql_rowcount}
                datasourceId={datasourceId}
                isVisible
                canDownload={canDownload}
              />
            </ResultContainer>
          ),
        };
      })}
    />
  );
};
