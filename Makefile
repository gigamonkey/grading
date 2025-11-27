export CLASSPATH := /Users/peter/hacks/bhs-cs/java/target/bhs-cs.jar:.

JAVAC_OPTS := -Xlint:all -Xlint:-serial -Xlint:-this-escape

all: java

java:
	javac $(JAVAC_OPTS) -d classes *.java

old_all:
	modules/pugly.sql db.db

db.db: schema.sql
	sqlite3 $@ < schema.sql

# Don't run this once db is a going concern
setup_db:
	sqlite3 $@ < load.sql

check:
	npx @biomejs/biome check --write

modules/pugly.sql: schema.sql
	npx puglify schema.sql > $@

clean:
	rm -f db.db*
