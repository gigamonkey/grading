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
