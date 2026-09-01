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
import { CustomControlItem } from '@superset-ui/chart-controls';
import { ReactNode } from 'react';
import {
  Checkbox,
  FormItem,
  InfoTooltip,
  Tooltip,
  type FormInstance,
} from '@superset-ui/core/components';
import { t } from '@apache-superset/core/translation';
import {
  Filter,
  ChartCustomization,
  getChartControlPanelRegistry,
} from '@superset-ui/core';
import { styled } from '@apache-superset/core/theme';
import {
  doesColumnMatchFilterType,
  getControlItems,
  setNativeFilterFieldValues,
} from './utils';
import { NativeFiltersForm, NativeFiltersFormItem } from '../types';
import {
  StyledFormItem,
  StyledLabel,
  StyledRowFormItem,
} from './FiltersConfigForm';
import { ColumnSelect } from './ColumnSelect';

export interface ControlItemsProps {
  expanded: boolean;
  datasetId: number;
  disabled: boolean;
  forceUpdate: Function;
  formChanged: Function;
  form: FormInstance<NativeFiltersForm>;
  filterId: string;
  filterType: string;
  filterToEdit?: Filter;
  customizationToEdit?: ChartCustomization;
  formFilter?: NativeFiltersFormItem;
  removed?: boolean;
}

const CleanFormItem = styled(FormItem)`
  margin-bottom: 0;
`;

const LabelColumnFormItem = styled(FormItem)`
  width: 100%;
`;

export default function getControlItemsMap({
  expanded,
  datasetId,
  disabled,
  forceUpdate,
  formChanged,
  form,
  filterId,
  filterType,
  filterToEdit,
  customizationToEdit,
  formFilter,
  removed,
}: ControlItemsProps) {
  const controlPanelRegistry = getChartControlPanelRegistry();
  const controlItems =
    getControlItems(controlPanelRegistry.get(filterType)) ?? [];
  const mapControlItems: Record<
    string,
    { element: ReactNode; checked: boolean }
  > = {};
  const mapMainControlItems: Record<
    string,
    { element: ReactNode; checked: boolean }
  > = {};

  controlItems
    .filter(
      (mainControlItem: CustomControlItem) =>
        mainControlItem?.name === 'groupby' ||
        mainControlItem?.name === 'labelColumn',
    )
    .forEach(mainControlItem => {
      const isLabelColumn = mainControlItem.name === 'labelColumn';
      const initialValue =
        filterToEdit?.controlValues?.[mainControlItem.name] ??
        customizationToEdit?.controlValues?.[mainControlItem.name] ??
        mainControlItem?.config?.default;
      const initColumn = isLabelColumn
        ? (filterToEdit?.controlValues?.labelColumn ??
          customizationToEdit?.controlValues?.labelColumn)
        : (customizationToEdit?.targets?.[0]?.column?.name ??
          filterToEdit?.targets?.[0]?.column?.name);
      const fieldName = isLabelColumn
        ? ['filters', filterId, 'controlValues', 'labelColumn']
        : ['filters', filterId, 'column'];

      const FormItemComponent = isLabelColumn ? LabelColumnFormItem : StyledFormItem;

      const element = (
        <>
          <CleanFormItem
            name={['filters', filterId, 'requiredFirst', mainControlItem.name]}
            hidden
            initialValue={
              mainControlItem?.config?.requiredFirst &&
              filterToEdit?.requiredFirst
            }
          />
          <FormItemComponent
            expanded={expanded}
            // don't show the column select unless we have a dataset
            name={fieldName}
            initialValue={initColumn}
            label={
              <StyledLabel>
                {mainControlItem.config?.label ||
                  (isLabelColumn ? t('Label column') : t('Value column'))}&nbsp;
                {mainControlItem.config?.description && (
                  <InfoTooltip
                    placement="top"
                    tooltip={mainControlItem.config.description}
                  />
                )}
              </StyledLabel>
            }
            rules={[
              {
                required: mainControlItem.config?.required && !removed, // TODO: need to move ColumnSelect settings to controlPanel for all filters
                message: t('Value column is required'),
              },
            ]}
            data-test={isLabelColumn ? 'label-column-input' : 'field-input'}
          >
            <ColumnSelect
              allowClear={isLabelColumn}
              mode={mainControlItem.config?.multiple && 'multiple'}
              form={form}
              formField={
                isLabelColumn
                  ? ['controlValues', 'labelColumn']
                  : 'column'
              }
              filterId={filterId}
              datasetId={datasetId}
              filterValues={column =>
                doesColumnMatchFilterType(
                  formFilter?.filterType || '',
                  column,
                ) && !!column?.filterable
              }
              onChange={val => {
                // We need reset default value when column changed
                if (isLabelColumn) {
                  const currentControlValues =
                    form.getFieldValue('filters')?.[filterId]?.controlValues || {};
                  setNativeFilterFieldValues(form, filterId, {
                    controlValues: {
                      ...currentControlValues,
                      labelColumn: val || null,
                    },
                    defaultDataMask: null,
                  });
                } else {
                  setNativeFilterFieldValues(form, filterId, {
                    defaultDataMask: null,
                  });
                }
                forceUpdate();
                formChanged();
              }}
            />
          </FormItemComponent>
        </>
      );
      mapMainControlItems[mainControlItem.name] = {
        element,
        checked: initialValue,
      };
    });
  controlItems
    .filter(
      (controlItem: CustomControlItem) =>
        controlItem?.config?.renderTrigger &&
        controlItem.name !== 'sortAscending' &&
        controlItem.name !== 'enableSingleValue' &&
        controlItem.name !== 'labelColumn',
    )
    .forEach(controlItem => {
      const initialValue =
        filterToEdit?.controlValues?.[controlItem.name] ??
        customizationToEdit?.controlValues?.[controlItem.name] ??
        controlItem?.config?.default;
      const element = (
        <>
          <CleanFormItem
            name={['filters', filterId, 'requiredFirst', controlItem.name]}
            hidden
            initialValue={
              controlItem?.config?.requiredFirst && filterToEdit?.requiredFirst
            }
          />
          <Tooltip
            key={controlItem.name}
            placement="left"
            title={
              controlItem.config.affectsDataMask &&
              disabled &&
              t('Populate "Default value" to enable this control')
            }
          >
            <StyledRowFormItem
              expanded={expanded}
              key={controlItem.name}
              name={['filters', filterId, 'controlValues', controlItem.name]}
              initialValue={initialValue}
              valuePropName="checked"
              colon={false}
            >
              <Checkbox
                disabled={controlItem.config.affectsDataMask && disabled}
                onChange={checked => {
                  if (controlItem.config.requiredFirst) {
                    setNativeFilterFieldValues(form, filterId, {
                      requiredFirst: {
                        ...formFilter?.requiredFirst,
                        [controlItem.name]: checked,
                      },
                    });
                  }
                  if (controlItem.config.resetConfig) {
                    setNativeFilterFieldValues(form, filterId, {
                      defaultDataMask: null,
                    });
                  }
                  formChanged();
                  forceUpdate();
                }}
              >
                <>
                  {controlItem.config.label}&nbsp;
                  {controlItem.config.description && (
                    <InfoTooltip
                      placement="top"
                      tooltip={controlItem.config.description}
                    />
                  )}
                </>
              </Checkbox>
            </StyledRowFormItem>
          </Tooltip>
        </>
      );
      mapControlItems[controlItem.name] = { element, checked: initialValue };
    });
  return {
    controlItems: mapControlItems,
    mainControlItems: mapMainControlItems,
  };
}
