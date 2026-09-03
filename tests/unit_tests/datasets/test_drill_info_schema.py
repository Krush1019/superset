# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from superset.datasets.schemas import DatasetDrillInfoSchema


def test_dataset_drill_info_schema_filters_hidden_columns() -> None:
    dataset = SimpleNamespace(
        id=1,
        table_name="orders",
        owners=[],
        created_by=None,
        created_on_humanized=None,
        changed_by=None,
        changed_on_humanized=None,
        columns=[
            SimpleNamespace(
                column_name="category",
                verbose_name="Category",
                groupby=True,
                hidden_from_drill=False,
            ),
            SimpleNamespace(
                column_name="customer_id",
                verbose_name=None,
                groupby=True,
                hidden_from_drill=True,
            ),
            SimpleNamespace(
                column_name="order_id",
                verbose_name=None,
                groupby=False,
                hidden_from_drill=True,
            ),
            SimpleNamespace(
                column_name="view_detail",
                verbose_name="View Detail",
                groupby=False,
                hidden_from_drill=False,
            ),
        ],
    )

    with patch(
        "superset.datasets.schemas.security_manager.is_guest_user",
        return_value=False,
    ):
        result = DatasetDrillInfoSchema().dump(dataset)

    assert result["columns"] == [
        {"column_name": "category", "verbose_name": "Category"},
    ]
    assert set(result["hidden_columns"]) == {"customer_id", "order_id"}
    assert result["verbose_map"] == {
        "category": "Category",
        "view_detail": "View Detail",
    }


def test_dataset_drill_info_schema_guest_includes_hidden_columns() -> None:
    dataset = SimpleNamespace(
        id=7,
        table_name="orders",
        owners=[],
        created_by=None,
        created_on_humanized=None,
        changed_by=None,
        changed_on_humanized=None,
        columns=[
            SimpleNamespace(
                column_name="category",
                verbose_name="Category",
                groupby=True,
                hidden_from_drill=False,
            ),
            SimpleNamespace(
                column_name="customer_id",
                verbose_name=None,
                groupby=True,
                hidden_from_drill=True,
            ),
            SimpleNamespace(
                column_name="view_detail",
                verbose_name="View Detail",
                groupby=False,
                hidden_from_drill=False,
            ),
        ],
    )

    with patch(
        "superset.datasets.schemas.security_manager.is_guest_user",
        return_value=True,
    ):
        result = DatasetDrillInfoSchema().dump(dataset)

    assert result == {
        "id": 7,
        "columns": [{"column_name": "category", "verbose_name": "Category"}],
        "hidden_columns": ["customer_id"],
        "verbose_map": {
            "category": "Category",
            "view_detail": "View Detail",
        },
    }
