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
"""Helpers to stamp ID/FK columns as hidden from drill UIs."""

from __future__ import annotations

import json
import re
from typing import Any

DRILL_HIDDEN_COLUMN_PATTERNS: tuple[str, ...] = (
    r"^id$",
    r".+_id$",
    r".+_fk$",
    r".+_uuid$",
    r"^uuid$",
)

_DRILL_HIDDEN_RE = [re.compile(pattern, re.IGNORECASE) for pattern in DRILL_HIDDEN_COLUMN_PATTERNS]


def is_hidden_drill_column(column_name: str) -> bool:
    """Return True if the column name looks like an ID or foreign key."""
    name = (column_name or "").strip()
    if not name:
        return False
    return any(pattern.search(name) for pattern in _DRILL_HIDDEN_RE)


def _get_column_extra(col: Any) -> dict[str, Any]:
    raw = getattr(col, "extra", None) or "{}"
    if isinstance(raw, dict):
        return dict(raw)
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, json.JSONDecodeError):
        return {}


def apply_hidden_from_drill(table: Any) -> Any:
    """
    Stamp ID/FK columns with ``extra.hidden_from_drill``.

    If the flag is already present (including an explicit ``false`` from the
    dataset editor), leave it unchanged so Sync columns does not overwrite
    analyst overrides.
    """
    for col in getattr(table, "columns", []) or []:
        extra = _get_column_extra(col)
        if "hidden_from_drill" in extra:
            continue
        extra["hidden_from_drill"] = is_hidden_drill_column(col.column_name)
        col.extra = json.dumps(extra)
    return table
