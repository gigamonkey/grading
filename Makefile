all:
	echo "Use db.db to rebuild db."

db.db:
	sqlite3 $@ < schema.sql
	sqlite3 $@ < load-roster.sql

clean:
	rm -f db.db*
