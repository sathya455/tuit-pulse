-- 1. Users table (Teachers, Parents, Students)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  mobile VARCHAR(15) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'parent', 'student')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tuition Batches (managed by a Teacher)
CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  batch_name VARCHAR(100) NOT NULL,
  subject VARCHAR(100),
  timing VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Students Roster (holds parent_mobile for automatic parent linking)
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  student_name VARCHAR(100) NOT NULL,
  student_mobile VARCHAR(15),
  parent_mobile VARCHAR(15) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Parent-Student Links (auto-populated when parent registers with matching mobile)
CREATE TABLE IF NOT EXISTS parent_student_links (
  id SERIAL PRIMARY KEY,
  parent_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(parent_user_id, student_id)
);

-- 5. Daily Pulse Logs (Attendance, Homework, Test Marks, Remarks)
CREATE TABLE IF NOT EXISTS daily_activities (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attendance VARCHAR(20) NOT NULL DEFAULT 'Present' CHECK (attendance IN ('Present', 'Absent', 'Late')),
  homework_status VARCHAR(30) DEFAULT 'Assigned',
  test_score VARCHAR(30),
  teacher_remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, batch_id, activity_date)
);
