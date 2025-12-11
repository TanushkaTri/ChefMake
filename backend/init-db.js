const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function initDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Read and execute the SQL schema file
    const schemaPath = path.join(__dirname, 'sql', '001_init_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schemaSQL);
    console.log('✅ Database schema created successfully!');
    
    // Run additional SQL migrations in order (002_*.sql, 003_*.sql, etc.)
    const sqlDir = path.join(__dirname, 'sql');
    const migrationFiles = fs.readdirSync(sqlDir)
      .filter((file) => file.endsWith('.sql') && file !== '001_init_schema.sql')
      .sort();

    for (const fileName of migrationFiles) {
      const filePath = path.join(sqlDir, fileName);
      const migrationSQL = fs.readFileSync(filePath, 'utf8');
      if (migrationSQL.trim()) {
        await pool.query(migrationSQL);
        console.log(`✅ Migration ${fileName} applied successfully!`);
      }
    }
    
    console.log('🎉 Database initialization completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();
