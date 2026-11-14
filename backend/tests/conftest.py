import os
os.environ.pop("DATABASE_URL", None)  # app must import and tests must never touch a real db
