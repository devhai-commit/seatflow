import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded avatars as static files
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Multer config: store avatars in uploads/avatars/, filename = studentId + ext
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(uploadsDir, 'avatars')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.params.studentId}${ext}`);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh (jpg/png/webp/gif)'));
  },
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'seatflow',
  waitForConnections: true,
  connectionLimit: 10,
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) return field.string() === '1';
    return next();
  },
});

const JSON_FIELDS = ['group_settings', 'groups_data', 'group_leaders'];

// Sync seating_assignments from chart. Preserves each student's assigned_at timestamp.
async function syncSeatingAssignments(chart) {
  await pool.query('DELETE FROM seating_assignments');
  const now = Date.now();
  const insertRows = [];
  chart.forEach((row, r) =>
    row.forEach((table, c) =>
      table.forEach((student, s) => {
        if (student?.id) {
          const ts = student.currentSeatAssignedTimestamp || now;
          insertRows.push([student.id, r, c, s, ts]);
        }
      })
    )
  );
  if (insertRows.length > 0) {
    await pool.query(
      'INSERT INTO seating_assignments (student_id, row_index, col_index, seat_index, assigned_at) VALUES ?',
      [insertRows]
    );
  }
}

function parseRow(row) {
  if (!row) return row;
  const result = { ...row };
  JSON_FIELDS.forEach(f => {
    if (result[f] && typeof result[f] === 'string') {
      try { result[f] = JSON.parse(result[f]); } catch {}
    }
  });
  return result;
}

// Build seating chart from seating_assignments joined with students.
// Returns [] when no assignments exist.
// Chart dimensions: max(minRows, maxAssignedRow+1) x max(cols, maxAssignedCol+1)
async function buildChartFromAssignments(minRows, cols) {
  const [assignments] = await pool.query(`
    SELECT sa.row_index, sa.col_index, sa.seat_index, sa.assigned_at,
           s.id AS student_id, s.full_name, s.short_name,
           s.parent_phone, s.address, s.weight, s.height,
           s.is_nearsighted, s.is_special_needs, s.avatar_url
    FROM seating_assignments sa
    JOIN students s ON sa.student_id = s.id
    ORDER BY sa.row_index, sa.col_index, sa.seat_index
  `);

  if (assignments.length === 0) return [];

  const [behaviors] = await pool.query('SELECT * FROM behavior_records');
  const behaviorMap = new Map();
  behaviors.forEach(b => {
    if (!behaviorMap.has(b.student_id)) behaviorMap.set(b.student_id, []);
    behaviorMap.get(b.student_id).push(b);
  });

  const maxRow = Math.max(...assignments.map(a => a.row_index));
  const maxCol = Math.max(...assignments.map(a => a.col_index));
  const actualRows = Math.max(minRows, maxRow + 1);
  const actualCols = Math.max(cols, maxCol + 1);

  const chart = Array.from({ length: actualRows }, () =>
    Array.from({ length: actualCols }, () => [])
  );

  assignments.forEach(a => {
    chart[a.row_index][a.col_index][a.seat_index] = {
      id: a.student_id,
      fullName: a.full_name,
      shortName: a.short_name || '',
      currentSeatAssignedTimestamp: a.assigned_at ? Number(a.assigned_at) : null,
      parentPhone: a.parent_phone || undefined,
      address: a.address || undefined,
      weight: a.weight || undefined,
      height: a.height || undefined,
      isNearsighted: a.is_nearsighted,
      isSpecialNeeds: a.is_special_needs,
      avatarUrl: a.avatar_url || undefined,
      behaviorRecords: (behaviorMap.get(a.student_id) || []).map(br => ({
        id: br.id,
        type: br.type,
        description: br.description,
        score: br.score,
        timestamp: Number(br.timestamp),
      })),
    };
  });

  return chart;
}

// GET /api/settings
app.get('/api/settings', async (req, res) => {
  try {
    const [settingsRows] = await pool.query('SELECT * FROM app_settings WHERE id = 1');
    const settings = parseRow(settingsRows[0]) || {};

    const minRows = settings.min_rows || 4;
    const cols = settings.cols || 5;

    const chart = await buildChartFromAssignments(minRows, cols);
    const actualRows = chart.length > 0 ? chart.length : minRows;

    res.json({
      ...settings,
      rows: actualRows,
      seating_chart: chart,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings
app.post('/api/settings', async (req, res) => {
  try {
    const data = { ...req.body };

    // Translate rows → min_rows (frontend uses `rows`, DB stores `min_rows`)
    if (data.rows !== undefined) {
      data.min_rows = data.rows;
      delete data.rows;
    }

    // Strip seating_chart — stored in seating_assignments, not app_settings
    const chart = data.seating_chart;
    delete data.seating_chart;

    JSON_FIELDS.forEach(f => {
      if (data[f] !== undefined && typeof data[f] !== 'string') {
        data[f] = JSON.stringify(data[f]);
      }
    });

    if (Object.keys(data).length > 0) {
      const [existing] = await pool.query('SELECT id FROM app_settings WHERE id = 1');
      if (existing.length > 0) {
        const keys = Object.keys(data);
        const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
        await pool.query(`UPDATE app_settings SET ${sets} WHERE id = 1`, Object.values(data));
      } else {
        data.id = 1;
        const keys = Object.keys(data);
        const colNames = keys.map(k => `\`${k}\``).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        await pool.query(
          `INSERT INTO app_settings (${colNames}) VALUES (${placeholders})`,
          Object.values(data)
        );
      }
    }

    if (chart !== undefined) {
      const chartData = typeof chart === 'string' ? JSON.parse(chart) : chart;
      await syncSeatingAssignments(chartData);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students
app.get('/api/students', async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT s.*, sa.assigned_at AS current_seat_assigned_timestamp
      FROM students s
      LEFT JOIN seating_assignments sa ON s.id = sa.student_id
      ORDER BY s.full_name
    `);
    const [behaviors] = await pool.query('SELECT * FROM behavior_records');
    const result = students.map(s => ({
      ...s,
      behavior_records: behaviors.filter(b => b.student_id === s.id),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/sync — insert new names, return all students
app.post('/api/students/sync', async (req, res) => {
  try {
    const { names } = req.body;
    const [existing] = await pool.query('SELECT full_name FROM students');
    const existingNames = new Set(existing.map(s => s.full_name));

    const newStudents = names.filter(n => !existingNames.has(n));
    if (newStudents.length > 0) {
      const inserts = newStudents.map(n => [uuidv4(), n]);
      await pool.query('INSERT INTO students (id, full_name) VALUES ?', [inserts]);
    }

    const [students] = await pool.query(`
      SELECT s.*, sa.assigned_at AS current_seat_assigned_timestamp
      FROM students s
      LEFT JOIN seating_assignments sa ON s.id = sa.student_id
      ORDER BY s.full_name
    `);
    const [behaviors] = await pool.query('SELECT * FROM behavior_records');
    const result = students.map(s => ({
      ...s,
      behavior_records: behaviors.filter(b => b.student_id === s.id),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students
app.post('/api/students', async (req, res) => {
  try {
    const { full_name } = req.body;
    const id = uuidv4();
    await pool.query('INSERT INTO students (id, full_name) VALUES (?, ?)', [id, full_name]);
    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id
app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const keys = Object.keys(data);
    const sets = keys.map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(`UPDATE students SET ${sets} WHERE id = ?`, [...Object.values(data), id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/:studentId/avatar — upload ảnh đại diện
app.post('/api/students/:studentId/avatar', (req, res, next) => {
  req.params.studentId = req.params.studentId; // ensure param accessible in multer filename
  next();
}, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không có file ảnh' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE students SET avatar_url = ? WHERE id = ?', [avatarUrl, req.params.studentId]);
    res.json({ avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:studentId/avatar — xóa ảnh đại diện
app.delete('/api/students/:studentId/avatar', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT avatar_url FROM students WHERE id = ?', [req.params.studentId]);
    const avatarUrl = rows[0]?.avatar_url;
    if (avatarUrl) {
      const filePath = path.join(__dirname, avatarUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('UPDATE students SET avatar_url = NULL WHERE id = ?', [req.params.studentId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/:studentId/behavior
app.post('/api/students/:studentId/behavior', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { type, description, score, timestamp } = req.body;
    const id = uuidv4();
    await pool.query(
      'INSERT INTO behavior_records (id, student_id, type, description, score, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [id, studentId, type, description, score, timestamp]
    );
    const [rows] = await pool.query('SELECT * FROM behavior_records WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/behavior/:id
app.delete('/api/behavior/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM behavior_records WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/seating-history — trả về 30 lần gần nhất
app.get('/api/seating-history', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM seating_history ORDER BY created_at DESC LIMIT 30'
    );
    const result = rows.map(r => ({
      ...r,
      snapshot: typeof r.snapshot === 'string' ? JSON.parse(r.snapshot) : r.snapshot,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/seating-history — lưu 1 snapshot
app.post('/api/seating-history', async (req, res) => {
  try {
    const { snapshot, rows_count, cols_count, created_at, note } = req.body;
    const snapshotStr = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
    const [result] = await pool.query(
      'INSERT INTO seating_history (snapshot, rows_count, cols_count, created_at, note) VALUES (?, ?, ?, ?, ?)',
      [snapshotStr, rows_count || 4, cols_count || 6, created_at, note || null]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`SeatFlow API running on http://localhost:${PORT}`));
