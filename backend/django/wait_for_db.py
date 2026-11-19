import os
import sys
import time

import psycopg

url = os.environ.get("DATABASE_URL", "postgresql://semanticshop:semanticshop@db:5432/semanticshop")
deadline = time.time() + 90

while True:
    try:
        with psycopg.connect(url, connect_timeout=5):
            sys.exit(0)
    except Exception:
        if time.time() > deadline:
            sys.exit("Base de données indisponible")
        time.sleep(2)
