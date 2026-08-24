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
"""
One-shot stamp of ``extra.hidden_from_drill`` on existing dataset columns.

Run inside the Superset app container, for example:

    docker compose exec <superset-app> python scripts/stamp_hidden_from_drill.py
"""

from __future__ import annotations


def main() -> None:
    # Models that use encrypted columns require create_app() before import.
    from superset.app import create_app

    app = create_app()
    with app.app_context():
        from superset.connectors.sqla.models import SqlaTable
        from superset.extensions import db
        from superset.utils.hidden_from_drill import apply_hidden_from_drill

        tables = db.session.query(SqlaTable).all()
        stamped = 0
        for table in tables:
            before = {
                col.column_name: getattr(col, "extra", None) for col in table.columns
            }
            apply_hidden_from_drill(table)
            after = {
                col.column_name: getattr(col, "extra", None) for col in table.columns
            }
            if before != after:
                stamped += 1
                db.session.add(table)
        db.session.commit()
        print(f"Stamped hidden_from_drill on {stamped} of {len(tables)} datasets.")


if __name__ == "__main__":
    main()
