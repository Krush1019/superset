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

import json
from types import SimpleNamespace

from superset.utils.hidden_from_drill import (
    apply_hidden_from_drill,
    is_hidden_drill_column,
)


def test_is_hidden_drill_column_matches_id_patterns() -> None:
    assert is_hidden_drill_column("id")
    assert is_hidden_drill_column("customer_id")
    assert is_hidden_drill_column("ORG_ID")
    assert is_hidden_drill_column("account_fk")
    assert is_hidden_drill_column("user_uuid")
    assert is_hidden_drill_column("uuid")
    assert not is_hidden_drill_column("customer_name")
    assert not is_hidden_drill_column("identity")
    assert not is_hidden_drill_column("")


def test_apply_hidden_from_drill_stamps_id_columns() -> None:
    table = SimpleNamespace(
        columns=[
            SimpleNamespace(column_name="customer_id", extra=None),
            SimpleNamespace(column_name="customer_name", extra="{}"),
        ]
    )

    apply_hidden_from_drill(table)

    assert json.loads(table.columns[0].extra)["hidden_from_drill"] is True
    assert json.loads(table.columns[1].extra)["hidden_from_drill"] is False


def test_apply_hidden_from_drill_preserves_existing_override() -> None:
    table = SimpleNamespace(
        columns=[
            SimpleNamespace(
                column_name="customer_id",
                extra=json.dumps({"hidden_from_drill": False}),
            ),
        ]
    )

    apply_hidden_from_drill(table)

    assert json.loads(table.columns[0].extra)["hidden_from_drill"] is False
