#!/bin/bash
# Fix PostgreSQL auth to allow postgres user via local socket
python3 << 'PYEOF'
import os

src = "/etc/postgresql/18/main/pg_hba.conf"
with open(src) as f:
    content = f.read()

new_content = content.replace(
    "local   all             postgres                                peer",
    "local   all             postgres                                trust"
)

if new_content == content:
    print("ERROR: pattern not found in pg_hba.conf")
    print("Current content:")
    print(content)
    exit(1)

with open(src, "w") as f:
    f.write(new_content)
print("pg_hba.conf updated successfully")
PYEOF

# Reload PostgreSQL
pg_ctlcluster 18 main reload
echo "PostgreSQL reloaded"
