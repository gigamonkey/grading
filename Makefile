all: modules/pugly.sql db.db

db.db: schema.sql
	sqlite3 $@ < schema.sql
	sqlite3 $@ < load.sql

check:
	npx @biomejs/biome check --write

modules/pugly.sql: schema.sql
	npx puglify schema.sql > $@

clean:
	rm -f db.db*
