"""A local, reproducible Iceberg table: storage, catalog, write, read, metric."""
from pathlib import Path
from tempfile import TemporaryDirectory

import pyarrow as pa
from pyiceberg.catalog import load_catalog


def main() -> None:
    with TemporaryDirectory(prefix="open-lakehouse-") as folder:
        root = Path(folder)
        catalog = load_catalog(
            "demo",
            type="sql",
            uri=f"sqlite:///{root / 'catalog.db'}",
            warehouse=(root / "warehouse").as_uri(),
        )
        catalog.create_namespace("sales")
        batch = pa.table({
            "order_id": pa.array([1, 2, 3], type=pa.int64()),
            "paid_amount": pa.array([100, 80, 50], type=pa.int64()),
            "refund_amount": pa.array([0, 20, 0], type=pa.int64()),
        })
        table = catalog.create_table("sales.orders", schema=batch.schema)
        table.append(batch)
        read_back = catalog.load_table("sales.orders").scan().to_arrow()
        net_revenue = sum(read_back["paid_amount"].to_pylist()) - sum(
            read_back["refund_amount"].to_pylist()
        )
        assert read_back.num_rows == 3
        assert net_revenue == 210
        print(f"rows={read_back.num_rows} net_revenue={net_revenue}")
        print(f"snapshot_id={table.current_snapshot().snapshot_id}")


if __name__ == "__main__":
    main()
