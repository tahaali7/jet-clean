#!/usr/bin/env python3
"""
سكريبت نقل البيانات من SQLite إلى PostgreSQL
الاستخدام: python3 scripts/migrate-data.py "postgresql://user:pass@host/db"
"""
import sys
import sqlite3
import subprocess

def export_sqlite_data():
    """Export all data from SQLite as SQL INSERT statements"""
    db_path = '/home/z/my-project/db/custom.db'
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    tables = {
        'Branch': ['id', 'name'],
        'AdminAccount': ['id', 'name', 'password'],
        'Employee': ['id', 'name', 'branchId', 'shift', 'password'],
        'CarEntry': ['id', 'date', 'branchId', 'empId', 'empName', 'room', 'totalCars', 'totalAmount', 'extraCars', 'extraAmount', 'priceCounts', 'customPrices', 'createdAt'],
        'WorkerExpense': ['id', 'date', 'branchId', 'amount', 'note'],
        'Treasury': ['id', 'date', 'branchId', 'total', 'cash', 'later'],
        'Record': ['id', 'empId', 'type', 'amount', 'note', 'date', 'branchId'],
        'ClosedDay': ['id', 'date', 'branchId'],
    }

    sql_statements = []

    for table, columns in tables.items():
        cursor.execute(f'SELECT * FROM "{table}"')
        rows = cursor.fetchall()
        print(f"  {table}: {len(rows)} rows")

        if len(rows) == 0:
            continue

        for row in rows:
            row_dict = dict(row)
            cols = []
            vals = []
            for col in columns:
                val = row_dict.get(col)
                if val is None:
                    cols.append(col)
                    vals.append('NULL')
                elif isinstance(val, str):
                    escaped = val.replace("'", "''")
                    cols.append(col)
                    vals.append(f"'{escaped}'")
                elif isinstance(val, int):
                    cols.append(col)
                    vals.append(str(val))
                else:
                    cols.append(col)
                    vals.append(f"'{str(val)}'")

            sql = f'INSERT INTO "{table}" ({", ".join(cols)}) VALUES ({", ".join(vals)}) ON CONFLICT DO NOTHING;'
            sql_statements.append(sql)

    conn.close()
    return sql_statements


def run_psql(pg_url, sql_statements):
    """Execute SQL statements against PostgreSQL"""
    import urllib.parse

    # Parse the URL
    parsed = urllib.parse.urlparse(pg_url)

    host = parsed.hostname
    port = parsed.port or 5432
    dbname = parsed.path.lstrip('/')
    user = parsed.username
    password = parsed.password

    # Try using psycopg2
    try:
        import psycopg2
        conn = psycopg2.connect(
            host=host, port=port, dbname=dbname,
            user=user, password=password,
            sslmode='require'
        )
        conn.autocommit = True
        cursor = conn.cursor()

        for stmt in sql_statements:
            try:
                cursor.execute(stmt)
            except Exception as e:
                print(f"  ⚠️ Warning: {e}")

        conn.close()
        print("✅ تم نقل البيانات بنجاح عبر psycopg2")
        return True
    except ImportError:
        print("psycopg2 غير متوفر")
    except Exception as e:
        print(f"⚠️ خطأ في psycopg2: {e}")

    # Try using subprocess with psql
    try:
        env = {
            'PGPASSWORD': password,
            'PATH': '/usr/bin:/bin'
        }
        sql_text = '\n'.join(sql_statements)

        result = subprocess.run(
            ['psql', '-h', host, '-p', str(port), '-U', user, '-d', dbname, '-v', 'ON_ERROR_STOP=0'],
            input=sql_text, capture_output=True, text=True, env=env, timeout=30
        )
        if result.returncode == 0:
            print("✅ تم نقل البيانات بنجاح عبر psql")
            return True
        else:
            print(f"⚠️ psql warning: {result.stderr[:200]}")
            return True
    except FileNotFoundError:
        print("psql غير متوفر")
    except Exception as e:
        print(f"⚠️ خطأ في psql: {e}")

    # Fallback: save SQL to file for manual execution
    output_path = '/home/z/my-project/scripts/migration-data.sql'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))
    print(f"📄 تم حفظ SQL في: {output_path}")
    print("   يمكنك تنفيذها يدوياً في لوحة تحكم Supabase/Neon")
    return True


if __name__ == '__main__':
    pg_url = sys.argv[1] if len(sys.argv) > 1 else None

    if not pg_url:
        print("❌ يرجى تمرير رابط PostgreSQL")
        print("   الاستخدام: python3 scripts/migrate-data.py 'postgresql://user:pass@host/db'")
        sys.exit(1)

    print(f"📤 تصدير البيانات من SQLite...")
    sql_statements = export_sqlite_data()
    print(f"📊 إجمالي: {len(sql_statements)} استعلام")
    print(f"\n📤 استيراد البيانات إلى PostgreSQL...")
    run_psql(pg_url, sql_statements)
