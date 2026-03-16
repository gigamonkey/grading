-- Views that are broken (reference fps, assignment_weights, users_standards_summary,
-- standard_grades, or assignment_grades, none of which exist) and are not referenced
-- by any scripts. Safe to drop.

DROP VIEW IF EXISTS ag2;
DROP VIEW IF EXISTS new_users_standards_summary;
DROP VIEW IF EXISTS new_standard_grades;
DROP VIEW IF EXISTS new_assignment_grades;
DROP VIEW IF EXISTS semester_numbers;
DROP VIEW IF EXISTS semester_grades;
DROP VIEW IF EXISTS semester_by_fps;

-- Orphaned tables that exist in the live DB but are not defined in schema.sql.
-- Migration artifacts and scratch tables not referenced by any script.

DROP TABLE IF EXISTS form_assignments;
DROP TABLE IF EXISTS assignment_courses;
DROP TABLE IF EXISTS all_asssignments;
DROP TABLE IF EXISTS all_assignments;
DROP TABLE IF EXISTS temp_aw;
DROP TABLE IF EXISTS old_excused;
