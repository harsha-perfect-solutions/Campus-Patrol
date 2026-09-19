const { Pool } = require('pg');
const crypto = require('crypto');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgrespassword@localhost:5434/cmadms_db' });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

async function fixAllRoles() {
  console.log('--- Fixing Credentials & Roles Across All Accounts ---');
  const standardHash = hashPassword('Password123!');

  // 1. Update all existing profiles to have the valid scrypt password hash and active status
  await pool.query(
    `UPDATE profiles 
     SET password_hash = $1, 
         status = 'Active', 
         must_change_password = FALSE;`,
    [standardHash]
  );
  console.log('✓ Updated all existing profiles with valid scrypt password hash for Password123!');

  // 2. Ensure each staff/student account has the exact role and identifiers
  const accounts = [
    // ADMIN
    { email: 'admin@cmadms.edu', name: 'System Administrator', role: 'admin', dept: 'ADMIN', staffCode: 'ADM-001', studentCode: null },
    
    // HOD
    { email: 'hod.cse@cmadms.edu', name: 'Dr. K. V. Sharma (HOD CSE)', role: 'hod', dept: 'CSE', staffCode: 'HOD-CSE', studentCode: null },
    
    // SECURITY
    { email: 'security@cmadms.edu', name: 'Security Officer Rajesh', role: 'security', dept: 'SECURITY', staffCode: 'SEC-001', studentCode: null },
    
    // FACULTY
    { email: 'faculty@cmadms.edu', name: 'Prof. Ravi Kumar', role: 'faculty', dept: 'CSE', staffCode: 'F-101', studentCode: null },
    { email: 'vikram@cmadms.edu', name: 'Prof. Vikram Mehta', role: 'faculty', dept: 'CSE', staffCode: 'FAC-101', studentCode: null },
    { email: 'anita@cmadms.edu', name: 'Prof. Anita Sen', role: 'faculty', dept: 'CSE', staffCode: 'FAC-102', studentCode: null },
    { email: 'swaminathan@cmadms.edu', name: 'Dr. K. Swaminathan', role: 'faculty', dept: 'ECE', staffCode: 'FAC-103', studentCode: null },
    { email: 'nambiar@cmadms.edu', name: 'Prof. S. Nambiar', role: 'faculty', dept: 'ECE', staffCode: 'FAC-104', studentCode: null },
    { email: 'varma@cmadms.edu', name: 'Dr. H. Varma', role: 'faculty', dept: 'EEE', staffCode: 'FAC-105', studentCode: null },
    { email: 'mukherjee@cmadms.edu', name: 'Prof. B. Mukherjee', role: 'faculty', dept: 'MECH', staffCode: 'FAC-106', studentCode: null },
    { email: 'deshmukh@cmadms.edu', name: 'Dr. P. Deshmukh', role: 'faculty', dept: 'CIVIL', staffCode: 'FAC-107', studentCode: null },
    { email: 'venkat@cmadms.edu', name: 'Dr. M. Venkat', role: 'faculty', dept: 'AIML', staffCode: 'FAC-108', studentCode: null },

    // STUDENTS
    { email: 'chodiashokdora278@gmail.com', name: 'Ashok Dora', role: 'student', dept: 'CSE', staffCode: null, studentCode: '23CSE1012' },
    { email: 'student.demo@campus.edu', name: 'Rahul Sharma', role: 'student', dept: 'CSE', staffCode: null, studentCode: '23CSE9999' },
    { email: 'meera.nair@cmadms.edu', name: 'Meera Nair', role: 'student', dept: 'CSE', staffCode: null, studentCode: '23CSE1044' },
    { email: 'karthik.reddy@cmadms.edu', name: 'Karthik Reddy', role: 'student', dept: 'ECE', staffCode: null, studentCode: '23ECE2031' },
    { email: 'sneha.patil@cmadms.edu', name: 'Sneha Patil', role: 'student', dept: 'MECH', staffCode: null, studentCode: '22MEC3007' },
  ];

  for (const acc of accounts) {
    // Check if profile exists
    let pRes = await pool.query(`SELECT id FROM profiles WHERE UPPER(email) = UPPER($1);`, [acc.email]);
    let userId;
    if (pRes.rows.length === 0) {
      const insRes = await pool.query(
        `INSERT INTO profiles (full_name, email, department, staff_code, student_code, password_hash, status, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, 'Active', FALSE)
         RETURNING id;`,
        [acc.name, acc.email, acc.dept, acc.staffCode, acc.studentCode, standardHash]
      );
      userId = insRes.rows[0].id;
    } else {
      userId = pRes.rows[0].id;
      await pool.query(
        `UPDATE profiles 
         SET full_name = $1, department = $2, staff_code = $3, student_code = $4, password_hash = $5, status = 'Active', must_change_password = FALSE
         WHERE id = $6;`,
        [acc.name, acc.dept, acc.staffCode, acc.studentCode, standardHash, userId]
      );
    }

    // Ensure user_roles
    await pool.query(`DELETE FROM user_roles WHERE user_id = $1;`, [userId]);
    await pool.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, $2);`, [userId, acc.role]);
    console.log(`✓ Configured [${acc.role.toUpperCase()}] ${acc.name} (${acc.email}) | ID/Code: ${acc.studentCode || acc.staffCode}`);
  }

  console.log('\nAll roles configured successfully. Default password for all: Password123!');
  await pool.end();
}

fixAllRoles().catch((err) => {
  console.error(err);
  pool.end();
});
