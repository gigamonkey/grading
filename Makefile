all:
	sqlite3 db.db < schema.sql
	uv run markup-to-questions.py 47 ~/hacks/bhs-cs/markup/views/from-markup/c/csa/questions/punctuation.txt

clean:
	rm -f db.db*
